# Agent OS × Blocks — Implementation Manifest

**Produced per:** `CLAUDE_IMPLEMENTATION_INSTRUCTIONS.md` → First response (Phase 0)
**Status:** Pre-implementation. No code changed. No provider calls made.

---

## 1. Repositories / refs inspected

| Repo | Ref | Commit (HEAD) | Role |
|---|---|---|---|
| `jayhunsu-ai/bro-s-start-it` | `codex/staging-environment` | `81b0dc2` | Agent OS planning corpus (11 spec docs, all read) |
| `jayhunsu-ai/bro-s-start-it` | `main` | `7edc863` | Same repo's default branch — docs + one `main.rs`, not otherwise inspected |
| `hamedgitty/bloks` | `main` | `b4ac3ff` | **"Blocks"** — the actual codebase in question |

`hamedgitty/bloks` has no `codex/staging-environment` branch — only `main`. The Agent OS docs' "target ref: `codex/staging-environment`" refers to the **planning repo's** branch, not a branch of Blocks itself. This is worth confirming with the user before anyone starts branching Blocks under that name.

Docs read in full, in the order `CLAUDE_IMPLEMENTATION_INSTRUCTIONS.md` specifies: `AGENT_OS_ARCHITECTURE.md`, `AGENT_OS_BRAIN_AND_POLICY.md`, `AGENT_OS_COST_AND_BUDGET.md`, `AGENT_OS_SECURITY_AND_PERMISSIONS.md`, `AGENT_OS_CONTEXT_AND_CACHE.md`, `AGENT_OS_EXECUTION_SPEC.md`, `AGENT_OS_DRY_RUN_SPEC.md`, `AGENT_MODEL_ROLE_CONTRACT.md`, `AGENT_CREATION_PACK.md`, `BLOCKS_MULTI_MODEL_AGENT_ARCHITECTURE_PLAN.md`, `start-it-agent-operating-system.md`, `AGENT_OS_IMPLEMENTATION_PLAN.md`. `docs/START_HERE_AGENT_FLEET.md` and `docs/AGENT_EXPERIENCE_LADDER.md` were located but not yet read line-by-line — flagged under §5.

Blocks repository read: `README.md`, `docs/ARCHITECTURE.md`, `server/index.ts` (6,805 lines — skimmed via import graph, not read in full), `server/policy.ts`, `server/ledger.ts`, `server/usage.ts`, `server/limits.ts`, `server/projects.ts`, `server/teams.ts`, `server/providers.ts`, `server/mcp-client.ts`, plus directory listings of `server/`, `server/drivers/`, `server/harness/`, `src/`.

---

## 2. What Blocks actually is (repository reality)

The single most important finding: **Blocks is not what the Agent OS documents describe.**

The docs (`AGENT_OS_ARCHITECTURE.md` §1, `BLOCKS_MULTI_MODEL_AGENT_ARCHITECTURE_PLAN.md` §19) describe Blocks as *"a replaceable agent-network adapter for discovery and agent-to-agent communication"* — implying a multi-tenant, hosted, engineering-team orchestration substrate that already talks to GitHub, Asana, and CodeGraph, and that hosts frontier command agents (Opus 5.5, Fable 5.1, Astra) coordinating foot soldiers.

The actual repository, per its own README and `docs/ARCHITECTURE.md`:

> *"A local-first desktop workspace for personal AI agents. Your agents, your machine, your data."* … *"Bloks has no server of its own."*

Concretely:

