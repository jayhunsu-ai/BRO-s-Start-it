import { test } from "node:test";
import assert from "node:assert/strict";
import { CostController, defaultBudgetHierarchy } from "../src/cost-controller.js";

test("reserve() denies an estimate above the invocation cap", () => {
  const cc = new CostController();
  const reservation = cc.reserve({
    projectId: "p1",
    model: "mock-opus",
    estimatedUncachedInputTokens: 10_000_000,
    estimatedCachedInputTokens: 0,
    estimatedOutputTokens: 1_000_000,
  });
  assert.equal(reservation, null);
});

test("reserve() then commit() updates remaining budget and the ledger", () => {
  const cc = new CostController();
  const before = cc.remainingUsd("p1");
  const reservation = cc.reserve({
    projectId: "p1",
    model: "mock-sonnet",
    estimatedUncachedInputTokens: 1000,
    estimatedCachedInputTokens: 0,
    estimatedOutputTokens: 500,
  });
  assert.ok(reservation);
  const event = cc.commit(reservation!.reservationId, { provider: "mock", model: "mock-sonnet", actualCostUsd: 0.01, result: "ok" });
  assert.equal(event.actualCostUsd, 0.01);
  assert.equal(cc.remainingUsd("p1"), before - 0.01);
  assert.equal(cc.getLedger().length, 1);
});

test("commit() throws on an unknown reservation id", () => {
  const cc = new CostController();
  assert.throws(() => cc.commit("nope", { provider: "mock", model: "mock-sonnet", actualCostUsd: 1, result: "ok" }));
});

test("kill switch blocks new reservations", () => {
  const cc = new CostController();
  cc.aiExecutionEnabled = false;
  const reservation = cc.reserve({ projectId: "p1", model: "mock-sonnet", estimatedUncachedInputTokens: 10, estimatedCachedInputTokens: 0, estimatedOutputTokens: 10 });
  assert.equal(reservation, null);
});

test("circuit breaker halts after repeated anomalies and blocks new reservations", () => {
  const cc = new CostController();
  for (let i = 0; i < 5; i++) cc.breaker.recordAnomaly();
  assert.equal(cc.breaker.current, "HALTED");
  const reservation = cc.reserve({ projectId: "p1", model: "mock-sonnet", estimatedUncachedInputTokens: 10, estimatedCachedInputTokens: 0, estimatedOutputTokens: 10 });
  assert.equal(reservation, null);
});

test("circuit breaker only resumes via an authorized caller", () => {
  const cc = new CostController();
  for (let i = 0; i < 5; i++) cc.breaker.recordAnomaly();
  cc.breaker.resumeFromHalted("human");
  assert.equal(cc.breaker.current, "GREEN");
});

test("dayBudgetUsd is enforced even when the monthly ceiling has room", () => {
  const cc = new CostController({ ...defaultBudgetHierarchy(), dayBudgetUsd: 0.005 });
  const reservation = cc.reserve({
    projectId: "p1",
    model: "mock-sonnet",
    estimatedUncachedInputTokens: 100_000,
    estimatedCachedInputTokens: 0,
    estimatedOutputTokens: 10_000,
  });
  assert.equal(reservation, null);
});

test("release() drops a reservation without touching spend", () => {
  const cc = new CostController();
  const before = cc.remainingUsd("p1");
  const reservation = cc.reserve({ projectId: "p1", model: "mock-sonnet", estimatedUncachedInputTokens: 1000, estimatedCachedInputTokens: 0, estimatedOutputTokens: 500 });
  assert.ok(reservation);
  cc.release(reservation!.reservationId);
  assert.equal(cc.remainingUsd("p1"), before);
  assert.throws(() => cc.commit(reservation!.reservationId, { provider: "mock", model: "mock-sonnet", actualCostUsd: 0.01, result: "ok" }));
});
