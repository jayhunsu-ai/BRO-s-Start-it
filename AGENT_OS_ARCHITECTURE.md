# Start-It / BRO / Veltrix — Agent OS Architecture

**Status:** Execution-ready architecture specification v1.0  
**Target ref:** `codex/staging-environment`

## 1. Purpose

Define the system that surrounds the Blocks agent network. Blocks is a replaceable **agent-network adapter** for discovery and agent-to-agent communication. It is not the Agent OS, source of truth, budget authority, security policy, context manager, verifier, or memory system.

The Agent OS owns orchestration, policy, budgets, permissions, context assembly, execution state, evidence, verification, and Alfred learning.

## 2. Layered architecture

```
USER / PROJECT AUTHORITY
        |
        v
AGENT OS BRAIN
  intent / planning / state / decisions
        |
        v
POLICY ENGINE
  authority / security / budget / scope / model rules
        |
        +-----------------------------+
        |                             |
        v                             v
CONTEXT + CACHE ENGINE           COST CONTROLLER
        |                             |
        +-------------+---------------+
                      |
                      v
              AGENT NETWORK API
                      |
                BlocksAdapter
                      |
        +-------------+-------------+
        |             |             |
      Opus          Sonnet        Astra
        |             |             |
      Fable       Foot Soldiers  Security
        |
        v
TOOLS: GitHub / Asana / CodeGraph / CI / runtime
        |
        v
VERIFICATION + EVIDENCE
        |
        v
TRACE -> ALFRED DISTILLATION -> MEMORY
```

## 3. Component ownership

| Component | Owns | Must not own |
|---|---|---|
| Agent OS Brain | planning, task state, synthesis | provider billing |
| Policy Engine | authority, permissions, scope, model eligibility | hidden model reasoning |
| Cost Controller | reservations, budgets, circuit breakers, spend ledger | task correctness |
| Context Engine | retrieval, minimization, cache-safe assembly | authorization decisions |
| Agent Network Adapter | agent discovery/message transport | budget or security authority |
| Blocks Adapter | Blocks-specific transport | source of truth |
| Tool Gateway | validated tool invocation | model routing |
| Verifier | independent acceptance decision | implementation |
| Alfred | provenance-backed learning | unverified truth |
| GitHub | code/history truth | orchestration |
| Asana | execution/task truth | code truth |

## 4. Blocks boundary

Implement an internal interface such as:

```
AgentNetwork
  discover(capability)
  invoke(target, task_envelope)
  stream(event)
  cancel(invocation)
  health()
```

The first implementation is `BlocksAdapter`.

No business logic should depend directly on Blocks-specific APIs. This makes a future native network possible without rewriting the Agent OS.

## 5. Core invariants

1. No model call bypasses Policy Engine and Cost Controller.
2. No agent can raise its own budget.
3. No implementation agent can bypass verification.
4. Security policy can block execution.
5. Project isolation is enforced before context assembly.
6. Stable context is cacheable; secrets are never cacheable into model context.
7. Agents receive least privilege.
8. Every consequential action has evidence and provenance.
9. Failed work is bounded by retry, time, tool, worker, and spend limits.
10. Human/project authority remains final for consequential product, budget, security-risk acceptance, and architecture decisions.

## 6. State machine

```
PLANNED
  -> AUTHORIZED
  -> CONTEXT_READY
  -> EXECUTING
  -> VERIFYING
  -> APPROVED
  -> COMMITTED
  -> LEARNED

Failure paths:
AUTHORIZED -> BLOCKED
EXECUTING -> FAILED
VERIFYING -> CHANGES_REQUIRED -> EXECUTING
Any state -> CANCELLED
Budget/security violation -> HALTED
```

State transitions must be explicit and auditable.

## 7. Agent lifecycle

A worker is created from:

`role + task + skills + tools + context + budget + expiry`

Workers are disposable. Durable knowledge belongs in the trace/memory system, not inside an agent persona.

## 8. Source-of-truth hierarchy

For engineering facts:

1. running system/runtime evidence
2. tests/CI
3. repository source/configuration
4. git history
5. CodeGraph
6. task tracker
7. planning documents
8. agent assertions

This hierarchy is contextual: planning documents define intent, while source/runtime evidence establishes current reality.

## 9. Project isolation

Every task carries `project_id`.

A task may access only:
- its project repository/ref;
- its project task context;
- its authorized tools;
- its project's memory namespace.

Start-It/BRO and L&D must never share credentials, raw traces, or project-specific memory.

## 10. Failure containment

Every invocation has:
- timeout;
- maximum tool calls;
- maximum output;
- maximum retries;
- maximum parallel children;
- maximum spend;
- allowed model tiers.

Any limit produces a structured halt, not an implicit retry.

## 11. Build order

1. schemas/contracts
2. policy engine
3. cost controller
4. context/cache engine
5. tool gateway
6. AgentNetwork interface + BlocksAdapter
7. orchestration state machine
8. workers
9. verification
10. trace/Alfred
11. dry-run simulator
12. real provider integration
13. measured rollout

## 12. Acceptance criteria

The architecture is accepted when a dry-run proves:
- unauthorized tool calls are denied;
- over-budget model calls are denied;
- repeated failures stop;
- cache misses trigger cost re-evaluation;
- security blocks propagate;
- verifier rejection triggers bounded remediation;
- project isolation holds;
- Blocks can be replaced behind the network interface;
- no real provider call is required for policy tests.
