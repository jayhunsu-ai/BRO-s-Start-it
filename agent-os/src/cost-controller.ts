// Agent OS — Cost Controller (Phase 1, zero-cost infrastructure, simulated)
//
// Implements AGENT_OS_COST_AND_BUDGET.md: the budget hierarchy (§2), the
// $500/$50 defaults (§3), reservation (§4), circuit breakers (§7), and
// the dry-run requirement (§12: "zero paid API calls"). All pricing here
// is SIMULATED — see SIMULATED_PRICING below — and nothing in this file
// makes a network call.
//
// This has no counterpart in Blocks. server/usage.ts is explicitly
// non-authoritative (see manifest §2) and server/ledger.ts carries no
// cost fields — this is genuinely net-new, not a wrapper.

import type { CostEvent, CostReservation, CircuitBreakerState } from "./contracts.js";

/** SIMULATED — not live provider pricing. Update only from verified
 * current documentation before any real spend is gated on these numbers
 * (see AGENT_OS_x_BLOCKS_IMPLEMENTATION_MANIFEST.md §4.7 / §7). */
export const SIMULATED_PRICING = {
  version: "simulated-v0",
  perMillionUsd: {
    "mock-sonnet": { input: 3, cachedInput: 0.3, output: 15 },
    "mock-opus": { input: 15, cachedInput: 1.5, output: 75 },
  },
} as const;

export type SimulatedModel = keyof typeof SIMULATED_PRICING.perMillionUsd;

export interface BudgetHierarchy {
  globalMonthlyCeilingUsd: number; // §3 default 500
  projectBudgetUsd: Record<string, number>;
  dayBudgetUsd: number; // §3 default daily hard stop 50
  taskBudgetUsd: number;
  invocationBudgetUsd: number;
  retryOrChildWorkerBudgetUsd: number;
}

export function defaultBudgetHierarchy(): BudgetHierarchy {
  return {
    globalMonthlyCeilingUsd: 500,
    projectBudgetUsd: {},
    dayBudgetUsd: 50,
    taskBudgetUsd: 20,
    invocationBudgetUsd: 5,
    retryOrChildWorkerBudgetUsd: 2,
  };
}

interface Spent {
  monthUsd: number;
  perProjectUsd: Record<string, number>;
  dayUsd: number;
  perTaskUsd: Record<string, number>;
}

export class CircuitBreaker {
  private state: CircuitBreakerState = "GREEN";
  private consecutiveAnomalies = 0;

  constructor(
    private readonly warningThreshold = 3,
    private readonly haltThreshold = 5,
  ) {}

  get current(): CircuitBreakerState {
    return this.state;
  }

  /** Call once per detected anomaly (§7: spend spike, repeated identical
   * calls, runaway retries, etc.). Caller decides what counts. */
  recordAnomaly(): CircuitBreakerState {
    this.consecutiveAnomalies += 1;
    if (this.consecutiveAnomalies >= this.haltThreshold) this.state = "HALTED";
    else if (this.consecutiveAnomalies >= this.warningThreshold) this.state = "WARNING";
    return this.state;
  }

  recordHealthy(): void {
    this.consecutiveAnomalies = 0;
    if (this.state !== "HALTED") this.state = "GREEN";
  }

  /** §7: "Only authorized control logic or human approval can resume
   * HALTED execution." — this is that one control. */
  resumeFromHalted(authorizedBy: "human" | "control-logic"): void {
    if (this.state !== "HALTED") return;
    if (authorizedBy !== "human" && authorizedBy !== "control-logic") return;
    this.state = "GREEN";
    this.consecutiveAnomalies = 0;
  }
}

export class CostController {
  private readonly spent: Spent = { monthUsd: 0, perProjectUsd: {}, dayUsd: 0, perTaskUsd: {} };
  private readonly ledger: CostEvent[] = [];
  private readonly reservations = new Map<string, CostReservation>();
  readonly breaker = new CircuitBreaker();
  /** §13: a single control that must be honored before any new provider
   * call. Simulated here as an in-memory flag; a real deployment reads
   * this from an env var / kill-switch service each call. */
  aiExecutionEnabled = true;