- **Single-user, single-machine, loopback-only.** The "harness" (`server/`) is an HTTP server bound to `127.0.0.1:8799` with Origin/Host checks — explicitly *not* a public or multi-tenant endpoint (`server/limits.ts`, `docs/ARCHITECTURE.md` "Boundaries worth knowing").
- **No cloud backend, no accounts, no sync.** Persistence is plain JSON under `~/.bloks` (`bots.json`, `bloks.json`, `messages-<id>.json`, `config.json`), written synchronously, no database.
- **General-purpose personal-agent chat app**, not an engineering platform. There is no GitHub integration, no Asana integration, no CodeGraph integration anywhere in `server/`. Tool access comes from whichever engine (Claude Code, Codex, Gemini CLI, Pi) an agent is bound to, plus user-registered MCP servers and Composio connectors.
- **"Projects" already exist** (`server/projects.ts`) but mean something different from Agent OS's `project_id`: a *lens* over local folders + a text brief, scoped to a single local workspace. No credential namespace, no multi-tenant isolation, no environment tier.
- **A policy/permission engine already exists** (`server/policy.ts`): a deny-first, five-field (`tool`, `command`, `path`, `url`, `agent`) allow/deny/ask rule system, evaluated per tool call, with an explicit "no rule → ask a human" default and a human-override ("Wheel") that freezes an agent while a person drives. This is real, tested (per README, ~850 tests including "the policy engine"), and philosophically close to Agent OS's tool policy — but it has none of Agent OS's dimensions: no `project`, `role`, `environment`, `sensitivity`, `destructive-risk` classification, no `ALLOW/DENY/ESCALATE/REQUIRES_HUMAN` verdict set, no policy precedence hierarchy.
- **A tamper-evident ledger already exists** (`server/ledger.ts`): hash-chained, agent-signed, append-only audit log — but of *actions* (agent created/archived, skill installed, policy changed, control taken/released), not of *spend*. It carries no dollars, tokens, or pricing data.
- **Usage tracking already exists** (`server/usage.ts`) but is, by its own doc comment, explicitly non-authoritative: *"this does NOT claim to know how much you have left … a convenience, not an accounting record."* There is no reservation-before-call, no denial, no circuit breaker, no ceiling anywhere in the codebase. `server/limits.ts` caps message/body sizes and SSE client counts — nothing about model-call budgets.
- **Multi-agent coordination already exists** (`server/teams.ts`, "rooms" in `server/index.ts`/`docs/ARCHITECTURE.md`): a senior agent in a room can propose a team of up to `MAX_HIRES = 4` members via a fenced JSON block; the *human* approves before any agent is created. Rooms run members sequentially by seniority, most-senior-speaks-last. This is a real, human-gated analogue of "Chief of Staff + specialists," but hired agents are ordinary persistent Bloks agents (added to `bots.json`) — there is no disposable/expiring worker lifecycle (`role + task + skills + tools + context + budget + expiry`) as `AGENT_OS_ARCHITECTURE.md` §7 requires, and no per-hire model/budget routing.
- **A provider/driver layer already exists** (`server/providers.ts`, `server/drivers/`) that is a reasonable analogue of a "provider gateway": CLI-driven engines (Claude Code, Codex, Gemini CLI, Pi) carry tool use; chat-only providers (OpenRouter, Gemini, Grok, Kimi, Llama, DeepSeek, Mistral, Groq, Ollama, custom OpenAI-compatible) do not. There is no provider named/configured for "Opus 5.5," "Fable 5.1," or "GPT-6 Astra" specifically — Claude models are whatever the Claude Code CLI session is signed into, not selected per role.
- **MCP tool calling exists in two shapes**, neither of which is a central schema-validated gateway: (a) an engine (Claude Code, Codex, …) connects to a registered MCP server directly during its own turn — Blocks "never sees either side of it" (`server/mcp-client.ts` header comment); (b) a small first-party `McpClient` lets the *app itself* list/call tools for UI purposes. Tool-call authorization currently happens by intercepting whatever permission-request protocol message the underlying CLI happens to surface (via `policy.ts` + an "ask-broker"), not by validating every tool call's arguments against a schema before execution.
- **License is FSL-1.1-MIT.** Free for internal use "at work... at any company size, with no fee," but selling Bloks or something substantially like it is prohibited until the two-year MIT conversion. This matters if Veltrix intends to commercialize the resulting Agent OS as a standalone product rather than use it internally.
- **Bloks is an independent, actively maintained open-source project** (maintained by one person, per README), not something owned by `jayhunsu-ai` or Veltrix. None of the eleven Agent OS documents mention this at all — whether the plan is to vendor/fork Blocks internally, or to contribute upstream, is undecided in the source material.

