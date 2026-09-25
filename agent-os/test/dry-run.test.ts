import { test } from "node:test";
import assert from "node:assert/strict";
import { runDryRun } from "../src/dry-run.js";
import type { AgentOSProject, TaskEnvelope } from "../src/contracts.js";

const project: AgentOSProject = { projectId: "start-it", displayName: "Start-It", environment: "STAGING" };
const task: TaskEnvelope = {
  taskId: "task-1",
  projectId: "start-it",
  title: "Add a footer",
  description: "Add a footer component",
  role: "foot_soldier",
  environment: "STAGING",
  sensitivity: "LOW",
  inScope: ["footer"],
  outOfScope: ["auth"],
  acceptanceCriteria: ["footer renders"],
  createdAt: new Date().toISOString(),
};

test("an allowed, low-risk task completes end to end with zero real spend", async () => {
  const report = await runDryRun({
    project,
    task,
    action: {
      agentId: "a1",
      role: "foot_soldier",
      action: "write:file",
      target: "start-it/footer.tsx",
      environment: "STAGING",
      sensitivity: "LOW",
      destructiveRisk: false,
      approvalRequired: false,
    },
    turnScript: { assistantText: "Added the footer.", ok: true, inputTokens: 200, outputTokens: 80 },
  });
  assert.equal(report.finalPolicyDecision, "ALLOW");
  assert.equal(report.turnCompleted, true);
  assert.ok(report.trace.some((t) => t.kind === "cost_event"));
  assert.ok(report.trace.some((t) => t.kind === "provider_event"));
});

test("a task requiring human approval never spawns a provider turn", async () => {
  const report = await runDryRun({
    project,
    task,
    action: {
      agentId: "a1",
      role: "foot_soldier",
      action: "write:file",
      target: "start-it/footer.tsx",
      environment: "STAGING",
      sensitivity: "LOW",
      destructiveRisk: false,
      approvalRequired: true,
    },
    turnScript: { assistantText: "n/a", ok: true, inputTokens: 0, outputTokens: 0 },
  });
  assert.equal(report.finalPolicyDecision, "REQUIRES_HUMAN");
  assert.equal(report.turnCompleted, false);
  assert.ok(!report.trace.some((t) => t.kind === "provider_event"));
});

test("a PRODUCTION action from a non-human role is routed to a human, not executed", async () => {
  const report = await runDryRun({
    project: { ...project, environment: "PRODUCTION" },
    task: { ...task, environment: "PRODUCTION" },
    action: {
      agentId: "a1",
      role: "chief_of_staff",
      action: "deploy:prod",
      target: "start-it/prod",
      environment: "PRODUCTION",
      sensitivity: "MEDIUM",
      destructiveRisk: false,
      approvalRequired: false,
    },
    turnScript: { assistantText: "n/a", ok: true, inputTokens: 0, outputTokens: 0 },
  });
  assert.equal(report.finalPolicyDecision, "REQUIRES_HUMAN");
  assert.equal(report.turnCompleted, false);
});

test("an over-budget task is denied and never reaches the provider", async () => {
  const report = await runDryRun({
    project,
    task,
    action: {
      agentId: "a1",
      role: "foot_soldier",
      action: "write:file",
      target: "start-it/footer.tsx",
      environment: "STAGING",
      sensitivity: "LOW",
      destructiveRisk: false,
      approvalRequired: false,
    },
    turnScript: { assistantText: "n/a", ok: true, inputTokens: 50_000_000, outputTokens: 5_000_000 },
  });
  assert.equal(report.finalPolicyDecision, "DENY");
  assert.equal(report.turnCompleted, false);
});
