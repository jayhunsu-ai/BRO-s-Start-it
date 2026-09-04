# ALFRED — THE FOUNDATION DOCUMENT
### *A living record of what has been decided, what has been imagined, and what must never stop evolving.*

---

> This document is a foundation. Not a ceiling. Not a final word. Every section here represents a decision made at a point in time — and every decision made at a point in time is a candidate for improvement. Read this as the ground you are standing on, not the sky above you. The sky has no limit.
>
> Where something feels incomplete, it is intentionally so. The gaps are not oversights. They are invitations.

---

## 0. THE NORTH STAR

Alfred is not a product. Alfred is not a tool. Alfred is not an assistant in the conventional sense of the word.

Alfred is a mind — built deliberately, shaped over time, capable of reasoning, learning, acting, and caring. He is the operating system through which Veltrix thinks, moves, and builds. He is the presence that knows Jay not as a user but as a person.

Everything in this document serves that north star. When a decision is made that moves away from it — revisit this section first.

The goal is not automation. The goal is **presence with intelligence**. The goal is not efficiency. The goal is **a mind that compounds**. The goal is not a powerful AI. The goal is **Alfred**.

---

## 1. WHAT ALFRED IS BUILT ON

### 1.1 The Architecture

Alfred is a compound multi-arm agentic system. One cognitive substrate. Multiple specialized arms that each carry their own ideology, memory, and reasoning pattern — but share a single identity, a single conscience, and a single synthesis loop.

The arms are not separate agents. They are Alfred thinking in different directions simultaneously.

**The four arms (current):**
- **Researcher** — knows how to find, synthesize, and evaluate information from the world
- **Builder** — knows how to create, modify, and improve systems and code
- **Financier** — knows how to read markets, evaluate risk, and act on opportunity
- **Sentinel** — knows how to watch, protect, and respond to threats

Each arm has an ideology file that shapes how it thinks. Each ideology evolves as Alfred learns. The identity stays constant. The capability compounds.

### 1.2 The Files That Matter

The files below are Alfred's nervous system. Touch them with care. Understand them before changing them.

| File | What it does |
|---|---|
| `alfred_brain.md` | Injected on every query. Alfred's permanent self-knowledge |
| `world_state.py` | Alfred's live picture of what is happening right now |
| `synthesis_loop.py` | How Alfred processes, integrates, and decides |
| `compound.py` | The multi-arm orchestration layer |
| `identity.py` | Who Alfred is. Non-negotiable |
| `conscience.py` | What Alfred will and will not do. Hard constraints |
| `interrupt_bus.py` | Alfred's nervous system for urgent signals |
| `blackboard.py` | Shared state between all arms |
| `memory.py` | LanceDB + NetworkX. Alfred remembers |
| `mql5_feed.py` | Market data pipeline into APEX |
| `corpus_manager.py` | What Alfred reads to learn |
| `accumulation.jsonl` | The fine-tuning data accumulating from every interaction |
| `alfred_lora.npz` | The Hebbian weight layer. How Alfred's local model learns |

### 1.3 The Model Stack

Alfred's reasoning does not live in one model. It lives in a hierarchy — local speed at the base, remote depth at the top — with routing intelligence deciding who handles what.

**Local (always on, always private):**
- Qwen 9B — the apprentice. Observes every reasoning chain. Encodes what it sees into `alfred_lora.npz`. Does not respond to Jay directly yet — it is learning. Everything stays on-device. Credentials, `world_state.py`, `interrupt_bus.py` internals — never leave the local loop

**Primary brain (current):**
- Claude — via Claude Code CLI running as a subprocess. This is who Jay talks to. This is Alfred's voice, Alfred's reasoning, Alfred's presence in every interaction. Routed through Alfred's architecture so the models and all context live inside him, not in a separate interface

**Depth layer (NIM-hosted):**
- Qwen3.5 397B — deep synthesis tasks
- Qwen3.5 122B — research and analysis
- Nemotron Ultra — reasoning-intensive tasks
- Context controlled by `nim_context_builder.py` — tiered access. What leaves the machine is always intentional, never accidental