  constructor(private readonly budgets: BudgetHierarchy = defaultBudgetHierarchy()) {}

  remainingUsd(projectId: string, taskId?: string): number {
    const projectBudget = this.budgets.projectBudgetUsd[projectId] ?? this.budgets.globalMonthlyCeilingUsd;

    // Reservations are already committed against the financial airlock. They
    // must reduce available headroom before a second concurrent invocation can
    // reserve the same budget. Otherwise two individually-valid reservations
    // could collectively exceed the monthly/project/day/task ceilings.
    let reservedMonthUsd = 0;
    let reservedProjectUsd = 0;
    let reservedTaskUsd = 0;
    for (const reservation of this.reservations.values()) {
      reservedMonthUsd += reservation.maxCostUsd;
      if (reservation.projectId === projectId) reservedProjectUsd += reservation.maxCostUsd;
      if (taskId && reservation.taskId === taskId) reservedTaskUsd += reservation.maxCostUsd;
    }

    const levels = [
      this.budgets.globalMonthlyCeilingUsd - this.spent.monthUsd - reservedMonthUsd,
      projectBudget - (this.spent.perProjectUsd[projectId] ?? 0) - reservedProjectUsd,
      this.budgets.dayBudgetUsd - this.spent.dayUsd - reservedMonthUsd,
      taskId
        ? this.budgets.taskBudgetUsd - (this.spent.perTaskUsd[taskId] ?? 0) - reservedTaskUsd
        : Infinity,
    ];
    return Math.min(...levels); // tightest level wins — §2: "never looser"
  }

  /** AGENT_OS_COST_AND_BUDGET.md §4: estimate, reserve, execute only if
   * allowed. Returns `null` if denied — caller must not proceed. */
  reserve(input: {
    projectId: string;
    taskId?: string;
    model: SimulatedModel;
    estimatedUncachedInputTokens: number;
    estimatedCachedInputTokens: number;
    estimatedOutputTokens: number;
  }): CostReservation | null {
    if (!this.aiExecutionEnabled) return null; // §13
    if (this.breaker.current === "HALTED") return null; // §7

    const price = SIMULATED_PRICING.perMillionUsd[input.model];
    const maxCostUsd =
      (input.estimatedUncachedInputTokens / 1_000_000) * price.input +
      (input.estimatedCachedInputTokens / 1_000_000) * price.cachedInput +
      (input.estimatedOutputTokens / 1_000_000) * price.output;

    const remaining = this.remainingUsd(input.projectId, input.taskId);
    const cap = Math.min(remaining, this.budgets.invocationBudgetUsd);
    if (maxCostUsd > cap) return null; // §14 acceptance test: over-ceiling task is denied

    const reservation: CostReservation = {
      reservationId: `res-${crypto.randomUUID()}`,
      projectId: input.projectId,
      taskId: input.taskId,
      estimatedUncachedInputTokens: input.estimatedUncachedInputTokens,
      estimatedCachedInputTokens: input.estimatedCachedInputTokens,
      estimatedOutputTokens: input.estimatedOutputTokens,
      pricingVersion: SIMULATED_PRICING.version,
      maxCostUsd,
      createdAt: new Date().toISOString(),
    };
    this.reservations.set(reservation.reservationId, reservation);
    return reservation;
  }

