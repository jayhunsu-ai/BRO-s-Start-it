# ALFRED — MASTER INTEGRATION PLAN (Consolidated)

**Supersedes:** `alfred_repo_integration_plan.md` (v1, rough) and
`alfred_integration_plan.md` (v2, corrected). Both are folded in here.
This is the single living plan going forward.

---

## ━━━ GROUND TRUTH (revised — these files were uploaded and DO exist) ━━━

Correction to the previous round: `nim_observer.py`, `interrupt_bus.py`,
`trickle_learn.py`, `corpus_manager.py`, `mql5_feed.py`, `metacog.py`,
`sandbox.py`, `deep_search.py`, `prompt_evolution.py`, `conscience.py`, and
`identity.py` all exist, and several are substantially built — not roadmap
stubs. `compound.py`-as-orchestrator and `world_state.py` are still not
confirmed to exist in the form v1 described; treat those two as open
questions, not facts either way.

What each actually is (so the rest of this doc stops guessing):

- **`nim_observer.py`** (1503 lines) — "Visiting Specialists." Alfred goes
  silent and watches large NIM-hosted models (qwen3-coder-480b,
  deepseek-v4-pro, etc.) work, tagging each observation with Alfred's
  cognitive state at that moment (arm pressures, compound phase, tension
  count, ideology confidence). Feeds the corpus passively over weeks.
- **`interrupt_bus.py`** (230 lines, fully built) — "The Spinal Cord."
  `fire(priority, source, content, data)` / `drain()` API with
  CRITICAL/HIGH/MEDIUM levels, logged to `interrupt_log.jsonl`. ORCA drains
  this before its normal tick. **This already exists** — every "[FUTURE,
  paired with interrupt_bus.py]" item in the previous round can be wired in
  now via `fire()`.
- **`trickle_learn.py`** (1001 lines) — layer-by-layer contrastive Hebbian
  weight updates via gguf layer access, no backprop. `run_metabolism_pass()`
  called hourly from `synthesis_loop.py` when idle + enough high-quality
  pairs accumulated.
- **`corpus_manager.py`** (2212 lines) — **this is the real
  `corpus_downloader.py`**, fully built, not partial. Per-arm corpus dirs
  (Financier: MQL5+arXiv, Sentinel: NVD/ExploitDB, Researcher: arXiv/PWC,
  Builder: PyPI/GitHub/SO), `corpus_status()`/`corpus_fetch(arm)` tools.
- **`mql5_feed.py`** (1569 lines, fully built) — MQL5's 2,400+ TA articles,
  BULK and LIVE ingestion modes, feeds Financier arm memory directly.
- **`metacog.py`** (405 lines) — self-assessment every N interactions,
  writes findings to `alfred_brain.md`, feeds EvoRoute deliberately rather
  than just passively.
- **`sandbox.py`** (1259 lines) — real-world test infra with
  `CyberSandbox` (Docker, vulnerable targets, security tools),
  `FinancierSandbox` (MT5 demo + Binance WS), `BuilderSandbox` (isolated
  exec + CI loop), `ResearcherSandbox` (paper reproduction).
- **`deep_search.py`** (584 lines) — multi-query browsing/synthesis loop
  (query variants → scan → read full pages → follow one link level →
  synthesize). Used by STELLA, Researcher, Sentinel, Financier.
- **`prompt_evolution.py`** (154 lines) — `introspect_prompts()` reads
  `agent._ROLE_PROMPTS` + `alfred_brain.md`, proposes prompt revisions when
  metacog flags failure patterns.
- **`conscience.py`** (486 lines) — `check_action(tool_name, args)` veto/
  surface mechanism for irreversible/high-stakes actions, built on
  argued positions from `substrate.py`. Surfaces to Jay, never silently blocks.
- **`identity.py`** (495 lines) — `run_integration_pass()` /
  `get_current_identity()`, reconciles ideology across compound mind, ORCA
  arms, and `alfred_brain.md` into one argued self-model, runs during Stage 3
  (REM) of the sleep cycle.

Still genuinely unconfirmed: `world_state.py`, `compound.py`-as-orchestrator,
`osiris_tools.py`, `sentinel_ng.py`, `live_feeds.py`, `alfred_watchdog.py`,
`model_manager.py`/`agent.py`/`orca.py`/`synthesis_loop.py`/`substrate.py`.
If you have these too, upload them and I'll do another correction pass rather
than guess again.

- Memory stack is RAM → LanceDB → NetworkX graph → fine-tuned weights
  (`trickle_learn.py` is the weights layer). Supabase/Redis/etc. *complement*,
  never replace, this.

---

## ━━━ PART 0 — THE TEACHING LAYER (NEW) ━━━
### Claude Code as Alfred's resident teacher, 1+ months

