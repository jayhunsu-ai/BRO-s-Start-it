import { test } from "node:test";
import assert from "node:assert/strict";
import { CostController } from "../src/cost-controller.js";
import { createBlocksCostGate } from "../src/blocks-cost-gate.js";

test("Blocks adapter authorizes an existing reservation and settles unknown usage safely", () => {
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
  const authorized = gate.authorize({
    reservationId: reservation!.reservationId,
    provider: "mock",
    model: "mock-sonnet",
    projectId: "p1",
    taskId: "t1",
  });
  assert.equal(authorized.reservationId, reservation!.reservationId);

  // Simulate a provider completing without verified currency usage.
  // The adapter must not call that zero dollars; it commits the reserved max.
  gate.settle({
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

test("Blocks adapter denies provider execution when no reservation exists", () => {
  const cc = new CostController();
  const gate = createBlocksCostGate(cc);
  assert.throws(() =>
    gate.authorize({
      reservationId: "missing",
      provider: "mock",
      model: "mock-sonnet",
    }),
  );
});