  /** Reserve a fixed invocation cap when token estimates or provider pricing are
   * not yet available to the caller. This is a hard pre-call ceiling: the
   * provider must not start unless the full cap fits every budget level. */
  reserveInvocation(input: {
    projectId: string;
    taskId?: string;
    provider: string;
    model: string;
    maxCostUsd: number;
  }): CostReservation | null {
    if (!this.aiExecutionEnabled) return null;
    if (this.breaker.current === "HALTED") return null;
    if (!Number.isFinite(input.maxCostUsd) || input.maxCostUsd <= 0) return null;

    const remaining = this.remainingUsd(input.projectId, input.taskId);
    const cap = Math.min(remaining, this.budgets.invocationBudgetUsd);
    if (input.maxCostUsd > cap) return null;

    const reservation: CostReservation = {
      reservationId: `res-${crypto.randomUUID()}`,
      projectId: input.projectId,
      taskId: input.taskId,
      estimatedUncachedInputTokens: 0,
      estimatedCachedInputTokens: 0,
      estimatedOutputTokens: 0,
      pricingVersion: "invocation-cap-v1",
      maxCostUsd: input.maxCostUsd,
      createdAt: new Date().toISOString(),
    };
    this.reservations.set(reservation.reservationId, reservation);
    return reservation;
  }

  /** §4 step 7: reconcile a reservation against actual (simulated)
   * usage, and append to the spend ledger (§10). */
  commit(
    reservationId: string,
    actual: {
      provider: string;
      model: string;
      actualCostUsd: number;
      cacheHitTokens?: number;
      cacheReadTokens?: number;
      cacheWriteTokens?: number;
      retryCount?: number;
      result: CostEvent["result"];
      escalationReason?: string;
    },
  ): CostEvent {
    const reservation = this.reservations.get(reservationId);
    if (!reservation) {
      throw new Error(`commit() called with unknown reservationId "${reservationId}" — reserve() first.`);
    }
    this.reservations.delete(reservationId);

    this.spent.monthUsd += actual.actualCostUsd;
    this.spent.perProjectUsd[reservation.projectId] =
      (this.spent.perProjectUsd[reservation.projectId] ?? 0) + actual.actualCostUsd;
    this.spent.dayUsd += actual.actualCostUsd;
    if (reservation.taskId) {
      this.spent.perTaskUsd[reservation.taskId] = (this.spent.perTaskUsd[reservation.taskId] ?? 0) + actual.actualCostUsd;
    }

    const event: CostEvent = {
      timestamp: new Date().toISOString(),
      projectId: reservation.projectId,
      taskId: reservation.taskId,
      invocationId: reservation.reservationId,
      provider: actual.provider,
      model: actual.model,
      pricingVersion: reservation.pricingVersion,
      estimatedCostUsd: reservation.maxCostUsd,
      actualCostUsd: actual.actualCostUsd,
      cacheHitTokens: actual.cacheHitTokens ?? 0,
      cacheReadTokens: actual.cacheReadTokens ?? 0,
      cacheWriteTokens: actual.cacheWriteTokens ?? 0,
      result: actual.result,
      retryCount: actual.retryCount ?? 0,
      escalationReason: actual.escalationReason,
    };
    this.ledger.push(event);

    if (actual.actualCostUsd > reservation.maxCostUsd * 3) this.breaker.recordAnomaly(); // crude spend-spike check
    else this.breaker.recordHealthy();

    return event;
  }

  /** Reservation abandoned without a commit (e.g. denied downstream) —
   * releases the hold without touching spend or the ledger. */
  /** Validate that a reservation still exists immediately before a provider
   * process/API call. This is the Agent OS side of the Blocks financial
   * airlock; it does not create a second reservation. */
  authorizeReservation(reservationId: string): CostReservation {
    if (!this.aiExecutionEnabled) throw new Error("Agent OS AI execution kill switch is disabled.");
    if (this.breaker.current === "HALTED") throw new Error("Agent OS cost circuit breaker is HALTED.");
    const reservation = this.reservations.get(reservationId);
    if (!reservation) throw new Error(`Unknown or already-settled cost reservation "${reservationId}".`);
    return reservation;
  }

  release(reservationId: string): void {
    this.reservations.delete(reservationId);
  }

  getLedger(): readonly CostEvent[] {
    return this.ledger;
  }
}
