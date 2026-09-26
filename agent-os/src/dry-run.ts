// Agent OS — Dry-run harness (Phase 1, zero-cost infrastructure)
//
// Wires TaskEnvelope -> ToolGateway (Policy + Cost) -> MockProvider ->
// Trace, entirely offline. This is the "simulated provider mode" that
// AGENT_OS_COST_AND_BUDGET.md §12 and AGENT_OS_DRY_RUN_SPEC.md require
// before real provider credentials are enabled. It makes zero network
// calls and holds no credentials.

import type { TaskEnvelope, ActionRequest, TraceEntry, AgentOSProject } from "./contracts.js";
import { newId } from "./contracts.js";
import { PolicyEngine } from "./policy-engine.js";
import { CostController } from "./cost-controller.js";
import { ToolGateway } from "./tool-gateway.js";
import { createMockProviderDriver, type MockTurnScript } from "./mock-provider.js";

export interface DryRunReport {
  taskId: string;
  trace: TraceEntry[];
  finalPolicyDecision: string;
  turnCompleted: boolean;
}

export async function runDryRun(opts: {
  project: AgentOSProject;
  task: TaskEnvelope;
  action: Omit<ActionRequest, "requestId" | "projectId" | "taskId">;
  turnScript: MockTurnScript;
  policyEngine?: PolicyEngine;
  costController?: CostController;
}): Promise<DryRunReport> {
  const trace: TraceEntry[] = [];
  const note = (kind: TraceEntry["kind"], payload: unknown) =>
    trace.push({
      traceId: newId(),
      taskId: opts.task.taskId,
      projectId: opts.project.projectId,
      timestamp: new Date().toISOString(),
      kind,
      payload,
      evidence: "OBSERVED",
    });

  const policyEngine = opts.policyEngine ?? new PolicyEngine();
  const costController = opts.costController ?? new CostController();
  const gateway = new ToolGateway(policyEngine, costController);

  const actionRequest: ActionRequest = {
    ...opts.action,
    requestId: newId(),
    projectId: opts.project.projectId,
    taskId: opts.task.taskId,
  };

  const { policy, reservationId } = gateway.authorize(actionRequest, {
    model: "mock-sonnet",
    estimatedUncachedInputTokens: opts.turnScript.inputTokens,
    estimatedCachedInputTokens: 0,
    estimatedOutputTokens: opts.turnScript.outputTokens,
  });
  note("policy_decision", policy);

  if (policy.decision !== "ALLOW") {
    return { taskId: opts.task.taskId, trace, finalPolicyDecision: policy.decision, turnCompleted: false };
  }

  const driver = createMockProviderDriver();
  const instance = await driver.create({
    instanceId: "dry-run",
    displayName: "Dry Run",
    environment: {},
    enabled: true,
    config: { scripts: { [opts.task.taskId]: [opts.turnScript] } },
  });

  let turnCompleted = false;
  const unsubscribe = instance.adapter.onEvent((event) => {
    note("provider_event", event);
    if (event.type === "turn.completed") turnCompleted = event.ok;
    if (event.type === "request.opened") {
      // Dry run auto-allows scripted requests once the gateway itself has
      // already ALLOWed the outer action — no second human loop in
      // simulation. A real integration keeps the human loop (ask-broker).
      void instance.adapter.respondToRequest(opts.task.taskId, event.requestId!, { behavior: "allow" });
    }
  });

  await instance.adapter.sendTurn({ threadId: opts.task.taskId, text: opts.task.description });
  await new Promise((resolve) => setTimeout(resolve, 0)); // flush the scripted turn's microtasks

  if (reservationId) {
    const cost = costController.commit(reservationId, {
      provider: "mock",
      model: "mock-sonnet",
      actualCostUsd: 0.0001,
      result: turnCompleted ? "ok" : "error",
    });
    note("cost_event", cost);
  }

  unsubscribe();
  await instance.dispose();

  return { taskId: opts.task.taskId, trace, finalPolicyDecision: policy.decision, turnCompleted };
}
