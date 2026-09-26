// Agent OS — core contracts (Phase 1, zero-cost infrastructure)
//
// These types are net-new to Agent OS and do not exist in Blocks. Where a
// type mirrors something Blocks already has under a different name (see
// AGENT_OS_BLOCKS_IMPLEMENTATION_MANIFEST.md §4.4), the Agent OS name is
// used explicitly and the Blocks equivalent is referenced in a comment,
// never silently aliased.
//
// The ProviderDriver family below is a VENDORED, type-compatible copy of
// hamedgitty/bloks `server/contracts.ts` (read at commit b4ac3ff, file sha
// cefaeb1). It is copied rather than imported because this package lives
// in a separate repository and does not depend on Blocks at build time.
// If Blocks' contracts.ts changes, this copy goes stale silently — there
// is no automated check for that today. Treat any driver written against
// this copy as unverified until it is checked against the live file.

export type EvidenceState = "OBSERVED" | "VERIFIED" | "INFERRED" | "STALE" | "UNKNOWN";

export type PolicyVerdict = "ALLOW" | "DENY" | "ESCALATE" | "REQUIRES_HUMAN";

export type EnvironmentTier = "LOCAL" | "STAGING" | "PRODUCTION";

export type Sensitivity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type AgentRole =
  | "human"
  | "chief_of_staff"
  | "architecture_lead"
  | "security_authority"
  | "verifier"
  | "foot_soldier";

/**
 * Agent OS's tenant/credential namespace. Deliberately NOT the same type
 * as Blocks' `Project` (server/projects.ts), which is a folder lens on a
 * single local workspace with no credential or tenant boundary. See
 * project-context.ts for the explicit mapping between the two.
 */
export interface AgentOSProject {
  projectId: string;
  displayName: string;
  environment: EnvironmentTier;
  /** Optional pointer at a Blocks workspace folder this project uses for
   * local file/tool access. Not a credential boundary — see project-context.ts. */
  blocksWorkspacePath?: string;
}

export interface TaskEnvelope {
  taskId: string;
  projectId: string;
  title: string;
  description: string;
  role: AgentRole;
  environment: EnvironmentTier;
  sensitivity: Sensitivity;
  inScope: string[];
  outOfScope: string[];
  acceptanceCriteria: string[];
  createdAt: string;
}

/** One capability/tool-call request, checked against every dimension
 * AGENT_OS_BRAIN_AND_POLICY.md §8 names. Mirrors the shape of Blocks'
 * ask-broker `PendingAsk` (tool/input) plus everything Blocks doesn't
 * carry: project, role, environment, sensitivity, destructiveRisk. */
export interface ActionRequest {
  requestId: string;
  projectId: string;
  taskId?: string;
  agentId: string;
  role: AgentRole;
  action: string;
  target: string;
  environment: EnvironmentTier;
  sensitivity: Sensitivity;
  destructiveRisk: boolean;
  approvalRequired: boolean;
  /** A caller-supplied, upfront cost estimate used only by the
   * budget-002 policy rule. The Cost Controller's own token-based
   * reservation (see tool-gateway.ts / cost-controller.ts) is separate
   * and is what actually gates spend — this field never gates anything
   * on its own. */
  estimatedCostUsd?: number;
  /** The raw tool name/input, when this action request originates from a
   * Blocks ask-broker PendingAsk (tool + input). Optional: some Agent OS
   * actions (e.g. UPDATE_ASANA) have no Blocks-side tool call at all. */
  bloksTool?: string;
  bloksInput?: unknown;
}

/** Required shape per AGENT_OS_BRAIN_AND_POLICY.md §12. */
export interface PolicyDecision {
  policyId: string;
  decision: PolicyVerdict;
  reason: string;
  evidence: EvidenceState;
  budgetImpactUsd: number;
  requiredNextAction: string;
}

export interface CostReservation {
  reservationId: string;
  projectId: string;
  taskId?: string;
  estimatedUncachedInputTokens: number;
  estimatedCachedInputTokens: number;
  estimatedOutputTokens: number;
  pricingVersion: string;
  maxCostUsd: number;
  createdAt: string;
}

/** Spend ledger row shape per AGENT_OS_COST_AND_BUDGET.md §10. Never
 * carries API secrets. */
export interface CostEvent {
  timestamp: string;
  projectId: string;
  taskId?: string;
  invocationId: string;
  provider: string;
  model: string;
  pricingVersion: string;
  estimatedCostUsd: number;
  actualCostUsd: number;
  cacheHitTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  result: "ok" | "denied" | "error";
  retryCount: number;
  escalationReason?: string;
}

export type CircuitBreakerState = "GREEN" | "WARNING" | "HALTED";