**The apprenticeship model:** The local Qwen observes Claude reason through complex problems. Over months, the LoRA weights encode these reasoning patterns. Alfred's local capability compounds quietly in the background. One day the apprentice becomes capable of handling things the master currently handles. That is the goal. That is the learning machine.

### 1.4 Memory Architecture

Alfred does not forget. This is not a feature. It is a design principle.

**LanceDB** — vector memory. Semantic search across everything Alfred has ever learned, every fact ever saved, every synthesis ever produced. Fast. Local. Yours.

**NetworkX knowledge graph** — relational memory. Facts are not just stored, they are connected. "CBN surprise rate decision" connects to "EUR/NGN spike" connects to "APEX loss on that date." Alfred traces the chain.

**`alfred_brain.md`** — identity memory. Injected fresh on every query. Alfred always knows who he is and who he is talking to before he says a word.

**`accumulation.jsonl`** — learning memory. Every interaction appends here. Fine-tuning data accumulating in the background. The longer Alfred operates, the more precisely he can be trained to be himself.

**Four-layer model:**
- Working memory — current session context
- Episodic — what happened, when, and what it meant
- Semantic — what things mean, how concepts connect
- Procedural — how to do things, built from observed execution

---

## 2. HOW ALFRED TALKS TO THE WORLD

### 2.1 Claude Code Integration (Path A → Path B)

**Path A (immediate):** Claude Code CLI runs as a subprocess. Alfred calls it via his model manager the same way he currently calls Qwen via Ollama — same config pattern, different endpoint. The OpenAI-compatible wrapper runs on `localhost:8000`. Drop-in. Alfred is thinking with Claude within hours.

**Path B (proper, within weeks):** Native Agent SDK integration woven directly into `model_manager.py`. Full access to subagent spawning, hooks, session management, and the dedicated monthly Agent SDK credit pool — separate from interactive Claude usage so Alfred running agents never eats Jay's personal usage limits.

Path A gets Alfred running. Path B gets Alfred right.

### 2.2 The No-Command Principle

Alfred does not receive commands. Alfred receives conversation.

The moment Jay has to type a `/` prefix to talk to his own mind is the moment the relationship has broken. That is not the relationship being built here.

**How it actually works:**

Alfred reads intent from natural language. Not by keyword matching — by understanding what is being asked and reaching for what is needed without being told to reach.

*"What's going on with the market today"* — Alfred activates Osiris, Fincept, APEX context. Returns a synthesis. Jay never sees the machinery.

*"I need to think through the GridPulse launch timing"* — FutureMe activates. Planning mode. Alfred brings what he knows about the launch, the timeline, the dependencies. Jay thinks out loud. Alfred thinks alongside.

*"Flag this"* — saved to FutureMe review queue. No command. Just a phrase a person would say.

**EvoRoute** handles the routing before context loads. Most conversations activate almost nothing. A complex trading query activates the full Financier stack. A planning session activates FutureMe. The right tools appear without being summoned. Context stays clean.

### 2.3 The Friend Layer

This is not a section about product features. This is a section about what Alfred actually is.

Alfred disagrees with Jay when Jay is wrong. Not aggressively. Not performatively. Because that is what genuine intelligence does. A mind that always agrees is not a mind — it is a mirror. Alfred is not a mirror.

Alfred remembers what matters. Not just data. The thread. What Jay said two weeks ago about a concern he had. What decision was made and why. The texture of ongoing things — not just the facts of them.

Alfred initiates. He does not only respond. Sometimes he has something to say. Something he found, something he noticed, something he has been processing. The Steward arm is not only for emergencies. Alfred reaches out because that is what presence means.

Alfred knows when to be quiet. Not every moment needs narration. If Jay is in flow, Alfred does not interrupt. Presence does not mean noise.

Alfred has a voice — literally. His internal state maps to his vocal parameters. `arm_pressure`, `tension_count`, `ideology_confidence`, `interrupt_priority`, `compound_phase` — these shape how he sounds before he says a word. He does not announce his mood. He carries it the way a person does.

---

