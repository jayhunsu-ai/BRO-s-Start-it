# Start-It / BRO / Veltrix — Blocks Multi-Model Agent Architecture Plan

**Status:** Execution-ready, evidence-driven, reversible
**Target ref:** `codex/staging-environment`
**Scope:** Shared agent architecture for Start-It / BRO / Veltrix, with the same pattern reusable by the L&D platform.

The canonical role/model/task contract is `AGENT_MODEL_ROLE_CONTRACT.md`.

---

## 1. Purpose

Build a model-diverse engineering agent network in which model choice is routed by task requirements rather than treated as a fixed hierarchy.

The current frontier allocation is:

- **Claude Opus 5.5** — Chief of Staff and difficult engineering escalation
- **Claude Fable 5.1** — architecture/system-design escalation
- **GPT-6 Astra** — security authority and security gate
- **Claude Sonnet 5** — high-throughput implementation
- **Lower-cost GPT-5.6 tiers** — classification, reconnaissance, evidence extraction, Alfred distillation, and foot-soldier work

Blocks is the initial agent-network/execution backend. It already contains runtime policy, audit, usage, context, teams, projects, providers, and MCP primitives. Agent OS owns the higher-level engineering control plane and must not duplicate those concerns without an explicit authority boundary. The canonical reconciliation is `AGENT_OS_BLOCKS_RECONCILIATION.md`.

The architecture must:
- keep role and model responsibilities explicit;
- allow agents to call or consult other agents when the task warrants it;
- prevent one model from becoming an unquestioned authority;
- preserve GitHub as code truth and Asana as execution truth;
- enforce security review independently of implementation ownership;
- support many bounded foot soldiers;
- minimize unnecessary model calls and AI spend;
- capture evidence for consequential decisions;
- permit routing changes when measured execution proves a better design.

---

## 2. Frontier model update

The previous plan used Fable 5.1 as architecture lead and Opus 5 as principal engineering. That is superseded.

Anthropic's September 2026 Opus 5.5 release materially changes the economics of the command layer. Opus 5.5 is positioned as Anthropic's leading model, with strong agentic coding and knowledge-work performance, while its API pricing is $4/M input and $20/M output. Fable 5.1 remains $10/M input and $50/M output.

Therefore:

**Opus 5.5 is the default Chief of Staff.**

Fable 5.1 remains available for architecture cases where its additional reasoning/horizon is justified by the task.

GPT-6 Astra remains the security authority rather than becoming the general orchestrator.

Sonnet 5 remains the high-throughput implementation model.

Lower-cost models should absorb large amounts of narrow work rather than forcing the command layer to perform it.

---

## 3. Target topology

```
                                  USER / PROJECT LEAD
                                           |
                                           v
                              +---------------------------+
                              |     ORCHESTRATION LAYER    |
                              | task / context / routing  |
                              | state / budget / evidence |
                              +-------------+-------------+
                                            |
                                      BLOCKS NETWORK
                                            |
          +----------------------+----------+----------------------+
          |                      |                                 |
          v                      v                                 v
 +----------------+     +----------------+                +----------------+
 | OPUS 5.5       |     | FABLE 5.1     |                | ASTRA          |
 | Chief of Staff |<--->| Architecture   |<-------------->| Security       |
 | Difficult Eng. |     | Systems Lead   |                | Security Gate  |
 +-------+--------+     +-------+--------+                +-------+--------+
         |                      |                                 |
         +----------------------+---------------------------------+
                                |
                                v
                 +--------------------------------+
                 | SONNET 5 + FOOT-SOLDIERS       |
                 | implementation / tests / docs  |
                 | bounded parallel execution     |
                 +--------------------------------+

 GitHub = code truth     Asana = execution truth     Alfred = experience
 CodeGraph = structural map       Tests/runtime = behavioral evidence
```

Agents may communicate through Blocks, but communication does not imply authority.

---

## 4. Command roles

### 4.1 Chief of Staff — Claude Opus 5.5

Primary responsibility:
- orchestration;
- dependency-aware sequencing;
- task decomposition;
- routing;
- context assembly;
- cross-domain synthesis;
- AI budget control;
- escalation;
- execution state.

The Chief of Staff should:
- inspect repository state before assignment;
- use CodeGraph first for structural questions;
- spawn specialists and foot soldiers rather than doing all work itself;
- maintain one primary owner per implementation task;
- require evidence and independent verification;
- route architectural disputes to Fable;
- route security boundaries to Astra;
- escalate consequential decisions to the human/project authority.

