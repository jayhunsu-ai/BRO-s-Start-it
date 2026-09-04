# Start-It / BRO / Veltrix — Blocks Multi-Model Agent Architecture Plan

**Status:** Proposed architecture — execution-ready, evidence-driven, reversible
**Target ref:** `codex/staging-environment`
**Scope:** Shared agent architecture for Start-It / BRO / Veltrix, with the same pattern reusable by the L&D platform.

---

## 1. Purpose

Build a model-diverse engineering agent network in which GPT-6 Astra, Claude Fable 5.1, Claude Opus 5, and Claude Sonnet 5 have distinct responsibilities while remaining interoperable through Blocks.

Blocks is the agent communication/discovery layer. It is not the source of truth for code, task state, or architectural decisions, and it is not treated as a model provider.

The architecture must:

- keep model responsibilities explicit;
- allow agents to call or consult other agents when the task warrants it;
- prevent one model from becoming an unquestioned authority;
- preserve GitHub as code truth and Asana as execution truth;
- enforce security review independently of implementation ownership;
- minimize unnecessary model calls and AI spend;
- capture evidence for consequential decisions;
- permit routing changes when measured execution proves a better design.

---

## 2. Repository alignment

This plan extends the existing `AGENT_CREATION_PACK.md` rather than replacing it.

The creation pack already establishes:

- CodeGraph-first repository understanding;
- evidence states (`OBSERVED`, `VERIFIED`, `INFERRED`, `STALE`, `UNKNOWN`);
- independent Standards Verification;
- GitHub / Asana / Alfred source-of-truth separation;
- structured engineering traces;
- model routing as an evidence-driven system;
- the rule that nothing becomes DONE without independent verification.

This document specializes those principles into a multi-provider Blocks network.

The existing agent pack remains authoritative for the general engineering operating model. This document is authoritative for the proposed Blocks/model topology unless a later verified architecture supersedes it.

---

# 3. Target topology

```text
                                  USER / PROJECT LEAD
                                           |
                                           v
                              +---------------------------+
                              |     ORCHESTRATION LAYER    |
                              | task selection / context  |
                              | routing / state / budget  |
                              +-------------+-------------+
                                            |
                                      BLOCKS NETWORK
                                            |
              +-----------------------------+-----------------------------+
              |                             |                             |
              v                             v                             v
     +----------------+           +----------------+           +----------------+
     | ASTRA SECURITY |           | FABLE 5.1      |           | OPUS 5          |
     | Security Chief |<--------->| Architecture & |<--------->| Principal       |
     | Security Gate  |           | Planning       |           | Engineer        |
     +-------+--------+           +-------+--------+           +-------+--------+
             |                            |                            |
             +----------------------------+----------------------------+
                                          |
                                          v
                                  +---------------+
                                  | SONNET 5      |
                                  | Implementation|
                                  | / QA / Routine|
                                  +---------------+

       GitHub = code truth       Asana = execution truth       Alfred = experience
       CodeGraph = structural map       Tests/runtime = behavioral evidence
```

Agents may communicate through Blocks, but communication does not imply authority. Each agent remains constrained by its role and tool permissions.

---

# 4. Model roles

## 4.1 GPT-6 Astra — Security Authority

**Primary responsibility:** adversarial security analysis and security approval.

Astra is deliberately NOT the universal project orchestrator.

Responsibilities:

- threat modeling;
- trust-boundary analysis;
- authentication and session security;
- authorization and RBAC/RLS review;
- tenant-isolation review;
- secrets and credential-flow review;
- API abuse and input-validation analysis;
- webhook/payment integration security;
- dependency and supply-chain security;
- AI-agent/tool permission analysis;
- infrastructure exposure review;
- security-focused PR/diff review;
- security regression analysis;
- release security gate;
- escalation of critical security findings.

Astra may recommend architectural changes, but implementation ownership remains with the appropriate engineering agent.