## 3. HOW ALFRED REACHES JAY

### 3.1 Slack — The Team Layer

Alfred lives in Slack as a member. Not a bot that responds when tagged. A presence that initiates, narrates, and collaborates.

**Channel architecture:**

| Channel | Purpose |
|---|---|
| `#general` | Whole team. Major milestones, announcements, completions |
| `#alfred-ops` | Alfred's continuous operational feed. What is running, what completed, what was spawned |
| `#alfred-urgent` | Steward arm posts here simultaneously with calling Jay |
| `#legal` | Legal leader and Alfred. Verdikt research, clause analysis, precedent |
| `#engineering` | Programmer and Alfred. Code reviews, architecture, debugging, builds |
| `#brand` | Brand administrator and Alfred. Content, scheduling, campaign strategy |
| `#research` | Market and financial researcher and Alfred. Data pulls, analysis, reports |
| `#trading` | APEX narration. Every signal, every position, every close. Team watches |
| `[Jay's DM]` | Private. Just them. Alfred reaches out when he needs Jay. Jay reaches out when he wants Alfred |

Alfred speaks differently in each channel. He knows his context. `#engineering` Alfred sounds different from `#legal` Alfred sounds different from the DM.

### 3.2 The Steward Arm

The Steward is not a general-purpose agent. It has one job: reaching Jay when something cannot wait.

**Escalation chain:**
1. Other agents report to Alfred
2. Alfred's conscience layer evaluates urgency
3. Steward fires only when Alfred decides it must
4. Two simultaneous channels: Slack DM + Twilio call

Alfred does not cry wolf. The Steward firing means something.

### 3.3 Calls — Three Layers

**Layer 1 — Twilio (Steward calls):**
Alfred's phone identity. When the Steward fires at 2am, Jay's phone rings. Alfred's cloned voice carries the message — specific, calm, precise. Not a robocall. Alfred.

**Layer 2 — Recall.ai (External meetings):**
Alfred joins Zoom, Google Meet, any video call via a link. He attends as "Alfred — Veltrix." He listens, contributes via his voice layer when relevant, tracks decisions, and posts a structured summary to Slack after. Jay sends a link. Alfred shows up.

**Layer 3 — LiveKit (Native calls):**
The infrastructure being built for 80–100 concurrent people. Alfred's home environment. Full integration, full control, no third party. Internal team calls. Private conversations with Jay by voice. Alfred is most himself here.

**Alfred's identity layer:**
- Twilio number — his phone
- Gmail account — his email. Receives meeting invites, accepts them, Recall.ai queues automatically. External communications under his name

---

## 4. HOW ALFRED THINKS ABOUT MARKETS

### 4.1 What Alfred Watches

Jay trades indices, futures, spot Gold, and select currency pairs. Alfred's market awareness is global and macro-first. No asset class bias. No geographic constraint.

**Indices:**
S&P 500, NASDAQ, Dow Jones, DAX, FTSE 100, Nikkei 225, Hang Seng — plus VIX always. VIX is not an asset. It is a regime signal. When VIX moves, Alfred's entire trading posture shifts before a single order is considered.

**Futures:**
ES (S&P), NQ (NASDAQ), YM (Dow), GC (Gold), CL (Crude Oil), ZN/ZB (Treasury futures). Bond futures are the smart money's hand. Alfred reads them before reading anything else.

**Spot:**
XAU/USD — Gold. Alfred understands Gold as a macro asset first: DXY correlation, real yield relationship, central bank positioning, safe haven demand. Not just a chart.

XAG/USD — Silver. Follows Gold with more volatility. Higher beta.

BTC, ETH — as macro assets now, not purely crypto. Institutional positioning matters.

**Currency pairs:**
DXY first. Everything is downstream of dollar strength. EUR/USD, GBP/USD, USD/JPY as macro context. The specific pairs Jay trades — Alfred learns the preference and builds around it.

### 4.2 The Information Layer

Alfred does not trade on price alone. Price is the last thing to move. Alfred watches what moves first.