**The idea:** Claude Code doesn't just write Alfred's code — it moves into the
repo as a curriculum architect. Over a month or more, it works through the
skill libraries below, and instead of leaving them as "things Claude Code can
do," it **distills each one into a native Alfred tool/skill** that jarvis can
call without Claude Code in the loop. Claude Code graduates skills to Alfred;
Alfred keeps the distilled version permanently.

#### This already has a name in Alfred's codebase: nim_observer.py
`nim_observer.py`'s "Visiting Specialists" pattern — Alfred goes silent,
watches a more capable model work, and gets the observation tagged with his
own cognitive state at that moment — is *exactly* the mechanism for Claude
Code teaching. Claude Code sessions become another visiting specialist:

- While Claude Code works (ingesting a skill repo, refactoring, auditing),
  Alfred is silent per the existing silence rule (`is_nim_active()`-equivalent).
- Each session is logged with the same state snapshot (`arm_pressures`,
  `compound_phase`, `tension_count`, `active_arm`) `nim_observer.py` already
  produces for NIM specialists.
- These observations become contrastive pairs for `trickle_learn.py` —
  "what Claude Code did vs. what Alfred would have done" is precisely the
  (actual, ideal) pair format `run_metabolism_pass()` consumes.

So Part 0's curriculum isn't a new subsystem — it's `nim_observer.py` pointed
at Claude Code sessions instead of (or alongside) NIM endpoints, with the
distillation step (below) as the explicit "what Alfred keeps" output.

#### New directory: `alfred_curriculum/`
```
alfred_curriculum/
  ledger.md              # what's been taught, what's pending, what graduated
  lessons/
    <skill_name>/
      source.md          # the original SKILL.md, untouched
      distilled.py        # Alfred-native version of the skill's logic
      memory_seed.md      # facts written into LanceDB teaching Alfred WHEN to use it
      status.json          # {ingested, audited, distilled, graduated}
```

#### The ingestion pipeline (per skill repo)
1. **Pull** — clone/`npx skills add` the source repo into `alfred_curriculum/lessons/<name>/`.
2. **Audit (security gate)** — before any bundled script runs, Claude Code
   runs it through `sentinel_zap.py` (new, Group 9 below) inside
   `sandbox.py`'s existing `CyberSandbox` (Docker, already isolated for
   running untrusted security tools) and statically greps for network calls,
   `subprocess`, `eval`, and credential access. OpenSandbox (Group 10) is
   only needed if `CyberSandbox` proves too narrow for non-security skills
   (e.g. heavy frontend builds) — try the existing sandbox first. Anything
   that fails the audit is quarantined, not deleted, with a note in
   `ledger.md`.
3. **Distill** — Claude Code rewrites the skill's workflow as a plain Python
   function/tool in `distilled.py`, stripped of anything Alfred doesn't need
   (UI, marketplace metadata, multi-platform shims).
