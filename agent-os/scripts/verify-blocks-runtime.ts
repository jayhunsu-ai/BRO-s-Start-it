import { createBlocksAdapterFromRuntime } from "../src/blocks-adapter.js";
import { createProviderExecutionGateway } from "../src/provider-execution-gateway.js";

const bridge = process.env.AGENT_OS_BLOCKS_BRIDGE;
const instanceId = process.env.AGENT_OS_BLOCKS_INSTANCE_ID ?? "ollama";

if (!bridge) {
  throw new Error("Set AGENT_OS_BLOCKS_BRIDGE to the local Blocks server/agent-os-bridge.ts module.");
}

const adapter = await createBlocksAdapterFromRuntime(instanceId, bridge);
const live = await (async () => {
  const instance = await import(bridge).then((m: { getAgentOSProvider: (id: string) => Promise<{ snapshot(): Promise<unknown> }> }) =>
    m.getAgentOSProvider(instanceId),
  );
  return instance.snapshot();
})();

console.log(JSON.stringify({
  instanceId,
  provider: adapter.provider,
  capabilities: adapter.capabilities,
  snapshot: live,
}, null, 2));

// Zero-cost execution proof:
// the real Blocks adapter is present, but the cost gate deliberately refuses
// the call before ProviderAdapter.sendTurn() can run.
let providerCalled = false;
const guardedAdapter = {
  ...adapter,
  async sendTurn(input: Parameters<typeof adapter.sendTurn>[0]) {
    providerCalled = true;
    return adapter.sendTurn(input);
  },
};

const gateway = createProviderExecutionGateway(guardedAdapter, {
  authorize() {
    throw new Error("ZERO_COST_TEST: execution intentionally disabled before provider call");
  },
  settle() {},
  release() {},
});

await gateway.sendTurn({
  threadId: "agent-os-zero-cost-smoke",
  text: "This must never reach the provider.",
  model: "local-test",
  costReservationId: "zero-cost-test",
}).then(
  () => { throw new Error("Expected the zero-cost gate to reject execution."); },
  (error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("ZERO_COST_TEST")) throw error;
  },
);

if (providerCalled) {
  throw new Error("FAIL: real Blocks provider was reached despite the zero-cost gate.");
}

console.log("PASS: real Blocks instance resolved; financial gate blocked provider execution; no provider call was made.");