---

## 3. Existing architecture vs. Agent OS component map

| Agent OS component (spec) | Closest Blocks equivalent (reality) | Fit |
|---|---|---|
| Policy Engine (`ALLOW/DENY/ESCALATE/REQUIRES_HUMAN`, precedence hierarchy, project+role+environment+sensitivity) | `server/policy.ts` (`allow/deny/ask`, tool/command/path/url/agent only) | Partial — real but structurally narrower |
| Cost Controller (reservation, ceilings, circuit breakers, spend ledger) | `server/usage.ts` (observational only, explicitly non-authoritative) | **Absent** |
| Spend ledger with pricing/cache metadata | `server/ledger.ts` (audit log of actions, no cost fields) | **Absent** (wrong shape) |
| Context/Cache Engine (L0–L6 layers, CodeGraph retrieval, cache-safe prefixes) | `server/context.ts` (LLM context-window compaction/defrag) | Partial — solves a different problem (fitting a transcript in-window, not layered retrieval) |
| Tool Gateway (schema-validated, single choke point) | `policy.ts` + ask-broker intercepting CLI permission prompts; `mcp-client.ts` (app-side only) | Partial — engine-issued tool calls during a turn are not centrally intercepted |
| AgentNetwork interface / BlocksAdapter (discover/invoke/stream/cancel/health) | `server/harness/registry.ts` (provider *instances*, not capability-based agent discovery); rooms address agents by `@name`, not capability | **Absent** as specified |
| Agent lifecycle (`role+task+skills+tools+context+budget+expiry`, disposable) | `server/teams.ts` (human-approved hires, persistent agents, no expiry/budget) | Partial |
| Project isolation (`project_id`, credential/memory namespace separation) | `server/projects.ts` (folder lens + brief, single local workspace, no credential separation) | Partial — different concept, same name |
| Environment tiers (LOCAL/STAGING/PRODUCTION) | None | **Absent** |
| Verification (independent APPROVE/CHANGES REQUIRED/REJECT) | **None found.** `server/proposals.ts` is *not* a verification system — confirmed by full read (§9). It's a "propose a reusable skill from a taught conversation" gate (≥4 replies, ≥2 user turns, ≥1500 chars, dedup by conversation fingerprint) with its own `ProposalStore`; it stages skill suggestions, never verifies work output. | **Absent** (corrected from "Unconfirmed") |
| Trace / evidence schema with provenance and evidence states | `server/ledger.ts` (hash-chained, signed, but no task/evidence-state/provenance fields); `server/activity.ts` (not yet read) | Partial |
| GitHub as code truth / Asana as execution truth / CodeGraph as structural truth | None present in `server/` | **Absent** |
| Provider gateway (credential separation, per-role model routing) | `server/providers.ts`, `server/drivers/` | Good structural fit, wrong content (no Opus/Fable/Astra role mapping) |

---

## 4. Contradictions (not silently resolved)

