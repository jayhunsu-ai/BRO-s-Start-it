# START HERE — Agent Fleet Setup Runbook

This is the operational runbook for going from an empty/near-empty Start-It repository to the first coordinated engineering agents.

## 0. What you are setting up

Do NOT start by spawning every agent.

Build the control plane first:

`Bloks -> repository -> CodeGraph -> agent prompts -> trace capture -> Asana dependencies -> first Senior Engineer -> parallel domain reconnaissance -> verification -> implementation waves`

The first agents are teachers for Alfred. Alfred should not be expected to already know the repository.

## 1. Prepare the machine

Use the machine where the coding agents will actually execute.

Install/confirm:

- Git
- GitHub authentication
- Node.js/npm if the repository requires them
- Python/uv or the repository's documented Python environment if applicable
- Docker if the project requires containers
- the coding-agent CLI/client you will use
- Bloks, if Bloks is the agent host/orchestrator you are using

Do not install arbitrary global packages before checking the repository's package/environment files.

## 2. Clone the repository

```bash
git clone https://github.com/jayhunsu-ai/BRO-s-Start-it.git
cd BRO-s-Start-it
```

Check:

```bash
git status
git branch -a
git log --oneline --decorate -10
```

Create a clean working branch for the initial engineering work. Keep `codex/staging-environment` as the planning/reference branch unless a deliberate merge is approved.

## 3. Read the repository's actual instructions

Before asking an agent to code, inspect:

- README
- package manifests
- lockfiles
- environment examples
- Docker files
- CI workflows
- contribution/development instructions
- test configuration
- existing source directories

Planning documents are context. The source tree is the implementation truth.

## 4. Install and validate CodeGraph

Use the CodeGraph MCP/index implementation supported by the actual agent client/Bloks environment.

Do not invent a command here: first identify the exact CodeGraph server/package/config supported by the environment.

Configure it against the repository root.

Required capabilities:

- project/file map
- symbol lookup
- references
- imports/dependencies
- caller/callee traversal
- HTTP route mapping where supported
- frontend/backend relationship mapping where supported
- impact analysis

Then run a smoke test asking for:

1. top-level project map
2. entry points
3. major modules
4. API routes
5. frontend routes/components
6. dependency relationships
7. test locations

Record the graph/index version and repository commit.

## 5. Create the trace directory

Use a location agreed with the Alfred learning pipeline. Example:

```text
.agent-learning/
  traces/
  distilled/
  routing/
  schemas/
```

Keep secrets and credentials out of it. If the trace directory is committed, define a redaction policy and review it before the first commit.

Each trace must contain:

- task ID
- agent role
- repository/ref/commit
- CodeGraph investigation
- relevant files/symbols
- observed facts
- high-level decisions
- changes
- commands/tests/results
- review findings
- verifier disposition
- lessons/follow-up

Do not store private chain-of-thought.

## 6. Install the agent creation pack

Use:

`AGENT_CREATION_PACK.md`

This defines the canonical personas and operating contracts.

Each spawned agent should receive only the persona relevant to its role plus the task context. Do not stuff the entire project history into every agent.

## 7. Configure Bloks

Bloks is the execution/orchestration layer in this workflow.

Create a project/workspace for Start-It / BRO / Veltrix.

Connect the repository.

Give the agents access only to the tools needed for their role.

Minimum useful tool groups:

### All engineering agents
- Git repository access
- CodeGraph
- local shell/test execution
- task tracker access sufficient to read their task and update status
- trace writer

### Chief of Staff
- repository read access
- CodeGraph
- Asana/task management
- trace read/write
- reporting/coordination tools

### Security
- CodeGraph
- repository/config read access
- test/runtime tools
- security/dependency intelligence when available

### Infrastructure
- repository/config access
- Docker/runtime tools
- CI/deployment/observability tools as appropriate

### Standards Verifier
- repository read access
- CodeGraph
- tests
- task evidence
- traces

Do not give every agent unrestricted write access to every external system.

## 8. Create the initial agent roster

Start with these roles:

1. Chief of Staff — coordination and dependency authority
2. Senior/Principal Engineer — architecture
3. Security Engineer — security baseline
4. Infrastructure Engineer — runtime/deployment baseline
5. Standards Verifier — independent verification

Do NOT initially spawn large numbers of implementation agents.

First establish the map.

After the baseline, add:

