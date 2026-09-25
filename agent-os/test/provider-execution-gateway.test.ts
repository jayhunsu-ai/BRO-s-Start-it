import { test } from "node:test";
import assert from "node:assert/strict";
import type {
  ProviderAdapter,
  RuntimeEvent,
  RuntimeEventListener,
  SendTurnInput,
} from "../src/contracts.js";
import { CostController } from "../src/cost-controller.js";
import { createBlocksCostGate } from "../src/blocks-cost-gate.js";
import { createProviderExecutionGateway } from "../src/provider-execution-gateway.js";

function createFakeAdapter(sendTurnImpl: (input: SendTurnInput, emit: (event: RuntimeEvent) => void) => Promise<{ turnId: string }>): ProviderAdapter {
  const listeners = new Set<RuntimeEventListener>();
  const emit = (event: RuntimeEvent) => listeners.forEach((listener) => listener(event));

  return {
    provider: "fake-paid-provider",
    capabilities: { sessionModelSwitch: "unsupported" },
    sendTurn: (input) => sendTurnImpl(input, emit),
    interruptTurn: async () => {},
    respondToRequest: async () => {},
    hasSession: () => false,
    stopAll: async () => {},
    onEvent: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

function reserve(cc: CostController) {
  const reservation = cc.reserve({
    projectId: "p1",
    taskId: "t1",
    model: "mock-sonnet",
    estimatedUncachedInputTokens: 1000,
    estimatedCachedInputTokens: 0,
    estimatedOutputTokens: 500,
  });
  assert.ok(reservation);
  return reservation;
}

test("execution gateway authorizes before provider send and settles a synchronous completion", async () => {
  const cc = new CostController();
  const reservation = reserve(cc);
  let sendCount = 0;

  const adapter = createFakeAdapter(async (_input, emit) => {
    sendCount += 1;
    emit({
      eventId: "evt-1",
      provider: "fake-paid-provider",
      threadId: "thread-1",
      turnId: "turn-1",
      createdAt: new Date().toISOString(),
      type: "turn.completed",
      ok: true,
      stopReason: "complete",
      cost: null,
    });
    return { turnId: "turn-1" };
  });

  const gateway = createProviderExecutionGateway(adapter, createBlocksCostGate(cc));
  const result = await gateway.sendTurn({
    threadId: "thread-1",
    text: "test",
    model: "mock-sonnet",
    costReservationId: reservation!.reservationId,
    projectId: "p1",
    taskId: "t1",
  });

  assert.equal(result.turnId, "turn-1");
  assert.equal(sendCount, 1);
  assert.equal(cc.getLedger().length, 1);
  assert.equal(cc.getLedger()[0].actualCostUsd, reservation!.maxCostUsd);
});

test("execution gateway never calls provider without a valid reservation", async () => {
  const cc = new CostController();
  let sendCount = 0;
  const adapter = createFakeAdapter(async () => {
    sendCount += 1;
    return { turnId: "turn-never" };
  });

  const gateway = createProviderExecutionGateway(adapter, createBlocksCostGate(cc));

  await assert.rejects(() =>
    gateway.sendTurn({
      threadId: "thread-1",
      text: "must not execute",
      model: "mock-sonnet",
      costReservationId: "missing",
      projectId: "p1",
      taskId: "t1",
    }),
  );

  assert.equal(sendCount, 0);
});

test("execution gateway releases the reservation when provider start fails", async () => {
  const cc = new CostController();
  const reservation = reserve(cc);

  const adapter = createFakeAdapter(async () => {
    throw new Error("provider start failed");
  });

  const gateway = createProviderExecutionGateway(adapter, createBlocksCostGate(cc));

  await assert.rejects(() =>
    gateway.sendTurn({
      threadId: "thread-1",
      text: "test",
      model: "mock-sonnet",
      costReservationId: reservation!.reservationId,
      projectId: "p1",
      taskId: "t1",
    }),
  );

  assert.equal(cc.getLedger().length, 0);
  assert.equal(cc.remainingUsd("p1", "t1"), 50);
});
