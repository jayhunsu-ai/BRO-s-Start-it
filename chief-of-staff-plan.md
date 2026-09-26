# Chief of Staff — Multi-Agent Team Implementation Plan

**Goal:** Stand up the Start-It hardening team (Chief of Staff + leads + ICs +
coordination bots + a hard-gate Standards Verifier) on Bloks, running against
your own Anthropic API key, with financial guardrails in place before any
agent is allowed to touch a task.

**Architecture:** Bloks (local-first desktop workspace) as the orchestration
layer, each agent as a real Claude Code session, one persistent Docker
container per agent so sessions never cold-reset. Tasks flow IC → domain Lead
→ Standards Verifier (hard gate) → Chief of Staff (cross-project/architecture
escalations only).

**Tech Stack:** Bloks (`hamedgitty/bloks`), Claude Code CLI
(`@anthropic-ai/claude-code`), Docker (local sandboxes), GitHub
(`jayhunsu-ai`, repos `BRO-s-Start-it` / `Start-it-and-Veltrix-`), monday.com
(board id `5103165979`, "Start-It / Veltrix — Exam/Proctoring Platform").

**Spec:** this conversation — cost model, skill bundle (`start-it-skills.zip`),
roster, and financial-guardrail decisions already agreed above. This plan
implements that spec; nothing here introduces new scope.

## Global Constraints

- **No agent gets a skill outside the packaged bundle.** Only skills present
  in `start-it-skills/security-backend/` and `start-it-skills/frontend-design/`
  (plus `brainstorming`, `product-brainstorming`, `writing-skills`,
  `writing-plans`, `executing-plans` for Chief of Staff) are installed.
  Nothing is added ad hoc mid-session.
- **Model tier is fixed per role** — never upgraded on the fly without
  updating this doc first: Opus 5 (Chief of Staff, Standards Verifier),
  Sonnet 5 (leads, coding ICs), Haiku 4.5 (coordination bots).
- **Standards Verifier rejection is a hard gate.** A task cannot be marked
  done, closed, or merged if the Verifier has not signed off. This is
  enforced structurally (Step 4.3 below), not left to convention.
- **Auto-reload stays OFF.** Maximum possible spend equals what's manually
  loaded in the Anthropic Console. No exceptions without revisiting this doc.
- **Sessions stay alive.** No agent's container or Claude Code session is
  torn down between tasks during active hours — that's what keeps prompt
  caching (and the cost model) valid.

---

## Phase 0: Financial Guardrails (do this before anything else)

- [ ] **Step 0.1: Check your actual current tier and limits**
  Go to `console.anthropic.com` → Settings → **Rate limits**. Note your
  current tier (likely "Evaluation" given the recent $8 load) and your
  current RPM/ITPM/OTPM numbers. Write them down — you'll compare against
  this after Day 1 of the pilot.

- [ ] **Step 0.2: Confirm auto-reload is off**
  Settings → **Billing** → Auto-reload section. If it shows "On," toggle it
  off. Confirm the setting shows "Off" before proceeding.

- [ ] **Step 0.3: Set an explicit spend limit**
  Settings → **Billing** → Spend limits → "Set limit." Enter a number that
  matches what you're actually willing to lose this week — not your tier's
  cap. Given the pilot is one project (Start-It) at the "always-on" cadence
  (~$12-16/day), a $50-75 weekly limit gives headroom without exposing you
  to a runaway loop burning more than that.

- [ ] **Step 0.4: Confirm the limit is live**
  Refresh the Billing page. The spend limit should show as active with the
  value you set, not "$500 (tier default)."

---

## Phase 1: Infrastructure

- [ ] **Step 1.1: Install prerequisites**
  Confirm Node 22+ and pnpm are installed:
  ```
  node -v   # expect v22.x or higher
  pnpm -v
  ```

- [ ] **Step 1.2: Install Claude Code and log in with your own key**
  ```
  npm i -g @anthropic-ai/claude-code
  claude
  ```
  Follow the login prompt, using the Anthropic account whose spend limit
  you just set in Phase 0.

- [ ] **Step 1.3: Clone and run Bloks**
  ```
  git clone https://github.com/hamedgitty/bloks.git
  cd bloks
  pnpm install
  pnpm dev:server   # harness, 127.0.0.1:8799
  pnpm dev          # app, 127.0.0.1:5199
  ```
  Open `http://127.0.0.1:5199`. Confirm the app loads with no agents yet.

- [ ] **Step 1.4: Connect GitHub**
  In Bloks settings, connect the `jayhunsu-ai` GitHub account with `repo`
  scope. Confirm it shows connected and can see `BRO-s-Start-it` and
  `Start-it-and-Veltrix-`.

- [ ] **Step 1.5: Verify Docker is the sandbox provider**
  Bloks' engine config for each Claude Code agent should run through a
  local Docker container (not a remote/hosted sandbox). Confirm Docker
  Desktop is running before creating any agent.

---

## Phase 2: Install the Skill Bundle

- [ ] **Step 2.1: Copy the bundle in**
  Unzip `start-it-skills.zip` (from earlier in this conversation) into
  `~/.bloks/skills/` (or wherever Bloks reads installed skills from — check
  `docs/ARCHITECTURE.md` in the Bloks repo if the path differs).

- [ ] **Step 2.2: Verify skill count**
  ```
  find ~/.bloks/skills -name "SKILL.md" | wc -l
  ```
  Expect **17** (11 security-backend + 6 frontend-design). If it's more,
  something extra got installed — remove it before continuing.

