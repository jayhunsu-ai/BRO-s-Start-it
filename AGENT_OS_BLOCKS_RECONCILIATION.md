# Agent OS × Blocks — Reconciled Architecture Decision

**Status:** Canonical reconciliation v1.1 — implementation may proceed after Phase 0.5
**Target ref:** codex/staging-environment

## 1. Decision

The earlier planning documents modeled Blocks too narrowly. Repository inspection of hamedgitty/bloks shows that Blocks is already a substantial local-first agent runtime with policy, audit, usage, context, teams, projects, providers, and MCP support.

**We will not rebuild those primitives beside Blocks.**

Agent OS is the **control plane and engineering orchestration layer**. Blocks is the **execution/runtime substrate and initial agent-network backend**. Agent OS may reuse, extend, wrap, or deliberately bypass a Blocks primitive only where this document says so.

> **One authority per concern. Reuse existing Blocks mechanisms where they are compatible; add Agent OS controls where Blocks does not provide the required guarantee. Never run two competing authorities for the same decision.**

## 2. Target architecture

USER / PROJECT AUTHORITY → Agent OS Brain → Policy + Project/Environment Authority → Cost Controller → Context/Tool/Provider Gateways → Blocks Runtime Adapter → Blocks agents/drivers/MCP → Tests / Security / Independent Verification → Trace / Alfred.

Blocks remains replaceable at the AgentNetwork boundary, but its existing runtime capabilities are treated as implementation substrate rather than pretending they do not exist.

## 3. Concern ownership

| Concern | Decision | Rule |
|---|---|---|
| Task lifecycle/state | Agent OS owns | Blocks rooms/teams are execution mechanisms, not canonical task state. |
| Human/project authority | Agent OS owns | Blocks human approval UX can be reused as a confirmation surface. |
| Agent discovery/invocation | AgentNetwork owns | Blocks is the first adapter/backend. |
| Provider execution | Blocks provider/driver layer, governed by Agent OS | Agent OS must authorize and budget before paid execution. |
| Policy/permissions | Agent OS is authoritative for Agent OS work | Blocks policy remains a runtime safety layer; it cannot weaken an Agent OS DENY. |
| Cost/budget | Agent OS owns | Blocks usage telemetry is observational, not financial authority. |
| Audit/trace | Agent OS owns engineering trace schema | Reuse Blocks ledger mechanism where useful; extend it rather than creating a second chain where practical. |
| Context window compaction | Blocks owns runtime compaction | Agent OS owns L0–L6 retrieval/assembly and freshness. |
| Project isolation | Agent OS owns security project identity | Disambiguate Blocks local Workspace from Agent OS Project. |
| Tool authorization | Agent OS owns policy decision | Native Blocks permission prompts remain a runtime backstop; engine-mediated MCP needs explicit enforcement before central governance. |
| Verification | Agent OS owns | Blocks review UX may be reused only after semantics are confirmed. |
| Alfred learning | Agent OS owns | Only validated Agent OS traces enter durable engineering memory. |

## 4. Policy reconciliation

Blocks has a deny-first policy engine with allow/deny/ask and tool/command/path/URL/agent fields. Agent OS requires ALLOW / DENY / ESCALATE / REQUIRES_HUMAN plus project, role, environment, sensitivity, destructive-risk, budget, and approval context.

Therefore:
1. Agent OS policy is the upstream authority for Agent OS orchestration decisions.
2. A Blocks policy result can add a restriction but can never upgrade an Agent OS denial.
3. Agent OS REQUIRES_HUMAN may map to Blocks human approval/takeover where appropriate.
4. Agent OS ESCALATE is handled by the Agent OS Brain; it is not collapsed into generic Blocks ask.
5. Do not replace Blocks policy.ts during Phase 1. Build a PolicyAdapter/Compiler boundary and tests demonstrating monotonic enforcement.
6. If Blocks cannot express an Agent OS restriction, Agent OS denies/blocks rather than weakening its policy.

## 5. Cost-control reconciliation

Blocks usage.ts is telemetry only. It is not the financial airlock.

The Cost Controller must sit before the point at which a provider call becomes billable. For CLI-driven providers, implementation must identify the exact process invocation seam and either authorize/reserve before spawning the provider process or use a controlled provider wrapper/process boundary that enforces reservation before the request is sent.

If a provider cannot expose a reliable pre-call boundary, that provider is **not eligible for paid rollout** until the boundary is fixed. Logging usage afterward does not constitute enforcement.

Ollama/local providers may be classified as zero-provider-spend execution, but still obey task, worker, timeout, tool, and resource limits.

## 6. Context reconciliation

Blocks context.ts is retained for transcript/context-window management.

