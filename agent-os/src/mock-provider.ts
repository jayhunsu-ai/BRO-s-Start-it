// Agent OS — Mock Provider (Phase 1, zero-cost infrastructure)
//
// Implements Blocks' `ProviderDriver` contract exactly (vendored copy in
// contracts.ts) with a scripted, deterministic, fully offline engine. No
// network calls, no credentials, no real CLI spawned. This is what
// AGENT_OS_COST_AND_BUDGET.md §12 calls "a simulated provider mode."
//
// Every turn emits, in order: turn.started, then either a request.opened
// (blocking until respondToRequest is called) followed by completion, or
// straight through content.delta / item.completed / token-usage /
// turn.completed. The script is supplied by the caller so tests can
// compose arbitrary scenarios without editing this file.

import type {
  ProviderDriver,
  ProviderInstance,
  ProviderAdapter,
  ProviderSnapshot,
  DriverCreateInput,
  SendTurnInput,
  TurnStartResult,
  RuntimeEvent,
  RuntimeEventListener,
  ModelCatalog,
  ThreadId,
  TurnId,
} from "./contracts.js";
import { newEventId, newId } from "./contracts.js";

export interface MockTurnScript {
  /** If set, a `request.opened` event fires with this tool/input before
   * the turn completes, and the turn blocks until `respondToRequest` is
   * called. This mock enforces no timeout of its own — production wiring
   * goes through ask-broker.ts, which does (15 minutes). */
  request?: { tool: string; input?: unknown; summary: string };
  assistantText: string;
  ok: boolean;
  inputTokens: number;
  outputTokens: number;
}

export interface MockProviderConfig {
  /** Keyed by threadId, so a test can script different behavior per
   * thread without a fresh driver instance each time. */
  scripts: Record<string, MockTurnScript[]>;
}

const MODELS: ModelCatalog = {
  default: "mock-sonnet",
  options: [
    { id: "mock-sonnet", label: "Mock Sonnet (simulated)" },
    { id: "mock-opus", label: "Mock Opus (simulated)" },
  ],
};