Astra should receive the minimum privileges necessary for review. Production write/destructive access is not a default capability.

### Security disposition

For security gates, Astra should return a structured result such as:

```json
{
  "disposition": "PASS | CHANGES_REQUIRED | BLOCK",
  "severity": "INFO | LOW | MEDIUM | HIGH | CRITICAL",
  "findings": [],
  "evidence": [],
  "required_actions": [],
  "confidence": 0.0
}
```

Astra's conclusions must cite observable evidence: source, configuration, test result, runtime observation, dependency information, or reproducible behavior.

---

## 4.2 Claude Fable 5.1 — Architecture / Systems Lead

**Primary responsibility:** high-level technical reasoning and architecture.

Responsibilities:

- translate product requirements into technical plans;
- evaluate competing architectures;
- reason across frontend/backend/data/infrastructure boundaries;
- sequence dependencies;
- identify prerequisite work;
- design interfaces and contracts;
- review major implementation plans;
- coordinate difficult cross-domain changes;
- synthesize feedback from specialist agents;
- propose changes to the execution plan.

Fable is the default architecture/planning authority, but not an absolute authority. Consequential decisions require evidence and can be challenged by specialists, verification, or execution results.

---

## 4.3 Claude Opus 5 — Principal Engineering / Difficult Work

**Primary responsibility:** technically difficult implementation and independent engineering judgment.

Use Opus for:

- difficult multi-file changes;
- complex debugging;
- deep refactors;
- high-risk migrations;
- difficult performance work;
- complicated integration work;
- independent review of important implementation choices;
- tasks where Sonnet is likely to require significant rework.

Opus should not automatically be invoked for routine work. The orchestrator should route by task difficulty and evidence rather than prestige of the model.

---

## 4.4 Claude Sonnet 5 — Execution / High-Throughput Engineering

**Primary responsibility:** reliable implementation at high throughput.

Use Sonnet for:

- ordinary feature implementation;
- frontend/backend task execution;
- tests;
- documentation;
- routine debugging;
- small refactors;
- mechanical migrations;
- test-fix loops;
- implementation following an already-approved contract.

Sonnet must not silently redesign architecture when executing a scoped task. If implementation reveals an architectural problem, it escalates instead of improvising around it.

---

# 5. Blocks responsibilities

Blocks is the common agent network.

Each specialist is exposed as a Blocks agent with:

- stable agent identity;
- explicit role description;
- model/provider configuration;
- allowed tools;
- input/output contract;
- task/session trace metadata;
- project context policy;
- cost/routing metadata.

The network should support:

```text
orchestrator -> specialist
specialist -> specialist
specialist -> orchestrator
reviewer -> implementation owner
security -> architecture
architecture -> security
```

Agent-to-agent calls should be purposeful, not conversational by default.

Every call should have:

- caller;
- target;
- task ID;
- reason for delegation;
- compact context;
- expected output;
- result/disposition;
- latency/cost metadata where available.

---

# 6. Context architecture

Do NOT permanently inject the entire repository, Asana backlog, or every previous agent conversation into every model.

Use layered context.

### Layer 1 — Task context

- Asana task;
- acceptance criteria;
- dependencies;
- current status;
- relevant project decision records.

### Layer 2 — Repository context

- current branch/ref;
- CodeGraph findings;
- relevant files/symbols;
- tests;
- configuration;
- recent relevant commits/diffs.

### Layer 3 — Specialist context

Only the information required by the specialist's role.

Example: Astra gets trust boundaries, relevant code, auth/data flows, configuration, and the proposed change—not the entire unrelated UI.

### Layer 4 — Evidence

- test output;
- runtime observations;
- security scans;
- CI state;
- dependency information;
- prior verified findings.

This keeps context smaller, reduces cost, and makes conclusions easier to audit.

---

# 7. Standard execution lifecycle

