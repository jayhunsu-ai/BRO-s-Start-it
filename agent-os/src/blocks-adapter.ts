// Agent OS — Blocks execution adapter
//
// This is the narrow bridge from Agent OS to a live Blocks ProviderInstance.
// Agent OS owns policy, project authority, reservations, and execution gating.
// Blocks owns provider lifecycle and the actual ProviderAdapter implementation.
//
// Intentionally no provider-specific logic lives here. The adapter resolves one
// already-created Blocks instance and delegates the ProviderAdapter surface
// without weakening, bypassing, or duplicating Blocks runtime behavior.

import type {
  ProviderAdapter,
  ProviderInstance,
  SendTurnInput,
  ThreadId,
  TurnId,
  TurnStartResult,
  RuntimeEventListener,
} from "./contracts.js";

export interface BlocksAdapter extends ProviderAdapter {
  readonly instanceId: string;
}

export function createBlocksAdapter(instance: ProviderInstance): BlocksAdapter {
  const provider = instance.adapter;

  return {
    instanceId: instance.instanceId,
    provider: provider.provider,
    capabilities: provider.capabilities,

    sendTurn(input: SendTurnInput): Promise<TurnStartResult> {
      return provider.sendTurn(input);
    },

    interruptTurn(threadId: ThreadId, turnId?: TurnId): Promise<void> {
      return provider.interruptTurn(threadId, turnId);
    },

    respondToRequest(
      threadId: ThreadId,
      requestId: string,
      decision: { behavior: "allow" | "deny" | "answer"; message?: string },
    ): Promise<void> {
      return provider.respondToRequest(threadId, requestId, decision);
    },

    hasSession(threadId: ThreadId): boolean {
      return provider.hasSession(threadId);
    },

    stopAll(): Promise<void> {
      return provider.stopAll();
    },

    onEvent(listener: RuntimeEventListener): () => void {
      return provider.onEvent(listener);
    },
  };
}


/**
 * Load a live Blocks provider from the runtime bridge.
 *
 * The bridge module is supplied by the Blocks host process. Keeping the module
 * path outside source control lets Agent OS remain independently testable and
 * prevents a compile-time dependency on the Blocks repository.
 *
 * Example runtime configuration:
 *   AGENT_OS_BLOCKS_BRIDGE=/path/to/bloks/server/agent-os-bridge.ts
 */
export async function createBlocksAdapterFromRuntime(
  instanceId: string,
  bridgeModule = process.env.AGENT_OS_BLOCKS_BRIDGE,
): Promise<BlocksAdapter> {
  if (!bridgeModule) {
    throw new Error("Agent OS Blocks bridge is not configured (AGENT_OS_BLOCKS_BRIDGE).");
  }

  const bridge = (await import(bridgeModule)) as {
    getAgentOSProvider?: (id: string) => Promise<unknown>;
  };

  if (typeof bridge.getAgentOSProvider !== "function") {
    throw new Error("Configured Blocks bridge does not export getAgentOSProvider().");
  }

  const instance = await bridge.getAgentOSProvider(instanceId);
  if (!instance || typeof instance !== "object") {
    throw new Error(`Blocks provider instance "${instanceId}" is unavailable.`);
  }

  return createBlocksAdapter(instance as ProviderInstance);
}
