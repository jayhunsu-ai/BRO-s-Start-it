// Agent OS — full provider execution orchestration
//
// This is the narrow composition point:
// ToolGateway (policy + reservation)
//   -> ProviderExecutionGateway (pre-call authorization)
//   -> BlocksAdapter (actual runtime delegation)
//
// The provider is never reached unless policy ALLOW and a live reservation
// both exist. Agent OS remains authoritative; Blocks remains the execution
// substrate.

import type { ActionRequest, SendTurnInput, TurnStartResult } from "./contracts.js";
import { ToolGateway, type CostEstimateInput, type GatewayResult } from "./tool-gateway.js";
import type { ProviderExecutionGateway } from "./provider-execution-gateway.js";

export interface ExecutionRequest {
  action: ActionRequest;
  costEstimate: CostEstimateInput;
  turn: SendTurnInput;
}

export interface ExecutionResult {
  gateway: GatewayResult;
  turn?: TurnStartResult;
}

export class AgentExecutionGateway {
  constructor(
    private readonly toolGateway: ToolGateway,
    private readonly providerGateway: ProviderExecutionGateway,
  ) {}

  async execute(input: ExecutionRequest): Promise<ExecutionResult> {
    // A provider turn is always spend-bearing in this execution path, so the
    // caller must provide a token-based reservation estimate.
    const gateway = this.toolGateway.authorize(input.action, input.costEstimate);

    if (gateway.policy.decision !== "ALLOW") {
      return { gateway };
    }

    // ToolGateway's invariant guarantees that an ALLOW spend-bearing action
    // has a reservation. Keep the check explicit so a future refactor cannot
    // accidentally bypass the financial airlock.
    if (!gateway.reservationId) {
      throw new Error("Agent OS execution invariant violated: ALLOW provider action has no cost reservation.");
    }

    const turn = await this.providerGateway.sendTurn({
      ...input.turn,
      costReservationId: gateway.reservationId,
      projectId: input.action.projectId,
      taskId: input.action.taskId,
    });

    return { gateway, turn };
  }
}
