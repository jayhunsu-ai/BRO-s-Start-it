import { test } from "node:test";
import assert from "node:assert/strict";
import { createMockProviderDriver } from "../src/mock-provider.js";

test("a scripted turn with no request emits the full event sequence and completes", async () => {
  const driver = createMockProviderDriver();
  const instance = await driver.create({
    instanceId: "t1",
    displayName: "test",
    environment: {},
    enabled: true,
    config: { scripts: { th1: [{ assistantText: "hi", ok: true, inputTokens: 10, outputTokens: 5 }] } },
  });
  const events: string[] = [];
  instance.adapter.onEvent((e) => events.push(e.type));
  await instance.adapter.sendTurn({ threadId: "th1", text: "hello" });
  assert.deepEqual(events, ["turn.started", "content.delta", "item.completed", "thread.token-usage.updated", "turn.completed"]);
});

test("a scripted request.opened blocks until respondToRequest is called", async () => {
  const driver = createMockProviderDriver();
  const instance = await driver.create({
    instanceId: "t2",
    displayName: "test",
    environment: {},
    enabled: true,
    config: { scripts: { th2: [{ request: { tool: "run:shell", summary: "rm -rf" }, assistantText: "done", ok: true, inputTokens: 1, outputTokens: 1 }] } },
  });
  const events: string[] = [];
  let requestId: string | undefined;
  instance.adapter.onEvent((e) => {
    events.push(e.type);
    if (e.type === "request.opened") requestId = e.requestId;
  });
  await instance.adapter.sendTurn({ threadId: "th2", text: "go" });
  assert.ok(requestId, "request.opened should have fired synchronously");
  assert.ok(!events.includes("turn.completed"), "turn must not complete before the request is answered");
  await instance.adapter.respondToRequest("th2", requestId!, { behavior: "allow" });
  await new Promise((r) => setTimeout(r, 0));
  assert.ok(events.includes("turn.completed"));
});

test("a denied request short-circuits the turn as not ok", async () => {
  const driver = createMockProviderDriver();
  const instance = await driver.create({
    instanceId: "t3",
    displayName: "test",
    environment: {},
    enabled: true,
    config: { scripts: { th3: [{ request: { tool: "run:shell", summary: "rm -rf" }, assistantText: "done", ok: true, inputTokens: 1, outputTokens: 1 }] } },
  });
  let requestId: string | undefined;
  const completed: { value: { ok: boolean; denials?: string[] } | null } = { value: null };
  instance.adapter.onEvent((e) => {
    if (e.type === "request.opened") requestId = e.requestId;
    if (e.type === "turn.completed") completed.value = e;
  });
  await instance.adapter.sendTurn({ threadId: "th3", text: "go" });
  await instance.adapter.respondToRequest("th3", requestId!, { behavior: "deny" });
  await new Promise((r) => setTimeout(r, 0));
  assert.ok(completed.value, "turn.completed should have fired");
  assert.equal(completed.value.ok, false);
  assert.deepEqual(completed.value.denials, ["run:shell"]);
});

test("sendTurn throws once the scripted turns for a thread are exhausted", async () => {
  const driver = createMockProviderDriver();
  const instance = await driver.create({
    instanceId: "t4",
    displayName: "test",
    environment: {},
    enabled: true,
    config: { scripts: { th4: [{ assistantText: "once", ok: true, inputTokens: 1, outputTokens: 1 }] } },
  });
  await instance.adapter.sendTurn({ threadId: "th4", text: "go" });
  await assert.rejects(() => instance.adapter.sendTurn({ threadId: "th4", text: "go again" }));
});