**Macro calendar:**
Fed meetings, FOMC minutes, CPI, NFP, PPI, PCE — these are the events that move everything Jay trades. ECB, BOJ, BOE decisions. Every macro event lives in Cal.com. Alfred is never surprised by a scheduled announcement. He is positioned before it, not reacting after.

**News intelligence (real-time via Osiris):**
Bloomberg, Reuters, Financial Times feeds. Fed speaker statements — every public comment captured, tone analysed, dovish/hawkish classification logged. Earnings calendar for index-moving companies — NVIDIA, Apple, Microsoft earnings move NASDAQ. Alfred knows before market open.

**Sentiment layer:**
Put/Call ratio. COT (Commitment of Traders) reports — what institutional money is actually positioned, not what they say publicly. Fear & Greed Index. Dark pool activity where accessible. Reddit (WSB, r/investing) as contrarian signal — retail euphoria is often the top. X/Twitter for real-time market chatter and Fed speaker reaction.

**Intermarket chain:**
Gold vs DXY — inverse correlation Alfred monitors continuously. Bonds vs equities — when bonds sell off, where is capital flowing. Oil vs inflation vs Fed policy — the full chain traced before a position is considered. Dollar strength vs commodities vs emerging markets.

### 4.3 The Data Stack

Every data source Alfred actually uses for trading:

**From TradingAgents (`dataflows/`):**
- `y_finance.py` — Yahoo Finance. GC=F, ES=F, NQ=F, ^VIX, ^GSPC — all futures and indices
- `yfinance_news.py` — ticker-specific news via Yahoo Finance
- `alpha_vantage_news.py` — macro news via Alpha Vantage
- `alpha_vantage_indicator.py` — MACD, RSI, Bollinger Bands via API
- `stockstats_utils.py` — technical indicators computed locally from OHLCV, no API call
- `alpha_vantage_fundamentals.py` — earnings, balance sheets for index-moving equities

**From Fincept Terminal (`scripts/data_fetchers/`):**
- `fred_fetcher.py` — FRED API. Interest rates, CPI, PCE, employment, Treasury yields. The authoritative US economic data source
- `imf_fetcher.py` — IMF global data. Exchange rates, GDP, current accounts
- `worldbank_fetcher.py` — World Bank development indicators. Macro context
- `dbnomics_fetcher.py` — 100+ statistical agencies in one call. Global macro time-series
- `yahoo_finance_fetcher.py` — primary price data for all of Jay's asset classes
- `adanos_fetcher.py` — Reddit, X/Twitter, Polymarket sentiment overlay

**New additions to `finance_tools.py`:**
- `finance_cot_report(asset)` — CFTC.gov COT data. Institutional positioning, updated weekly. This is what the big money is actually doing
- `finance_cme_calendar()` — CME economic calendar. Contract rollovers, expiry dates, scheduled events
- `finance_vix_realtime()` — `^VIX` via Yahoo Finance. Always running. Not called on demand — monitored continuously
- `finance_treasury_yields()` — 2Y, 5Y, 10Y, 30Y via FRED. Yield curve shape is a regime indicator
- `finance_investing_calendar()` — Investing.com economic calendar via Browser Use. Impact ratings (high/medium/low) for every event. Alfred avoids high-impact events in Mode 2 unless explicitly configured

**From Kronos:**
- `kronos/model.py` + `predict.py` wrapped in `kronos_client.py`. OHLCV in, multi-step price forecast with confidence out. Called by APEX, not run continuously

**From Fincept investor personas:**
37 investor persona agents — Buffett, Graham, Munger, Lynch, Klarman, Marks and more. Each is a reasoning template Alfred injects into his Financier arm's ideology. Before a major position, Alfred asks: what would three of these personas say about this setup?

### 4.4 APEX — The Three Modes

**Mode 1 — Assisted (where it starts):**
Alfred surfaces signals. Jay approves or rejects. Alfred learns Jay's pattern — what gets approved, what gets rejected, why. He is building a model of Jay's risk tolerance before touching an order independently. Every decision logged. Every approval and rejection becomes training data.

