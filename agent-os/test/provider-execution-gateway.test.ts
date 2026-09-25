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
  assert.equal(cc.remainingUsd("p1", "t1"), 20);
});

test("execution gateway settles the exact numeric provider cost", async () => {
  const cc = new CostController();
  const reservation = reserve(cc);

  const adapter = createFakeAdapter(async (_input, emit) => {
    emit({
      eventId: "evt-cost",
      provider: "fake-paid-provider",
      threadId: "thread-1",
      turnId: "turn-cost",
      createdAt: new Date().toISOString(),
      type: "turn.completed",
      ok: true,
      stopReason: "complete",
      cost: 1.25,
    });
    return { turnId: "turn-cost" };
  });

  const gateway = createProviderExecutionGateway(adapter, createBlocksCostGate(cc));
  await gateway.sendTurn({
    threadId: "thread-1",
    text: "priced",
    model: "mock-sonnet",
    costReservationId: reservation!.reservationId,
    projectId: "p1",
    taskId: "t1",
  });

  assert.equal(cc.getLedger().length, 1);
  assert.equal(cc.getLedger()[0].actualCostUsd, 1.25);
  assert.equal(cc.getLedger()[0].result, "ok");
});

test("execution gateway settles a failed provider turn as an error", async () => {
  const cc = new CostController();
  const reservation = reserve(cc);

  const adapter = createFakeAdapter(async (_input, emit) => {
    emit({
      eventId: "evt-fail",
      provider: "fake-paid-provider",
      threadId: "thread-1",
      turnId: "turn-fail",
      createdAt: new Date().toISOString(),
      type: "turn.completed",
      ok: false,
      stopReason: "error",
      cost: 0.4,
    });
    return { turnId: "turn-fail" };
  });

  const gateway = createProviderExecutionGateway(adapter, createBlocksCostGate(cc));
  await gateway.sendTurn({
    threadId: "thread-1",
    text: "fail",
    model: "mock-sonnet",
    costReservationId: reservation!.reservationId,
    projectId: "p1",
    taskId: "t1",
  });

  assert.equal(cc.getLedger().length, 1);
  assert.equal(cc.getLedger()[0].actualCostUsd, 0.4);
  assert.equal(cc.getLedger()[0].result, "error");
});

test("execution gateway isolates concurrent turns so one completion cannot settle another reservation", async () => {
  const cc = new CostController();
  const first = reserve(cc);
  const second = reserve(cc);
  let resolveFirst: ((value: { turnId: string }) => void) | undefined;
  let resolveSecond: ((value: { turnId: string }) => void) | undefined;

  const adapter = createFakeAdapter((input, emit) => {
    if (input.text === "first") {
      return new Promise((resolve) => {
        resolveFirst = () => {
          emit({
            eventId: "evt-first",
            provider: "fake-paid-provider",
            threadId: input.threadId,
            turnId: "turn-first",
            createdAt: new Date().toISOString(),
            type: "turn.completed",
            ok: true,
            stopReason: "complete",
            cost: 1,
          });
          resolve({ turnId: "turn-first" });
        };
      });
    }

    return new Promise((resolve) => {
      resolveSecond = () => {
        emit({
          eventId: "evt-second",
          provider: "fake-paid-provider",
          threadId: input.threadId,
          turnId: "turn-second",
          createdAt: new Date().toISOString(),
          type: "turn.completed",
          ok: true,
          stopReason: "complete",
          cost: 2,
        });
        resolve({ turnId: "turn-second" });
      };
    });
  });

  const gateway = createProviderExecutionGateway(adapter, createBlocksCostGate(cc));
  const firstPromise = gateway.sendTurn({
    threadId: "thread-1",
    text: "first",
    model: "mock-sonnet",
    costReservationId: first!.reservationId,
    projectId: "p1",
    taskId: "t1",
  });
  const secondPromise = gateway.sendTurn({
    threadId: "thread-2",
    text: "second",
    model: "mock-sonnet",
    costReservationId: second!.reservationId,
    projectId: "p1",
    taskId: "t1",
  });

  await new Promise((resolve) => setImmediate(resolve));
  assert.ok(resolveFirst);
  assert.ok(resolveSecond);

  resolveFirst!();
  await firstPromise;

  // First completion must not consume the second reservation.
  assert.equal(cc.getLedger().length, 1);
  assert.equal(cc.getLedger()[0].actualCostUsd, 1);

  resolveSecond!();
  await secondPromise;

  assert.equal(cc.getLedger().length, 2);
  assert.deepEqual(
    cc.getLedger().map((entry) => entry.actualCostUsd).sort((a, b) => a - b),
    [1, 2],
  );
});
