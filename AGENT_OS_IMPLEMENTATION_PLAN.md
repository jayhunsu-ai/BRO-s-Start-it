# Start-It / BRO / Veltrix — Agent OS Implementation Plan

**Status:** Handoff plan for implementation agents v1.0

## 1. Rule

Do not redesign the architecture during implementation unless an evidence-backed Architecture Override is raised and approved through the Agent OS policy.

Implementation agents should build the specified contracts first.

## 2. Phase 0 — Documentation / contract freeze

Implement nothing expensive.

Verify and reconcile:
- AGENT_OS_ARCHITECTURE.md
- AGENT_OS_BRAIN_AND_POLICY.md
- AGENT_OS_COST_AND_BUDGET.md
- AGENT_OS_SECURITY_AND_PERMISSIONS.md
- AGENT_OS_CONTEXT_AND_CACHE.md
- AGENT_OS_EXECUTION_SPEC.md
- AGENT_OS_DRY_RUN_SPEC.md
- AGENT_MODEL_ROLE_CONTRACT.md
- AGENT_CREATION_PACK.md
- BLOCKS_MULTI_MODEL_AGENT_ARCHITECTURE_PLAN.md
- start-it-agent-operating-system.md

Output: one implementation manifest and a list of contradictions. Do not silently resolve material contradictions. The repository-reality reconciliation is now captured in `AGENT_OS_BLOCKS_RECONCILIATION.md` and supersedes earlier assumptions about Blocks.

## 3. Phase 0.5 — Blocks substrate reconciliation

Complete before Phase 1:
- read the remaining Blocks policy/team/context/proposals/persistence/permission/trust files;
- establish AgentOSProject vs BlocksWorkspace naming;
- decide vendoring/fork/dependency strategy;
- identify the exact provider pre-call cost-control seam;
- identify the MCP authorization boundary;
- record which Blocks primitives are KEEP, EXTEND, WRAP, or NEW in `AGENT_OS_BLOCKS_RECONCILIATION.md`.

No paid provider calls.

## 4. Phase 1 — Schemas

Create versioned schemas for:
- TaskEnvelope;
- Invocation;
- PolicyDecision;
- BudgetReservation;
- ToolRequest;
- ToolResult;
- AgentResult;
- VerificationResult;
- TraceRecord;
- MemoryRecord;
- ProjectContext.

All schemas require ids, timestamps, project identity, and provenance where applicable.

## 5. Phase 2 — Policy engine

Implement:
- precedence;
- authorization;
- project isolation;
- scope;
- model eligibility;
- destructive-action checks;
- security classification.

Return ALLOW / DENY / ESCALATE / REQUIRES_HUMAN.

Unit-test every deny condition.

## 6. Phase 3 — Cost controller

Implement:
- pricing configuration outside source;
- reservation;
- reconciliation;
- task/day/month ceilings;
- retry budgets;
- child-worker budgets;
- cache-aware estimates;
- spend ledger;
- circuit breaker;
- emergency shutdown.

No provider integration yet.

## 7. Phase 4 — Context/cache engine

Implement:
- layered context;
- CodeGraph retrieval;
- verified memory retrieval;
- context minimization;
- secret redaction;
- cache-safe stable prefixes;
- freshness metadata.

## 8. Phase 5 — Tool gateway

Implement one validated gateway for all external actions.

Require:
- project;
- role;
- action;
- target;
- environment;
- schema validation;
- policy decision.

## 9. Phase 6 — Agent network

Implement:
- AgentNetwork interface;
- BlocksAdapter;
- agent discovery;
- invocation;
- timeout/cancel;
- health;
- normalized messages.

No Blocks-specific calls outside the adapter.

## 10. Phase 7 — Orchestration

Implement the execution state machine.

Start with:
- one task;
- one worker;
- one verifier.

Then add bounded parallelism.

## 11. Phase 8 — Verification

Implement:
- independent verifier;
- exact dispositions;
- evidence requirements;
- remediation loop;
- security gate integration.

## 12. Phase 9 — Trace / Alfred

Implement:
- append-only structured traces;
- validation;
- provenance;
- distillation;
- memory namespaces;
- no-secret/no-private-reasoning safeguards.

## 13. Phase 10 — Dry-run simulator

Implement all mandatory scenarios in AGENT_OS_DRY_RUN_SPEC.md.

This phase must pass before real provider keys are introduced.

## 14. Phase 11 — Provider rollout

Roll out:
1. low-cost classification;
2. Sonnet implementation;
3. Opus command path;
4. Astra security;
5. Fable architecture escalation.

Start with tiny task budgets and shadow routing.

## 15. Phase 12 — Measured optimization

Measure:
- verified success;
- cost;
- cache hit rate;
- rework;
- latency;
- security findings;
- escaped defects.

Only evidence-backed routing changes are allowed.

## 16. Implementation constraints

- use existing project conventions;
- no secrets in source;
- no provider keys in prompts;
- no unrestricted self-modification;
- no direct provider calls outside the provider gateway;
- no direct Blocks calls outside BlocksAdapter;
- no silent budget increases;
- no infinite retries;
- no bypassing verifier;
- no cross-project memory access.

## 17. Definition of Done

The Agent OS is ready for real work when the architecture, policies, dry-run scenarios, schemas, gateways, orchestration, verification, trace, and provider rollout all pass their acceptance criteria.