- [ ] **Step 2.3: Add the process skills for Chief of Staff only**
  Install `brainstorming`, `product-brainstorming`, `writing-skills`,
  `writing-plans`, `executing-plans` — but scoped to the Chief of Staff
  agent's config, not the whole roster. ICs and leads don't need these;
  loading them everywhere just adds dead weight to every turn.

---

## Phase 3: Create the Roster

Create each agent in Bloks with the exact model and skill assignment below.
Do not deviate from this table without updating it first.

| Agent | Model | Skills loaded | Turns/day (est.) | Cost/day (est.) |
|---|---|---|---|---|
| Chief of Staff | Opus 5 | brainstorming, product-brainstorming, writing-skills, writing-plans, executing-plans | 18 | $0.84 |
| Standards Verifier | Opus 5 | verification-before-completion, coding-standards, ai-first-engineering + domain skill per task | 20 | $1.69 |
| Senior Engineer (lead) | Sonnet 5 | security-backend set | 12 | $0.14 |
| Security Engineer (lead) | Sonnet 5 | security-backend set | 12 | $0.14 |
| Infrastructure Engineer (lead) | Sonnet 5 | security-backend set | 12 | $0.14 |
| On-Call Backend (IC) | Sonnet 5 | security-backend set | 30 | $2.16 |
| Shipping Backend (IC) | Sonnet 5 | security-backend set | 30 | $2.16 |
| Studio Frontend (IC) | Sonnet 5 | frontend-design set | 30 | $2.33 |
| Motion Frontend (IC) | Sonnet 5 | frontend-design set | 30 | $2.33 |
| Sprint Lead | Haiku 4.5 | none (coordination only) | 40 | $0.22 |
| Bug Triage | Haiku 4.5 | none | 40 | $0.22 |
| Product | Haiku 4.5 | none | 40 | $0.22 |
| Release | Haiku 4.5 | none | 40 | $0.22 |
| Waitlist | Haiku 4.5 | none | 40 | $0.22 |

**Total: ~$13.83/day, ~$415/month for this one project, always-on.**

- [ ] **Step 3.1: Create Chief of Staff** with the model/skills above.
- [ ] **Step 3.2: Create the 3 leads**, each pointed at `security-backend`
  skills (leads review across both domains even though ICs specialize).
- [ ] **Step 3.3: Create the 4 coding ICs**, each pointed at only their
  domain's skill folder (security-backend for backend ICs, frontend-design
  for frontend ICs) — not both.
- [ ] **Step 3.4: Create the 5 coordination bots** with no skills loaded.
- [ ] **Step 3.5: Create the Standards Verifier** last, with the universal
  skill trio plus dynamic domain loading per task.

---

## Phase 4: Wire the Gate

- [ ] **Step 4.1: Set review order** — each IC's completed task routes to its
  domain Lead first, not directly to the Verifier.
- [ ] **Step 4.2: Route Lead-approved work to the Standards Verifier** before
  it can be marked done.
- [ ] **Step 4.3: Make the Verifier's rejection structurally blocking.** In
  Bloks, this means the task's status cannot transition to "done"/"merged"
  without a recorded Verifier approval — confirm this is a workflow rule
  (per Bloks' "rules you write in a sentence" feature: *"Refuse to close a
  task without a recorded Standards Verifier approval"*), not just a comment
  left for someone to notice.
- [ ] **Step 4.4: Route only cross-project or architecture-level disagreements
  to Chief of Staff.** Routine Verifier approvals/rejections should not
  page Chief of Staff — that defeats the point of adding the Verifier.

---

## Phase 5: Burn-Rate Monitoring

- [ ] **Step 5.1: Assign burn-rate checking to the Release bot** (already
  the closest fit — it's already the QA/production gate role). Give it a
  daily task: check Console usage/cost report, compare against the $50-75
  weekly limit from Step 0.3, and message Chief of Staff if the week's pace
  would blow through it.
- [ ] **Step 5.2: Set the check cadence** — once per day is enough at this
  scale; don't burn tokens having it poll hourly.

---

## Phase 6: Pilot Run — Start-It Board

- [ ] **Step 6.1:** Point Senior Engineer at `BRO-s-Start-it` (the production
  repo — pre-infra, README/ADRs/CI skeleton, no app code yet per earlier
  check).
- [ ] **Step 6.2:** Load the 20 Start-It tasks from the monday.com board
  (`5103165979`) into Bloks' task queue.
- [ ] **Step 6.3:** Start all agents. Do not intervene for the first hour —
  you're testing whether the gate and caching behave as modeled, not
  micromanaging turn-by-turn.
- [ ] **Step 6.4: End-of-day checkpoint.** Compare actual Console spend
  against the ~$13.83/day model. If it's more than ~1.5x the estimate,
  stop and diagnose before Day 2 — likely cause is cache misses (sessions
  got reset somewhere) or the Verifier rejecting the same task repeatedly
  without escalating.

---

## Phase 7: Acceptance Criteria Before Scaling to Other Projects

- [ ] All 20 Start-It tasks either done (Verifier-approved) or explicitly
  escalated to you with a clear reason — nothing silently stuck.
- [ ] Actual Day 1 spend within 1.5x of the $13.83/day model.
- [ ] Zero tasks marked done without a recorded Verifier approval.
- [ ] Rate limit page (Console) shows no sustained 429s — confirms you're
  clear of the Evaluation-tier ceiling for this workload.
- [ ] You've reviewed at least 3 Verifier rejections and 3 approvals to
  confirm its judgment matches your actual bar, not just the letter of
  the skills.

Only once these hold do you point this same roster at a second project
(L&D management or Veltrix/BRO) — each new project gets its own set of ICs,
leads, and Verifier; Chief of Staff is the only agent shared across projects.