Agent OS adds the higher-level context assembly contract: L0 GLOBAL → L1 PROJECT → L2 REPO → L3 VERIFIED MEMORY → L4 TASK → L5 TARGET CODE → L6 LIVE RESULTS.

Do not replace Blocks context compaction unless evidence shows a conflict. Agent OS prepares the context package; Blocks may compact it for a specific runtime/model.

## 7. Project reconciliation

There are two distinct concepts:

- **Agent OS Project** = security, credential, memory, task, and environment isolation boundary.
- **Blocks Workspace** = local folder/brief lens used by the desktop runtime.

Implementation must not expose both as the same Project type. Use explicit names such as AgentOSProject and BlocksWorkspace, or equivalent repository conventions.

A Blocks Workspace may be attached to an Agent OS Project, but it does not define the security boundary.

## 8. Teams and workers

Blocks supports human-approved team formation and persistent agents. Agent OS requires disposable bounded workers.

Do not bypass Blocks human approval merely to obtain parallelism.

Instead:
- start with one-task/one-worker execution;
- reuse Blocks team/runtime primitives where they fit;
- introduce disposable worker metadata at the Agent OS layer;
- preserve human approval for actions policy marks REQUIRES_HUMAN;
- add bounded parallelism only after dependency and permission controls are proven.

The many-foot-soldiers requirement means many bounded invocations/capabilities, not dozens of permanent Blocks personas.

## 9. MCP/tool boundary

Blocks supports MCP, but engine-mediated MCP calls may bypass Blocks' own central interception path.

Registering GitHub, Asana, or CodeGraph MCP servers is sufficient for connectivity but **not sufficient for centralized Agent OS authorization**.

Before a tool is marked centrally governed, prove one of:
1. the call passes through an Agent OS/Blocks-enforced gateway;
2. the MCP server itself enforces the required project/scope/credential policy; or
3. the runtime is changed so Agent OS can observe and authorize the call.

Until then, treat the path as controlled-but-not-centrally-governed and do not grant it sensitive/destructive authority.

## 10. Provider/model identity

Provider/model names and pricing in planning documents are routing configuration, not architecture facts. Before paid rollout, verify actual currently available model identifiers and prices from provider documentation and store pricing configuration outside source control.

The architecture does not depend on any particular model vendor.

## 11. Trace/ledger reconciliation

Blocks' tamper-evident ledger is valuable infrastructure. Agent OS should extend/reuse its append-only mechanism where practical rather than creating a second unrelated audit chain.

The Agent OS trace schema must add engineering provenance such as task ID, project, repository/ref/commit, role/model, evidence states, tests, verification, cost, and outcome. Secrets and private reasoning remain excluded.

## 12. Implementation strategy

### Phase 0.5 — reconcile substrate
- Read the remaining Blocks files affecting policy, teams, context, proposals, persistence, permissions, and trust model.
- Decide/record whether Blocks is vendored/forked or consumed as an external runtime dependency.
- Establish explicit AgentOSProject vs BlocksWorkspace naming.
- Identify provider process seams and MCP authorization seams.

### Phase 1 — contracts
Build schemas against the reconciled concepts, not against a blank Agent OS runtime.

### Phase 2 — policy
Build Agent OS policy as an upstream authorization layer with a Blocks policy adapter/backstop. Do not duplicate enforcement without a defined precedence relationship.

### Phase 3 — cost
Build the financial airlock and prove the actual provider process/request interception point before enabling paid calls.

### Phase 4 — context
Build Agent OS retrieval/assembly above Blocks runtime compaction.

### Phase 5 — tools
Establish one governed tool boundary; leave ungoverned MCP capabilities restricted.

### Phase 6 onward
Implement AgentNetwork/BlocksAdapter, orchestration, verification, trace/Alfred, and dry-run against the actual Blocks substrate.

## 13. Non-negotiable acceptance tests

Before paid rollout, prove:
- Agent OS DENY cannot be upgraded by Blocks policy.
- REQUIRES_HUMAN reaches a real human confirmation path.
- a paid provider request cannot start without a successful budget reservation.
- a provider with no reliable pre-call boundary is blocked from paid rollout.
- Blocks context compaction cannot silently add unauthorized project data.
- AgentOSProject isolation is distinct from BlocksWorkspace.
- engine-mediated MCP cannot receive sensitive/destructive authority without a proven enforcement path.
- worker budgets/expiry are enforced independently of persistent Blocks agent identity.
- trace and spend records are append-only/auditable and contain no secrets/private reasoning.
- the entire suite runs with mock/local providers at zero paid API cost.

## 14. Architecture override rule

This document supersedes earlier descriptions of Blocks where they conflict with repository reality. Future implementation changes must cite the concrete Blocks file/API/behavior being relied upon and update this reconciliation document when ownership changes.