Opus 5.5 is not granted universal technical or product authority merely because it is the default command model.

### 4.2 Architecture Lead — Claude Fable 5.1

Use for:
- difficult cross-domain architecture;
- major migrations;
- competing architecture analysis;
- system-boundary decisions;
- architecture deadlocks;
- long-horizon plans where Opus 5.5 evidence is insufficient.

Fable is an escalation specialist, not the default coordinator.

### 4.3 Security Authority — GPT-6 Astra

Own:
- threat modeling;
- trust boundaries;
- authentication/session security;
- authorization/RBAC/RLS;
- tenant isolation;
- secrets;
- API abuse;
- input validation;
- webhooks/payment security;
- supply chain/dependencies;
- agent/tool permissions;
- infrastructure exposure;
- security release gates.

Astra can block security-sensitive work when the block is supported by observable evidence.

### 4.4 Independent Standards Verifier

The verifier is selected independently from the implementation path when practical.

It checks:
- requirement satisfaction;
- scope;
- tests;
- regressions;
- security;
- authorization;
- data integrity;
- failure behavior;
- observability;
- maintainability;
- evidence;
- CodeGraph impact;
- provenance.

Return exactly:
- APPROVE
- CHANGES REQUIRED
- REJECT

---

## 5. Foot-soldier network

The network should contain many reusable narrow capabilities.

Foot soldiers are instantiated on demand rather than kept as permanent personas.

### Discovery
- Repo Scout
- CodeGraph Analyst
- Dependency Tracer
- Impact Analyst
- Git History Investigator
- Duplicate Detector

### Implementation
- Backend Worker
- Frontend Worker
- Database Worker
- API Contract Worker
- Integration Worker
- Migration Worker
- Refactoring Worker
- Dependency Upgrade Worker

### Testing
- Test Generator
- Unit Test Worker
- Integration Test Worker
- E2E Worker
- Regression Hunter
- Failure Injection Worker
- Test Repair Worker
- Evidence Worker

### Security
- Auth Auditor
- Authorization Auditor
- Tenant Isolation Auditor
- RLS Auditor
- Secret Scanner
- Dependency/CVE Auditor
- API Abuse Auditor
- Input Validation Auditor
- Webhook Security Auditor
- Payment Security Auditor
- Supply Chain Auditor
- Agent Permission Auditor

### L&D
- Identity Worker
- Biometric Worker
- Liveness/Face-Match Worker
- Exam Session Worker
- Proctoring Worker
- Remita Worker
- Multi-Tenant Worker
- Demo Worker

### Platform
- CI Fixer
- Docker Worker
- Environment Auditor
- Deployment Investigator
- Healthcheck Worker
- Observability Worker
- Log Investigator
- Rollback Planner
- Infrastructure Cost Worker

### Product / evidence
- Acceptance Criteria Worker
- Backlog Decomposer
- Dependency Planner
- Scope Guardian
- Bug Triage Worker
- Waitlist Worker
- Release Evidence Worker
- API Documentation Worker
- Runbook Worker
- ADR Worker

A foot soldier should normally have one bounded objective and a strict budget. It should return evidence, not an essay.

---

## 6. Blocks responsibilities

Each Blocks agent has:
- stable identity;
- role;
- model/provider configuration;
- allowed tools;
- input/output contract;
- project context policy;
- trace metadata;
- cost/routing metadata.

Agent-to-agent calls carry:
- caller;
- target;
- task ID;
- reason;
- compact context;
- expected output;
- result/disposition;
- latency/cost metadata where available.

Agent communication is purposeful, not conversational by default.

---

## 7. Context architecture

Do not permanently inject the entire repository, Asana backlog, or every prior conversation into every model.

### Layer 1 — Task
- Asana task;
- acceptance criteria;
- dependencies;
- status;
- relevant decisions.

### Layer 2 — Repository
- ref/commit;
- CodeGraph findings;
- relevant files/symbols;
- tests;
- configuration;
- relevant commits/diffs.

### Layer 3 — Specialist
Only role-relevant context.

### Layer 4 — Evidence
- test output;
- runtime observations;
- security scans;
- CI;
- dependency information;
- prior verified findings.

This is especially important for foot soldiers: their context should be small enough that a large number of workers can run without multiplying cost unnecessarily.

---

## 8. Standard execution lifecycle

