// Agent OS runtime facade for the Blocks host.
//
// Blocks remains the runtime/provider owner. This module supplies the
// authoritative Agent OS financial airlock around a Blocks ProviderAdapter.
import type { ProviderAdapter, SendTurnInput, TurnStartResult } from "./contracts.js";
import { CostController } from "./cost-controller.js";
import { createBlocksCostGate, type BlocksCostGate } from "./blocks-cost-gate.js";
import { createProviderExecutionGateway } from "./provider-execution-gateway.js";

export interface AgentOSRuntimeOptions {
  monthlyCeilingUsd?: number;
  dayBudgetUsd?: number;
  taskBudgetUsd?: number;
  invocationBudgetUsd?: number;
  retryOrChildWorkerBudgetUsd?: number;
}

export interface GuardedProviderAdapter extends ProviderAdapter {
  readonly agentOS: {
    reserveAndSend(input: SendTurnInput & { projectId: string; taskId?: string }): Promise<TurnStartResult>;
    controller: CostController;
  };
}

export function createAgentOSRuntime(options: AgentOSRuntimeOptions = {}) {
  const controller = new CostController({
    globalMonthlyCeilingUsd: options.monthlyCeilingUsd ?? 500,
    projectBudgetUsd: {},
    dayBudgetUsd: options.dayBudgetUsd ?? 50,
    taskBudgetUsd: options.taskBudgetUsd ?? 20,
    invocationBudgetUsd: options.invocationBudgetUsd ?? 5,
    retryOrChildWorkerBudgetUsd: options.retryOrChildWorkerBudgetUsd ?? 2,
  });
  const costGate: BlocksCostGate = createBlocksCostGate(controller);

  function guard(adapter: ProviderAdapter): GuardedProviderAdapter {
    const gateway = createProviderExecutionGateway(adapter, costGate);
    return Object.assign(adapter, {
      agentOS: {
        controller,
        async reserveAndSend(input: SendTurnInput & { projectId: string; taskId?: string }) {
          const model = input.model ?? "unknown";
          const reservation = controller.reserveInvocation({
            projectId: input.projectId,
            taskId: input.taskId,
            provider: adapter.provider,
            model,
            maxCostUsd: controllerRemainingInvocationCap(controller),
          });
          if (!reservation) {
            throw new Error(`Agent OS denied provider execution: no budget available for ${adapter.provider}/${model}.`);
          }
          try {
            return await gateway.sendTurn({
              ...input,
              costReservationId: reservation.reservationId,
              projectId: input.projectId,
              taskId: input.taskId,
            });
          } catch (error) {
            controller.release(reservation.reservationId);
            throw error;
          }
        },
      },
    });
  }

  return { controller, costGate, guard };
}

function controllerRemainingInvocationCap(controller: CostController): number {
  // The controller itself enforces the configured invocation ceiling and all
  // higher-level ceilings. Keep this value explicit so a future runtime can
  // expose a configurable per-model cap without changing the gateway.
  return Math.max(0, Math.min(5, controller.remainingUsd("__runtime__")));
}
