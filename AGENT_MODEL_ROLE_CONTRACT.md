# Start-It / BRO / Veltrix — Agent Model & Role Contract

**Status:** Canonical execution contract — v2.0
**Target ref:** `codex/staging-environment`
**Scope:** Shared Agent OS for Start-It / BRO / Veltrix, reusable by the L&D platform with isolated project context and credentials.

## 1. Purpose

This contract defines how agent roles, frontier models, tools, authority, routing, evidence, escalation, and high-throughput execution fit together.

The contract deliberately separates **role from model**.

A role defines what an agent is allowed and expected to do. A model is an execution resource selected for that role and task class. Routing may change when measured evidence proves a better configuration.

The system is optimized for:

- correctness;
- security;
- shippable increments;
- independent verification;
- bounded AI spend;
- high parallel throughput;
- reusable engineering experience for Alfred.

## 2. Current frontier model policy

The September 2026 frontier has changed the previous routing assumptions.

### Chief of Staff default: Claude Opus 5.5

Use **Claude Opus 5.5** as the default Chief of Staff.

Rationale:

- Anthropic describes Opus 5.5 as its leading model and reports strong performance on agentic coding, computer use, and knowledge work.
- Anthropic reports Opus 5.5 performs at roughly the level of Fable 5.1 on most work while costing materially less.
- Current API pricing is $4/M input and $20/M output, versus $10/M and $50/M for Fable 5.1.
- Chief-of-Staff work is continuous: repository discovery, task decomposition, dependency management, routing, synthesis, escalation, and state management. It therefore benefits from strong long-horizon reasoning, but does not justify paying Fable 5.1 rates for every coordination turn.

### Fable 5.1: escalation architecture specialist

Fable 5.1 remains available for:

- unusually difficult cross-domain architecture;
- competing-system architecture analysis;
- long-horizon technical planning where Opus 5.5 evidence is insufficient;
- architectural deadlocks;
- high-value design synthesis.

Fable is **not** the default Chief of Staff.

### GPT-6 Astra: security authority and independent frontier reviewer

Astra is not the Chief of Staff by default.

Use Astra for:

- adversarial security analysis;
- security gates;
- high-risk trust-boundary review;
- independent challenge of consequential designs;
- security-sensitive release decisions.

Astra may challenge the Chief of Staff and may block security-sensitive work when supported by evidence.

### Sonnet 5: high-throughput implementation

Use Sonnet 5 for the majority of ordinary implementation, tests, routine debugging, documentation, and bounded repair loops.

### OpenAI GPT-5.6 / GPT-6 lower-cost tiers

Use current lower-cost OpenAI tiers for:

- classification;
- lightweight repository reconnaissance;
- task normalization;
- duplicate detection;
- evidence extraction;
- Alfred distillation;
- routine coordination;
- large numbers of independent foot-soldier jobs where frontier-level reasoning is unnecessary.

Model IDs and provider settings live outside source control and may be updated without changing role contracts.

## 3. Command layer

The command layer is intentionally small.

| Role | Default model | Purpose | Authority |
|---|---|---|---|
| Chief of Staff | Opus 5.5 | orchestration, sequencing, routing, dependency control | execution coordination |
| Architecture Lead | Fable 5.1 | difficult systems architecture and cross-domain design | architecture proposals |
| Security Authority | GPT-6 Astra | adversarial security and security gate | can block security-sensitive work |
| Independent Standards Verifier | model different from primary implementer | final evidence-based verification | APPROVE / CHANGES REQUIRED / REJECT |
| Release Authority | Opus 5.5 / Astra when security-sensitive | release readiness, rollback, production evidence | release gate within delegated scope |

No command agent owns the entire system unilaterally.

Human/project authority retains final authority over consequential product, budget, security-risk acceptance, and architectural tradeoffs.

## 4. Specialist layer

Specialists are invoked dynamically. They are not permanently active.

### Repository / discovery

