# Agent OS — zero-cost infrastructure (Phase 1)

Scoped exactly per instruction: contracts, policy adapter, project/workspace
distinction, cost-controller simulation, tool-gateway boundary, and mock
provider / dry-run tests. **No real provider APIs, no credentials, no
network calls anywhere in this package.** `npm test` makes zero paid API
calls by construction — there is no code path here that can reach a real
provider.

## What this is, and isn't

This package does **not** modify `hamedgitty/bloks`. It's a standalone,
dependency-light TypeScript package that:

- vendors a type-compatible copy of Blocks' `ProviderDriver` contract
  (`src/contracts.ts`, copied from `server/contracts.ts` at commit `b4ac3ff`,
  file sha `cefaeb1` — see that file's header for the exact provenance and
  staleness caveat: if Blocks' contracts.ts changes, this copy goes stale
  silently, there is no automated check for that yet);
- implements Agent OS's own Policy Engine and Cost Controller as new,
  independent authorities — see `AGENT_OS_BLOCKS_IMPLEMENTATION_MANIFEST.md`
  §4.1/§4.2 for why these are *not* wrappers around Blocks'
  `server/policy.ts` / `server/usage.ts`;
- ships the one real integration point Phase 0.5 confirmed exists —
  `createGatedOnAsk` in `src/policy-engine.ts` — as an importable function,
  documented for wiring into `server/harness/ask-broker.ts`'s `onAsk`
  callback (via `server/drivers/claude.ts`), but does **not** wire it in,
  since that would mean editing a third-party open-source repository this
  project doesn't own or maintain.

## Layout

| File | Implements |
|---|---|
| `src/contracts.ts` | Agent OS schemas (`TaskEnvelope`, `ActionRequest`, `PolicyDecision`, `CostEvent`, `TraceEntry`, ...) + vendored `ProviderDriver` family |
| `src/policy-engine.ts` | 10-level precedence policy engine (AGENT_OS_BRAIN_AND_POLICY.md §3/§12) + `createGatedOnAsk` |
| `src/cost-controller.ts` | Budget hierarchy, $500/$50 defaults, reservation, circuit breaker, kill switch (AGENT_OS_COST_AND_BUDGET.md §2–§7, §13) — SIMULATED pricing only |
| `src/project-context.ts` | `AgentOSProject` vs. Blocks' `BlocksWorkspaceRef`, resolving manifest §4.4 |
| `src/tool-gateway.ts` | Single choke point combining Policy + Cost before any action |
| `src/mock-provider.ts` | Scripted, offline `ProviderDriver` implementation — AGENT_OS_COST_AND_BUDGET.md §12's "simulated provider mode" |
| `src/dry-run.ts` | End-to-end harness: TaskEnvelope → Gateway → MockProvider → Trace |
| `test/*.test.ts` | `node:test` coverage for all of the above |

## Running

```
npm install
npm test        # node:test via tsx — zero network access required
npm run typecheck
```

## Deliberately NOT here (per instruction)

- No real Anthropic/OpenAI/other provider client.
- No credential handling of any kind.
- No wiring into `hamedgitty/bloks` — see the integration note above.
- No CodeGraph/GitHub/Asana MCP servers — those remain the missing
  prerequisites recorded in the manifest §5.
- The other three Blocks drivers (Codex, Gemini CLI, Pi) were not
  re-verified to share `claude.ts`'s `onAsk` shape; `createGatedOnAsk` is
  only confirmed correct for the Claude Code driver.

## Known gaps this package does not (and cannot, from outside Blocks) close

- Claude Code's `bypassPermissions` mode means no ask ever reaches
  `ask-broker.ts` at all — `createGatedOnAsk` has nothing to gate in that
  mode. Only changing what permission mode a driver requests can close
  this.
- Real pricing (`SIMULATED_PRICING` in `cost-controller.ts`) is a
  placeholder and must be replaced with verified current numbers before
  any real spend is gated on it (manifest §4.7 / §7 risk register).
- `policy.ts`'s actual caller site inside Blocks is still unconfirmed
  (manifest §9) — this package's Policy Engine does not depend on that
  answer, but reconciling the two systems still does.