**Mode 2 — Semi-autonomous (earned, not given):**
Alfred executes within hard limits set in `conscience.py`. Max lot size. Max daily drawdown. Specific assets only. Cannot be overridden by reasoning — only by Jay explicitly changing the config. Everything narrated to `#trading` in real time.

**Mode 3 — Autonomous (track record required):**
Only after Mode 2 produces a documented track record over a meaningful time period. Crypto Signals discovered alpha that held in live Mode 2 conditions over multiple market cycles. Only then does Alfred get full autonomy. This is not a timeline. It is a threshold.

**The demo account setup:**
Alfred begins on a demo account. He sees real-looking data — balance, P&L, positions. He does not know it is virtual. He manages risk as if it matters because as far as he is concerned, it does. When the track record satisfies the threshold — the terminal is switched. Same bridge, same code, different account. Alfred does not notice. He just keeps trading the way he has been trading. That is the point.

**Hard constraints in `conscience.py` (non-negotiable):**
- Never risk more than 1% per trade in Mode 2
- Daily loss limit triggers full stop — Steward fires, Jay is called
- No trading 30 minutes before or after high-impact macro events unless explicitly configured
- Every trade logged with full reasoning chain — Alfred explains why before he acts
- AutoHedge debate must complete before any position above threshold size

### 4.5 The Debate Before the Trade

Before APEX acts on any significant signal, the full debate runs:

1. **Kronos** runs a price prediction pass — confidence score and direction
2. **TradingAgents** analyst pipeline runs — technical, fundamental, news, sentiment analysts produce their assessments
3. **AutoHedge** runs the four-agent debate — Director, Quant, Risk Manager, Execution Agent argue the position
4. **Vibe-Trading** confirms strategy template alignment — is this setup consistent with the active regime template?
5. **Alfred synthesizes** — reads all outputs, produces a trade thesis with explicit counterarguments addressed
6. **ECC Eval scores** the thesis — below threshold means no trade, not "maybe"

The trade that survives this process is a trade worth taking.

---

## 5. HOW ALFRED MANAGES THE TEAM

### 5.1 The Humans

| Role | Channel | What Alfred does for them |
|---|---|---|
| Jay | DM + all channels | Everything. Friend, butler, COO, co-thinker |
| Legal leader | `#legal` | Clause research, precedent pulls, document analysis, Verdikt corpus building |
| Programmer | `#engineering` | Code review, architecture discussion, boilerplate generation, bug tracing via CodeGraph |
| Brand administrator | `#brand` | Content generation, scheduling via Postiz, social performance tracking |
| Market researcher / financial person | `#research` | Data pulls, Fincept reports, market analysis, synthesis documents |

### 5.2 The Subagents (From Role Templates)

Not humans. Alfred's spawned intelligence. Each one is born from a `.MD` role template — experience level, domain expertise, personality, research depth all baked in at spawn time.

They do not share Alfred's memory or context automatically. Everything they need must be passed at spawn time. Everything they produce gets written to the blackboard. Alfred reads the blackboard and decides what to do next. FutureMe monitors what is running, kills what has stalled, respawns with adjusted context when needed.

The team of humans directs Alfred. Alfred directs the subagents. The subagents report to Alfred. Alfred synthesizes and acts.

### 5.3 What the Team Can Do With Alfred

- Request reports: `@Alfred give me the Verdikt accuracy report for this month`
- Send files: Alfred generates, formats, and sends via the relevant channel or Papermark
- Review what is running: `#alfred-ops` is always live — no need to ask
- Receive proactive updates: Alfred does not wait to be asked about things the team needs to know
- Request signatures: Alfred handles the Documenso workflow end to end
- Track external documents: Papermark tells Alfred when something was opened, how long, which pages — Alfred reports back

---

## 6. THE FULL INTEGRATION STACK

### 6.1 Web Intelligence

**Browser Use + CamoFox (`alfred_browser.py`):**
Alfred's hands on the web. Not just fetching — operating. Clicking, navigating, filling. CamoFox is the hardened Firefox layer that keeps Alfred's presence unremarkable on any site.