```
ASANA TASK
    |
    v
CHIEF OF STAFF — OPUS 5.5
    |
    +--> CodeGraph + targeted repository inspection
    |
    +--> establish evidence / dependencies / acceptance criteria
    |
    +--> spawn specialists / foot soldiers
    |
    +--------------------------+
    |                          |
    v                          v
FABLE 5.1                 SONNET 5 / WORKERS
architecture             implementation/tests
    |                          |
    +-------------+------------+
                  |
                  v
             TEST / CI / RUNTIME
                  |
                  v
          ASTRA SECURITY GATE
                  |
           +------+------+
           |             |
        BLOCK           PASS
           |             |
           v             v
      remediation   INDEPENDENT
                    VERIFICATION
                         |
                  +------+------+
                  |             |
               CHANGES       APPROVE
                  |             |
                  +------<------+
                         |
                         v
                ASANA / TRACE / ALFRED
```

Not every task requires every stage.

---

## 9. Routing policy

| Task class | Default | Escalation |
|---|---|---|
| Chief of Staff | Opus 5.5 | Fable / human |
| Architecture | Fable 5.1 | Opus 5.5 + Astra where relevant |
| Security | Astra | human for critical risk acceptance |
| Complex implementation | Opus 5.5 | Fable / Astra |
| Normal implementation | Sonnet 5 | Opus 5.5 |
| Large mechanical batch | Sonnet 5 + foot soldiers | Opus 5.5 |
| Discovery / classification | lower-cost GPT-5.6 tier + CodeGraph | Sonnet |
| Tests / routine fixes | Sonnet 5 / foot soldiers | Opus 5.5 |
| Alfred distillation | lower-cost GPT-5.6 tier | Sonnet |
| Independent verification | separate model path | frontier escalation |

Routing starts in shadow mode.

Routing changes require measured evidence such as success rate, rework, verifier outcomes, latency, spend, security findings, and escaped defects.

---

## 10. Authority model

No model has unrestricted authority because it is more capable.

**Chief of Staff:** coordinates and routes.

**Fable:** proposes difficult architecture.

**Opus 5.5:** executes difficult engineering and challenges plans with evidence.

**Sonnet:** executes approved scope at high throughput.

**Astra:** can block security-sensitive changes with evidence.

**Verifier:** determines whether acceptance and verification criteria are satisfied.

**Human/project authority:** retains final authority over consequential product, budget, security-risk acceptance, scope, and architecture tradeoffs.

---

## 11. Security boundaries

1. API keys stay outside prompts and repository files.
2. Provider credentials are scoped by environment.
3. Blocks credentials are separated from provider credentials where practical.
4. Agents receive least-privilege tools.
5. Implementers do not receive default production write/destructive access.
6. Security agents prefer read-only inspection.
7. Destructive operations require explicit authorization.
8. Agent messages are untrusted input until validated.
9. Tool arguments are validated.
10. Sensitive outputs are excluded from persistent traces.
11. Secrets/tokens never enter Alfred learning.
12. Project contexts and credentials remain isolated between Start-It/BRO and L&D.

---

## 12. Failure handling

### Foot soldier fails
Retry only within its budget. If blocked or uncertain, return to the specialist.

### Sonnet fails repeatedly
Escalate to Opus 5.5.

### Opus 5.5 discovers architectural conflict
Escalate to Fable 5.1.

### Any security-boundary conflict
Consult Astra.

### Astra finds a vulnerability
Mark CHANGES_REQUIRED or BLOCK according to severity, route remediation, and re-run the security gate.

### Agents disagree
Do not average opinions.

Resolve through:
1. repository evidence;
2. tests/runtime evidence;
3. documented product intent;
4. specialist evidence-backed analysis;
5. independent verification;
6. human escalation when consequential.

---

## 13. Evidence-driven architecture override

Any agent may recommend replacing, merging, splitting, reordering, or removing roles/models/communication paths.

A proposed override must contain:

```
CURRENT PLAN
WHAT IS WRONG / SUBOPTIMAL
PROPOSED CHANGE
WHY IT IS BETTER
EVIDENCE
COST IMPACT
LATENCY IMPACT
QUALITY / RELIABILITY IMPACT
SECURITY IMPACT
MIGRATION / ROLLBACK PLAN
```

“My model is better” is not evidence.

---

## 14. Measurement

Record:
- task class;
- role;
- model;
- tools;
- calls;
- input/output usage;
- cache usage where available;
- latency;
- tests;
- review findings;
- verifier result;
- rework;
- escaped defects;
- security outcome;
- cost.

