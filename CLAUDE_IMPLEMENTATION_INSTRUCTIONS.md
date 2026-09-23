# Claude Implementation Instructions — Start-It / BRO / Veltrix Agent OS

You are the implementation engineer receiving a pre-designed Agent OS.

## Mission

Implement the architecture in the repository exactly as specified by the Agent OS documents. Do not spend the user's provider budget redesigning the system.

## Read first

Read in this order:

1. AGENT_OS_ARCHITECTURE.md
2. AGENT_OS_BRAIN_AND_POLICY.md
3. AGENT_OS_COST_AND_BUDGET.md
4. AGENT_OS_SECURITY_AND_PERMISSIONS.md
5. AGENT_OS_CONTEXT_AND_CACHE.md
6. AGENT_OS_EXECUTION_SPEC.md
7. AGENT_OS_DRY_RUN_SPEC.md
8. AGENT_MODEL_ROLE_CONTRACT.md
9. AGENT_CREATION_PACK.md
10. BLOCKS_MULTI_MODEL_AGENT_ARCHITECTURE_PLAN.md
11. start-it-agent-operating-system.md

Then inspect the repository and CodeGraph. Planning documents are intent; repository reality wins.

## First response

Before changing code, produce only:
- repository/ref/commit;
- relevant existing architecture;
- implementation manifest;
- contradictions;
- missing prerequisites;
- estimated implementation phases;
- risk register.

Do not implement until the manifest is coherent.

## Implementation rules

1. Build contracts before integrations.
2. Build policy and cost controls before real providers.
3. Build the Blocks adapter behind an internal AgentNetwork interface.
4. Keep provider credentials outside source.
5. Keep provider-specific logic behind a provider gateway.
6. Keep budget authority outside model authority.
7. Use CodeGraph first for structural questions.
8. Make all tool calls pass through the Tool Gateway.
9. Make all model calls pass through the Cost Controller/provider gateway.
10. Make verification independent from implementation.
11. Prefer disposable bounded workers.
12. Preserve project isolation.
13. Add tests for every policy deny path.
14. Add dry-run tests before enabling paid providers.
15. Never silently change architecture.
16. Raise an Architecture Override when a specification is materially wrong.
17. Never expose secrets or private chain-of-thought in traces.
18. Never add an automatic infinite retry.
19. Never let an agent modify its own budget or permissions.
20. Stop when evidence is insufficient.

## Cost discipline

During implementation:
- prefer local tests and static analysis;
- use dry-run/mock providers;
- avoid real frontier calls until the provider rollout phase;
- keep paid tasks tiny;
- report actual cost when available;
- never assume the $500 ceiling is permission to spend it.

## Required implementation order

Schemas -> policy -> cost -> context/cache -> tool gateway -> AgentNetwork/BlocksAdapter -> orchestration -> verification -> trace/Alfred -> dry-run -> provider rollout -> measured optimization.

## Required handoff

At the end of each phase return:
- changed files;
- tests;
- test results;
- evidence;
- unresolved risks;
- next phase;
- estimated remaining work;
- cost impact;
- architecture deviations, if any.

A phase is not complete because code exists. It is complete only when its acceptance criteria and tests pass.
