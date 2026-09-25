import { test } from "node:test";
import assert from "node:assert/strict";
import { CostController } from "../src/cost-controller.js";
import { PolicyEngine } from "../src/policy-engine.js";
import { ToolGateway } from "../src/tool-gateway.js";
import { AgentExecutionGateway } from "../src/execution-gateway.js";
import { createProviderExecutionGateway } from "../src/provider-execution-gateway.js";
import { createBlocksCostGate } from "../src/blocks-cost-gate.js";
import type { ProviderAdapter } from "../src/contracts.js";
import type { ProviderExecutionGateway } from "../src/provider-execution-gateway.js";
import type { ActionRequest, TurnStartResult } from "../src/contracts.js";

function action(overrides: Partial<ActionRequest> = {}): ActionRequest {
  return {
    requestId: "req-1",
    projectId: "p1",
    taskId: "t1",
    agentId: "agent-1",
    role: "foot_soldier",
    action: "run:provider",
    target: "p1/service",
    environment: "LOCAL",
    sensitivity: "LOW",
    destructiveRisk: false,
    approvalRequired: false,
    ...overrides,
  };
}

function estimate() {
  return {
    model: "mock-sonnet" as const,
    estimatedUncachedInputTokens: 1_000,
    estimatedCachedInputTokens: 0,
    estimatedOutputTokens: 500,
  };
}

function turn() {
  return {
    threadId: "thread-1",
    text: "hello",
    model: "mock-sonnet",
  };
}

function fakeProviderGateway(calls: Array<unknown>, result: TurnStartResult = { turnId: "turn-1" }): ProviderExecutionGateway {
  return {
    async sendTurn(input) {
      calls.push(input);
      return result;
    },
  };
}

function makeExecution(
  costController = new CostController(),
  calls: Array<unknown> = [],
) {
  const toolGateway = new ToolGateway(new PolicyEngine(), costController);
  const providerGateway = fakeProviderGateway(calls);
  return {
    execution: new AgentExecutionGateway(toolGateway, providerGateway),
    costController,
    calls,
  };
}

test("ALLOW composes policy + reservation + provider execution", async () => {
  const { execution, costController, calls } = makeExecution();

  const result = await execution.execute({
    action: action(),
    costEstimate: estimate(),
    turn: turn(),
  });

  assert.equal(result.gateway.policy.decision, "ALLOW");
  assert.ok(result.gateway.reservationId);
  assert.equal(result.turn?.turnId, "turn-1");
  assert.equal(calls.length, 1);
  assert.equal((calls[0] as { costReservationId: string }).costReservationId, result.gateway.reservationId);
  assert.equal(costController.getLedger().length, 0);
});

test("DENY never reaches the provider and does not leave a reservation", async () => {
  const { execution, costController, calls } = makeExecution();

  const result = await execution.execute({
    action: action({
      action: "write:file",
      target: "other-project/file.txt",
    }),
    costEstimate: estimate(),
    turn: turn(),
  });

  assert.equal(result.gateway.policy.decision, "DENY");
  assert.equal(result.turn, undefined);
  assert.equal(calls.length, 0);
  assert.equal(costController.getLedger().length, 0);
  assert.equal(costController.remainingUsd("p1", "t1"), 20);
});

test("REQUIRES_HUMAN never reaches the provider", async () => {
  const { execution, costController, calls } = makeExecution();

  const result = await execution.execute({
    action: action({
      approvalRequired: true,
    }),
    costEstimate: estimate(),
    turn: turn(),
  });

  assert.equal(result.gateway.policy.decision, "REQUIRES_HUMAN");
  assert.equal(result.turn, undefined);
  assert.equal(calls.length, 0);
  assert.equal(costController.getLedger().length, 0);
  assert.equal(costController.remainingUsd("p1", "t1"), 20);
});

test("ESCALATE never reaches the provider", async () => {
  const { execution, costController, calls } = makeExecution();

  const result = await execution.execute({
    action: action({
      destructiveRisk: true,
      sensitivity: "CRITICAL",
    }),
    costEstimate: estimate(),
    turn: turn(),
  });

  assert.equal(result.gateway.policy.decision, "ESCALATE");
  assert.equal(result.turn, undefined);
  assert.equal(calls.length, 0);
  assert.equal(costController.getLedger().length, 0);
  assert.equal(costController.remainingUsd("p1", "t1"), 20);
});

test("kill switch denies before provider execution", async () => {
  const costController = new CostController();
  costController.aiExecutionEnabled = false;
  const { execution, calls } = makeExecution(costController);

  const result = await execution.execute({
    action: action(),
    costEstimate: estimate(),
    turn: turn(),
  });

  assert.equal(result.gateway.policy.decision, "DENY");
  assert.equal(result.turn, undefined);
  assert.equal(calls.length, 0);
  assert.equal(costController.getLedger().length, 0);
});

test("budget denial prevents provider execution", async () => {
  const costController = new CostController({
    globalMonthlyCeilingUsd: 0.001,
    projectBudgetUsd: {},
    dayBudgetUsd: 0.001,
    taskBudgetUsd: 0.001,
    invocationBudgetUsd: 0.001,
    retryOrChildWorkerBudgetUsd: 0.001,
  });
  const { execution, calls } = makeExecution(costController);

  const result = await execution.execute({
    action: action(),
    costEstimate: {
      ...estimate(),
      estimatedOutputTokens: 100_000,
    },
    turn: turn(),
  });

  assert.equal(result.gateway.policy.decision, "DENY");
  assert.match(result.gateway.policy.reason, /Cost Controller denied the reservation/);
  assert.equal(result.turn, undefined);
  assert.equal(calls.length, 0);
  assert.equal(costController.getLedger().length, 0);
});

test("provider start failure releases the reservation at the Blocks execution boundary", async () => {
  const costController = new CostController();
  const toolGateway = new ToolGateway(new PolicyEngine(), costController);
  const provider: ProviderAdapter = {
    provider: "mock-paid-provider",
    capabilities: { sessionModelSwitch: "unsupported" },
    async sendTurn() {
      throw new Error("provider start failed");
    },
    async interruptTurn() {},
    async respondToRequest() {},
    hasSession() {
      return false;
    },
    async stopAll() {},
    onEvent() {
      return () => {};
    },
  };
  const providerGateway = createProviderExecutionGateway(
    provider,
    createBlocksCostGate(costController),
  );
  const execution = new AgentExecutionGateway(toolGateway, providerGateway);

  await assert.rejects(
    () =>
      execution.execute({
        action: action(),
        costEstimate: estimate(),
        turn: turn(),
      }),
    /provider start failed/,
  );

  assert.equal(costController.getLedger().length, 0);
  assert.equal(costController.remainingUsd("p1", "t1"), 20);
});
