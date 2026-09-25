import { test } from "node:test";
import assert from "node:assert/strict";
import { PolicyEngine, createGatedOnAsk, type PolicyContext } from "../src/policy-engine.js";
import type { ActionRequest } from "../src/contracts.js";

const baseCtx: PolicyContext = { budgetRemainingUsd: 100, circuitBreakerState: "GREEN", aiExecutionEnabled: true };
const baseReq: ActionRequest = {
  requestId: "r1",
  projectId: "start-it",
  agentId: "a1",
  role: "foot_soldier",
  action: "write:file",
  target: "start-it/README.md",
  environment: "LOCAL",
  sensitivity: "LOW",
  destructiveRisk: false,
  approvalRequired: false,
};

test("default rule allows a benign in-project action", () => {
  const decision = new PolicyEngine().evaluate(baseReq, baseCtx);
  assert.equal(decision.decision, "ALLOW");
  assert.equal(decision.policyId, "default-999-allow");
});

test("kill switch denies everything regardless of other rules", () => {
  const decision = new PolicyEngine().evaluate(baseReq, { ...baseCtx, aiExecutionEnabled: false });
  assert.equal(decision.decision, "DENY");
  assert.equal(decision.policyId, "human-001-kill-switch");
});

test("production action from a non-human role requires a human", () => {
  const decision = new PolicyEngine().evaluate({ ...baseReq, environment: "PRODUCTION", role: "chief_of_staff" }, baseCtx);
  assert.equal(decision.decision, "REQUIRES_HUMAN");
});

test("critical destructive action escalates to security", () => {
  const decision = new PolicyEngine().evaluate({ ...baseReq, destructiveRisk: true, sensitivity: "CRITICAL" }, baseCtx);
  assert.equal(decision.decision, "ESCALATE");
});

test("halted circuit breaker denies before lower-precedence rules are reached", () => {
  const decision = new PolicyEngine().evaluate(baseReq, { ...baseCtx, circuitBreakerState: "HALTED" });
  assert.equal(decision.decision, "DENY");
  assert.equal(decision.policyId, "budget-001-circuit-breaker");
});

test("estimated cost above remaining budget is denied", () => {
  const decision = new PolicyEngine().evaluate({ ...baseReq, estimatedCostUsd: 200 }, baseCtx);
  assert.equal(decision.decision, "DENY");
  assert.equal(decision.policyId, "budget-002-insufficient-estimate");
});

test("cross-project write is denied by project isolation rule", () => {
  const decision = new PolicyEngine().evaluate({ ...baseReq, target: "other-project/secret.env" }, baseCtx);
  assert.equal(decision.decision, "DENY");
  assert.equal(decision.policyId, "project-001-cross-project-write");
});

test("approval-required action requires a human even if otherwise benign", () => {
  const decision = new PolicyEngine().evaluate({ ...baseReq, approvalRequired: true }, baseCtx);
  assert.equal(decision.decision, "REQUIRES_HUMAN");
});

test("precedence: kill switch beats an otherwise budget-exceeding request too", () => {
  const decision = new PolicyEngine().evaluate({ ...baseReq, estimatedCostUsd: 200 }, { ...baseCtx, aiExecutionEnabled: false });
  assert.equal(decision.policyId, "human-001-kill-switch");
});

test("createGatedOnAsk auto-answers ALLOW without invoking rawOnAsk", () => {
  const answered: { value: { id: string; behavior: string; message?: string } | null } = { value: null };
  let rawCalled = false;
  const broker = { answer: (id: string, behavior: "allow" | "deny" | "answer", message?: string) => { answered.value = { id, behavior, message }; } };
  const gated = createGatedOnAsk({
    engine: new PolicyEngine(),
    buildContext: () => baseCtx,
    toActionRequest: (ask: { id: string; tool: string }) => ({ ...baseReq, requestId: ask.id, action: ask.tool, bloksTool: ask.tool }),
    getBroker: () => broker,
    rawOnAsk: () => { rawCalled = true; },
  });
  gated({ id: "ask-1", tool: "write:file" });
  assert.ok(answered.value, "broker should have answered");
  assert.equal(answered.value.behavior, "allow");
  assert.equal(rawCalled, false);
});

test("createGatedOnAsk falls through to rawOnAsk for ESCALATE/REQUIRES_HUMAN", () => {
  let rawCalled = false;
  const broker = { answer: () => { throw new Error("should not auto-answer"); } };
  const gated = createGatedOnAsk({
    engine: new PolicyEngine(),
    buildContext: () => baseCtx,
    toActionRequest: (ask: { id: string; tool: string }) => ({ ...baseReq, requestId: ask.id, approvalRequired: true }),
    getBroker: () => broker,
    rawOnAsk: () => { rawCalled = true; },
  });
  gated({ id: "ask-2", tool: "run:shell" });
  assert.equal(rawCalled, true);
});

test("createGatedOnAsk auto-denies DENY without invoking rawOnAsk", () => {
  const answered: { value: { behavior: string; message?: string } | null } = { value: null };
  let rawCalled = false;
  const broker = { answer: (_id: string, behavior: "allow" | "deny" | "answer", message?: string) => { answered.value = { behavior, message }; } };
  const gated = createGatedOnAsk({
    engine: new PolicyEngine(),
    buildContext: () => ({ ...baseCtx, aiExecutionEnabled: false }),
    toActionRequest: (ask: { id: string; tool: string }) => ({ ...baseReq, requestId: ask.id, action: ask.tool }),
    getBroker: () => broker,
    rawOnAsk: () => { rawCalled = true; },
  });
  gated({ id: "ask-3", tool: "write:file" });
  assert.ok(answered.value, "broker should have answered");
  assert.equal(answered.value.behavior, "deny");
  assert.equal(rawCalled, false);
});