6. Backend IC(s)
7. Frontend Studio IC(s)
8. Frontend Motion IC if needed
9. Product
10. Bug Triage
11. Sprint Lead
12. Release
13. Waitlist

## 9. Give the Chief of Staff the first assignment

Task:

`S0 — Establish the engineering baseline and execution order.`

Instructions:

- inspect the repository
- use CodeGraph first
- inspect the staging branch documents
- compare plans to actual implementation
- identify missing foundations
- inspect existing Asana tasks
- identify duplicates/obsolete work
- propose execution waves
- do not start broad feature coding

Output:

- architecture baseline
- dependency map
- security/infrastructure blockers
- proposed wave order
- assignments
- acceptance criteria

## 10. Run the reconnaissance wave

Run these in parallel only after the Senior Engineer establishes the graph/index:

### Senior Engineer
Architecture and dependency map.

### Security Engineer
Trust boundaries, auth, authorization, secrets, routes, data access, external integrations.

### Infrastructure Engineer
Runtime, environments, Docker, CI/CD, deployment, observability, external services.

Each must use CodeGraph and cite repository evidence in its trace.

## 11. Reconcile the staging branch

Inspect `codex/staging-environment`.

Classify every relevant planning artifact as:

- implemented
- planned
- future-state
- contradicted
- obsolete
- unknown

Never silently convert a planned document into an implementation assumption.

## 12. Establish Alfred's first learning sink

At this point Alfred is still not the expert.

Create the pipeline:

`agent -> raw trace -> validation -> Standards Verifier -> distilled lesson -> provenance -> Alfred memory`

The first objective is not retrieval quality. It is clean data collection.

## 13. Add EvoRoute-style measurement

Do not enable automatic model switching yet.

Record:

- task class
- agent role
- model
- tool set
- estimated/actual cost where available
- latency
- tests
- review result
- verifier result
- rework
- failure category

Start routing experiments in shadow mode.

## 14. First verification gate

The Standards Verifier checks:

- CodeGraph was actually used
- conclusions match source evidence
- no hidden reasoning was stored
- traces have commit/ref provenance
- security findings are evidence-based
- architecture claims distinguish fact from inference
- proposed task order respects dependencies

If this fails, do not start Sprint 1.

## 15. Reorder Asana

After verification, the Chief of Staff turns the reconnaissance into the canonical backlog.

Broad ordering:

1. security/credential containment
2. environment/infrastructure foundation
3. auth/authorization/tenant boundaries
4. CI/regression protection
5. core data/event/idempotency primitives
6. API contracts
7. backend domain primitives
8. frontend shell/domain surfaces
9. BRO/AI capabilities
10. product features
11. sensitive workflows/payments
12. hardening/red-team
13. release

Dependencies outrank dates.

## 16. Start implementation

Only now spawn the first implementation batch.

Each task follows:

`task -> CodeGraph -> targeted source -> plan -> implement -> tests -> impact analysis -> self-review -> trace -> lead review -> Standards Verifier`

Keep tasks small enough to verify independently.

## 17. Git discipline

Agents should:

- work on explicit branches
- make focused commits
- avoid unrelated formatting churn
- never commit secrets
- reference the task ID in commits/PRs when appropriate
- rebase/merge only under the agreed workflow

## 18. Alfred learning cycle after each task

When a task is approved:

1. preserve raw trace
2. attach commit/ref
3. record verification
4. extract durable lessons
5. assign provenance
6. update Alfred memory
7. optionally update routing statistics

Never let an unverified trace become a high-confidence architectural fact.

## 19. When to add more agents

Scale the fleet only when the work is actually parallelizable.

Good parallelism:
- independent frontend/backend work after contracts exist
- separate security/infrastructure reconnaissance
- independent test suites
- separate domain modules

Bad parallelism:
- five agents discovering the repository independently
- multiple agents rewriting the same architecture
- implementation before API contracts exist
- feature agents working while security prerequisites are unresolved

## 20. First-day success criteria

By the end of the first setup cycle you should have:

- clean repository checkout
- working agent host/Bloks environment
- CodeGraph functioning
- architecture baseline
- security baseline
- infrastructure baseline
- staging-document reconciliation
- structured trace capture
- Standards Verifier gate
- canonical Asana dependency order
- agent personas installed
- first implementation wave assigned

The objective is not maximum code on day one.

The objective is to establish a system that can safely produce better code and better engineering knowledge on every subsequent day.
