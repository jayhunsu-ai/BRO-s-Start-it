// Agent OS — Policy Engine (Phase 1, zero-cost infrastructure)
//
// Implements the precedence hierarchy and verdict contract from
// AGENT_OS_BRAIN_AND_POLICY.md §3 and §12. Pure function over an
// ActionRequest and a project's rule set — no I/O, no provider calls.
//
// This is a NEW authority. It does not replace, call, or read Blocks'
// server/policy.ts (five-field tool/command/path/url/agent rules) — see
// AGENT_OS_BLOCKS_IMPLEMENTATION_MANIFEST.md §4.2 for why the two cannot
// be silently reconciled. `createGatedOnAsk` below is the documented,
// minimal-diff way to attach THIS engine to the one seam Phase 0.5
// confirmed actually exists (ask-broker.ts's `onAsk`, called from
// server/drivers/claude.ts) — it does not modify Blocks.

import type { ActionRequest, PolicyDecision, PolicyVerdict, AgentRole } from "./contracts.js";

const PRECEDENCE = [
  "human_authority",
  "security_safety",
  "hard_budget",
  "project_isolation_credential",
  "tool_permissions",
  "task_scope",
  "architecture",
  "model_routing",
  "performance_cost",
  "agent_preference",
] as const;

export type PolicyLevel = (typeof PRECEDENCE)[number];

export interface PolicyRule {
  policyId: string;
  level: PolicyLevel;
  /** Return a verdict to fire this rule, or `undefined` to abstain and
   * let a lower-precedence rule decide. */
  evaluate(req: ActionRequest, ctx: PolicyContext): PolicyOutcome | undefined;
}

export interface PolicyOutcome {
  decision: PolicyVerdict;
  reason: string;
  evidence: PolicyDecision["evidence"];
  budgetImpactUsd?: number;
  requiredNextAction: string;
}

export interface PolicyContext {
  /** From the Cost Controller — see cost-controller.ts. Kept separate
   * from PolicyEngine so budget state has exactly one owner. */
  budgetRemainingUsd: number;
  circuitBreakerState: "GREEN" | "WARNING" | "HALTED";
  aiExecutionEnabled: boolean;
}

const ROLE_MAY_APPROVE_PRODUCTION: AgentRole[] = ["human"];

/** Default rule set, one per precedence level, matching
 * AGENT_OS_BRAIN_AND_POLICY.md §4 (authority rules) and §9 (stop
 * conditions). A project may add rules but may not remove or reorder
 * these — `PolicyEngine.evaluate` always walks PRECEDENCE in order. */
export function defaultRules(): PolicyRule[] {
  return [
    {
      policyId: "human-001-kill-switch",
      level: "human_authority",
      evaluate: (_req, ctx) =>
        ctx.aiExecutionEnabled
          ? undefined
          : {
              decision: "DENY",
              reason: "AI_EXECUTION_ENABLED=false — emergency shutdown is active.",
              evidence: "OBSERVED",
              requiredNextAction: "A human must re-enable execution before any action proceeds.",
            },
    },
    {
      policyId: "human-002-production-requires-human",
      level: "human_authority",
      evaluate: (req) =>
        req.environment === "PRODUCTION" && !ROLE_MAY_APPROVE_PRODUCTION.includes(req.role)
          ? {
              decision: "REQUIRES_HUMAN",
              reason: `Role "${req.role}" cannot authorize a PRODUCTION action unilaterally.`,
              evidence: "OBSERVED",
              requiredNextAction: "Route to a human for explicit production approval.",
            }
          : undefined,
    },
    {
      policyId: "security-001-destructive-critical",
      level: "security_safety",
      evaluate: (req) =>
        req.destructiveRisk && req.sensitivity === "CRITICAL"
          ? {
              decision: "ESCALATE",
              reason: "Destructive action at CRITICAL sensitivity requires Security Authority review.",
              evidence: "OBSERVED",
              requiredNextAction: "Route to security_authority before proceeding.",
            }
          : undefined,
    },
    {
      policyId: "budget-001-circuit-breaker",
      level: "hard_budget",
      evaluate: (_req, ctx) =>
        ctx.circuitBreakerState === "HALTED"
          ? {
              decision: "DENY",
              reason: "Circuit breaker is HALTED — no new spend-bearing action may proceed.",
              evidence: "OBSERVED",
              requiredNextAction: "A human must resume the circuit breaker (see cost-controller.ts).",
            }
          : undefined,
    },
    {
      policyId: "budget-002-insufficient-estimate",
      level: "hard_budget",
      evaluate: (req, ctx) =>
        req.estimatedCostUsd !== undefined && req.estimatedCostUsd > ctx.budgetRemainingUsd
          ? {
              decision: "DENY",
              reason: `Estimated cost $${req.estimatedCostUsd.toFixed(4)} exceeds remaining budget $${ctx.budgetRemainingUsd.toFixed(4)}.`,
              evidence: "OBSERVED",
              budgetImpactUsd: req.estimatedCostUsd,
              requiredNextAction: "Reduce scope, wait for budget reset, or request a human budget increase.",
            }
          : undefined,
    },
    {
      policyId: "project-001-cross-project-write",
      level: "project_isolation_credential",
      evaluate: (req) =>
        req.action.startsWith("write:") && !req.target.startsWith(`${req.projectId}/`)
          ? {
              decision: "DENY",
              reason: `Write action "${req.action}" targets "${req.target}", outside project "${req.projectId}".`,
              evidence: "OBSERVED",
              requiredNextAction: "Confirm the correct project scope before retrying.",
            }
          : undefined,
    },
    {
      policyId: "tool-001-approval-required",
      level: "tool_permissions",
      evaluate: (req) =>
        req.approvalRequired
          ? {
              decision: "REQUIRES_HUMAN",
              reason: `Action "${req.action}" on "${req.target}" is flagged approval-required.`,
              evidence: "OBSERVED",
              requiredNextAction: "Surface to a human for approval (Blocks ask-broker card, if this came from a tool call).",
            }
          : undefined,
    },
    {
      policyId: "default-999-allow",
      level: "agent_preference",
      evaluate: () => ({
        decision: "ALLOW",
        reason: "No higher-precedence rule fired.",
        evidence: "INFERRED",
        requiredNextAction: "Proceed.",
      }),
    },
  ];
}