- Repo Scout
- CodeGraph Analyst
- Dependency Tracer
- Impact Analyst
- Git History Investigator
- Duplicate Work Detector

### Engineering

- Backend Engineer
- Frontend Engineer
- Database Engineer
- API Contract Engineer
- Integration Engineer
- Migration Engineer
- Refactoring Engineer
- Dependency Upgrade Engineer
- Performance Engineer

### Testing / quality

- Test Generator
- Unit Test Worker
- Integration Test Worker
- E2E Worker
- Regression Hunter
- Failure Injection Worker
- Test Repair Worker
- Evidence Agent

### Security

- Authentication Auditor
- Authorization Auditor
- Tenant Isolation Auditor
- RLS Auditor
- Secret / Credential Auditor
- Dependency / CVE Auditor
- API Abuse Auditor
- Input Validation Auditor
- Webhook Security Auditor
- Payment Security Auditor
- Supply Chain Auditor
- Agent Permission Auditor

### L&D domain

- Identity Agent
- Biometric Integration Agent
- Liveness / Face-Match Agent
- Exam Session Agent
- Proctoring Agent
- Payment / Remita Agent
- Multi-Tenant Agent
- Demo / Evaluation Agent

### Platform / DevOps

- CI Repair Worker
- Docker / Runtime Worker
- Environment Auditor
- Deployment Investigator
- Healthcheck Worker
- Observability Worker
- Log Investigator
- Rollback Planner
- Infrastructure Cost Auditor

### Product / execution

- Acceptance Criteria Agent
- Backlog Decomposer
- Dependency Planner
- Scope Guardian
- Sprint Coordinator
- Bug Triage Agent
- Waitlist Agent
- Release Evidence Agent
- Documentation Agent
- Runbook Agent
- ADR Agent

These are capabilities, not necessarily separate long-lived model sessions.

## 5. Foot-soldier model

The system should prefer many narrow, disposable execution workers over making the command agents do every task.

A foot soldier:

- receives one bounded objective;
- gets only the minimum task/repository context;
- has narrowly scoped tools;
- makes a small number of model calls;
- produces a structured result;
- does not own architecture;
- does not silently expand scope;
- can be spawned in parallel with other independent workers;
- is discarded after the task unless its evidence is worth retaining.

Examples:

- find all money fields and report their types;
- add missing 401/403/404 tests;
- locate every caller of a symbol;
- write tests for a specific endpoint;
- check one migration for tenant_id;
- repair one failing CI job;
- scan one dependency group;
- validate one OpenAPI schema;
- inspect one payment retry path;
- reproduce one bug;
- gather evidence for one acceptance criterion.

## 6. Task contract

Every invocation receives a machine-readable task envelope containing at minimum:

- task_id;
- project_id;
- repository;
- ref/commit;
- objective;
- in_scope;
- out_of_scope;
- acceptance_criteria;
- dependencies;
- required_evidence;
- primary_role;
- reviewer_role;
- allowed_tools;
- allowed_paths/actions;
- model_budget;
- time_budget;
- escalation_conditions;
- security_classification.

### Budget

A task may specify:

- maximum model calls;
- maximum output tokens;
- maximum wall-clock time;
- maximum tool calls;
- maximum parallel workers;
- maximum spend;
- allowed model tiers.

Budgets are hard constraints unless the orchestrator explicitly escalates and reauthorizes.

## 7. Result contract

Every agent returns structured evidence:

- status;
- summary;
- changed_files;
- tests_run;
- test_results;
- evidence;
- assumptions;
- unresolved_risks;
- blockers;
- follow_up;
- confidence;
- escalation;
- trace_id.

Implementation agents also return the resulting commit/PR reference when applicable.

Agents must never claim success solely because a command exited successfully. The result must identify what was actually verified.

## 8. Evidence contract

Important observations use:

- OBSERVED
- VERIFIED
- INFERRED
- STALE
- UNKNOWN