export interface TraceEntry {
  traceId: string;
  taskId: string;
  projectId: string;
  timestamp: string;
  kind: "policy_decision" | "cost_event" | "provider_event" | "note";
  payload: unknown;
  evidence: EvidenceState;
}

// ── vendored, type-compatible copy of hamedgitty/bloks server/contracts.ts ──
// (sha cefaeb1 at commit b4ac3ff on `main`). Trimmed to what this package
// uses; field names and shapes are unchanged from the source.

export type DriverKind = string;
export type InstanceId = string;
export type ThreadId = string;
export type TurnId = string;

export interface RuntimeEventBase {
  eventId: string;
  provider: DriverKind;
  providerInstanceId?: InstanceId;
  threadId: ThreadId;
  createdAt: string;
  turnId?: TurnId;
  itemId?: string;
  requestId?: string;
  raw?: { source: string; payload: unknown };
}

export type RuntimeEvent = RuntimeEventBase &
  (
    | { type: "session.started"; sessionId: string | null; model?: string | null }
    | { type: "session.exited"; reason?: string }
    | { type: "turn.started" }
    | {
        type: "turn.completed";
        ok: boolean;
        stopReason?: string | null;
        cost?: number | null;
        denials?: string[];
      }
    | { type: "item.started"; itemType: "tool" | "reasoning"; title?: string }
    | { type: "item.updated"; itemType: "tool" | "reasoning"; tokens?: number | null }
    | { type: "item.completed"; itemType: "tool"; ok: boolean }
    | { type: "item.completed"; itemType: "assistant_text"; text: string }
    | { type: "content.delta"; streamKind: "assistant_text" | "reasoning_text"; delta: string }
    | {
        type: "request.opened";
        requestType: "permission" | "question";
        tool: string;
        input?: unknown;
        summary: string;
        choices?: string[];
      }
    | { type: "request.resolved"; behavior: string; source: string }
    | { type: "thread.token-usage.updated"; input: number; output: number }
    | { type: "runtime.error"; message: string }
  );

export type RuntimeEventListener = (event: RuntimeEvent) => void;

export interface SendTurnInput {
  threadId: ThreadId;
  text: string;
  model?: string;
  effort?: "low" | "medium" | "high";
  resumeCursor?: unknown;
  transcript?: Array<{ role: "user" | "assistant"; text: string }>;
  system?: string;
  cwd?: string;
  extraDirs?: string[];
  env?: Record<string, string>;
}

export interface TurnStartResult {
  turnId: TurnId;
}

export interface ProviderAdapter {
  readonly provider: DriverKind;
  readonly capabilities: {
    sessionModelSwitch: "in-session" | "unsupported";
    replaysNatively?: boolean;
  };
  sendTurn(input: SendTurnInput): Promise<TurnStartResult>;
  interruptTurn(threadId: ThreadId, turnId?: TurnId): Promise<void>;
  respondToRequest(
    threadId: ThreadId,
    requestId: string,
    decision: { behavior: "allow" | "deny" | "answer"; message?: string },
  ): Promise<void>;
  hasSession(threadId: ThreadId): boolean;
  stopAll(): Promise<void>;
  onEvent(listener: RuntimeEventListener): () => void;
}

export interface ProviderSnapshot {
  state: "available" | "unavailable";
  reason?: string;
  authenticated?: boolean;
  version?: string | null;
}

export interface ModelCatalog {
  default: string;
  options: Array<{ id: string; label: string }>;
}

export interface DriverCreateInput<Config> {
  instanceId: InstanceId;
  displayName: string | undefined;
  environment: Record<string, string>;
  enabled: boolean;
  config: Config;
}

export interface ProviderInstance {
  readonly instanceId: InstanceId;
  readonly driverKind: DriverKind;
  readonly displayName: string | undefined;
  readonly enabled: boolean;
  readonly models: ModelCatalog;
  readonly adapter: ProviderAdapter;
  catalogReady?: Promise<void>;
  snapshot(): Promise<ProviderSnapshot>;
  generateText?(prompt: string): Promise<string>;
  dispose(): Promise<void>;
}

export interface ProviderDriver<Config = unknown> {
  readonly driverKind: DriverKind;
  readonly metadata: { displayName: string; supportsMultipleInstances?: boolean };
  decodeConfig(raw: unknown): Config;
  defaultConfig(): Config;
  readonly models: ModelCatalog;
  create(input: DriverCreateInput<Config>): Promise<ProviderInstance>;
}

let eventCounter = 0;
export const newEventId = () => `ev-${Date.now().toString(36)}-${(eventCounter++).toString(36)}`;
export const newId = () => crypto.randomUUID();