4. **Teach** — Claude Code writes 2-5 memory facts ("when the Builder arm is
   asked to refactor a >500 line module, call `understand_anything_graph()`
   first") into LanceDB via `memory.write()`. This is literally how Alfred
   *learns* the skill — not by reading docs at runtime, but by having the
   judgment pre-loaded as memory + a callable tool.
5. **Graduate** — register the tool in `tools.py` / `server.py` like any
   other Alfred tool. Mark `status.json.graduated = true`. Claude Code moves on.

#### Month-by-month curriculum (suggested order)
| Month | Focus | Sources |
|---|---|---|
| 1 | Builder methodology | Superpowers (TDD, worktrees, plan execution), Spec Kit, Big O lesson |
| 1 | Code comprehension | CodeGraph, Understand-Anything |
| 2 | Security posture | Anthropic-Cybersecurity-Skills (curated subset), OWASP ZAP, web-check |
| 2 | Design/taste | Taste-Skill suite — see critique loop below |
| 3 | Research workflow | Academic-Research-Skills, official `anthropics/skills` research-assistant + summarization |
| 3 | Knowledge-work plugins | `anthropics/knowledge-work-plugins` — pull engineering, data, productivity plugins relevant to Alfred's arms |
| 4+ | Ongoing | Re-audit graduated skills as upstream repos update; expand to remaining plugins as needed |

#### "Surpass Taste-Skill" → `alfred_taste.py`
Taste-Skill (Leonxlnx/taste-skill, 13 sub-skills, ~850k installs) is a set of
SKILL.md files that bias an agent's frontend output away from generic
"AI slop" via a 3-parameter system (design variance, motion intensity, etc).
It's a *prompt-time* intervention — it works because the instructions are in
context when the model generates.

Alfred surpasses this by making taste a **runtime scoring + critique loop**,
not just a prompt:

```python
# alfred_taste.py
"""
Alfred — alfred_taste.py
Runtime aesthetic critique loop, distilled from taste-skill + design/skills
in knowledge-work-plugins. Used by Builder arm after any frontend output.
"""
TASTE_AXES = ["layout_intent", "typography", "motion", "spacing", "originality"]

def critique(html_or_jsx: str) -> dict:
    """
    Claude (via model_manager) scores output 0-10 on each TASTE_AXES,
    using the distilled taste-skill rubric as its rubric, not its prompt.
    Returns {axis: score, "verdict": str, "rewrite_needed": bool}.
    """
    ...

def taste_loop(generate_fn, max_rounds: int = 3):
    """Generate -> critique -> regenerate with critique as feedback,
    until all axes >= 7 or max_rounds reached."""
    ...
```

**Files to modify:** `agent.py` (Builder role calls `taste_loop()` instead of
returning raw generation for any frontend/UI task); `orca.py` (Builder arm
`tool_affinity` gets `alfred_taste_critique`).

**Why this surpasses it:** Taste-Skill makes *Claude Code* produce better
output once. `alfred_taste.py` makes *Alfred* self-correct every time,
indefinitely, without re-reading the skill — the judgment is baked into a
scoring function plus a feedback loop.

---

## ━━━ PART 1 — PHASE 1 CORE (condensed from v2, P0/P1) ━━━

These were specified in full in `alfred_integration_plan.md` (v2). Summary
table below; v2 remains the implementation reference for exact code. **Two
corrections from the ground-truth section above**: Fincept/Public APIs
fetchers extend the *existing* `corpus_manager.py` (per-arm `ARM_CORPUS_DIRS`,
`corpus_fetch(arm)`) rather than a new corpus pipeline, and Kronos's forecasts
sit alongside the *existing* `mql5_feed.py` TA-article ingestion rather than
needing one built from scratch.

| Repo | Alfred file(s) | What it adds | New file |
|---|---|---|---|
| Crawl4AI (`unclecode/crawl4ai`) | `corpus_manager.py`, `deep_search.py` | bulk URL→markdown crawling feeding existing per-arm corpus dirs; `deep_search.py`'s "read full pages" step can use Crawl4AI's markdown output instead of raw HTML | — |
| Browser Use (`browser-use/browser-use`) | `deep_search.py`, `orca.py` | `deep_search.py` already does multi-query browsing/synthesis — Browser Use becomes its *fetch* backend for JS-heavy pages it currently can't reach via `requests` | `alfred_browser.py` |
| CamoFox (`jo-inc/camofox-browser`) | `alfred_browser.py` | stealth fallback + yt-dlp transcripts, used when `deep_search.py` hits a bot wall | (same file) |
| ScrapeGraphAI | `corpus_manager.py`, `tools.py` | NLP-prompted structured extraction via local Qwen, for new per-arm corpus sources | — |
| Supadata | `deep_search.py` | YouTube transcript primary source for research synthesis | — |
| Fincept Terminal scripts | `mql5_feed.py`-style pattern, `corpus_manager.py` | FRED/IMF/World Bank fetchers as a new Financier corpus source dir, investor-persona reasoning templates feed `identity.py`'s ideology sources | `fincept_bridge.py` |
| Kronos finance model | `mql5_feed.py` consumers, `orca.py` | quantitative OHLCV forecasting alongside the qualitative TA knowledge `mql5_feed.py` already extracts | `kronos_client.py` |
| OpenHands | `agent.py`, `sandbox.py`'s `BuilderSandbox` | coding sub-agent for multi-file/complex tasks, executes inside the existing isolated test directory + CI loop | `openhands_client.py` |
| Dify | external RAG | large-doc RAG outside LanceDB | `dify_client.py` |
| Supabase | structured relational layer | complements RAM→LanceDB→NetworkX→weights stack | `alfred_db.py` |
| Stirling PDF | `corpus_manager.py` | batch PDF→text for Researcher arm's arXiv/PWC corpus | `corpus_processor.py` |
| Slack | `interrupt_bus.py` | `_queue_alert`-equivalent becomes `interrupt_bus.fire(HIGH, source="slack", ...)` — Slack push fires on the existing bus | `alfred_slack.py` |
| ostafen/Kronos (cron) | `interrupt_bus.py` | webhook fires → `interrupt_bus.fire(...)` — the bus already exists, this just gives it an external clock | — |
| Coolify | hosting | hosts Dify/Supabase/CamoFox/etc | — |
| HyperFrames | `synthesis_loop.py`, `tools.py` | HTML→MP4 daily briefings | `alfred_video.py` |

**Skip/defer (unchanged from v2):** Langflow (Dify covers it), Maxun (Crawl4AI+ScrapeGraphAI cover it), Open-Generative-AI media gen (superseded by Part 4 below), Claude-SEO (low value for Alfred), KAOS/kronos-agent-os (pattern-mine only).

---

## ━━━ PART 2 — NEW BATCH: SECURITY → Sentinel arm ━━━

### OWASP ZAP — `github.com/zaproxy/zaproxy`
**What it is:** Open-source web app scanner with a REST API + daemon mode
(`zap.sh -daemon -port 8090`).

**Integration:**
- New `sentinel_zap.py` — thin client over ZAP's REST API (spider + active
  scan + alerts).