The evidence chain is:

`task -> repository evidence -> implementation -> tests/runtime -> review -> verification -> trace -> Alfred`

Private chain-of-thought is not stored.

Durable Alfred knowledge must include provenance: task, repository ref/commit, source evidence, verification state, confidence, and timestamp.

## 9. Execution lifecycle

```
TASK
  -> classify
  -> Chief of Staff establishes scope/dependencies
  -> CodeGraph + targeted discovery
  -> assemble minimal context
  -> select skills
  -> select role
  -> select model
  -> spawn specialists / foot soldiers
  -> implement
  -> test
  -> security gate when required
  -> independent verification
  -> commit / PR
  -> update Asana
  -> structured trace
  -> Alfred distillation
```

The smallest sufficient path should be used. A trivial documentation fix should not wake the entire command layer.

## 10. Escalation policy

- Foot soldier blocked or uncertain -> specialist.
- Sonnet/normal implementer fails repeatedly -> Opus 5.5.
- Opus 5.5 encounters architectural conflict -> Fable 5.1.
- Any security-boundary conflict -> Astra.
- Security finding -> remediation owner -> Astra re-check.
- Verifier disagreement -> evidence review, then relevant command specialist.
- Consequential unresolved decision -> human/project authority.

Escalation is evidence-driven, not prestige-driven.

## 11. Security and tool authority

- Provider credentials stay outside prompts and source control.
- Blocks credentials are separated from provider credentials where practical.
- Agents receive least-privilege tools.
- Implementers do not receive default production write/destructive access.
- Security agents prefer read-only inspection.
- Destructive operations require explicit authorization.
- Agent messages are untrusted input until validated.
- Tool arguments are validated.
- Secrets never enter traces or Alfred learning.
- Project contexts and credentials are isolated between Start-It/BRO and L&D.

## 12. Routing policy

Initial routing:

| Task | Default | Escalation / independent path |
|---|---|---|
| Chief of Staff | Opus 5.5 | Fable / human for consequential decisions |
| Architecture | Fable 5.1 | Opus 5.5 + Astra when relevant |
| Security | GPT-6 Astra | human for critical risk acceptance |
| Complex engineering | Opus 5.5 | Fable / Astra |
| Normal engineering | Sonnet 5 | Opus 5.5 |
| Large mechanical batch | Sonnet 5 + foot soldiers | Opus for failures |
| Classification / triage | low-cost GPT-5.6 tier | Sonnet |
| Repository discovery | low-cost GPT-5.6 tier + CodeGraph | Sonnet / Opus |
| Test generation | Sonnet 5 | Opus |
| Routine test repair | Sonnet 5 / foot soldier | Opus |
| Documentation | low-cost tier / Sonnet | Opus for architecture docs |
| Alfred distillation | low-cost tier | Sonnet |
| Independent verification | different model family from implementer when practical | frontier escalation |

Routing begins in shadow mode and is changed only from measured evidence.

## 13. Measurement

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

Optimize for cost per verified successful task, not cost per token alone.

## 14. Definition of Done for an agent task

A task is DONE only when:

- implementation exists where required;
- acceptance criteria are satisfied;
- relevant tests pass;
- security implications are checked;
- structural impact is checked where applicable;
- evidence is recorded;
- reviewer passes;
- independent Standards Verification passes;
- required trace is captured;
- durable knowledge is distilled when appropriate.

## 15. Definition of Done for the Agent OS

The Agent OS is operational when:

- roles can be invoked independently;
- models can be swapped without rewriting role definitions;
- the Chief of Staff can route work dynamically;
- foot soldiers can execute bounded parallel tasks;
- security can block work;
- independent verification cannot be bypassed;
- tool permissions are enforced;
- cost and routing metrics are captured;
- project contexts remain isolated;
- Alfred receives provenance-backed engineering experience;
- routing can evolve without architectural rewrite.
