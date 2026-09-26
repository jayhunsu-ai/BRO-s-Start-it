import { test } from "node:test";
import assert from "node:assert/strict";
import { CostController } from "../src/cost-controller.js";
import { createBlocksCostGate } from "../src/blocks-cost-gate.js";

test("Blocks adapter authorizes an existing reservation and settles unknown usage safely", async () => {
  const cc = new CostController();
  const reservation = cc.reserve({
    projectId: "p1",
    taskId: "t1",
    model: "mock-sonnet",
    estimatedUncachedInputTokens: 1000,
    estimatedCachedInputTokens: 0,
    estimatedOutputTokens: 500,
  });
  assert.ok(reservation);

  const gate = createBlocksCostGate(cc);
  const authorized = await gate.authorize({
    reservationId: reservation!.reservationId,
    provider: "mock",
    model: "mock-sonnet",
    projectId: "p1",
    taskId: "t1",
  });
  assert.equal(authorized.reservationId, reservation!.reservationId);

  await gate.settle({
    reservationId: reservation!.reservationId,
    provider: "mock",
    model: "mock-sonnet",
    actualCostUsd: null,
    result: "ok",
  });

  assert.equal(cc.getLedger().length, 1);
  assert.equal(cc.getLedger()[0].actualCostUsd, reservation!.maxCostUsd);
  assert.throws(() =>
    cc.authorizeReservation(reservation!.reservationId),
  );
});

test("Blocks adapter denies provider execution when no reservation exists", async () => {
  const cc = new CostController();
  const gate = createBlocksCostGate(cc);
  await assert.rejects(
    Promise.resolve().then(() =>
      gate.authorize({
        reservationId: "missing",
        provider: "mock",
        model: "mock-sonnet",
      }),
    ),
  );
});

test("provider spawn boundary is never reached without a cost reservation", async () => {
  const cc = new CostController();
  const gate = createBlocksCostGate(cc);
  let spawnCount = 0;

  const invokeProvider = async (reservationId?: string) => {
    await gate.authorize({
      reservationId: reservationId ?? "missing",
      provider: "mock-paid-provider",
      model: "mock-sonnet",
      projectId: "p1",
      taskId: "t1",
    });
    spawnCount += 1;
  };

  await assert.rejects(() => invokeProvider());
  assert.equal(spawnCount, 0);
});