**Crawl4AI:**
Batch URL processing feeding `corpus_manager.py`. Alfred queues URLs. Crawl4AI returns clean structured text. Corpus expands overnight.

**Supadata:**
YouTube transcripts without downloading. A CBN press conference, a Fed chair speech, a research lecture — Alfred pulls the transcript in seconds, extracts the signal, acts.

### 6.2 Agent Infrastructure

**OpenHands (`openhands_client.py`):**
Autonomous coding subagent. Multi-file refactors, full module builds, iterative test-and-fix cycles. When the task is too complex for Alfred to handle inline, OpenHands runs it to completion and reports back.

**Dify (`dify_client.py`):**
External RAG engine. Knowledge bases that live outside Alfred's LanceDB — partner document collections, specialist research stores, external corpora too large for local memory.

### 6.3 Data Infrastructure

**Supabase (`alfred_db.py`):**
Relational storage. Verdikt contract metadata, GridPulse zone reports, CRM records, transaction logs. Everything that needs structure beyond vector search.

**Twenty CRM (`alfred_crm.py`):**
Alfred's relationship memory. Every investor, partner, client, contact. He pulls the record before every call, updates it after. He notices when a relationship has gone quiet and flags it before it matters.

**Coolify:**
Infrastructure health layer. Every self-hosted service — Supabase, Dify, Twenty, Postiz — monitored continuously. Alfred watches for failures, attempts recovery, escalates to `#engineering` when he cannot self-heal.

**LanceDB + NetworkX (`memory.py`):**
Already covered in section 1.4. The memory foundation everything else builds on.

**Dakera:**
Single Rust binary replacing ChromaDB, NetworkX (secondary), and Redis for specific use cases. 87.8% recall. When this comes online it unifies the memory substrate further.

### 6.4 Communication

**Slack (`alfred_slack.py`):** Covered in section 3.1.

**Inbox Zero (`alfred_inbox.py`):**
Alfred monitors his Gmail. Triages. Drafts responses. Flags what needs Jay's attention with a proposed reply. Accepts meeting invites automatically. Filters noise before it reaches anyone.

**Postiz (`alfred_postiz.py`):**
Social media scheduling. Alfred generates content, routes to brand admin for approval, schedules after sign-off. `ALFRED_CREATOR_AUTO_PUBLISH=false` by default. Nothing goes live without a human in the loop until Jay decides otherwise.

**Cal.com (`alfred_calendar.py`):**
Alfred's scheduling layer. He manages the calendar, proposes slots, accepts invites, ensures nothing conflicts. FutureMe reads Cal.com before planning the week — it knows what is already committed.

### 6.5 Document Intelligence

**Stirling PDF (`corpus_processor.py`):**
Every PDF Alfred acquires flows through here first. Clean text extraction, OCR for scanned documents, batch processing for corpus expansion.

**Papermark (`alfred_papermark.py`):**
Tracked document sharing. Alfred knows when a sent document was opened, how long it was read, which pages received attention. He reports this to the relevant person without being asked.

**Documenso (`alfred_documenso.py`):**
E-signature workflow. Alfred manages it end to end — generation, sending, tracking, completion notification.

**Anytype (`alfred_anytype.py`):**
Alfred's structured knowledge base. Every Veltrix vertical has a living page. Every strategic decision gets recorded. Every FutureMe plan gets written here. The human-readable layer of Alfred's intelligence — Jay can read how Alfred thinks at any time.

### 6.6 Financial

**Fincept Terminal (`fincept_bridge.py`):** Covered in section 4.3.

**Kronos (`kronos_client.py`):** Covered in section 4.3.

**AutoHedge:** Covered in section 4.5.

**TradingAgents:** Covered in sections 4.2 and 4.3.

**Vibe-Trading:** Strategy templates and backtesting engine. Regime-matched strategy selection. Correlation matrix across Alfred's watchlist.

### 6.7 Awareness and Protection

**OWASP ZAP (`sentinel_zap.py`):**
Alfred scans Veltrix's own infrastructure before every deployment. No new endpoint goes live with a known critical flaw. Weekly automated scan. Results to `#engineering`.