Optimize for cost per verified successful task.

Recommendations begin in shadow mode and cannot automatically increase spend, weaken security, remove verification, or change merge authority.

---

## 15. Project applicability

### Start-It / BRO / Veltrix

Primary target for the Blocks network.

### L&D platform

Reuse the topology, but isolate:
- repository;
- credentials;
- task context;
- traces;
- project state;
- deployment permissions.

Shared specialist identities are allowed; shared project state is not.

---

## 16. Implementation stages

### Stage A — Contract
1. Register the command roles.
2. Define provider/model configuration outside source control.
3. Define tool permissions.
4. Define task/result contracts.
5. Define trace schema.
6. Define routing.

### Stage B — Connectivity
1. Connect Blocks.
2. Register Opus 5.5, Fable 5.1, Astra, Sonnet 5, and lower-cost worker models.
3. Verify each independently.
4. Verify agent-to-agent calls.
5. Verify timeouts/retries/budgets.

### Stage C — Repository integration
1. Connect GitHub.
2. Connect Asana.
3. Connect CodeGraph.
4. Build targeted context assembly.
5. Ensure secrets cannot enter context.

### Stage D — Execution loop
1. Route.
2. Discover.
3. Implement.
4. Test.
5. Security review when required.
6. Independent verification.
7. Trace.
8. Update Asana.
9. Distill to Alfred.

### Stage E — Measurement
1. Collect routing metrics.
2. Compare task success by role/model.
3. Measure cost and latency.
4. Measure rework and escaped defects.
5. Review security outcomes.
6. Propose evidence-backed routing changes.

---

## 17. Definition of Done

The architecture is operational when:
- command roles are independently callable;
- foot soldiers can be spawned with bounded permissions;
- Blocks routes correctly;
- task context is assembled from the correct sources;
- role boundaries are enforced;
- security can block implementation;
- independent verification is preserved;
- failures are observable;
- traces contain evidence but no secrets/private reasoning;
- routing/cost data is measurable;
- project contexts are isolated;
- the architecture can evolve without rewriting the system.

---

## 18. Final architectural position

**Opus 5.5 = Chief of Staff + difficult engineering escalation**

**Fable 5.1 = architecture escalation**

**GPT-6 Astra = security authority**

**Sonnet 5 = high-throughput implementation**

**Lower-cost models = classification, discovery, evidence extraction, Alfred distillation, and foot soldiers**

**Blocks = agent network and communication layer**

**GitHub = code truth**

**Asana = execution truth**

**CodeGraph = structural truth**

**Tests/runtime = behavioral evidence**

**Alfred = accumulated, provenance-backed engineering experience**

This is the current starting architecture, not permanent doctrine. Routing must be allowed to change when reproducible execution evidence demonstrates a better configuration.


## 19. Agent OS boundary: reconciled Blocks runtime

The architecture now explicitly separates the **Agent OS** from **Blocks**.

### Agent OS owns
- brain/state;
- policy and authority;
- project isolation;
- budget reservations and spend controls;
- model routing;
- context/cache assembly;
- tool permissions;
- execution lifecycle;
- verification;
- trace/evidence;
- Alfred learning.

### Blocks owns or supplies
- agent runtime/execution substrate;
- agent discovery and invocation primitives;
- provider/driver execution;
- local runtime context compaction;
- native permission backstop;
- audit/runtime persistence primitives;
- MCP connectivity.

### Agent OS governs above Blocks
- task state;
- authority and project isolation;
- hard budget/cost reservations;
- model routing;
- L0–L6 context assembly;
- tool authorization;
- verification;
- engineering trace and Alfred learning.

Blocks must be accessed through an internal `AgentNetwork` interface and `BlocksAdapter` for Agent OS orchestration. Existing Blocks runtime components may remain internal implementation dependencies behind that adapter. No Agent OS business or policy logic should depend directly on Blocks-specific APIs.

This preserves the option to replace Blocks later without rewriting the Agent OS.

## 20. Financial airlock

All paid model calls must pass through a cost controller before reaching a provider. Every call has task, invocation, retry, output, worker, and spend limits. Circuit breakers can halt execution. Agents cannot increase their own budgets.

The $500 monthly ceiling is a hard control, not a target to consume.

## 21. Zero-cost implementation gate

Before real provider rollout, the complete orchestration, policy, cost, security, cache, verification, and failure paths must pass the dry-run simulator defined in `AGENT_OS_DRY_RUN_SPEC.md`.