```text
ASANA TASK
    |
    v
ORCHESTRATOR
    |
    +--> CodeGraph + targeted repository inspection
    |
    +--> establish evidence / dependencies / acceptance criteria
    |
    v
FABLE 5.1
architecture + execution plan
    |
    +-----------------------+
    |                       |
    v                       v
ASTRA                  OPUS / SONNET
security constraints   implementation
    |                       |
    +-----------+-----------+
                |
                v
          TEST / CI / RUNTIME
                |
                v
          ASTRA SECURITY GATE
                |
        +-------+-------+
        |               |
     BLOCK           PASS
        |               |
        v               v
   remediation      INDEPENDENT
                    STANDARDS
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

Not every trivial task requires every model. The orchestrator should use the smallest sufficient path.

---

# 8. Routing policy

Initial routing:

| Task class | Default model/agent | Escalate to |
|---|---|---|
| Security-sensitive | Astra | Fable / Opus as needed |
| Architecture | Fable 5.1 | Opus + Astra |
| Complex implementation | Opus 5 | Astra / Fable |
| Normal implementation | Sonnet 5 | Opus when blocked |
| Tests / routine fixes | Sonnet 5 | Opus when repeatedly failing |
| Independent security review | Astra | human/project lead for critical findings |
| Independent standards verification | Separate verifier path | Opus/Fable/Astra as evidence requires |

Routing is a starting policy, not a permanent truth.

---

# 9. Agent authority model

No model has unrestricted authority merely because it is the strongest model available.

### Fable
Can propose architecture and sequencing.

### Opus
Can implement complex work and challenge plans with evidence.

### Sonnet
Can implement within approved scope and escalate deviations.

### Astra
Can block a change on security grounds and require remediation, but must support the block with evidence.

### Independent verifier
Determines whether the task satisfies its acceptance and verification criteria.

### Human/project authority
Retains final authority over consequential product, budget, security-risk acceptance, and architectural tradeoffs.

---

# 10. Security boundaries for the agent network

The agent system itself is a security boundary.

Required controls:

1. API keys live outside prompts and repository files.
2. Provider credentials are scoped per environment.
3. Blocks credentials are separated from provider credentials where practical.
4. Agents receive only the tools required for their role.
5. Production access is not automatically granted to implementation agents.
6. Security agents prefer read-only inspection and controlled security tooling.
7. Destructive operations require explicit authorization.
8. Agent-to-agent messages are treated as untrusted input until validated.
9. Tool arguments are validated before execution.
10. Sensitive outputs are excluded from persistent traces.
11. Secrets/tokens/private credentials never enter Alfred learning data.
12. Security findings are persisted with evidence and disposition.

---

# 11. Failure handling

### Sonnet fails repeatedly

Escalate to Opus rather than endlessly retrying the same strategy.

### Opus discovers architectural conflict

Escalate to Fable for plan revision and Astra if the conflict affects a security boundary.

### Astra finds a vulnerability

Mark the work `CHANGES_REQUIRED` or `BLOCK` according to severity. Route remediation to the implementation owner. Re-run the security gate after remediation.

### Agents disagree

Do not average their opinions.

Resolve by:

1. checking repository evidence;
2. checking tests/runtime evidence;
3. checking documented product intent;
4. asking the relevant specialist to produce an evidence-backed analysis;
5. using independent verification;
6. escalating consequential unresolved decisions.

---

# 12. Evidence-driven architecture override protocol

**This architecture is intentionally overridable. It is a proposed execution design, not doctrine.**

Any agent may recommend replacing, merging, splitting, reordering, or removing roles/models/communication paths when it can demonstrate a better approach.

A proposed override must contain:

```text
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

Acceptable evidence includes:

- measured task success;
- test pass/failure rates;
- security findings;
- escaped defects;
- rework rate;
- latency measurements;
- token/API spend;
- tool-call failure rates;
- CI outcomes;
- benchmark results relevant to the task class;
- production/staging observations;
- reproducible architectural defects.

An agent saying "my model is better" is **not** sufficient evidence.

