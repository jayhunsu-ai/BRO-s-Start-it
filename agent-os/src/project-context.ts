// Agent OS — Project/Workspace distinction (Phase 1)
//
// Resolves manifest §4.4: Agent OS's `project_id` (credential/tenant
// namespace) and Blocks' `Project` (server/projects.ts — a folder lens on
// one person's local machine) are DIFFERENT concepts that happened to
// share a name. This file gives each an unambiguous name and a single,
// explicit (and currently trivial) mapping between them. Nothing here
// implies Blocks' ProjectStore has been changed — it hasn't.

import type { AgentOSProject } from "./contracts.js";

/** Mirrors the fields Blocks' `server/projects.ts` `Project` type is
 * known to carry, per AGENT_OS_x_BLOCKS_IMPLEMENTATION_MANIFEST.md §2:
 * "a lens over local folders + a text brief, scoped to a single local
 * workspace." Field names here are descriptive, not verified against the
 * live type (that file's exact interface was summarized, not fully
 * transcribed, during Phase 0 — confirm before relying on field names). */
export interface BlocksWorkspaceRef {
  workspaceId: string;
  folderPath: string;
  brief?: string;
}

export interface ProjectWorkspaceBinding {
  project: AgentOSProject;
  workspace: BlocksWorkspaceRef | null;
}

/**
 * An AgentOSProject has at most one bound Blocks workspace today — there
 * is no multi-workspace-per-project concept yet, and no credential
 * separation is implied by this binding (Blocks has none; see manifest
 * §4.3). This registry is purely a lookup table, held in memory.
 */
export class ProjectRegistry {
  private readonly projects = new Map<string, AgentOSProject>();
  private readonly bindings = new Map<string, BlocksWorkspaceRef | null>();

  register(project: AgentOSProject, workspace: BlocksWorkspaceRef | null = null): void {
    this.projects.set(project.projectId, project);
    this.bindings.set(project.projectId, workspace);
  }

  get(projectId: string): AgentOSProject | undefined {
    return this.projects.get(projectId);
  }

  resolveWorkspace(projectId: string): BlocksWorkspaceRef | null {
    return this.bindings.get(projectId) ?? null;
  }

  binding(projectId: string): ProjectWorkspaceBinding | undefined {
    const project = this.projects.get(projectId);
    if (!project) return undefined;
    return { project, workspace: this.bindings.get(projectId) ?? null };
  }
}