- Used two ways: (1) as a **Sentinel arm tool** — `sentinel_scan_url(url)` for
  OSINT/threat-assessment targets; (2) as the **curriculum security gate**
  (Part 0 step 2) — scan any web-facing service a new skill/tool stands up.
- `orca.py`: add `sentinel_scan_url` to Sentinel arm `tool_affinity`.

### web-check — `github.com/Lissy93/web-check`
**What it is:** Self-hostable domain/host OSINT — DNS, headers, TLS, ports,
threat lists, in one report (Docker, has a JSON API mode).

**Integration:**
- `sentinel_webcheck.py` — wraps the API/CLI, returns the JSON report.
- `sentinel_tools.py`: add `osint_webcheck(domain)`.
- Pairs with ZAP: web-check for recon, ZAP for active scanning.

### Burp Suite — ⚠️ no public repo
PortSwigger proprietary. Community Edition has no automation API; Pro adds a
REST API extension. **Decision needed from Jay** (no response on this yet) —
default assumption: **skip automated integration**, ZAP covers the scripted
case, Burp stays Jay's manual tool for deep-dive testing.

### Anthropic-Cybersecurity-Skills — `github.com/mukul975/Anthropic-Cybersecurity-Skills`
**What it is:** 754 skills across 26 security domains, MITRE ATT&CK / NIST
CSF 2.0 / MITRE ATLAS / D3FEND / NIST AI RMF mapped, agentskills.io standard.