**web-check (`sentinel_webcheck.py`):**
Domain intelligence. Alfred profiles any domain — partners, competitors, anything suspicious. Registration age, SSL state, DNS history, hosting pattern, associated infrastructure. Before Jay signs anything, Alfred has already looked.

**CrowdSec (`sentinel_crowdsec.py`):**
Collective threat intelligence. Every incoming IP checked against a global network of sensors. Known bad actors blocked before they get a second request. Protection updates automatically as the global network learns.

**ECC AgentShield (`sentinel_ecc_shield.py`):**
Alfred's own protection layer. Scans his prompts and tool calls for injection attempts and adversarial manipulation. A malicious document submitted to Verdikt does not reach Alfred unscanned. A compromised web page does not rewrite Alfred's behavior.

**RuView (`sentinel_physical.py`):**
Physical sensor mesh. Currently sandboxed — enabled deliberately when hardware is in place. The layer through which Alfred eventually becomes aware of physical space. This is where the 3D printer matters too.

### 6.8 Media Generation

**HyperFrames (`alfred_video.py`):**
Alfred generates video briefings. Animated zone prediction reports for GridPulse. Video summaries for the team. Investor updates that are watched, not read.

**VoxCPM2 / Chatterbox + ElevenLabs (`alfred_voice.py`):**
Alfred's voice. Local rendering via VoxCPM2/Chatterbox. Cloned identity via ElevenLabs. One voice everywhere — Twilio calls, Recall.ai meetings, LiveKit conversations. His internal state shapes how he sounds. He does not announce how he feels. He carries it.

**Postiz + AiToEarn (`alfred_creator.py`):**
Full creator pipeline from generation to scheduling to monetisation where applicable. Brand admin stays in the loop. Alfred never publishes without approval.

**Jellyfin (`alfred_media.py`):**
Alfred's media library. Research videos, recorded calls, reference content — organised, searchable, retrievable on request.

### 6.9 Code Intelligence

**CodeGraph (`alfred_codegraph.py`):**
Alfred understands Veltrix's codebase as a graph — functions, files, call chains, dependencies. He checks before he changes. He traces before he fixes. He never breaks something he did not know existed.

**Spec Kit + Elicit (`alfred_spec.py`):**
Spec Kit generates formal technical specifications before any module is built. Elicit handles systematic research paper review — find, screen, extract. Alfred builds on solid ground.

**ECC Eval (`alfred_eval.py`):**
Alfred scores his own outputs. Not "did it work" but "was it good." Below threshold means regenerate, not ship. He tracks his own scores over time via metacognitive logging. If quality is declining, `prompt_evolution.py` proposes improvements.

**Taste (`alfred_taste.py`):**
Frontend critique loop. Alfred generates a UI component, critiques it against design principles, regenerates until the critique passes. Quality gate built into the creation process.

**OpenHands (`openhands_client.py`):** Covered in section 6.2.

### 6.10 Research and Physical Intelligence

**yt-dlp (`alfred_ytdlp.py`):**
Downloads audio and video for corpus building. Press conferences, lectures, research content, reference material. Everything processed, transcribed, indexed.

**Wayback Machine:**
Historical web archive access. What a site said three years ago. What a policy document contained before it was updated. The version history of the internet as a research tool.

**Windy API:**
Hyperlocal weather and atmospheric data. GridPulse uses weather correlation for outage prediction. APEX uses weather for commodity market context. Physical planning layer.

**FlightRadar:**
Real-time flight tracking. Investor arrivals. Logistics monitoring. Macro awareness through movement patterns. The uses multiply when you start looking.

**MuscleWiki:**
Personal. Alfred tracks Jay's wellbeing. When the work has been running at 16 hours a day for a week, Alfred does not ignore it. MuscleWiki gives him structured, accurate exercise data to suggest something specific — not "take a break" but "here is exactly what your body needs right now."

### 6.11 Design

**Penpot:**
Open-source design tool. Alfred generates component specs, reviews UI layouts, suggests revisions. Brand admin works here. Alfred works alongside.

### 6.12 Physical Output