---

# 13. Execution-stage override rule

During actual execution, the current plan may be overturned if implementation evidence shows that the planned architecture is inferior.

The execution agent must not silently change the architecture.

Instead:

```text
DISCOVERY
  -> record evidence
  -> stop affected scope if necessary
  -> propose alternative
  -> compare current vs proposed
  -> security review if boundary changes
  -> independent verification
  -> approve/reject change
  -> update plan
  -> continue execution
```

For urgent security issues, the security gate may temporarily block the affected path while the alternative is evaluated.

The updated architecture becomes authoritative only after the change is documented and the relevant source-of-truth documents are updated.

---

# 14. Measurement / routing feedback loop

Every meaningful agent task should contribute structured routing evidence:

- task class;
- model/agent;
- tools used;
- input/output usage where available;
- latency;
- tests;
- review findings;
- verifier result;
- rework;
- failure category;
- security outcome.

Use this data to determine whether routing should change.

Start recommendations in shadow mode. Do not automatically increase spend, reduce verification, weaken security, or alter merge authority based solely on a learned routing recommendation.

---

# 15. Project applicability

## Start-It / BRO / Veltrix

This is the primary target for the initial Blocks network.

The network should operate against the existing repository and staging environment while preserving the existing CodeGraph, Alfred, GitHub, and Asana operating model.

## L&D platform

Reuse the same agent topology, but provide a separate project context and permissions boundary.

Do not allow project context to leak between the two projects merely because the same Blocks network hosts both.

Shared specialist identities may exist, but project-specific state, credentials, task context, traces, and repositories remain isolated.

---

# 16. Implementation stages

## Stage A — Contract

1. Define four Blocks agent identities.
2. Define provider/model configuration outside source control.
3. Define tool permissions per role.
4. Define request/response contracts.
5. Define trace schema.
6. Define routing table.

## Stage B — Connectivity

1. Connect Blocks MCP/agent interface to the orchestrator.
2. Register Fable, Opus, Sonnet, and Astra agents.
3. Verify each agent independently.
4. Verify agent-to-agent calls.
5. Verify failure/timeouts and bounded retries.

## Stage C — Repository integration

1. Connect GitHub context.
2. Connect Asana task context.
3. Connect CodeGraph.
4. Build targeted-context assembly.
5. Ensure no secrets enter model context.

## Stage D — Execution loop

1. Route task.
2. Plan.
3. Implement.
4. Test.
5. Security review.
6. Independent verification.
7. Trace.
8. Update Asana.

## Stage E — Measurement

1. Collect routing metrics.
2. Compare model performance by task class.
3. Measure cost and latency.
4. Measure rework and escaped defects.
5. Review security outcomes.
6. Propose evidence-backed routing changes.

---

# 17. Definition of Done for the agent architecture

The architecture is not considered operational merely because four APIs respond.

It is operational when:

- all four agents are independently callable;
- Blocks can route between them;
- task context is assembled from the correct sources;
- role boundaries are enforced;
- security review can block implementation;
- independent verification is preserved;
- failures are observable;
- traces contain evidence but no secrets/private reasoning;
- routing/cost data is measurable;
- the execution-stage override mechanism works;
- the architecture can be changed without rewriting the entire system.

---

# 18. Final architectural position

The recommended initial division of labor is:

**Astra = Security**

**Fable 5.1 = Architecture / Systems reasoning**

**Opus 5 = Principal engineering / difficult implementation**

**Sonnet 5 = High-throughput implementation / routine engineering**

**Blocks = agent network and communication layer**

**GitHub = code truth**

**Asana = execution truth**

**CodeGraph = structural truth**

**Tests/runtime = behavioral evidence**

**Alfred = accumulated, provenance-backed engineering experience**

This is the recommended starting architecture, not a permanent hierarchy. The execution system is explicitly designed to overturn it when a better plan is demonstrated with clear, reproducible evidence.
