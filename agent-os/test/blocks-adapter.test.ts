// Agent OS — Blocks adapter tests
//
// These tests prove the adapter is a transparent delegation boundary. They
// use a fake Blocks ProviderInstance, so no provider process, credential, or
// paid API call is started.

import { test } from "node:test";
import assert from "node:assert/strict";
import { createBlocksAdapter } from "../src/blocks-adapter.js";
import type {
  ProviderInstance,
  ProviderAdapter,
  RuntimeEvent,
  SendTurnInput,
} from "../src/contracts.js";

function makeFakeInstance() {
  const calls: string[] = [];
  const listeners = new Set<(event: RuntimeEvent) => void>();

  const provider: ProviderAdapter = {
    provider: "fake-blocks-provider",
    capabilities: {
      sessionModelSwitch: "unsupported",
      replaysNatively: false,
    },

    async sendTurn(input: SendTurnInput) {
      calls.push(`sendTurn:${input.threadId}`);
      return { turnId: "turn-1" };
    },

    async interruptTurn(threadId, turnId) {
      calls.push(`interrupt:${threadId}:${turnId ?? ""}`);
    },

    async respondToRequest(threadId, requestId, decision) {
      calls.push(`respond:${threadId}:${requestId}:${decision.behavior}`);
    },

    hasSession(threadId) {
      calls.push(`hasSession:${threadId}`);
      return threadId === "thread-1";
    },

    async stopAll() {
      calls.push("stopAll");
    },

    onEvent(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };

  const instance: ProviderInstance = {
    instanceId: "blocks-instance-1",
    driverKind: provider.provider,
    displayName: "Fake Blocks",
    enabled: true,
    models: {
      default: "fake-model",
      options: [{ id: "fake-model", label: "Fake Model" }],
    },
    adapter: provider,
    async snapshot() {
      return { state: "available", authenticated: true };
    },
    async dispose() {
      calls.push("dispose");
    },
  };

  return { instance, calls, listeners };
}

test("BlocksAdapter delegates provider execution without adding a second runtime", async () => {
  const { instance, calls } = makeFakeInstance();
  const adapter = createBlocksAdapter(instance);

  const result = await adapter.sendTurn({
    threadId: "thread-1",
    text: "hello",
    model: "fake-model",
  });

  assert.equal(adapter.instanceId, "blocks-instance-1");
  assert.equal(adapter.provider, "fake-blocks-provider");
  assert.equal(result.turnId, "turn-1");
  assert.deepEqual(calls, ["sendTurn:thread-1"]);
});

test("BlocksAdapter delegates control and session methods unchanged", async () => {
  const { instance, calls } = makeFakeInstance();
  const adapter = createBlocksAdapter(instance);

  assert.equal(adapter.hasSession("thread-1"), true);
  await adapter.interruptTurn("thread-1", "turn-1");
  await adapter.respondToRequest("thread-1", "request-1", {
    behavior: "deny",
  });
  await adapter.stopAll();

  assert.deepEqual(calls, [
    "hasSession:thread-1",
    "interrupt:thread-1:turn-1",
    "respond:thread-1:request-1:deny",
    "stopAll",
  ]);
});

test("BlocksAdapter preserves the Blocks event subscription boundary", () => {
  const { instance, listeners } = makeFakeInstance();
  const adapter = createBlocksAdapter(instance);
  const received: string[] = [];

  const unsubscribe = adapter.onEvent((event) => received.push(event.type));

  for (const listener of listeners) {
    listener({
      eventId: "event-1",
      provider: "fake-blocks-provider",
      threadId: "thread-1",
      createdAt: new Date().toISOString(),
      type: "turn.started",
    });
  }

  assert.deepEqual(received, ["turn.started"]);
  unsubscribe();
  assert.equal(listeners.size, 0);
});