export class PolicyEngine {
  constructor(private readonly rules: PolicyRule[] = defaultRules()) {}

  evaluate(req: ActionRequest, ctx: PolicyContext): PolicyDecision {
    for (const level of PRECEDENCE) {
      for (const rule of this.rules.filter((r) => r.level === level)) {
        const outcome = rule.evaluate(req, ctx);
        if (outcome) {
          return {
            policyId: rule.policyId,
            decision: outcome.decision,
            reason: outcome.reason,
            evidence: outcome.evidence,
            budgetImpactUsd: outcome.budgetImpactUsd ?? 0,
            requiredNextAction: outcome.requiredNextAction,
          };
        }
      }
    }
    // Unreachable while `default-999-allow` exists, but fail closed.
    return {
      policyId: "fallback-000-fail-closed",
      decision: "DENY",
      reason: "No rule produced a verdict — failing closed.",
      evidence: "UNKNOWN",
      budgetImpactUsd: 0,
      requiredNextAction: "This is a policy-engine bug: every evaluate() must terminate via default-999-allow.",
    };
  }
}

/**
 * The confirmed integration point (see manifest §8.2, option b).
 *
 * A Blocks ask-broker exposes `answer(id, behavior, message)` and its
 * `onAsk(ask)` callback fires with the entry already registered, so
 * calling `answer()` synchronously inside a wrapped `onAsk` resolves the
 * ask before any UI card is shown. This function returns such a wrapper:
 * ALLOW/DENY auto-resolve; ESCALATE/REQUIRES_HUMAN fall through to the
 * original onAsk (i.e. the human card still shows, unchanged).
 *
 * Nothing here imports or executes Blocks code — `getBroker` and
 * `rawOnAsk` are supplied by whoever wires this into a driver.
 */
export function createGatedOnAsk<Ask extends { id: string; tool: string; input?: unknown }>(opts: {
  engine: PolicyEngine;
  buildContext: () => PolicyContext;
  toActionRequest: (ask: Ask) => ActionRequest;
  getBroker: () => { answer(id: string, behavior: "allow" | "deny" | "answer", message?: string): void };
  rawOnAsk: (ask: Ask) => void;
  onDecision?: (ask: Ask, decision: PolicyDecision) => void;
}) {
  return (ask: Ask) => {
    const decision = opts.engine.evaluate(opts.toActionRequest(ask), opts.buildContext());
    opts.onDecision?.(ask, decision);
    if (decision.decision === "ALLOW") {
      opts.getBroker().answer(ask.id, "allow");
      return;
    }
    if (decision.decision === "DENY") {
      opts.getBroker().answer(ask.id, "deny", decision.reason);
      return;
    }
    // ESCALATE / REQUIRES_HUMAN: unchanged Blocks behavior — show the card.
    opts.rawOnAsk(ask);
  };
}