**Integration (curriculum, Month 2):**
- Don't ingest all 754. Claude Code picks the subset relevant to Alfred's
  actual exposure: OSINT/recon, web app testing (pairs with ZAP/web-check),
  threat intel monitoring (feeds `synthesis_loop.py`'s security cadence),
  and AI-security/ATLAS skills (relevant since Alfred *is* an AI system —
  this doubles as Alfred's own self-defense curriculum).
- Each distilled skill becomes a `sentinel_tools.py` function following the
  Part 0 pipeline. Audit gate applies — this repo is exactly the kind of
  large third-party skill collection the audit step exists for.

---

## ━━━ PART 3 — NEW BATCH: PHYSICAL-WORLD SENSING → new Sentinel-Physical sub-arm ━━━

### RuView — `github.com/ruvnet/RuView`
**What it is:** Turns commodity WiFi Channel State Information (via $9 ESP32
nodes) into presence/pose/vital-sign sensing — no cameras. Brand new (this
week), went viral, and its own internal QA audit flags it: Maintainability
Index 48/100, a 3,741-line `main.rs` with cyclomatic complexity 65, and
"life-safety claims (disaster survivor detection, vital signs, fall alerts)
require rigorous verification that is currently absent."

**Integration — sandboxed only, for now:**
- New `sentinel_physical.py` — reads RuView's local sensor-mesh API
  (no cloud, runs on the ESP32 mesh + a local server).
- Feeds a *new* `live_feeds.py` channel: `presence_state` (room occupancy,
  movement) — useful for things like "don't run the loud fine-tune job while
  Jay's asleep in the room" type contextual awareness.
- **Do not** wire vitals/fall-detection into anything that triggers alerts or
  actions until RuView's own hotspots (the god-object `main.rs`, the
  duplicated tick pipelines) are resolved upstream or you've independently
  validated accuracy. Treat current output as "interesting signal," not "fact."
- This is the first physical-sensor integration for Alfred — worth its own
  small arm (`sentinel-physical`) rather than bolting onto the digital Sentinel.

---

## ━━━ PART 4 — NEW BATCH: CODE INTELLIGENCE → Builder arm ━━━

### CodeGraph — `github.com/colbymchenry/codegraph` (recommended primary)
**What it is:** Pre-indexed code knowledge graph purpose-built for agent
consumption (Claude Code, Codex, Gemini, Cursor, etc). Benchmarked: ~16%
cheaper, 47% fewer tokens, 58% fewer tool calls vs. an agent doing
grep/find/Read discovery. 100% local, respects `.gitignore`, strips
vendor/build noise across 7 languages.

**Why this one over the alternatives:** `Understand-Anything` (below) is
more about *human-readable* exploration (visual dashboard, "teach the
team"). `CodeGraphContext` and FalkorDB's `Code-Graph` are heavier — they
stand up a graph database (Neo4j/FalkorDB) and are great for deep Cypher
queries but are infrastructure projects in their own right. CodeGraph is the
leanest "agent calls a tool, gets exactly the call-graph context it needs"
option — closest to "the best so I can improve it."

**Integration:**
- New `alfred_codegraph.py` — wraps `codegraph_explore` and the indexer.
- `orca.py`: Builder arm `tool_affinity` += `codegraph_explore`.
- `agent.py`: before any multi-file refactor/coding task, `run_agent()` calls
  `codegraph_explore(task)` first and feeds the result into context —
  replacing ad-hoc grep/Read discovery.
- **Improvement path** (since you want to extend it): the index is local and
  file-based — natural next step is wiring its output into Alfred's NetworkX
  memory graph so code structure and conceptual memory share one graph.

### Understand-Anything — `github.com/Lum1104/Understand-Anything`
**What it is:** Claude Code plugin — multi-agent pipeline builds an
interactive knowledge graph + dashboard of a codebase, with a "domain view"
mapping code to business processes.

**Integration:**
- Curriculum item, Month 1. Distilled use: when Alfred (or Jay via Alfred) is
  onboarding to a *new, unfamiliar* repo (e.g. one of the repos in this very
  plan), run `/understand-knowledge` once to generate the dashboard, then
  have Claude Code extract the "domain view" mapping as a memory seed —
  this is the human-facing complement to CodeGraph's machine-facing index.

### OpenSandbox — `github.com/opensandbox-group/OpenSandbox`
**What it is:** CNCF-listed sandbox runtime (Docker/K8s), multi-language SDKs,
built-in support for running Claude Code / Codex / Gemini CLI inside a sandbox,
plus browser and code-interpreter sandboxes.

**Integration:**
- This is the runtime for **two** things at once: (1) the Part 0 audit
  sandbox for untrusted skill scripts, (2) the execution sandbox for
  OpenHands' coder sub-agent (v2's `openhands_client.py` already assumes
  *some* sandbox — OpenSandbox is that sandbox).
- New `alfred_sandbox.py` — thin wrapper around the OpenSandbox SDK
  (`create_sandbox`, `run_command`, `destroy`).
- `openhands_client.py` (v2): point its execution backend at OpenSandbox
  instead of bare Docker.

### Spec Kit — `github.com/github/spec-kit`
**What it is:** GitHub's official spec-driven dev toolkit — `/specify`,
`/plan`, `/tasks` slash commands that turn a feature description into a
structured spec → plan → task breakdown before any code is written.

**Integration:**
- Curriculum item, Month 1. Pairs directly with Superpowers' TDD workflow:
  Spec Kit produces the spec/plan, Superpowers' `executing-plans` and
  `test-driven-development` skills execute it.
- Distilled output: `alfred_spec.py` — when Alfred's Builder arm receives a
  "build X" task above a complexity threshold, it first runs the Spec Kit
  flow to produce `spec.md`/`plan.md`/`tasks.md` in the target repo, *then*
  calls OpenHands/coder against the task list — turning one big ambiguous
  request into a checklist OpenHands can execute reliably.

### Superpowers — `github.com/obra/superpowers`
**What it is:** 21-skill Claude Code plugin: TDD workflow, git worktrees,
subagent-driven development, plan execution, root-cause debugging.

**Integration:** Primary curriculum source for Builder-arm *methodology*
(Month 1). Distilled skills become standing instructions in `agent.py`'s
`coder` role system prompt (e.g. "always write a failing test first," "use a
worktree per task") rather than one-off tool calls — these are *habits*,
not tools.

### Big O notation → curriculum lesson, not a repo
Folded into the CodeGraph/Understand-Anything output: when Builder arm
reviews code, Claude Code teaches Alfred to annotate functions in the code
graph with rough complexity (`O(n)`, `O(n^2)`, etc) as part of the existing
review pass — no new file, just an extra field in `alfred_codegraph.py`'s
output schema.

---

## ━━━ PART 5 — NEW BATCH: FINANCE EXPANSION → Financier arm ━━━

### TradingAgents — `github.com/TauricResearch/TradingAgents`
**What it is:** Multi-agent LLM trading framework (LangGraph) — Fundamentals,
Sentiment, News, and Technical analyst roles debate toward a decision.
Apache-2.0, explicitly research-only per its own README (not financial advice).

**Integration mode:** Mine patterns, like v2 did with Fincept's 37 personas —
**don't run it as a separate system**. Extract the four analyst-role prompts
and the debate/aggregation pattern into `finance_tools.py` as additional
reasoning personas for the Financier arm, alongside Fincept's Buffett/Graham/
Munger personas. Same role, different source.

- `orca.py`: Financier arm gains a `debate_round(symbol)` reasoning mode that
  runs the four TradingAgents-style perspectives (using jarvis, not a second
  LLM stack) before Kronos's quantitative forecast — qualitative debate,
  then a number.

### Public APIs — `github.com/public-apis/public-apis`
**What it is:** Curated directory of free APIs across every category.

**Integration:**
- Feeds `corpus_manager.py`'s data-source discovery directly — when the
  Researcher or Financier arm needs a new feed type, check this list before
  building a custom scraper.
- Practical first pass: Claude Code filters the list for finance/macro/news/
  research categories and adds the best 10-15 as candidate `finance_tools.py`
  / `research_tools.py` fetchers, same pattern as the Fincept fetchers.

---

## ━━━ PART 6 — NEW BATCH: CONTENT & MONETIZATION → new "Creator" output layer ━━━

This group is the biggest addition and the direct answer to "AI to Earn."

### AiToEarn — `github.com/yikart/AiToEarn`
**What it is:** Full-stack, MIT-licensed, 20k+ star platform — AI generates
content (video/image/text drafts via HappyHorse/Seedance models), then
publishes to 14 platforms (TikTok, YouTube, Instagram, Douyin, Xiaohongshu,
Bilibili, LinkedIn, X, etc), tracks engagement, and supports monetization
(CPS/CPE/CPM content marketplace). **Has native MCP support** — usable
directly from Claude/Alfred without a custom bridge.

**This is the centerpiece of the new Output layer** — it subsumes the
"Buffer MCP" idea entirely (no separate Buffer integration needed) and gives
Alfred's other new media tools somewhere to *go*:

```
Generation:  MoneyPrinterTurbo + LTX-Video (visuals) + VoxCPM2 (voice)
                    │
                    ▼
             alfred_creator.py  (new)
                    │
                    ▼
        AiToEarn MCP — publish, track, monetize across 14 platforms
```

**Integration:**
- New `alfred_creator.py` — orchestrates: synthesis_loop produces a
  fact/insight worth sharing → MoneyPrinterTurbo/LTX-Video render a short
  video, VoxCPM2 narrates it → AiToEarn MCP publishes + tracks performance.
- `synthesis_loop.py`: new cadence `content_pipeline` (daily/weekly) —
  optional, gated, and **should default to draft-only** (AiToEarn supports
  draft generation without auto-publish) until Jay reviews output quality.
- `orca.py`: this could become a new **Creator arm** rather than bolting onto
  Financier — content monetization is its own discipline, and AiToEarn's
  "Engage" agent (auto-reply/interaction) plus "Monetize" agent map cleanly
  to arm-style roles.

### VoxCPM2 — `huggingface.co/openbmb/VoxCPM2` + `github.com/Saganaki22/ComfyUI-VoxCPM2`
**What it is:** Tokenizer-free TTS, 2B params, 30 languages, 48kHz, voice
design + cloning, LoRA fine-tunable, Apache-2.0.

**Integration:**
- New `alfred_voice.py` — local inference via the model weights (runs on the
  RTX 2070 Max-Q, same "doesn't compete with jarvis" framing as Kronos:
  only loads when called).
- Used by: HyperFrames briefings (add narration track), `alfred_creator.py`
  (video voiceovers), and optionally a Slack voice-message feature.
- **Voicebox dropped** — Meta never released code/weights for it. VoxCPM2 is
  the single TTS solution.

### MoneyPrinterTurbo — `github.com/harry0703/MoneyPrinterTurbo`
**What it is:** AI short-video generator (script → visuals → voice → video).
⚠️ Maintenance mode since Dec 2025 — stable but low active development.

**Integration:** Visual/assembly layer for `alfred_creator.py`. Given its
maintenance status, treat it as a working baseline and be ready to swap its
video-assembly step for LTX-Video output directly if it falls behind.

### LTX-Video — `github.com/Lightricks/LTX-Video`
**What it is:** Fast open-weight video generation model (confirmed, you
linked it).

**Integration:** Higher-quality visual generator, used either as
MoneyPrinterTurbo's visual backend (if its plugin model allows swapping) or
directly by `alfred_creator.py` for short clips that don't need
MoneyPrinterTurbo's full pipeline.

### Longcat-Video avatar — ⚠️ still unconfirmed
I can't verify the exact repo/avatar feature for this one. If it's Meituan's
LongCat-Video project, it would slot in here as an **avatar/talking-head**
layer on top of VoxCPM2's audio — giving Alfred a face for briefings, on top
of HyperFrames' text-card format. Send the link and I'll fold in concrete
integration steps; structurally it sits in the same `alfred_creator.py`
pipeline as a third visual option alongside MoneyPrinterTurbo/LTX-Video.

---

## ━━━ PART 7 — NEW BATCH: COMMUNICATION, SCHEDULING, INFRA, DEVICE ━━━

### Cal.com — `github.com/calcom/cal.com`
**Integration:** Self-hosted, gives `interrupt_bus.py` **[FUTURE]** calendar
awareness — Alfred can check/propose meeting times for Jay. New
`alfred_calendar.py` wrapping Cal.com's API.

### PenPot — `github.com/penpot/penpot`
**Integration:** Open-source Figma alternative. Builder arm output for
*design* tasks (not just code) — when Jay asks for a mockup rather than a
working page, Alfred can produce a PenPot file via its API instead of (or
alongside) a coded artifact. Pairs with `alfred_taste.py` — taste critique
can run on PenPot exports too.

### Syncthing — `github.com/syncthing/syncthing`
**Integration:** P2P sync for Alfred's corpus/memory directories across
machines (Jay's Windows dev box + any Coolify-hosted server) without routing
through cloud storage. Pure infra — config only, no new Python file.

### escrcpy — `github.com/viarotel-org/escrcpy`
**What it is:** Electron GUI wrapper around `scrcpy` for Android screen
mirroring/control.

**Integration:** Directly extends the existing APK-modding workflow from
memory (the `zipfile`/`FileNotFoundError` work). New `alfred_android.py` —
shells out to escrcpy/scrcpy CLI for: launching a connected device, running
automated UI interactions for testing patched APKs, and pulling
screenshots/logs back for Alfred to inspect. Builder arm tool, used when a
task involves testing an Android build rather than just patching the APK file.

### Redis pub/sub — `github.com/redis/redis`
**Integration [FUTURE, paired with interrupt_bus.py]:** Once
`interrupt_bus.py` lands, back it with Redis pub/sub instead of an
in-process queue — lets Alfred's various services (Slack listener, Cal.com
webhook, ostafen/Kronos cron jobs, AiToEarn engagement webhooks) all publish
to one channel that the core loop subscribes to, regardless of which process
they run in. Until `interrupt_bus.py` exists, this has no integration target
— flagged for whenever that file lands.

---

## ━━━ UNIFIED ARCHITECTURE MAP ━━━

```
                         ┌───────────────────────────────────────────┐
                         │              ALFRED CORE                   │
                         │  agent.py | orca.py | synthesis_loop.py    │
                         │  interrupt_bus.py [FUTURE] | model_manager │
                         └──────────┬──────────────────────────────────┘
                                    │
   ┌───────────┬───────────┬────────┼────────┬──────────────┬─────────────┐
   ▼           ▼           ▼                 ▼              ▼             ▼
WORLD FEEDS  FINANCIER   SENTINEL        SENTINEL-      BUILDER       CREATOR (new)
(Osiris)     ARM         (digital)       PHYSICAL       ARM           ARM
             │           │               (new)          │             │
Browser Use  Fincept     ZAP             RuView          CodeGraph     MoneyPrinterTurbo
CamoFox      Kronos      web-check       (sensor mesh)   Understand-   + LTX-Video
Crawl4AI     TradingAgents Cyber-Skills                   Anything      + VoxCPM2
ScrapeGraphAI Public APIs                                 OpenSandbox   → AiToEarn
Supadata                                                  Spec Kit        (publish/
                                                           Superpowers      monetize)
                                                           alfred_taste.py
   │                                                                         │
   ▼                                                                         ▼
TOOL OCEAN (STELLA)                                                   OUTPUT/INFRA
OpenHands · Dify · Curriculum-           CURRICULUM LAYER (Part 0)    HyperFrames
graduated skills from:                   alfred_curriculum/           Slack · Cal.com
  Superpowers, Spec Kit,                 ledger.md tracks every        PenPot
  Anthropic-Cybersecurity-Skills,        skill: ingested→audited→      Syncthing
  Academic-Research-Skills,              distilled→graduated           escrcpy → Android
  Taste-Skill, anthropics/skills,        Audit gate: ZAP +             Supabase · Stirling
  knowledge-work-plugins                 OpenSandbox sandbox           PDF · Coolify
```

---

## ━━━ UNIFIED PRIORITY QUEUE ━━━

| Priority | Item | Effort | Why |
|---|---|---|---|
| 🔴 P0 | **Part 0 curriculum scaffold** (`alfred_curriculum/`, ledger, audit gate) | Medium | Everything skill-based depends on this existing first |
| 🔴 P0 | Crawl4AI, Stirling PDF, Supabase | Low-Med | Carried from v2, still the cheapest immediate wins |
| 🔴 P0 | CodeGraph | Low (`npm`/binary install) | Immediate Builder-arm token/cost savings, low risk |
| 🟠 P1 | Superpowers + Spec Kit (Month 1 curriculum) | Low-Med | Builder methodology upgrade, no infra needed |
| 🟠 P1 | Browser Use, CamoFox, Fincept fetchers | Low-Med | Carried from v2 |
| 🟠 P1 | OWASP ZAP | Low (Docker) | Needed both as Sentinel tool AND as the audit gate for everything else |
| 🟡 P2 | OpenSandbox | Medium | Unlocks safe curriculum auditing + OpenHands sandboxing |
| 🟡 P2 | VoxCPM2 | Low-Med | Local TTS, feeds HyperFrames + Creator pipeline |
| 🟡 P2 | TradingAgents (pattern-mine), Public APIs (filter pass) | Low | Cheap additions to Financier arm |
| 🟡 P2 | Taste-Skill curriculum → `alfred_taste.py` | Medium | Builder output quality |
| 🟢 P3 | AiToEarn + MoneyPrinterTurbo/LTX-Video → Creator arm | High | New arm, biggest scope item — do after core arms are solid |
| 🟢 P3 | Anthropic-Cybersecurity-Skills (curated subset) | Medium | Large repo, needs the audit gate to exist first |
| 🟢 P3 | Cal.com, PenPot, Syncthing, escrcpy | Low each | Quality-of-life, no dependencies |
| 🔵 P4 | RuView (sandboxed experiment only) | Low | Interesting, unverified — don't wire to actions yet |
| 🔵 P4 | OpenHands, Dify, Coolify, Kronos finance, HyperFrames | Med-High | Carried from v2 as P2/P3 |
| ⏸ Deferred | Redis pub/sub, ostafen/Kronos cron | — | Both target `interrupt_bus.py`, which doesn't exist yet |
| ⏸ Open question | Burp Suite | — | Pending Jay's Pro-license answer |
| ⏸ Open question | Longcat-Video avatar | — | Pending repo confirmation |

---

## ━━━ FILES SUMMARY ━━━

### New files (this phase)
| File | Purpose |
|---|---|
| `alfred_curriculum/` (dir) | Part 0 ledger + lessons |
| `sentinel_zap.py` | ZAP REST client — Sentinel tool + curriculum audit gate |
| `sentinel_webcheck.py` | web-check OSINT wrapper |
| `sentinel_physical.py` | RuView sensor-mesh reader |
| `alfred_codegraph.py` | CodeGraph wrapper for Builder arm |
| `alfred_sandbox.py` | OpenSandbox SDK wrapper |
| `alfred_spec.py` | Spec Kit flow driver |
| `alfred_taste.py` | Taste critique/regeneration loop |
| `alfred_creator.py` | Content pipeline orchestrator (MoneyPrinterTurbo/LTX-Video/VoxCPM2 → AiToEarn) |
| `alfred_voice.py` | VoxCPM2 local TTS client |
| `alfred_calendar.py` | Cal.com wrapper |
| `alfred_android.py` | escrcpy/scrcpy wrapper |

(v2's new files — `alfred_browser.py`, `alfred_db.py`, `alfred_slack.py`,
`alfred_video.py`, `fincept_bridge.py`, `kronos_client.py`,
`openhands_client.py`, `dify_client.py`, `corpus_processor.py` — unchanged,
still pending.)

### Files to modify (cumulative)
`finance_tools.py`, `orca.py`, `osiris_tools.py`, `research_tools.py`,
`synthesis_loop.py`, `agent.py`, `tools.py`, `server.py`,
`concern_register.py`, `principle_engine.py`, `alfred_watchdog.py`,
`openhands_client.py` (point at OpenSandbox), `corpus_manager.py`
(Public APIs source list).

### New env vars
```
ZAP_URL=http://localhost:8090
ZAP_API_KEY=
OPENSANDBOX_URL=
CODEGRAPH_INDEX_PATH=
AITOEARN_MCP_URL=
VOXCPM2_MODEL_DIR=
CALCOM_API_KEY=
PENPOT_URL=
PENPOT_TOKEN=
```
(plus all env vars from v2's table, unchanged)

---

## ━━━ OPEN ITEMS (still need Jay) ━━━
1. **Burp Suite** — Pro license (REST API) or manual-only? Default: manual-only.
2. **Longcat-Video avatar** — exact repo link.
3. Confirm Creator-arm scope: should AiToEarn auto-publish ever be enabled, or
   permanently draft-only with manual approval?
