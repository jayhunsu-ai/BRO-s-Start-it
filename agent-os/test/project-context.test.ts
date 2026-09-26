import { test } from "node:test";
import assert from "node:assert/strict";
import { ProjectRegistry } from "../src/project-context.js";

test("a project with no bound workspace resolves to null, not an error", () => {
  const registry = new ProjectRegistry();
  registry.register({ projectId: "start-it", displayName: "Start-It", environment: "STAGING" });
  assert.equal(registry.resolveWorkspace("start-it"), null);
});

test("binding() returns both the Agent OS project and its Blocks workspace together", () => {
  const registry = new ProjectRegistry();
  registry.register(
    { projectId: "bro", displayName: "BRO", environment: "LOCAL" },
    { workspaceId: "w1", folderPath: "/Users/x/bro", brief: "BRO platform" },
  );
  const binding = registry.binding("bro");
  assert.equal(binding?.project.projectId, "bro");
  assert.equal(binding?.workspace?.folderPath, "/Users/x/bro");
});

test("an unregistered project has no binding at all", () => {
  const registry = new ProjectRegistry();
  assert.equal(registry.binding("unknown"), undefined);
});

test("re-registering a project overwrites its binding rather than merging it", () => {
  const registry = new ProjectRegistry();
  registry.register({ projectId: "p1", displayName: "P1", environment: "LOCAL" }, { workspaceId: "w1", folderPath: "/a" });
  registry.register({ projectId: "p1", displayName: "P1", environment: "LOCAL" });
  assert.equal(registry.resolveWorkspace("p1"), null);
});