1. **Blocks is described as a thin network adapter; it is actually a fairly complete, opinionated product** with its own policy engine, audit ledger, usage tracking, project concept, and team-formation flow. "No business logic should depend directly on Blocks-specific APIs" (`AGENT_OS_ARCHITECTURE.md` §4) is workable, but "Blocks... is not the source of truth, budget authority, security policy, context manager, verifier, or memory system" (§1) is currently **false as a description of the codebase** — Blocks already *is* a (partial, differently-shaped) policy authority, context manager, and memory system for its own domain. Wrapping it behind an adapter doesn't make its existing policy.ts/context.ts/ledger.ts disappear; it creates two parallel systems unless one is explicitly deprecated or delegated to.
2. **Two incompatible security ontologies.** Agent OS policy is tuple-based (`project + agent + role + action + target + environment + sensitivity + approval`) with a 10-level precedence hierarchy and four verdicts. Blocks policy is five-field (`tool/command/path/url/agent`) with three verdicts (`allow/deny/ask`) and no role/environment/sensitivity concept at all. These cannot be reconciled by "the Agent OS calls the Blocks adapter" — either Blocks' policy engine is bypassed entirely (and its ~850 tests' worth of behavior, the Wheel/human-takeover UX, and the "ask a human" default are set aside for agent-originated work), or the Agent OS policy engine has to compile down into Blocks rules (lossy: no way to express `ESCALATE`/`REQUIRES_HUMAN` or environment tiers as a Blocks rule today).
3. **"No secrets in prompts / no secrets in cache"** (Agent OS, multiple docs) vs. Blocks' actual model: engine CLIs (Claude Code, Codex) run with the user's own local credentials and can "read your files, use your logged-in accounts, and drive a computer" (`README.md` Security section, `SECURITY.md` referenced but not read). Blocks' trust model is "you are running this on your machine and you approve consequential actions," not "credentials never reach the agent." These are different security postures, not the same one described two ways.
4. **Project isolation double-booking.** Agent OS's `project_id` (credential/memory/trace namespace separating Start-It/BRO from L&D) and Blocks' `Project` (a UI lens over folders, one person's machine) share a name and nothing else. If the plan is to reuse Blocks' `ProjectStore`, its schema needs new fields (credential scope, environment tier, memory namespace) that don't exist; if the plan is a separate Agent-OS-level project concept, the two "projects" will need a disambiguating name before anyone writes code, or every future doc/PR referencing "project" will be ambiguous.
5. **`$500` ceiling has no enforcement point to attach to.** `AGENT_OS_COST_AND_BUDGET.md` assumes a reservation happens "before a paid model call." In Blocks today, model calls happen inside driver processes (`server/drivers/claude.ts`, `codex.ts`, etc.) that Blocks itself doesn't always fully mediate (CLI engines manage their own provider sessions). A pre-call reservation gate has no existing seam to hook into for CLI-driven engines without changing how those drivers invoke their underlying CLIs.
6. **Chief-of-Staff/foot-soldier model assumes autonomous spawning; Blocks requires human approval for every hire.** This is arguably a feature (matches Agent OS invariant #10, "human/project authority remains final"), but it directly contradicts the throughput assumption in `BLOCKS_MULTI_MODEL_AGENT_ARCHITECTURE_PLAN.md` §5 ("many bounded foot soldiers," "instantiated on demand") — Blocks caps a team at 4 members and gates creation on a person reading a card. Either the foot-soldier volume claims in the plan are wrong for this substrate, or Agent OS needs its own spawning path that bypasses `teams.ts`'s human-approval flow — which then reopens invariant #10.
7. **Specific frontier model names are unverified.** "Claude Opus 5.5," "Claude Fable 5.1," and "GPT‑6 Astra" are asserted with specific pricing ($4/$20 and $10/$50 per M tokens) as of "September 2026." I can't verify GPT‑6 Astra's existence or pricing from what's in these repos, and I'd want to check current provider documentation before this pricing is used to gate real spend, rather than treat the plan's numbers as ground truth.

---

## 5. Missing prerequisites

- **`server/proposals.ts`, `server/activity.ts`, `server/store.ts`, `server/index.ts` (full read), `server/contracts.ts`, `server/context.ts`, `server/permission-proxy.ts`, `server/box.ts`, `server/scout.ts`, `server/composio.ts`** — not yet read in full. `proposals.ts` in particular is load-bearing for §3's "Verification" row and shouldn't be assumed without reading it.
- **`SECURITY.md`, `CONTRIBUTING.md`, `LICENSING.md`, `test/README.md`** in Blocks — referenced by the README but not read; `SECURITY.md` explicitly states parts of the trust model "are not solved yet," which is directly relevant to Agent OS's security invariants.
- **`docs/START_HERE_AGENT_FLEET.md` and `docs/AGENT_EXPERIENCE_LADDER.md`** in the planning repo — located, not read. Names suggest they may contain onboarding/routing detail that supersedes or extends the eleven docs already read.
- **CodeGraph** — referenced throughout the Agent OS docs as mandatory-first tooling ("CodeGraph-first rule") but no CodeGraph installation, index, or MCP server was found anywhere in either repository. **Update:** this is lower-risk than first assessed. Blocks already has two working paths to any MCP server — engine-mediated (a CLI engine like Claude Code connects to a registered server directly during its own turn) and app-mediated (`server/mcp-client.ts`, Bloks' own stdio/streamable-HTTP JSON-RPC client for listing/reading/calling tools independent of any engine). Once a CodeGraph MCP server exists and is registered, Blocks needs no new integration code to reach it. The prerequisite is narrower than "build CodeGraph support into Blocks" — it's "stand up a CodeGraph MCP server and register it," which is outside this repository's scope.
- **GitHub/Asana connection details** — same update as CodeGraph: registering GitHub and Asana as MCP servers (first-party or third-party) is sufficient for Blocks to reach them through either existing path; no new client code is needed in `server/`.
- **Remaining gap this does *not* close (see §4.5 / §4 contradiction on the cost controller):** MCP tool calls an engine makes mid-turn go directly from that engine's process to the MCP server — per `mcp-client.ts`'s own header comment, Blocks "never sees either side of it." So registering CodeGraph/GitHub/Asana as MCP servers solves *data access*; it does not by itself give the Agent OS's Policy Engine or Cost Controller a point to intercept those specific calls. Closing that requires either the MCP servers self-enforcing scope/budget, or extending Blocks' tool-call interception (currently keyed to the CLI's own native permission-prompt protocol) to also see engine-originated MCP calls.
- **A decision on vendoring strategy** — fork Blocks internally (permitted under FSL-1.1-MIT for internal use), contribute the Agent-OS-relevant primitives upstream, or build the Agent OS as a separate service that treats unmodified Blocks purely as one of several `AgentNetwork` backends. This changes almost every phase below and isn't decided in any of the eleven documents.
- **Confirmation of the target repository for Agent OS code.** `codex/staging-environment` exists only in `jayhunsu-ai/bro-s-start-it`, which currently holds planning documents and a single `main.rs`, not a service skeleton. Whether Agent OS code lands there, in a new repo, or inside a fork of `hamedgitty/bloks` is unresolved.

---

## 6. Estimated implementation phases

Per `AGENT_OS_IMPLEMENTATION_PLAN.md`, adjusted for what §2–§5 above actually found:

| Phase | Scope | Adjustment from the plan as written |
|---|---|---|
| 0 (this doc) | Manifest + contradictions | Done here; contradictions in §4 need a decision from the user before Phase 1, per "do not silently resolve material contradictions." |
| 0.5 (new) | Read remaining Blocks files (§5); decide vendoring strategy; name-disambiguate "project" | Not in the original plan — added because §4.4 and §5 block later phases otherwise. |
| 1 | Schemas (`TaskEnvelope`, `Invocation`, etc.) | As written, but `ProjectContext` schema must reconcile with `server/projects.ts`'s existing `Project` type rather than assume a blank slate. |
| 2 | Policy engine | As written, but must decide: replace `policy.ts`, wrap it, or run Agent-OS policy upstream of it. §4.2 is the blocking contradiction. |
| 3 | Cost controller | Net-new — nothing in Blocks to build on per §2/§3. Needs a real hook point into CLI-driven provider calls (§4.5). |
| 4 | Context/cache engine | `server/context.ts` solves a different problem (window compaction) and is not a starting point for layered L0–L6 retrieval; treat as net-new alongside it, not a replacement. |
| 5 | Tool gateway | Partial substrate (`policy.ts` + ask-broker) for CLI-surfaced permission prompts only; engine-to-MCP-server calls during a turn still bypass any central gateway per `mcp-client.ts`'s own comment — closing that gap is new work, not wiring. |
| 6 | AgentNetwork / BlocksAdapter | `server/harness/registry.ts` is provider-instance registration, not capability-based agent discovery; the adapter is closer to net-new than "wrap what's there." |
| 7 | Orchestration state machine | Net-new; `teams.ts`/rooms are a different (human-gated, seniority-ordered) coordination model that may or may not become a backend for this. |
| 8 | Verification | Depends on reading `proposals.ts` first (§5) — cannot be scoped yet. |
| 9 | Trace / Alfred | `ledger.ts` is a solid append-only, tamper-evident substrate for the trace *mechanism*; its schema needs new fields (task_id, model, evidence state, cost) that don't exist today. |
| 10 | Dry-run simulator | As written; genuinely net-new, no existing mock-provider mode found. |
| 11 | Provider rollout | Needs §4.7 resolved (verify actual current model names/pricing) before wiring "Opus 5.5 default" logic. |
| 12 | Measured optimization | As written. |

---

## 7. Risk register

| Risk | Likelihood | Impact | Note |
|---|---|---|---|
| Building a second policy/cost/context system alongside Blocks' existing ones, rather than one coherent layer, because §4.1/§4.2 aren't resolved before Phase 1 starts | High | High | This is the single biggest risk. It's exactly the "silently change architecture" failure mode `CLAUDE_IMPLEMENTATION_INSTRUCTIONS.md` rule 15 warns against, and the contradictions in §4 make it easy to fall into by accident. |
| Cost controller has no real hook point for CLI-driven engines (Claude Code, Codex) without modifying how Blocks' drivers invoke those CLIs | Medium | High | Pre-call reservation assumes Agent OS mediates every provider call; several Blocks engines are "ride along with a CLI you already signed in to," which may not expose a clean pre-flight point. |
| FSL-1.1-MIT license conflicts with commercialization plans | Low–Medium (unknown intent) | High if it happens | Internal use is explicitly fine; reselling "Bloks, or something substantially like it" is not, until the 2-year MIT conversion per release. Worth a definitive answer before investing in a fork. |
| "Opus 5.5 / Fable 5.1 / GPT-6 Astra" pricing and availability asserted in the docs may be stale or wrong by the time real provider rollout (Phase 11) happens | Medium | Medium | Budget math in `AGENT_OS_COST_AND_BUDGET.md` and the routing table in `AGENT_MODEL_ROLE_CONTRACT.md` should be re-verified against current provider pricing immediately before Phase 11, not assumed from the doc date. |
| Foot-soldier throughput assumptions (§4.6) collide with Blocks' human-approval-gated team formation, leading to either a security regression (bypassing approval) or a performance regression (throughput far below what the plan assumes) | Medium | Medium | Needs an explicit decision, not a default. |
| CodeGraph, GitHub, and Asana integrations are all missing simultaneously; several Agent OS invariants ("CodeGraph-first," "GitHub = code truth," "update Asana") are unimplementable until all three exist | High (currently true) | Medium | Doesn't block Phases 1–5 (schemas/policy/cost/context/tool-gateway can be built without them) but does block Phase 7 onward in any realistic engineering-task test. |
| Two different things both called "project" in the same codebase | High if unaddressed | Medium | Low cost to fix now (rename one), high cost to fix after schemas/APIs are written against the ambiguous name. |

---

## 8. Phase 0.5 — confirmed seams

Of the requested file list, these were read in full this pass: `server/proposals.ts`, `server/permission-proxy.ts`, `server/drivers/claude.ts`, `server/harness/ask-broker.ts`. Not yet read: `server/activity.ts`, `server/store.ts`, `server/contracts.ts`, `server/context.ts`, `server/box.ts`, `server/scout.ts`, `server/composio.ts`, `SECURITY.md`, `CONTRIBUTING.md`, `LICENSING.md`, tests. The two seams asked for are answered below with evidence; the remaining files should still be read before Phase 1 starts on policy/cost work, since `activity.ts`/`contracts.ts` in particular may bear on the Trace schema (Phase 9) and `SECURITY.md` on the security invariants directly.

### 8.1 The actual provider process seam

**`server/drivers/claude.ts`, inside `ClaudeDriver.create().sendTurn`, at the `spawn(config.cli, argv, {...})` call.**

Confirmed facts:

- Each turn is a **fresh subprocess** of the `claude` CLI (`-p`, stream-json in/out), not a persistent process — continuity across turns is the CLI's own `--resume`, not Bloks holding session state. Killing the process group at turn end is how attached MCP helper processes get reaped.
- **Model selection happens in `argv`** (`--model`), from a hardcoded `MODELS` table in this file: `{ default: "claude-sonnet-5", options: ["claude-fable-5-1", "claude-fable-5", "claude-opus-5", "claude-sonnet-5", "claude-haiku-4-5"] }`. **This directly contradicts the Agent OS docs' assumption of "Opus 5.5" as a routable model** — the driver only knows about `claude-opus-5` (no `.5`), and there is no per-role model-routing logic here at all; whatever model an agent is configured with is what every turn uses, chosen by a human when the agent (or hire) was created, not selected dynamically per task by an orchestrator.
- **Credentials are a single global CLI login, not per-project/per-role.** The driver explicitly `delete env.ANTHROPIC_API_KEY` before spawning, so it rides the CLI's own subscription login (kept in the macOS Keychain or `~/.claude/.credentials.json`) rather than an API key Bloks controls. There is exactly one Claude Code identity per machine today — Agent OS's per-project credential separation has no seam to attach to here without either (a) running multiple isolated `claude` CLI logins somehow, or (b) switching this driver to API-key auth so Bloks can inject a project-scoped key per spawn.
- **This is also where every MCP server for the turn gets mounted**: the user's own registered servers (prefixed `u_<slug>`), `computer` (cloud box or local Mac, via `computer-proxy` helper), `sandbox` (via `sandbox-proxy` helper), `browser` (via `browser-proxy` helper), `composio` (HTTP, with an API-key header), and `bloks` (the permission bridge itself, via `permission-proxy.ts`). A future CodeGraph/GitHub/Asana MCP server would be mounted the same way — either as a `u_<slug>` user server or a new named entry alongside `computer`/`sandbox`/`browser`, each requiring its own helper-process pattern if it needs scoped credentials the way `computer`/`sandbox`/`browser` do.
- **`--allowedTools` is the actual access-control artifact for this turn** — only MCP servers explicitly named here are reachable at all; everything else is invisible to the CLI regardless of what's registered.
- Non-Claude engines (Codex, Gemini CLI, Pi) each have their own driver file under `server/drivers/` with presumably their own spawn logic — **not yet confirmed to follow this same shape**; `claude.ts` should not be assumed representative of all four without reading the others.

### 8.2 The actual MCP/tool authorization seam

**There isn't one that reaches `policy.ts`.** The real chain, fully traced:

1. Claude Code's **own internal `--permission-mode`** (`acceptEdits`, `auto`→`acceptEdits`, or `bypassPermissions`) decides, inside the CLI itself, which actions need asking about at all. This is Anthropic's logic, not Bloks'. In `bypassPermissions` mode on a non-shared turn, **no bridge is attached at all** — nothing is asked, nothing is denied, nothing is logged by anything in this repository.
2. When the CLI's own logic decides to ask, it calls its `--permission-prompt-tool`, wired to `mcp__bloks__approve` — a **separate process**, `permission-proxy.ts`, spawned specifically for this (`PERMISSION_HELPER`), running as its own tiny MCP server over stdio.
3. `permission-proxy.ts` forwards the question over a **unix socket** to `server/harness/ask-broker.ts`, running inside the main harness process (one socket per turn, path derived from thread id).
4. `ask-broker.ts` — **confirmed by full read to contain no reference to `policy.ts` anywhere** — just holds the request, fires `onAsk` (which `claude.ts` turns into a `request.opened` runtime event for the UI), and waits: either a human calls `respondToRequest` (wired through `broker.answer(...)`), or a 15-minute timeout resolves it (**deny** for permissions, **best-judgment-continue** for questions — the two failure directions are deliberately asymmetric).

**So `policy.ts`'s allow/deny/ask rule matching is not in this path at all** for Claude Code turns. Every permission question that reaches the bridge becomes a human-facing card with no automated rule-based short-circuit visible anywhere in `claude.ts` → `permission-proxy.ts` → `ask-broker.ts`. Where `policy.ts` actually *is* consulted remains unconfirmed — candidates not yet ruled out: a pre-turn check on which agents/tools/MCP servers a room is even allowed to attach (gating step 1 above, not step 2–4), the app-side `McpClient` path (`mcp-client.ts`, first-party UI tool calls), or agent/skill/hire creation flows in `index.ts`. This should be resolved by reading `server/index.ts`'s route handlers and `server/contracts.ts` before assuming where, if anywhere, `policy.ts` gates a live tool call.

**What this means for the Agent OS Policy Engine and Cost Controller:** neither has a real interception point today for Claude-Code-driven turns unless one of:
- (a) A new MCP server is inserted into every turn's `mcpServers` map in `claude.ts` that itself enforces Agent-OS-level policy/budget before performing an action (a genuinely new gateway, sitting where `computer`/`sandbox`/`browser` sit today);
- (b) `ask-broker.ts` (or a wrapper around it) is extended to consult a policy/budget check *before* firing `onAsk`, auto-resolving `allow`/`deny` for the cases Agent OS's policy already has an answer for, and only escalating to a human card for genuine `ASK`/`ESCALATE` cases;
- (c) Claude Code's own `--permission-mode` is set narrowly enough (or `bypassPermissions` is never used) that most consequential actions already reach the bridge, and (b) is layered on top of that.

(b) is the smallest change consistent with what's already built — it reuses the existing socket/card/timeout machinery and only inserts a decision *before* `onAsk` fires, rather than replacing the transport. It does not, on its own, solve §4.5 (no reservation point before the model call itself starts, only before tool calls *within* a running turn) or the `bypassPermissions` gap (nothing reaches the bridge at all in that mode).

---

## 9. What remains before Phase 1

Still unread from the original Phase 0.5 list: `server/activity.ts`, `server/store.ts`, `server/contracts.ts`, `server/context.ts`, `server/box.ts`, `server/scout.ts`, `server/composio.ts`, `SECURITY.md`, `CONTRIBUTING.md`, `LICENSING.md`, and the test suite. Of these, `contracts.ts` and `activity.ts` matter most before Phase 1/9 (they likely define the runtime-event and audit shapes any new schema needs to interoperate with), and `SECURITY.md` matters before Phase 2 (it's referenced by `README.md` as stating parts of the trust model "are not solved yet" — directly relevant to the Policy Engine's invariants).

Also unconfirmed: where, if anywhere, `policy.ts` is actually called from a live code path (see §8.2) — this determines whether it's dead weight to design around or a real second authority that needs reconciling with Agent OS's Policy Engine before Phase 2. And whether the other three driver files (`codex.ts`, and whatever backs Gemini CLI and Pi) share `claude.ts`'s shape — nothing here should be assumed to generalize across drivers without reading them.

- No code was written or changed.
- No provider/model calls were made.
- No branch was created in either repository.
- `server/index.ts` (6,805 lines) was inspected via its import graph and header comment, not read line-by-line; anything wired only inside its route handlers (rather than imported at the top) may be under-represented above.

**Per `CLAUDE_IMPLEMENTATION_INSTRUCTIONS.md`: do not implement until this manifest is coherent.** The material contradictions in §4 — especially §4.1/§4.2 (Blocks already has a policy/context/audit stack that the docs assume doesn't exist) and §4.4 (two unrelated things named "project") — need an explicit call from you before Phase 1 starts, or Phase 1's schemas will be built against an assumption the repository already contradicts. §8's finding sharpens §4.5: it's not just that the cost controller lacks a hook point, it's that **the policy engine as currently wired has no automated decision path for Claude Code turns either** — everything that reaches the bridge is a human card, full stop, until something new is inserted.
