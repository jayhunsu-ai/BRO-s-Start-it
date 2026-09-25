// Agent OS — Tool Gateway boundary (Phase 1, zero-cost infrastructure)
//
// The invariant this exists to serve: every consequential action passes
// through Policy + Cost before it happens. Phase 0.5 confirmed there is
// exactly ONE place in Blocks today where an equivalent decision could be
// inserted without modifying Blocks itself: the `onAsk` callback a driver
// hands to `createAskBroker` (see server/harness/ask-broker.ts, invoked
// from server/drivers/claude.ts). `createGatedOnAsk` in policy-engine.ts
// IS that insertion point. This file is the higher-level object a caller
// actually constructs: it owns a PolicyEngine + a CostController together
// so both are consulted with one call, and it never imports Blocks code.
//
// Known gap (manifest §8.2): when Claude Code's own --permission-mode is
// `bypassPermissions`, no ask ever reaches this gateway at all. This
// module cannot close that gap — only changing what permission mode a
// driver requests can.

import type { ActionRequest, PolicyDecision } from "./contracts.js";
import { PolicyEngine, type PolicyContext } from "./policy-engine.js";
import { CostController, type SimulatedModel } from "./cost-controller.js";

export interface GatewayResult {
  policy: PolicyDecision;
  reservationId?: string;
}

export interface CostEstimateInput {
  model: SimulatedModel;
  estimatedUncachedInputTokens: number;
  estimatedCachedInputTokens: number;
  estimatedOutputTokens: number;
}

export class ToolGateway {
  constructor(
    private readonly policyEngine: PolicyEngine,
    private readonly costController: CostController,
  ) {}

  /** The single choke point: validate + decide + (maybe) reserve, in one
   * call, so nothing downstream can act on a partial decision. Pass
   * `costEstimate` whenever this action will trigger a provider turn —
   * that is what actually reserves budget; `req.estimatedCostUsd` only
   * feeds the policy engine's own upfront-estimate rule and never gates
   * anything by itself. */
  authorize(req: ActionRequest, costEstimate?: CostEstimateInput): GatewayResult {
    validateActionRequest(req);

    let reservationId: string | undefined;
    if (costEstimate) {
      const reservation = this.costController.reserve({
        projectId: req.projectId,
        taskId: req.taskId,
        ...costEstimate,
      });
      reservationId = reservation?.reservationId;
    }

    const ctx: PolicyContext = {
      budgetRemainingUsd: this.costController.remainingUsd(req.projectId, req.taskId),
      circuitBreakerState: this.costController.breaker.current,
      aiExecutionEnabled: this.costController.aiExecutionEnabled,
    };
    const policy = this.policyEngine.evaluate(req, ctx);

    if (policy.decision !== "ALLOW" && reservationId) {
      this.costController.release(reservationId); // don't hold budget for a denied/escalated action
      reservationId = undefined;
    }

    // A cost estimate was supplied (a provider turn was about to happen)
    // but the reservation itself was denied (budget/circuit-breaker/kill
    // switch), while the policy engine — which knows nothing about token
    // counts — would otherwise have said ALLOW. Keep the two systems from
    // silently disagreeing: Cost's refusal wins.
    if (costEstimate && !reservationId && policy.decision === "ALLOW") {
      return {
        policy: {
          policyId: "budget-003-reservation-denied",
          decision: "DENY",
          reason: "Cost Controller denied the reservation for this action's estimated provider spend.",
          evidence: "OBSERVED",
          budgetImpactUsd: 0,
          requiredNextAction: "Reduce scope or wait for a human budget decision.",
        },
      };
    }

    return { policy, reservationId };
  }
}

/** AGENT_OS_BRAIN_AND_POLICY.md §8: "Tool arguments are schema-validated
 * before execution." Minimal structural check — no external validation
 * library, so this stays a dependency-free, zero-cost boundary. */
export function validateActionRequest(req: ActionRequest): void {
  const required: Array<keyof ActionRequest> = [
    "requestId",
    "projectId",
    "agentId",
    "role",
    "action",
    "target",
    "environment",
    "sensitivity",
  ];
  for (const key of required) {
    const value = req[key];
    if (value === undefined || value === null || value === "") {
      throw new TypeError(`ActionRequest missing required field "${String(key)}".`);
    }
  }
  if (typeof req.destructiveRisk !== "boolean") {
    throw new TypeError("ActionRequest.destructiveRisk must be a boolean.");
  }
  if (typeof req.approvalRequired !== "boolean") {
    throw new TypeError("ActionRequest.approvalRequired must be a boolean.");
  }
}