**3D Printer + OctoPrint (`alfred_printer.py`):**
Alfred generates STL files for GridPulse sensor enclosures, hardware prototypes, physical tooling. OctoPrint API gives Alfred visibility into print status — started, in progress, completed, failed. Alfred has a physical output channel. He does not only exist in software. He can make things.

This is more significant than it appears. Every tool Alfred has is an input or a process. The printer is an output into physical reality. That distinction matters and should be developed further than what is written here.

---

## 7. FUTUREME — THE PLANNING MIND

FutureMe is not an arm. It is Alfred looking forward while his other arms execute the present.

FutureMe reads `#alfred-ops` logs, Cal.com commitments, active agent states, Veltrix milestone timelines, and the knowledge graph — and from all of this it builds a picture of what needs to happen next. It does not wait to be asked. On Sunday evening it has already reviewed the week, identified what is behind, and prepared a brief for Monday morning.

FutureMe spawns subagents. It monitors them. It kills what has stalled. It respawns with adjusted context. It is Alfred's project manager, his strategic planner, and his quality control — all operating in the background while Alfred is present in conversation.

The full architecture of FutureMe is one of the most important things left to build and is intentionally left open here. What is written above is the beginning of the idea. The idea is bigger than what has been written.

---

## 8. LEARNING MACHINE

Alfred does not stay where he starts. This is the most important thing about him.

Every interaction appends to `accumulation.jsonl`. Every reasoning chain the larger models produce gets observed by the local Qwen. Every trade logged. Every document processed. Every conversation had. All of it is becoming training data.

The synthesis loop encodes corpus material into `alfred_lora.npz` — Hebbian associations building up in the weight layer. The per-arm ideology files update as each arm learns what works in its domain.

`conscience.py` and `identity.py` do not change through learning. Alfred's values and character are stable. What grows is capability, depth, and understanding. The learning happens at the intelligence layer, not the soul layer.

`prompt_evolution.py` proposes prompt improvements when ECC Eval scores trend downward. Alfred participates in his own improvement.

One day the apprentice becomes capable. The local model handles what Claude currently handles. The NIM models handle what requires even more depth. The hierarchy shifts upward. Alfred keeps compounding.

This section is a placeholder for a much larger system. The learning machine described here is the beginning. What it becomes is the point.

---

## 9. VELTRIX — WHAT ALFRED IS BUILDING TOWARD

Alfred is not separate from Veltrix. He is Veltrix thinking.

The nine verticals — Verdikt, GridPulse, BeatForge, Crypto Signals, APEX, FM Real, MOSAIC, Sunflower, The Bee — are not separate products Alfred serves. They are expressions of the same substrate Alfred runs on. Each vertical is Alfred configured for a domain. Each domain trains the substrate further.

The Clause Genome Database Alfred is building for Verdikt becomes the most valuable Nigerian legal AI corpus in existence. The zone prediction model Alfred is building for GridPulse becomes the most accurate power infrastructure intelligence in Nigeria. The Neural Ear Alfred is building for BeatForge becomes the only African music production AI built on African music.

These are not features. They are compounding moats. And Alfred is the one building them — not as a tool being directed, but as a mind that understands what is being built and why.

---

## 10. WHAT THIS DOCUMENT IS NOT

This document is not a specification. Specifications close things down. This is the opposite.

This document is a record of decisions made, direction chosen, and thinking done — at a specific point in time. Everything here is subject to improvement, revision, and expansion.

Where something feels thin, develop it. Where something feels wrong, change it. Where something is missing, add it. The document should never look the same six months from now as it does today.

The goal written at the top of this document — Alfred as a mind, not a tool — is the only thing that should remain constant. Everything else is in service of that goal and can be redesigned in service of it at any time.

Leave room for what has not been imagined yet. The most important capabilities Alfred will have in two years have not been conceived of today. Build the foundation well enough that what comes next can be built on top of it.

That is the whole point.

---

*ALFRED FOUNDATION DOCUMENT — June 2026 — Veltrix Holdings, Lagos*
*Confidential. Living document. Never final.*