export function createMockProviderDriver(): ProviderDriver<MockProviderConfig> {
  return {
    driverKind: "mock",
    metadata: { displayName: "Agent OS Mock Provider (offline, zero-cost)", supportsMultipleInstances: true },
    models: MODELS,
    defaultConfig: () => ({ scripts: {} }),
    decodeConfig: (raw) => {
      if (typeof raw !== "object" || raw === null || !("scripts" in raw)) {
        throw new TypeError("MockProviderConfig requires a `scripts` map.");
      }
      return raw as MockProviderConfig;
    },
    create: async (input: DriverCreateInput<MockProviderConfig>): Promise<ProviderInstance> => {
      const listeners = new Set<RuntimeEventListener>();
      const emit = (event: RuntimeEvent) => listeners.forEach((l) => l(event));
      const sessions = new Set<ThreadId>();
      const scriptCursor = new Map<ThreadId, number>();
      const pendingRequests = new Map<
        string,
        { threadId: ThreadId; turnId: TurnId; resolve: (behavior: "allow" | "deny" | "answer", message?: string) => void }
      >();

      const runTurn = async (threadId: ThreadId, turnId: TurnId, script: MockTurnScript) => {
        sessions.add(threadId);
        emit({ eventId: newEventId(), provider: "mock", threadId, createdAt: new Date().toISOString(), turnId, type: "turn.started" });

        if (script.request) {
          const requestId = newId();
          // Register the pending request BEFORE emitting request.opened, so
          // a synchronous listener that reacts to the event by calling
          // respondToRequest immediately finds an entry to resolve.
          let resolveFn!: (behavior: "allow" | "deny" | "answer", message?: string) => void;
          const behaviorPromise = new Promise<{ behavior: "allow" | "deny" | "answer"; message?: string }>((resolve) => {
            resolveFn = (behavior, message) => resolve({ behavior, message });
          });
          pendingRequests.set(requestId, { threadId, turnId, resolve: resolveFn });

          emit({
            eventId: newEventId(),
            provider: "mock",
            threadId,
            createdAt: new Date().toISOString(),
            turnId,
            requestId,
            type: "request.opened",
            requestType: "permission",
            tool: script.request.tool,
            input: script.request.input,
            summary: script.request.summary,
          });

          const { behavior } = await behaviorPromise;
          emit({
            eventId: newEventId(),
            provider: "mock",
            threadId,
            createdAt: new Date().toISOString(),
            turnId,
            requestId,
            type: "request.resolved",
            behavior,
            source: "test",
          });
          if (behavior === "deny") {
            emit({
              eventId: newEventId(),
              provider: "mock",
              threadId,
              createdAt: new Date().toISOString(),
              turnId,
              type: "turn.completed",
              ok: false,
              stopReason: "denied",
              denials: [script.request.tool],
            });
            return;
          }
        }

        emit({
          eventId: newEventId(),
          provider: "mock",
          threadId,
          createdAt: new Date().toISOString(),
          turnId,
          type: "content.delta",
          streamKind: "assistant_text",
          delta: script.assistantText,
        });
        emit({
          eventId: newEventId(),
          provider: "mock",
          threadId,
          createdAt: new Date().toISOString(),
          turnId,
          type: "item.completed",
          itemType: "assistant_text",
          text: script.assistantText,
        });
        emit({
          eventId: newEventId(),
          provider: "mock",
          threadId,
          createdAt: new Date().toISOString(),
          turnId,
          type: "thread.token-usage.updated",
          input: script.inputTokens,
          output: script.outputTokens,
        });
        emit({
          eventId: newEventId(),
          provider: "mock",
          threadId,
          createdAt: new Date().toISOString(),
          turnId,
          type: "turn.completed",
          ok: script.ok,
          stopReason: script.ok ? "complete" : "error",
          cost: null,
        });
      };

      const adapter: ProviderAdapter = {
        provider: "mock",
        capabilities: { sessionModelSwitch: "unsupported", replaysNatively: true },
        sendTurn: async (turnInput: SendTurnInput): Promise<TurnStartResult> => {
          const turnId = newId();
          const scripts = input.config.scripts[turnInput.threadId] ?? [];
          const cursor = scriptCursor.get(turnInput.threadId) ?? 0;
          const script = scripts[cursor];
          scriptCursor.set(turnInput.threadId, cursor + 1);
          if (!script) {
            throw new Error(`MockProvider: no scripted turn left for thread "${turnInput.threadId}" (cursor ${cursor}).`);
          }
          void runTurn(turnInput.threadId, turnId, script);
          return { turnId };
        },
        interruptTurn: async () => {},
        respondToRequest: async (_threadId, requestId, decision) => {
          const pending = pendingRequests.get(requestId);
          if (!pending) throw new Error(`MockProvider: no pending request "${requestId}".`);
          pendingRequests.delete(requestId);
          pending.resolve(decision.behavior, decision.message);
        },
        hasSession: (threadId) => sessions.has(threadId),
        stopAll: async () => {
          sessions.clear();
          pendingRequests.clear();
        },
        onEvent: (listener) => {
          listeners.add(listener);
          return () => listeners.delete(listener);
        },
      };

      return {
        instanceId: input.instanceId,
        driverKind: "mock",
        displayName: input.displayName,
        enabled: input.enabled,
        models: MODELS,
        adapter,
        snapshot: async (): Promise<ProviderSnapshot> => ({ state: "available", authenticated: true, version: "mock-0" }),
        generateText: async (prompt: string) => `[mock completion for: ${prompt.slice(0, 40)}]`,
        dispose: async () => {
          sessions.clear();
          pendingRequests.clear();
        },
      };
    },
  };
}
