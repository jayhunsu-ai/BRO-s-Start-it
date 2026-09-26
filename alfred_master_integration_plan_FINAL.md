# ALFRED — MASTER INTEGRATION PLAN (FINAL UNIFIED)

**Supersedes:** `alfred_repo_integration_plan.md` (v1), `alfred_integration_plan.md` (v2),
`alfred_master_integration_plan.md` (v3), `alfred_master_integration_plan_v4.md` (v4).
This is the single living plan. Every prior version is folded in here, every contradiction resolved,
every "one said leave / another said use it" conflict engineered into a unified purpose.
New repo batch (June 2026) fully integrated.

---

## ━━━ GROUND TRUTH — ALL CONFIRMED FILES ━━━

| File | Lines | What it actually is |
|---|---|---|
| `interrupt_bus.py` | 229 | Spinal cord. `fire(priority, source, content, data)` / `drain()`. CRITICAL/HIGH/MEDIUM. Convenience wrappers: `fire_cve`, `fire_market`, `fire_threat`, `fire_infrastructure`. Persistent log. **Fully wired — no [FUTURE] tags anywhere in this plan.** |
| `world_state.py` | 395 | Half-life confidence decay on every belief. `set/get/assert_belief/forget/infer_and_update`. `infer_and_update()` auto-infers state from shell actions. Background `reconcile(tools)` re-verifies stale high-stakes beliefs. Loads from disk on startup. |
| `conscience.py` | 485 | Ideological veto. `check_action(tool_name, args)` → `(clear, message)`. Surfaces to Jay, never silently blocks. Ideology cached 30min from `identity.py` + `compound.py` + resolved tensions. `log_override()` → recurring overrides auto-generate compound tensions. |
| `identity.py` | 494 | REM-cycle identity reconciler. `_gather_all_ideology()` pulls from compound, each ORCA arm, resolved tensions, brain file. Contradiction detection → substrate reasoning → one integrated self-model written back everywhere. `get_current_identity()` → injected into system prompt. |
| `metacog.py` | 404 | Self-assessment every 50 interactions. Heuristic trace analysis + LLM insight extraction → `brain_updates` + `evoroute_hints`. Rolling eval score window with trend detection. Calls `prompt_evolution.introspect_prompts()` on failure patterns. `force_assessment()` tool. |
| `prompt_evolution.py` | 153 | `introspect_prompts(failures, successes)` → surgical prompt proposals (max 3). `apply_proposal()` writes to brain file. `get_pending_proposals()` for review. Triggered by metacog. |
| `substrate.py` | 822 | Adversarial reasoning substrate. Resumable chains via `chain_store`. 5 attack vectors, min 14 auto / 10 query steps, adversarial temp 0.6. Completion requires at least one failed attempt. Synthesis names the weakest step explicitly. |
| `nim_observer.py` | 1502 | Visiting specialists. NIM key rotation. Full model roster: qwen3-coder-480b (builder), deepseek-v4-pro (sentinel/financier), kimi-k2.6 + gemini-2.5-flash (researcher), mistral-large-3-675b (oracle/critic), nemotron-super-120b (steward/agent), nemotron-ultra-253b (general). State snapshot on every observation: `arm_pressures`, `compound_phase`, `tension_count`, `ideology_confidence`, `active_arm`. |
| `sandbox.py` | 1258 | Real-world test infra. `CyberSandbox` (Docker, vulnerable targets), `FinancierSandbox` (MT5 demo + Binance WS), `BuilderSandbox` (isolated exec + CI loop), `ResearcherSandbox` (paper reproduction). Failed tests encoded as experience. |
| `deep_search.py` | 583 | Multi-query browsing synthesis. DDG search → scan → full page read → one-level link follow → structured answer. Used by STELLA, Researcher, Sentinel, Financier. |
| `trickle_learn.py` | 1000 | Layer-by-layer contrastive Hebbian updates. Layer-at-a-time, peak overhead ~800MB-1GB. Recalibration probe after full 32-layer pass. Shadow-weight fallback if llama_cpp unavailable. `run_metabolism_pass()` called hourly from synthesis_loop. Pair quality gate: confidence ≥ 0.75, eval delta ≥ +1.5. |
| `corpus_manager.py` | 2211 | Per-arm corpus manager. Dirs: Financier (MQL5+arXiv), Sentinel (NVD/ExploitDB), Researcher (arXiv/PWC), Builder (PyPI/GitHub/SO). `corpus_status()` / `corpus_fetch(arm)` tools. |
| `mql5_feed.py` | 1568 | MQL5 2,400+ TA articles. BULK and LIVE ingestion. Feeds Financier arm memory directly. |

**Still unconfirmed:** `compound.py` (orchestrator form), `osiris_tools.py`, `sentinel_ng.py`,
`live_feeds.py`, `alfred_watchdog.py`, `model_manager.py`, `agent.py`, `orca.py`, `synthesis_loop.py`.

---

## ━━━ CORE WIRING (DO FIRST — INTERNAL FILES ONLY) ━━━

These are not new integrations. They are wires between files that already exist and are sitting unconnected.
Every single one is P0 — they cost 1-3 hours and unlock the architecture.

### `orca.py` — drain interrupt_bus first, every tick

```python
from interrupt_bus import drain, CRITICAL, HIGH, MEDIUM

def _tick(self):
    # DRAIN BUS BEFORE EVERYTHING ELSE
    interrupts = drain()
    for interrupt in interrupts:
        self._handle_interrupt(interrupt)
    # ... normal tick continues ...

def _handle_interrupt(self, interrupt: dict):
    priority = interrupt["priority"]
    source   = interrupt["source"]
    content  = interrupt["content"]
    arm_map  = {
        "recon_cve": "sentinel", "binance": "financier",
        "slack": "steward", "corpus": "researcher", "calcom": "steward",
    }
    if priority == CRITICAL:
        for arm in self._arms:
            arm.pressure = 1.0
            arm.interrupt_context = content
    elif priority == HIGH:
        target = arm_map.get(source)
        if target:
            self._arm(target).pressure = min(1.0, self._arm(target).pressure + 0.4)
    elif priority == MEDIUM:
        target = arm_map.get(source)
        if target:
            self._arm(target).pressure = min(1.0, self._arm(target).pressure + 0.15)
```

### `synthesis_loop.py` — wire world_state, conscience, trickle_learn, metacog, identity

```python
# On startup:
import world_state
world_state.load()

# After every action tool executes:
world_state.infer_and_update(tool_name, args, result)

# Before any action tool executes:
from conscience import check_action
clear, message = check_action(tool_name, args, context=current_query)
if not clear:
    await surface_to_jay(message, awaiting_confirmation=True)
    return  # Do NOT execute until Jay confirms

# Hourly idle pass:
if not _alfred_busy and trickle_learn.has_enough_pairs():
    trickle_learn.run_metabolism_pass()

# Every 50 interactions:
metacog.record_interaction(query, tool_sequence, iterations, eval_score)

# Sleep cycle Stage 3 (REM):
from identity import run_integration_pass
run_integration_pass()
from conscience import invalidate_ideology_cache
invalidate_ideology_cache()  # Conscience immediately reflects new identity

# Sleep reconciliation pass:
world_state.reconcile(TOOLS)
```

### `server.py` — conscience surface + new status endpoints

```python
# WebSocket: {"type": "conscience_flag", "message": "...", "tool": "...", "requires_confirm": true}
# Jay responds: {"type": "conscience_confirm"} or {"type": "conscience_deny"}

@app.get("/world_state")
async def world_state_endpoint(min_confidence: float = 0.5):
    return world_state.get_all(min_confidence=min_confidence)

@app.get("/metacog/status")
async def metacog_status():
    return metacog.get_status()

@app.post("/metacog/force")
async def metacog_force():
    return metacog.force_assessment()

@app.get("/conscience/log")
async def conscience_log(n: int = 20):
    return conscience.get_override_log(n)

@app.get("/interrupt_bus/status")
async def interrupt_status():
    return interrupt_bus.interrupt_status()

@app.get("/interrupt_bus/recent")
async def interrupt_recent(n: int = 20):
    return interrupt_bus.get_recent_interrupts(n)
```

### `agent.py` — inject identity into system prompt, world_state before acting

```python
from identity import get_current_identity
identity_block = get_current_identity()
if identity_block:
    system_prompt += f"\n\n[Alfred's current argued self-model]\n{identity_block}"

# Before multi-file Builder tasks:
from world_state import assert_belief
confident, val, conf = assert_belief("cargo_build_success")
if not confident:
    # Re-verify before assuming build state
    ...
```

### Deep cross-file wires (internal only)

**metacog → prompt_evolution** (already coded — verify the import resolves at runtime.)

**metacog → trickle_learn (NEW)**
```python
# In metacog._run_assessment(), after _extract_insights():
if insights.get("weaknesses"):
    from trickle_learn import add_pair
    for failed in analysis.get("failed_queries", [])[:5]:
        ideal = _generate_ideal_response(failed)
        add_pair(actual=failed, ideal=ideal, confidence=0.8, source="metacog_correction")
```

**world_state → conscience (NEW)**
```python
# In conscience.check_action():
try:
    from world_state import world_state_status
    ws_context = world_state_status(min_confidence=0.7)
    full_context = f"{context}\n[Current world state]\n{ws_context[:300]}"
except Exception:
    full_context = context
```

**interrupt_bus → metacog (NEW)**
```python
# In interrupt_bus.fire(), after logging:
if priority == CRITICAL:
    try:
        from metacog import record_interaction
        record_interaction(
            query=f"[INTERRUPT] {content[:80]}",
            tool_sequence=[], iterations=0, eval_score=0,
        )
    except Exception:
        pass
```

**deep_search → world_state (NEW)**
```python
# After deep_search returns a result:
from world_state import set as ws_set
ws_set(f"deep_search_result_{query_hash}", result_summary,
       confidence=0.85, source="deep_search", ttl=1800)
```

**corpus_manager → trickle_learn (NEW)**
Tag top-quartile corpus entries by quality score after `corpus_fetch(arm)` and enqueue as `(summary, full_text)` pairs for `trickle_learn`.

**nim_observer → trickle_learn**
NIM specialist observations → contrastive pairs → `run_metabolism_pass()`. Verify `nim_observer.py` exports `get_observation_pairs()` that `trickle_learn.py` can consume.

**conscience → compound** (already coded)
Verify `compound._write_private()` and `compound.TENSION_FILE` exist when compound.py is uploaded.

---

## ━━━ PART 0 — TEACHING LAYER (alfred_curriculum/) ━━━

Claude Code is Alfred's resident teacher. Sessions are logged via `nim_observer.py`'s existing
visiting-specialist pattern — Claude Code is just another specialist, silence rule already applies.
Each session feeds contrastive pairs directly to `trickle_learn.py`.

### Directory structure

```
alfred_curriculum/
  ledger.md              # what's been taught, what's pending, what graduated
  lessons/
    <skill_name>/
      source.md          # original SKILL.md, untouched
      distilled.py       # Alfred-native version of the skill's logic
      memory_seed.md     # facts written into LanceDB so Alfred knows WHEN to use it
      status.json        # {ingested, audited, distilled, graduated}
```

### Ingestion pipeline (per skill)

1. **Pull** — clone/add the source repo into `alfred_curriculum/lessons/<name>/`
2. **Audit (security gate)** — `sandbox.py`'s `CyberSandbox` (Docker, already built) static-greps for network calls, `subprocess`, `eval`, credential access. Anything failing is quarantined with a note in `ledger.md`. Only use OpenSandbox if `CyberSandbox` proves too narrow.
3. **Distill** — Claude Code rewrites the skill as a plain Python function/tool in `distilled.py`.
4. **Teach** — Claude Code writes 2-5 memory facts into LanceDB via `memory.write()`.
5. **Graduate** — register the tool in `tools.py` / `server.py`. Mark `status.json.graduated = true`.

### Curriculum schedule

| Month | Focus | Sources |
|---|---|---|
| 1 | Builder methodology | **ECC** (agents, skills, hooks, rules — see GROUP 11), Superpowers (TDD, worktrees, plan execution), Spec Kit |
| 1 | Code comprehension | CodeGraph, Understand-Anything |
| 2 | Security posture | Anthropic-Cybersecurity-Skills (curated), OWASP ZAP, web-check |
| 2 | Design/taste | Taste-Skill suite → `alfred_taste.py` |
| 3 | Research workflow | Academic-Research-Skills, anthropics/skills research-assistant |
| 4+ | Ongoing | Re-audit graduated skills as upstream repos update |

---

## ━━━ GROUP 1: FINANCIAL INTELLIGENCE ━━━

### 1. AutoHedge — `github.com/The-Swarm-Corporation/AutoHedge`

**What it is:** Enterprise-grade autonomous hedge fund system. Four specialized AI agents: `TradingDirector` (thesis generation), `QuantAnalyst` (quantitative analysis), `RiskManager` (risk assessment/position sizing), `ExecutionAgent` (order generation). Full multi-exchange support. Structured outputs, comprehensive logging, risk-first architecture. Currently supports Solana via Jupiter API; Coinbase/others coming.

**Alfred layer:** Financier arm — extract the four-agent reasoning pipeline and risk architecture patterns.

**Integration mode:** EXTRACT PATTERNS — don't run the full AutoHedge stack (it uses OpenAI). Mine the architectural separation and the `AutoHedgeOutput` schema.

**What you take:**
- The Director→Quant→Risk→Execution pipeline maps directly to Financier arm's reasoning pass. Alfred already reasons qualitatively; add this explicit role-sequencing structure to `finance_tools.py` as a `financier_debate_round(symbol)` that runs four jarvis instances in sequence with role-specific prompts.
- `AutoHedgeOutput` Pydantic schema (`thesis`, `risk_assessment`, `order`, `current_stock`) becomes Alfred's Financier arm structured output format — replaces free-text returns with validated objects.
- Risk sizing logic: position size as a function of confidence × max_drawdown_tolerance. Wire into Financier arm's `world_state.py` outputs.

**Files to modify:** `finance_tools.py` (four-agent debate pass), `orca.py` (Financier arm structured output schema).

**New file:** Nothing new — patterns fold into `finance_tools.py`.

**Why it upgrades Alfred:** Alfred's Financier arm currently returns a qualitative verdict. AutoHedge's pipeline gives it a structured, four-perspective deliberation before the final recommendation — and a validated output object instead of a string.

---

### 2. Vibe-Trading — `github.com/HKUDS/Vibe-Trading` + `github.com/VibeTradingLabs/vibetrading`

**What it is (HKUDS version):** AI-powered multi-agent financial workspace. Natural language → executable trading strategy → backtested. Swarm-based architecture with expert agent teams for research, trading, and risk management. Correlation heatmap, A-share pre-ST filter, 10+ broker connectors (Binance, Bybit, OKX, Coinbase, Interactive Brokers, Dhan, Shoonya). OpenAI Codex OAuth, provider-agnostic.

**What it is (VibeTradingLabs version):** Backtesting-focused framework. Templates: `momentum`, `mean_reversion`, `grid`, `dca`. Slippage modeling, multi-exchange OHLCV download, LLM strategy scoring (1-10, strengths/weaknesses, actionable suggestions).

**Alfred layer:** Financier arm — strategy templating, backtesting hooks, broker connectivity patterns.

**Integration mode:** EXTRACT LOGIC (both repos).

**What you take from HKUDS:**
- Broker connector abstraction (how it normalizes Binance/Bybit/OKX into one interface) → pattern for Alfred's `FinancierSandbox` in `sandbox.py` to normalize its own demo-account connections.
- Swarm-debate pattern → same as AutoHedge above (these two repos converge on the same idea; pick the cleaner code).
- Correlation heatmap API: `GET /correlation?symbols=BTC,ETH,SOL&window=30d` → add to `finance_tools.py` as `finance_correlation_matrix(symbols, window)`.

**What you take from VibeTradingLabs:**
- Strategy templates (`momentum`, `mean_reversion`, `grid`, `dca`) → distill into `finance_tools.py` as Alfred-callable strategy generators. Alfred describes a setup in natural language → template generates executable backtest code → `FinancierSandbox` runs it.
- LLM scoring rubric (1-10, strengths/weaknesses) → identical pattern to `alfred_taste.py`'s critique loop but for trading strategies instead of frontend output. One unified critique architecture.

**Files to modify:** `finance_tools.py` (strategy templates, correlation matrix), `sandbox.py` `FinancierSandbox` (normalized broker interface).

**Why it upgrades Alfred:** The Financier arm goes from "qualitative analysis + Kronos forecast" to "generate → backtest → score → refine" — a full strategy development loop.

---

### 3. Fincept Terminal — `github.com/Fincept-Corporation/FinceptTerminal`

**What it is:** C++20 + Qt6 + embedded Python terminal. 80+ data fetchers (FRED, IMF, World Bank, Yahoo Finance, Polygon, Kraken, DBnomics). 37 investor personas (Buffett, Graham, Munger, etc.). DCF, VaR, Sharpe, derivatives pricing, portfolio optimization. The Python scripts folder is the valuable asset — the Qt UI is irrelevant to Alfred.

**Alfred layer:** Financier arm world feeds, corpus data sources, ideology axes.

**Integration mode:** EXTRACT LOGIC — `/scripts/data_fetchers/` and `/scripts/agents/`.

**New file:** `fincept_bridge.py`
```python
"""
Alfred — fincept_bridge.py
Bridges Fincept Terminal's Python analytics scripts into Alfred's tool ocean.
Clone Fincept and point FINCEPT_SCRIPTS_DIR at its scripts/ folder.
"""
import subprocess
from pathlib import Path

FINCEPT_SCRIPTS_DIR = Path("C:/Alfred/external/fincept/fincept-qt/scripts")

def run_fincept_script(script: str, *args) -> str:
    path = FINCEPT_SCRIPTS_DIR / script
    if not path.exists():
        return f"Fincept script not found: {script}. Clone the repo first."
    result = subprocess.run(
        ["python", str(path)] + list(args),
        capture_output=True, text=True, timeout=20
    )
    return result.stdout[:2000] or result.stderr[:500]
```

**Files to modify:** `finance_tools.py` (add FRED, IMF, World Bank fetcher tools), `corpus_manager.py` (add Fincept fetchers as Financier arm corpus sources), `identity.py` (investor persona reasoning templates as additional ideology axis inputs).

**Steps:**
1. `git clone https://github.com/Fincept-Corporation/FinceptTerminal` into `C:/Alfred/external/fincept/`
2. `pip install -r fincept-qt/requirements.txt` (Python analytics deps only — skip Qt)
3. Create `fincept_bridge.py`
4. Add 5-10 tool functions to `finance_tools.py`
5. Extend Financier arm `world_feeds` in `orca.py`

---

### 4. Kronos Finance Model — `github.com/shiyu-coder/Kronos`

**What it is:** AAAI 2026 paper. Decoder-only transformer pre-trained on 12 billion OHLCV K-line records from 45 exchanges. Zero-shot beats all existing time-series foundation models (+93% RankIC on rank correlation, -9% MAE on volatility). Fine-tune scripts included.

**Alfred layer:** Financier arm — quantitative price forecasting primitive alongside the qualitative TA knowledge `mql5_feed.py` extracts.

**Hardware note:** Kronos is a smaller specialized model. It runs on RTX 2070 Max-Q. It only loads when called by the Financier arm — no VRAM competition with jarvis.

**New file:** `kronos_client.py`
```python
"""
Alfred — kronos_client.py
Kronos model inference client. Separate from llama-server — uses qlib.
Only loads when called. Does not compete with jarvis for VRAM.
"""
import sys
from pathlib import Path

KRONOS_DIR = Path("C:/Alfred/external/kronos")

class KronosClient:
    def __init__(self):
        if str(KRONOS_DIR) not in sys.path:
            sys.path.insert(0, str(KRONOS_DIR))
        from kronos.model import KronosModel
        self.model = KronosModel.from_pretrained("shiyu-coder/Kronos-base")

    def predict(self, symbol: str, data: str, steps: int = 5) -> str:
        import json
        rows = json.loads(data)
        # format OHLCV into Kronos token format, run inference
        return "prediction output"  # implement per Kronos API
```

**Files to modify:** `finance_tools.py` (add `finance_kronos_predict`), `orca.py` (add to Financier arm `tool_affinity`).

**Steps:** `pip install qlib` → clone repo → download weights via `huggingface-cli` → create `kronos_client.py` → register tool.

---

## ━━━ GROUP 2: WEB INTELLIGENCE ━━━

### 5. Crawl4AI — `github.com/unclecode/crawl4ai`

**What it is:** Async Python web crawler. JavaScript rendering, parallel crawl, clean markdown output. No API keys. 50k+ stars. Best free option for bulk LLM-ready content extraction.

**Alfred layer:** `corpus_manager.py` bulk URL feeding; `deep_search.py` fetch backend for JS-heavy pages.

**Integration — two integration points:**

**Point 1: `corpus_manager.py` — extend per-arm corpus sources**
```python
async def _crawl_url_for_corpus(url: str) -> str:
    try:
        from crawl4ai import AsyncWebCrawler
        async with AsyncWebCrawler(verbose=False) as crawler:
            result = await crawler.arun(url=url)
            return result.markdown[:3000] if result.success else ""
    except ImportError:
        return ""
```

**Point 2: `deep_search.py` — replace raw `requests` with Crawl4AI for JS-heavy pages**
```python
# In deep_search.py's page fetch step:
# If requests returns empty/bot-blocked content, fall back to Crawl4AI
```

**Steps:** `pip install crawl4ai` → `python -m crawl4ai.setup` (installs Playwright) → integrate.

---

### 6. Browser Use — `github.com/browser-use/browser-use`

**What it is:** Python library wrapping Playwright + LLM reasoning for browser automation. Natural language task → browses → structured results. Works with local LLMs via OpenAI-compatible endpoints (Alfred's llama-server exposes `/v1/chat/completions`).

**Alfred layer:** `deep_search.py` fetch backend; Osiris world feeds active browsing.

**New file:** `alfred_browser.py`
```python
"""
Alfred — alfred_browser.py
Browser agent using Browser Use + jarvis via llama-server.
No external API calls — uses Alfred's own model.
"""
import asyncio
from typing import Optional

async def browse(task: str, url: Optional[str] = None) -> str:
    try:
        from browser_use import Agent
        from langchain_openai import ChatOpenAI
        llm = ChatOpenAI(
            model="jarvis", base_url="http://127.0.0.1:8080/v1",
            api_key="no-key-needed", temperature=0.3,
        )
        full_task = f"Starting at {url}: {task}" if url else task
        agent = Agent(task=full_task, llm=llm)
        result = await agent.run()
        return str(result)[:3000]
    except ImportError:
        return "Browser Use not installed. Run: pip install browser-use"
    except Exception as e:
        return f"Browser error: {e}"

def browse_sync(task: str, url: Optional[str] = None) -> str:
    return asyncio.run(browse(task, url))
```

**Files to modify:** `osiris_tools.py` (add `osint_browse` wrapping `browse_sync`), `orca.py` (add to Researcher and Sentinel arm `tool_affinity`), `deep_search.py` (use as JS-heavy fetch backend).

**Steps:** `pip install browser-use langchain-openai` → `playwright install chromium` → create `alfred_browser.py` → wire.

---

### 7. CamoFox Browser — `github.com/jo-inc/camofox-browser`

**What it is:** Anti-detection browser server. Wraps Camoufox — a Firefox fork with C++-level fingerprint spoofing. REST API + MCP server. yt-dlp integration for YouTube transcripts. Bypasses Cloudflare and bot detection that blocks Playwright-based Browser Use.

**Alfred layer:** Osiris — stealth fallback when Browser Use is blocked; YouTube transcript primary route.

**Integration — extends `alfred_browser.py`:**
```python
CAMOFOX_URL = "http://127.0.0.1:9377"

async def browse_stealth(task: str, url: str) -> str:
    """Stealth browse via CamoFox — use when standard browser gets blocked."""
    try:
        import requests
        session_r = requests.post(f"{CAMOFOX_URL}/sessions", json={})
        sid = session_r.json()["id"]
        requests.post(f"{CAMOFOX_URL}/sessions/{sid}/navigate", json={"url": url})
        content_r = requests.get(f"{CAMOFOX_URL}/sessions/{sid}/content")
        requests.delete(f"{CAMOFOX_URL}/sessions/{sid}")
        return content_r.json().get("text", "")[:3000]
    except Exception as e:
        return f"CamoFox unavailable: {e}"

def youtube_transcript(video_id: str) -> str:
    """Get YouTube transcript via CamoFox's yt-dlp endpoint."""
    try:
        import requests
        r = requests.post(f"{CAMOFOX_URL}/youtube/transcript", json={"video_id": video_id})
        return r.json().get("transcript", "")[:4000]
    except Exception as e:
        return f"YouTube transcript error: {e}"
```

**Files to modify:** `alfred_browser.py` (add above), `osiris_tools.py` (add `osint_youtube_transcript`).

**Steps:** `git clone https://github.com/jo-inc/camofox-browser` → `npm install && npm start` (port 9377) → add to alfred_watchdog.py resurrection list.

**Note:** `yt-dlp` (GROUP 10 below) is CamoFox's internal mechanism here. CamoFox's endpoint wraps yt-dlp — use CamoFox's endpoint for YouTube transcripts; use standalone yt-dlp directly for bulk video/audio corpus downloads.

---

### 8. ScrapeGraphAI — `github.com/ScrapeGraphAI/Scrapegraph-ai`

**What it is:** NLP-prompted web scraper. Describe what you want in natural language → it builds the extraction graph. Multi-LLM support (works with local Qwen via Ollama-compatible endpoints). Self-healing when sites change structure.

**Alfred layer:** `corpus_manager.py` structured data extraction; `tools.py` STELLA-accessible tool.

**Integration:**
```python
def _scrapegraph_extract(url: str, prompt: str) -> dict:
    try:
        from scrapegraphai.graphs import SmartScraperGraph
        config = {"llm": {"model": "ollama/jarvis", "base_url": "http://127.0.0.1:8080/v1", "api_key": "no-key"}}
        graph = SmartScraperGraph(prompt=prompt, source=url, config=config)
        return graph.run()
    except ImportError:
        return {}
    except Exception as e:
        return {"error": str(e)}
```

**Steps:** `pip install scrapegraphai` → add helper to `synthesis_loop.py` → add `scrape_structured` to `tools.py`.

---

### 9. Supadata — `pip install supadata`

**What it is:** API service for structured YouTube transcript extraction (Whisper fallback when captions don't exist), web page scraping, and social data. Free tier: 100 credits/month.

**Alfred layer:** `deep_search.py` YouTube transcript primary source; `research_tools.py` Researcher arm tool.

**Integration — `research_tools.py`:**
```python
def research_youtube_transcript(video_id: str) -> str:
    if not SUPADATA_KEY:
        from alfred_browser import youtube_transcript
        return youtube_transcript(video_id)  # CamoFox fallback
    try:
        from supadata import Supadata
        s = Supadata(api_key=SUPADATA_KEY)
        result = s.youtube.transcript(video_id=video_id, text=True)
        return str(result)[:4000]
    except Exception as e:
        return f"Supadata error: {e}"
```

**Priority:** Supadata primary (cleaner transcripts) → CamoFox/yt-dlp fallback (no API key required, unlimited).

---

## ━━━ GROUP 3: AGENT INFRASTRUCTURE ━━━

### 10. OpenHands — `github.com/OpenHands/OpenHands`

**What it is:** Open-source autonomous software engineering platform (formerly OpenDevin). CodeAct paradigm — agents write and execute real code. SWE-Bench state-of-the-art. Docker sandbox execution. Supports any LLM backend.

**Alfred layer:** Builder arm coding sub-agent for multi-file/complex tasks. **Not a replacement for `sandbox.py`'s `BuilderSandbox`** — OpenHands is for tasks that exceed Alfred's 12-iteration tool loop (full module refactors, debugging sessions spanning many files). Wire at `agent.py`'s coder role.

**New file:** `openhands_client.py`
```python
"""
Alfred — openhands_client.py
OpenHands integration — Alfred's autonomous coding arm.
Pointed at jarvis via llama-server for zero API cost.
"""
import requests, os

OPENHANDS_URL = os.getenv("OPENHANDS_URL", "http://127.0.0.1:3000")

def openhands_task(task: str, working_dir: str = "") -> str:
    try:
        payload = {
            "task": task,
            "llm_config": {"model": "jarvis", "base_url": "http://127.0.0.1:8080/v1", "api_key": "no-key"},
            "workspace": working_dir or "C:/Users/DELL/Desktop/Alfred",
        }
        r = requests.post(f"{OPENHANDS_URL}/api/conversations", json=payload, timeout=300)
        if r.status_code == 200:
            return r.json().get("result", "OpenHands completed task.")
        return f"OpenHands error: {r.status_code}"
    except Exception as e:
        return f"OpenHands unavailable: {e}"
```

**Files to modify:** `agent.py` (route to OpenHands when `role == "coder"` and `_is_complex_coding_task(task)`), `orca.py` (add to Builder arm `tool_affinity`), `tools.py` (register `openhands_code`).

---

### 11. ECC — `github.com/affaan-m/ECC`

**What it is:** Agent harness performance optimization system. MIT-licensed. 205k+ stars. Currently: 64 specialized agents, 262 workflow skills, 84 slash commands, automated hook workflows, rules (always-follow guidelines), MCP configurations for 14 external services, cross-harness support (Claude Code, Codex, Cursor, OpenCode, Gemini, Zed, Copilot). Key subsystems:

- **AgentShield** — security scanner for AI agent configs (638 stars, 1609 tests, 98% coverage). Scans CLAUDE.md, settings.json, MCP configs, hooks, agents for hardcoded secrets, overly permissive permissions, hook-injection risks, MCP vulnerabilities. 102 static-analysis rules.
- **Instinct system** — continuous learning that observes sessions and creates atomic behaviors with confidence scoring. Directly analogous to Alfred's `trickle_learn.py` but at the harness layer.
- **NanoClaw v2** — model routing, skill hot-load, session bridging.
- **Hermes operator story** — orchestrator workflow for multi-agent parallel work using git worktrees.
- **Skills catalog** — 157 selectable skills across: TDD, security review, frontend patterns (Django, Spring Boot, Laravel, Next.js), backend patterns, API design, deployment, content writing, market research, ML workflows, eval harness.
- **Hook runtime controls** — `ECC_HOOK_PROFILE=minimal|standard|strict`, `ECC_DISABLED_HOOKS=...` for runtime gating without editing hook files.

**Alfred layer:** This is the single largest source for the `alfred_curriculum/` teaching layer — ECC IS the curriculum for Month 1 Builder methodology and the ongoing security-hardening layer.

**Integration mode:** CURRICULUM + EXTRACT — DO NOT deploy ECC as Alfred's harness (Alfred has his own architecture). Mine ECC systematically through `alfred_curriculum/`.

**What you take — and how:**

**Tier 1 (highest value, extract first):**

*AgentShield → `sentinel_ecc_shield.py`*
This is a direct Sentinel arm tool. The security scanner is exactly what Alfred needs to audit his own `alfred_curriculum/` lesson imports before graduating them. Run it as the curriculum audit gate alongside `CyberSandbox`.
```python
"""
Alfred — sentinel_ecc_shield.py
ECC AgentShield security scanner for AI agent configs.
Used as (1) curriculum audit gate and (2) Alfred's own agent-config hardening.
"""
import subprocess
from pathlib import Path

ECC_DIR = Path("C:/Alfred/external/ecc")

def shield_scan(target_path: str) -> dict:
    """
    Scan a path (skill, hook, MCP config, agent file) for vulnerabilities.
    Returns: {passed: bool, issues: list, risk_level: str}
    """
    try:
        result = subprocess.run(
            ["node", str(ECC_DIR / "agentshield/scan.js"), target_path],
            capture_output=True, text=True, timeout=30, cwd=str(ECC_DIR)
        )
        import json
        return json.loads(result.stdout) if result.returncode == 0 else {"passed": False, "error": result.stderr[:300]}
    except Exception as e:
        return {"passed": False, "error": str(e)}
```

*Instinct system → trickle_learn bridge*
ECC's instinct system (session observation → atomic behaviors with confidence scoring) is the same mechanism as `trickle_learn.py`'s pair accumulation. Cross-reference both codebases and fold any confidence-scoring technique from ECC's instinct system that `trickle_learn.py` doesn't already implement. No new file — this is a `trickle_learn.py` improvement pass.

*Eval harness skill → `alfred_eval.py`*
ECC has a full evaluation harness for scoring agent outputs. Distill this into `alfred_eval.py` — a tool Alfred uses to self-score his own outputs before returning them. Pairs with `metacog.py`'s eval_score tracking.

**Tier 2 (curriculum distillation — Month 1-2):**
- Security skills (AgentShield's 102 static-analysis rules, hook-injection patterns, MCP vulnerability checks) → distill into `sentinel_tools.py`.
- TDD skill, worktree skill, plan-execution skill, root-cause debugging skill → distill into `agent.py`'s coder role system prompt as standing habits.
- Model routing (NanoClaw) → pattern to inform Alfred's `model_manager.py` — which model for which task type.
- Hook patterns (SessionStart, Stop-phase session summaries, script-based hooks) → pattern for Alfred's own interrupt hooks in `interrupt_bus.py`.

**Tier 3 (reference only):**
- The 64-agent separation (planner, code reviewer, build resolver, security reviewer, etc.) validates Alfred's ORCA arm design. Cross-reference arm assignments to ECC agent roles to verify Alfred isn't missing any specialist.
- The 14 MCP server configs → review as a checklist against Alfred's own MCP integrations to ensure nothing is misconfigured.
- Framework-specific skills (Django, Next.js, Spring Boot) → corpus items for Builder arm, not distilled tools.

**Files to modify:** `alfred_curriculum/ledger.md` (add ECC lesson track), `sentinel_tools.py` (add `shield_scan`), `trickle_learn.py` (confidence-scoring improvement from instinct system), `tools.py` (register `ecc_shield_scan`, `alfred_eval`).

**New files:** `sentinel_ecc_shield.py`, `alfred_eval.py`.

**Steps:**
1. `git clone https://github.com/affaan-m/ECC` into `C:/Alfred/external/ecc/`
2. Run AgentShield on Alfred's own repo first: `node ecc/agentshield/scan.js C:/Alfred/` — fix any findings before anything else.
3. Create `sentinel_ecc_shield.py`.
4. Add `ecc_shield_scan` as the second step of `alfred_curriculum/`'s audit gate (after `CyberSandbox`, before graduation).
5. Begin Month 1 curriculum distillation per the schedule above.

**Why it upgrades Alfred:** ECC is the most mature open-source agent-harness system in existence. Rather than Alfred reinventing every harness pattern from scratch, the curriculum layer systematically imports the best ones. The AgentShield scanner in particular closes a real gap — Alfred currently has no way to audit his own skill imports for security issues.

---

### 12. Dify — `github.com/langgenius/dify`

**What it is:** Production-hardened LLM app platform. Visual workflow builder + RAG engine + model management + observability. Full API surface. MCP server support.

**Alfred layer:** External RAG for large document collections; observability for NIM/API calls.

**Relationship to Alfred's memory:** Dify does NOT replace `memory.py` or LanceDB. Alfred's own memories (conversations, facts, graph) stay in LanceDB. Dify handles external document knowledge bases Alfred queries but doesn't own.

**New file:** `dify_client.py`
```python
import os, requests

DIFY_URL     = os.getenv("DIFY_URL", "http://localhost:80")
DIFY_API_KEY = os.getenv("DIFY_API_KEY", "")

def dify_query(knowledge_base: str, query: str) -> str:
    if not DIFY_API_KEY:
        return "DIFY_API_KEY not set. Deploy Dify and configure an API key."
    try:
        r = requests.post(
            f"{DIFY_URL}/v1/datasets/{knowledge_base}/retrieve",
            headers={"Authorization": f"Bearer {DIFY_API_KEY}"},
            json={"query": query, "top_k": 5}, timeout=15,
        )
        if r.status_code != 200:
            return f"Dify error {r.status_code}"
        results = r.json().get("records", [])
        if not results:
            return "No relevant documents found."
        return "\n\n".join(
            f"[{r.get('segment', {}).get('document', {}).get('name', '?')}]\n"
            f"{r.get('segment', {}).get('content', '')[:500]}"
            for r in results[:3]
        )
    except Exception as e:
        return f"Dify query error: {e}"
```

**Steps:** `git clone https://github.com/langgenius/dify && cd dify/docker && docker compose up -d` → access Dify Studio at `localhost:80` → create knowledge bases → add env vars.

---

## ━━━ GROUP 4: DATA INFRASTRUCTURE ━━━

### 13. Supabase — `github.com/supabase/supabase`

**What it is:** PostgreSQL + Auth + Auto REST/GraphQL APIs + Realtime subscriptions + Vector support. Self-hostable via Docker.

**Alfred layer:** Structured relational storage complementing the RAM → LanceDB → NetworkX → weights stack. NOT a replacement for any layer.

**What goes to Supabase:** `concern_register`, `principle_store`, `prediction_ledger`, ORCA logs, calibration data, blackboard history.
**What stays in LanceDB:** embeddings, vector search, semantic similarity.

**New file:** `alfred_db.py`
```python
"""
Alfred — alfred_db.py
Supabase client for structured relational storage.
LanceDB: semantic search, embeddings.
Supabase: structured queries, relational data, realtime.
"""
import os

SUPABASE_URL = os.getenv("SUPABASE_URL", "http://localhost:8000")
SUPABASE_KEY = os.getenv("SUPABASE_ANON_KEY", "")

def _client():
    from supabase import create_client
    return create_client(SUPABASE_URL, SUPABASE_KEY)

def upsert_concern(concern: dict) -> bool:
    try:
        _client().table("concerns").upsert(concern).execute()
        return True
    except Exception as e:
        print(f"[DB] Concern upsert error: {e}")
        return False

def get_open_concerns_db(domain: str = "", min_pressure: float = 0.0) -> list:
    try:
        q = _client().table("concerns").select("*").eq("open", True)
        if domain: q = q.eq("domain", domain)
        if min_pressure > 0: q = q.gte("pressure", min_pressure)
        return q.order("pressure", desc=True).execute().data
    except Exception as e:
        return []

def log_orca_reasoning(arm: str, task: str, result: str, chain_steps: int):
    try:
        _client().table("orca_log").insert({
            "arm": arm, "task": task[:200], "result": result[:400], "chain_steps": chain_steps
        }).execute()
    except Exception:
        pass
```

**Files to modify:** `concern_register.py` (dual-write alongside existing JSON), `principle_engine.py` (Supabase logging for principles and predictions), `orca.py` (log arm reasoning passes via `log_orca_reasoning`).

**Steps:** Clone → `cd supabase/docker` → `cp .env.example .env` → `docker compose up -d` → create tables: `concerns`, `principles`, `predictions`, `orca_log`, `blackboard_history`, `calibration_data` → `pip install supabase`.

---

### 14. Coolify — `github.com/coollabsio/coolify`

**What it is:** Self-hosted PaaS. One-click Docker deploys, automatic SSL/HTTPS, health monitoring, Git-based autodeploys, REST API. Alfred's infrastructure control plane.

**Alfred layer:** Hosts and manages all external services Alfred depends on (Supabase, Dify, Stirling PDF, CamoFox, OpenHands, etc.).

**Files to modify:** `alfred_watchdog.py` (add Coolify service health checks + resurrection requests), `server.py` (add `/services/status` endpoint).

**Key capability:** Coolify's API lets Alfred trigger its own redeployment after a Gödel self-patch. Alfred becomes infrastructure-aware.

**Steps:** `curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash` → deploy each service through Coolify → add `COOLIFY_URL` and `COOLIFY_TOKEN` to `.env`.

---

### 15. Twenty CRM — `github.com/twentyhq/twenty`

**What it is:** Open-source Salesforce alternative. Modern data model (objects, relations, custom types), Notion/Airtable/Linear-inspired UX, privacy-first, self-hostable Docker. Full REST + GraphQL API. Plugin ecosystem coming.

**Alfred layer:** Steward arm — structured contact/relationship management. Alfred currently has no persistent people/company knowledge layer. Twenty CRM fills this for Jay's professional network.

**Integration mode:** DEPLOY AS SERVICE + thin API client.

**New file:** `alfred_crm.py`
```python
"""
Alfred — alfred_crm.py
Twenty CRM client — Steward arm's contact/relationship intelligence layer.
"""
import os, requests

TWENTY_URL = os.getenv("TWENTY_URL", "http://localhost:3000")
TWENTY_API_KEY = os.getenv("TWENTY_API_KEY", "")

def crm_search(query: str) -> list:
    """Search contacts/companies in Twenty CRM."""
    try:
        r = requests.post(
            f"{TWENTY_URL}/api",
            headers={"Authorization": f"Bearer {TWENTY_API_KEY}"},
            json={"query": f'{{ people(filter: {{name: {{like: "%{query}%"}}}}) {{ edges {{ node {{ id name emails {{ primaryEmail }} }} }} }} }}'},
            timeout=10,
        )
        return r.json().get("data", {}).get("people", {}).get("edges", [])
    except Exception as e:
        return []

def crm_upsert_contact(name: str, email: str, company: str = "", notes: str = "") -> bool:
    """Upsert a contact. Called by Steward arm after notable interactions."""
    try:
        # GraphQL mutation via Twenty's API
        ...
        return True
    except Exception:
        return False
```

**Files to modify:** `orca.py` (add `crm_search`, `crm_upsert_contact` to Steward arm `tool_affinity`), `tools.py` (register both).

**interrupt_bus wire:** Steward arm encounters a new person → `fire(MEDIUM, source="steward", content=f"New contact: {name}")` → queues a CRM upsert.

**Why it upgrades Alfred:** Alfred currently has no structured way to remember Jay's professional network — names, companies, relationships, interaction history. Twenty CRM gives the Steward arm a queryable relationship graph it can reference before preparing meetings or drafting correspondence.

**Steps:** `git clone https://github.com/twentyhq/twenty && docker compose up` → configure → add `TWENTY_URL` and `TWENTY_API_KEY` to `.env`.

---

## ━━━ GROUP 5: DOCUMENT INTELLIGENCE ━━━

### 16. Stirling PDF — `github.com/Stirling-Tools/Stirling-PDF`

**What it is:** Locally hosted Docker app. 60+ PDF operations via REST API. OCR, text extraction, convert, split, merge. Zero outbound calls, in-memory processing.

**Alfred layer:** `corpus_manager.py` batch PDF ingestion pipeline. Supplement to the existing `read_pdf` pdfplumber tool — Stirling handles scanned PDFs OCR can't read.

**New file:** `corpus_processor.py`
```python
"""
Alfred — corpus_processor.py
Batch PDF → text pipeline via Stirling PDF.
"""
import requests
from pathlib import Path

STIRLING_URL = os.getenv("STIRLING_PDF_URL", "http://localhost:8081")
CORPUS_DIR   = Path("C:/Alfred/corpus/pdfs")
OUTPUT_DIR   = Path("C:/Alfred/corpus/text")

def process_pdf_batch(source_dir: Path = None) -> dict:
    source_dir = source_dir or CORPUS_DIR
    source_dir.mkdir(parents=True, exist_ok=True)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    results = {"processed": 0, "failed": 0, "skipped": 0}
    for pdf in source_dir.glob("*.pdf"):
        out_file = OUTPUT_DIR / f"{pdf.stem}.txt"
        if out_file.exists():
            results["skipped"] += 1
            continue
        try:
            with open(pdf, "rb") as f:
                r = requests.post(f"{STIRLING_URL}/api/v1/misc/extract-text",
                                  files={"fileInput": f}, timeout=120)
            if r.status_code == 200:
                text = r.json().get("text", "")
                if text.strip():
                    out_file.write_text(text, encoding="utf-8")
                    results["processed"] += 1
                else:
                    results["failed"] += 1
            else:
                results["failed"] += 1
        except Exception as e:
            print(f"[Corpus] PDF error {pdf.name}: {e}")
            results["failed"] += 1
    return results
```

**Port conflict note:** llama-server runs on `:8080`. Run Stirling on `:8081`: `docker run -d -p 8081:8080 frooodle/s-pdf`.

**Files to modify:** `tools.py` (add `read_pdf_stirling` fallback for scanned PDFs; `process_corpus_pdfs` callable tool).

---

### 17. Papermark — `github.com/mfts/papermark`

**What it is:** Open-source DocSend alternative. Secure document sharing with per-viewer analytics (page-by-page time, drop-off points, completions), custom domains, access controls, link expiry. Self-hostable.

**Alfred layer:** Output layer — when Alfred produces a report, briefing, or research summary that Jay shares with others, route it through Papermark for tracked delivery.

**Integration mode:** DEPLOY AS SERVICE + thin wrapper.

**New file:** `alfred_papermark.py`
```python
"""
Alfred — alfred_papermark.py
Papermark document sharing with analytics.
Used by Creator arm and Steward arm for tracked document delivery.
"""
import os, requests

PAPERMARK_URL = os.getenv("PAPERMARK_URL", "http://localhost:3001")
PAPERMARK_API_KEY = os.getenv("PAPERMARK_API_KEY", "")

def share_document(file_path: str, title: str, expires_days: int = 7) -> str:
    """Upload a document to Papermark and return a trackable share link."""
    try:
        with open(file_path, "rb") as f:
            r = requests.post(
                f"{PAPERMARK_URL}/api/documents",
                headers={"Authorization": f"Bearer {PAPERMARK_API_KEY}"},
                files={"file": f},
                data={"name": title},
                timeout=30,
            )
        if r.status_code in (200, 201):
            doc = r.json()
            return doc.get("link", {}).get("url", "Link not returned")
        return f"Papermark error {r.status_code}"
    except Exception as e:
        return f"Papermark unavailable: {e}"

def get_document_analytics(document_id: str) -> dict:
    """Get view analytics for a shared document."""
    try:
        r = requests.get(
            f"{PAPERMARK_URL}/api/documents/{document_id}/views",
            headers={"Authorization": f"Bearer {PAPERMARK_API_KEY}"},
            timeout=10,
        )
        return r.json() if r.status_code == 200 else {}
    except Exception:
        return {}
```

**Files to modify:** `tools.py` (register `share_document`, `get_document_analytics`), `synthesis_loop.py` (when a high-salience report is flagged for sharing, optionally route through `share_document` and fire a Slack notification with the link).

**interrupt_bus wire:** After `share_document()` → `fire(MEDIUM, source="papermark", content=f"Document shared: {title}", data={"link": link})`.

---

### 18. Documenso — `github.com/documenso/documenso`

**What it is:** Open-source DocuSign alternative. E-signature platform. Self-hostable. API for programmatic document creation and signature request. Audit trail, multi-party signing.

**Alfred layer:** Steward arm — when Alfred prepares contracts or formal agreements for Jay, route them through Documenso for signature tracking rather than manual email chains.

**Integration mode:** DEPLOY AS SERVICE + thin wrapper.

**New file:** `alfred_documenso.py`
```python
"""
Alfred — alfred_documenso.py
Documenso e-signature client.
Steward arm sends documents for signing and tracks completion status.
"""
import os, requests

DOCUMENSO_URL = os.getenv("DOCUMENSO_URL", "http://localhost:3000")
DOCUMENSO_API_KEY = os.getenv("DOCUMENSO_API_KEY", "")

def send_for_signature(title: str, file_path: str, signers: list[dict]) -> str:
    """
    Send a document for signature.
    signers: [{"name": "...", "email": "...", "role": "SIGNER"}]
    Returns document ID or error.
    """
    try:
        with open(file_path, "rb") as f:
            r = requests.post(
                f"{DOCUMENSO_URL}/api/v1/documents",
                headers={"Authorization": f"Bearer {DOCUMENSO_API_KEY}"},
                files={"file": f},
                data={"title": title},
                timeout=30,
            )
        if r.status_code in (200, 201):
            doc_id = r.json().get("id")
            for signer in signers:
                requests.post(
                    f"{DOCUMENSO_URL}/api/v1/documents/{doc_id}/recipients",
                    headers={"Authorization": f"Bearer {DOCUMENSO_API_KEY}"},
                    json=signer, timeout=10,
                )
            requests.post(
                f"{DOCUMENSO_URL}/api/v1/documents/{doc_id}/send",
                headers={"Authorization": f"Bearer {DOCUMENSO_API_KEY}"},
                timeout=10,
            )
            return f"Document sent for signature. ID: {doc_id}"
        return f"Documenso error {r.status_code}"
    except Exception as e:
        return f"Documenso unavailable: {e}"
```

**Files to modify:** `tools.py` (register `send_for_signature`), `orca.py` (add to Steward arm `tool_affinity`).

---

## ━━━ GROUP 6: SECURITY & INFRASTRUCTURE ━━━

### 19. OWASP ZAP — `github.com/zaproxy/zaproxy`

**What it is:** Open-source web app scanner. REST API + daemon mode (`zap.sh -daemon -port 8090`). Spider, active scan, passive scan, alerts by severity.

**Alfred layer:** Sentinel arm tool + `alfred_curriculum/` audit gate.

**New file:** `sentinel_zap.py`
```python
"""
Alfred — sentinel_zap.py
OWASP ZAP REST client.
Two uses: (1) Sentinel arm web security scanning, (2) curriculum audit gate for web-facing services.
"""
import os, requests

ZAP_URL = os.getenv("ZAP_URL", "http://localhost:8090")
ZAP_API_KEY = os.getenv("ZAP_API_KEY", "")

def _zap(endpoint: str, params: dict = None) -> dict:
    try:
        r = requests.get(f"{ZAP_URL}/JSON/{endpoint}", params={"apikey": ZAP_API_KEY, **(params or {})}, timeout=10)
        return r.json() if r.status_code == 200 else {"error": r.status_code}
    except Exception as e:
        return {"error": str(e)}

def scan_url(url: str, scan_type: str = "passive") -> dict:
    """Spider + scan a URL. scan_type: 'passive' or 'active'."""
    _zap("spider/action/scan", {"url": url})
    import time; time.sleep(5)
    if scan_type == "active":
        _zap("ascan/action/scan", {"url": url})
        time.sleep(30)
    alerts = _zap("core/view/alerts", {"baseurl": url})
    return alerts

def audit_service(base_url: str) -> str:
    """Curriculum audit gate — scan a service before graduating its skill."""
    result = scan_url(base_url, "passive")
    alerts = result.get("alerts", [])
    high_risk = [a for a in alerts if a.get("risk") in ("High", "Critical")]
    if high_risk:
        return f"AUDIT FAILED — {len(high_risk)} high/critical alerts. Do not graduate."
    return f"Audit passed — {len(alerts)} total alerts, none high/critical."
```

**Files to modify:** `sentinel_tools.py` (add `sentinel_scan_url`), `orca.py` (add to Sentinel arm `tool_affinity`), `alfred_curriculum/` ingestion pipeline (add ZAP audit step).

**Steps:** `docker run -d -p 8090:8090 ghcr.io/zaproxy/zaproxy:stable zap.sh -daemon -host 0.0.0.0 -port 8090` → add `ZAP_URL` and `ZAP_API_KEY` to `.env`.

---

### 20. CrowdSec — `github.com/crowdsecurity/crowdsec`

**What it is:** Open-source IDS/IPS/WAF. Behavioral detection by analyzing logs and HTTP requests. Community blocklist (crowdsourced malicious IPs). Python client via `pycrowdsec`. "Detect Here, Remedy There" architecture — agent detects, bouncers remediate (iptables, nginx, Traefik, etc.).

**Alfred layer:** Sentinel arm passive threat intelligence feed + Alfred's own infrastructure protection.

**Integration mode:** DEPLOY AS SERVICE + Python client as a Sentinel tool.

**New file:** `sentinel_crowdsec.py`
```python
"""
Alfred — sentinel_crowdsec.py
CrowdSec integration — two uses:
(1) Query CrowdSec's community blocklist for threat intelligence on any IP.
(2) Feed CrowdSec decisions into interrupt_bus as threat signals.
"""
import os

CROWDSEC_LAPI_URL = os.getenv("CROWDSEC_LAPI_URL", "http://localhost:8080")
CROWDSEC_API_KEY  = os.getenv("CROWDSEC_API_KEY", "")

def check_ip_reputation(ip: str) -> dict:
    """Check if an IP is in CrowdSec's community blocklist."""
    try:
        from pycrowdsec.client import StreamClient
        client = StreamClient(api_key=CROWDSEC_API_KEY, lapi_url=CROWDSEC_LAPI_URL)
        client.run()
        action = client.get_action_for(ip)
        return {"ip": ip, "action": action or "clean", "blocked": action is not None}
    except Exception as e:
        return {"ip": ip, "error": str(e)}

def start_crowdsec_monitor():
    """Background thread: pipe CrowdSec new decisions to interrupt_bus."""
    import threading
    def _monitor():
        try:
            from pycrowdsec.client import StreamClient
            from interrupt_bus import fire, HIGH
            client = StreamClient(api_key=CROWDSEC_API_KEY, lapi_url=CROWDSEC_LAPI_URL)
            client.run()
            # Poll for new decisions every 60s
            import time
            while True:
                decisions = client.get_current_decisions()
                if decisions:
                    fire(HIGH, source="crowdsec",
                         content=f"CrowdSec: {len(decisions)} active blocks",
                         data={"decisions": decisions})
                time.sleep(60)
        except Exception as e:
            print(f"[CrowdSec] Monitor error: {e}")
    threading.Thread(target=_monitor, daemon=True, name="CrowdSecMonitor").start()
```

**Files to modify:** `sentinel_tools.py` (add `sentinel_check_ip`), `server.py` (start `start_crowdsec_monitor()` in startup).

**Steps:** `docker run -d -p 8080:8080 crowdsecurity/crowdsec` → `pip install pycrowdsec` → enroll with CrowdSec Central API for community blocklist access → add env vars.

---

### 21. web-check — `github.com/Lissy93/web-check`

**What it is:** Self-hostable domain/host OSINT. DNS, headers, TLS, ports, threat lists — one JSON report. Docker, has a JSON API mode.

**Alfred layer:** Sentinel arm OSINT recon tool. Pairs with ZAP: web-check for passive recon, ZAP for active scanning.

**New file:** `sentinel_webcheck.py`
```python
"""
Alfred — sentinel_webcheck.py
web-check OSINT wrapper — domain/host intelligence.
"""
import os, requests

WEBCHECK_URL = os.getenv("WEBCHECK_URL", "http://localhost:3000")

def osint_webcheck(domain: str) -> dict:
    try:
        r = requests.get(f"{WEBCHECK_URL}/api?url={domain}", timeout=30)
        return r.json() if r.status_code == 200 else {"error": r.status_code}
    except Exception as e:
        return {"error": str(e)}
```

**Files to modify:** `sentinel_tools.py` (add `osint_webcheck`), `orca.py` (add to Sentinel arm `tool_affinity`).

**Steps:** `docker run -d -p 3000:3000 lissy93/web-check` → add `WEBCHECK_URL` to `.env`.

---

### 22. Inbox Zero — `github.com/elie222/inbox-zero`

**What it is:** AI executive assistant for email. Automate emails, bulk unsubscribe, block cold emails, analytics. Open-source (AGPL-3.0). Gmail/Google Workspace focused. Rules engine, AI-categorized actions, bulk operations.

**Alfred layer:** Steward arm email intelligence. Alfred can query Inbox Zero's analytics to understand Jay's email patterns, identify high-priority senders, and surface unread items that need attention — without Alfred having direct Gmail access.

**Integration mode:** DEPLOY AS SERVICE + API wrapper.

**What you take:**
- The AI rules engine pattern (if sender X AND subject contains Y → action Z) → blueprint for Steward arm's communication routing logic in `agent.py`.
- Cold email detection model → Alfred can flag incoming requests to Jay as likely cold outreach before Jay reads them.
- Analytics: who emails most, what categories dominate, what's been unread longest → surfaces via a Steward arm `email_intelligence()` tool.

**New file:** `alfred_inbox.py`
```python
"""
Alfred — alfred_inbox.py
Inbox Zero integration — email intelligence for Steward arm.
Surfaces patterns, high-priority senders, and cold email flags.
"""
import os, requests

INBOX_ZERO_URL = os.getenv("INBOX_ZERO_URL", "http://localhost:3000")
INBOX_ZERO_KEY = os.getenv("INBOX_ZERO_API_KEY", "")

def get_email_stats() -> dict:
    """Get Jay's email stats: top senders, category breakdown, unread counts."""
    try:
        r = requests.get(f"{INBOX_ZERO_URL}/api/stats",
                         headers={"Authorization": f"Bearer {INBOX_ZERO_KEY}"}, timeout=10)
        return r.json() if r.status_code == 200 else {}
    except Exception:
        return {}

def get_pending_actions() -> list:
    """Get emails flagged by Inbox Zero's AI as requiring action."""
    try:
        r = requests.get(f"{INBOX_ZERO_URL}/api/actions/pending",
                         headers={"Authorization": f"Bearer {INBOX_ZERO_KEY}"}, timeout=10)
        return r.json() if r.status_code == 200 else []
    except Exception:
        return []
```

**Files to modify:** `orca.py` (add `email_intelligence` to Steward arm `tool_affinity`), `tools.py` (register `get_email_stats`, `get_pending_actions`).

---

## ━━━ GROUP 7: MEDIA SERVER & PERSONAL LIBRARY ━━━

### 23. Jellyfin — `github.com/jellyfin/jellyfin`

**What it is:** Free, open-source media server. Streams movies, TV, music, photos to any device. No subscriptions, no tracking. Full REST API (OpenAPI spec). 48k+ stars. Hardware-accelerated transcoding.

**Alfred layer:** Creator arm media library — Alfred's generated video content (HyperFrames briefings, MoneyPrinterTurbo/LTX-Video outputs) routes to Jellyfin for organized, on-demand playback rather than sitting in a flat folder.

**Integration mode:** DEPLOY AS SERVICE + thin API client.

**New file:** `alfred_media.py`
```python
"""
Alfred — alfred_media.py
Jellyfin media library client.
Creator arm deposits generated videos here. Steward arm queries for playback.
"""
import os, requests

JELLYFIN_URL = os.getenv("JELLYFIN_URL", "http://localhost:8096")
JELLYFIN_API_KEY = os.getenv("JELLYFIN_API_KEY", "")

def _headers():
    return {"X-Emby-Authorization": f'MediaBrowser Token="{JELLYFIN_API_KEY}"'}

def refresh_library() -> bool:
    """Trigger a library scan after Alfred deposits new content."""
    try:
        r = requests.post(f"{JELLYFIN_URL}/Library/Refresh", headers=_headers(), timeout=10)
        return r.status_code == 204
    except Exception:
        return False

def get_recent_items(limit: int = 10) -> list:
    """Get recently added items — Steward arm can surface these to Jay."""
    try:
        r = requests.get(f"{JELLYFIN_URL}/Items/Latest", headers=_headers(),
                         params={"Limit": limit}, timeout=10)
        return r.json() if r.status_code == 200 else []
    except Exception:
        return []
```

**Files to modify:** `alfred_creator.py` (after generating a video, copy to Jellyfin's media folder + call `refresh_library()`), `tools.py` (register `get_recent_media_items`), `orca.py` (Steward arm `tool_affinity` gets `get_recent_media_items`).

**interrupt_bus wire:** `alfred_creator.py` after video deposit → `fire(MEDIUM, source="creator", content=f"New video: {title}", data={"jellyfin_id": item_id})`.

---

### 24. Immich — `github.com/immich-app/immich`

**What it is:** High-performance self-hosted photo and video management (90k+ GitHub stars). Full REST API. Face recognition, object detection, CLIP visual search, metadata (EXIF, map), album management, multi-user. MCP server available (`immich-photo-manager`).

**Alfred layer:** Sentinel-Physical sub-arm / Steward arm — visual memory layer. If Alfred's workflow ever involves screenshots, visual captures, or reference images for projects, Immich stores and indexes them with semantic search.

**Integration mode:** DEPLOY AS SERVICE. Short-term: use the existing `immich-photo-manager` MCP server. Long-term: thin Python wrapper if needed.

**What you take:**
- CLIP visual search → Alfred can search "find me the screenshot of that error last Tuesday" across a personal library, not just ask Jay to find it.
- Face recognition → useful if Creator arm produces content involving Jay (profile photos for social posts, etc.) — auto-organizes by subject.
- The MCP server (`anyproto/anytype-mcp` pattern) → add `immich-photo-manager` to Alfred's MCP config alongside the other 14 ECC-configured MCP servers.

**Files to modify:** MCP config (add immich-photo-manager), `tools.py` (register `search_photos`, `create_album` via Immich REST API).

**Steps:** `docker compose up -d` via Immich's official compose file → configure `JELLYFIN_API_KEY` → install `immich-photo-manager` MCP for Claude Code sessions → add Python wrapper if MCP proves insufficient.

---

### 25. Anytype — `github.com/anyproto/anytype-ts`

**What it is:** Personal knowledge base. Offline-first, E2E encrypted, P2P sync. Composable blocks: text, databases, kanban, calendar, custom Types. gRPC API + MCP server (`anytype-mcp`). Open code (Any Source Available License 1.0).

**Alfred layer:** Steward arm second brain — structured notes, task tracking, and wiki for Jay that Alfred can read and write via the API. Anytype's graph-object model (entities + relationships, not flat text) is close to Alfred's own NetworkX memory layer.

**Integration mode:** DEPLOY (already a desktop app) + MCP server + Python wrapper.

**What you take:**
- **Primary:** `anytype-mcp` server → wire into Alfred's MCP config so Alfred can create/read/update Anytype objects via natural language. Alfred can write meeting notes, project specs, and task lists directly into Jay's Anytype workspace.
- **Secondary:** The graph-native object model → cross-reference with Alfred's NetworkX layer. Anytype objects and their relations are isomorphic to Alfred's memory nodes and edges. When Alfred writes a new entity to memory, optionally mirror it as an Anytype object for Jay's visibility.
- **API:** `http://127.0.0.1:31009` (local Anytype API) → thin Python client for programmatic access.

**New file:** `alfred_anytype.py`
```python
"""
Alfred — alfred_anytype.py
Anytype API client — Steward arm's note/knowledge layer.
Anytype runs locally; API is on 127.0.0.1:31009.
"""
import os, requests

ANYTYPE_URL = os.getenv("ANYTYPE_API_BASE_URL", "http://127.0.0.1:31009")
ANYTYPE_KEY = os.getenv("ANYTYPE_API_KEY", "")

def _headers():
    return {"Authorization": f"Bearer {ANYTYPE_KEY}", "Anytype-Version": "2025-11-08"}

def create_note(title: str, body: str, space_id: str = "") -> str:
    """Create a note object in Anytype. Returns object ID."""
    try:
        r = requests.post(f"{ANYTYPE_URL}/v1/objects",
                          headers=_headers(),
                          json={"name": title, "body": body, "type": "ot-note"},
                          timeout=10)
        return r.json().get("object", {}).get("id", "") if r.status_code in (200, 201) else ""
    except Exception:
        return ""

def search_notes(query: str) -> list:
    """Full-text search across Anytype objects."""
    try:
        r = requests.get(f"{ANYTYPE_URL}/v1/search",
                         headers=_headers(),
                         params={"query": query, "limit": 10},
                         timeout=10)
        return r.json().get("data", []) if r.status_code == 200 else []
    except Exception:
        return []
```

**Files to modify:** MCP config (add anytype-mcp server), `tools.py` (register `create_note`, `search_notes`), `orca.py` (Steward arm `tool_affinity`).

**interrupt_bus wire:** After important synthesis findings → `fire(MEDIUM, source="synthesis", content=summary)` → Steward arm optionally creates an Anytype note.

---

## ━━━ GROUP 8: SCHEDULING ━━━

### 26. ostafen/Kronos (scheduler) — `github.com/ostafen/kronos`

**What it is:** Lightweight cron job scheduler with webhook notifications. JSON DSL, REST API, Go binary — single executable, no runtime deps.

**Alfred layer:** `interrupt_bus.py` external clock source. Kronos fires webhooks at Alfred on schedule regardless of synthesis loop health.

**Files to modify:** `server.py` (add `/webhook/kronos` receiver that calls `interrupt_bus.fire()`), `synthesis_loop.py` (register Alfred's scheduled jobs with Kronos on startup).

```python
# synthesis_loop.py — _register_kronos_jobs():
jobs = [
    {"name": "alfred_hebbian_pass",   "cron": "0 */30 * * * *"},
    {"name": "alfred_finetune_check", "cron": "0 0 * * * *"},
    {"name": "alfred_corpus_pass",    "cron": "0 0 */2 * * *"},
    {"name": "alfred_daily_briefing", "cron": "0 0 8 * * *"},  # 8am daily
]
```

**Steps:** `docker run -d -p 9175:9175 ghcr.io/ostafen/kronos` → add `/webhook/kronos` to `server.py` → add `_register_kronos_jobs()` to startup.

---

### 27. Cal.com — `github.com/calcom/cal.com`

**What it is:** Open-source scheduling platform. REST API, webhook events (booking created/cancelled/rescheduled).

**Alfred layer:** Steward arm calendar awareness via `interrupt_bus.py`.

**New file:** `alfred_calendar.py` (Cal.com wrapper).

**interrupt_bus wire:**
```python
# On Cal.com webhook (meeting starting):
from interrupt_bus import fire, HIGH
fire(HIGH, source="calcom", content=f"Meeting in 10min: {event.title}",
     data={"event_id": event.id, "start": event.start})
```

**Files to modify:** `server.py` (add `/webhook/calcom` endpoint), `orca.py` (Steward arm gets calendar awareness).

---

## ━━━ GROUP 9: COMMUNICATION ━━━

### 28. Slack SDK — `pip install slack-bolt`

**What it is:** Slack's official Python Bolt framework. Async support. Receive messages, send messages, respond to events.

**Alfred layer:** Human-Alfred async push channel. Critical alerts → Slack instead of sitting in `alfred_alerts.jsonl`.

**New file:** `alfred_slack.py`
```python
import os, asyncio, threading

SLACK_BOT_TOKEN = os.getenv("SLACK_BOT_TOKEN", "")
SLACK_CHANNEL   = os.getenv("SLACK_CHANNEL", "#alfred")

def push_alert(message: str, urgency: str = "normal") -> bool:
    if not SLACK_BOT_TOKEN:
        return False
    try:
        from slack_sdk import WebClient
        client = WebClient(token=SLACK_BOT_TOKEN)
        prefix = ":red_circle: *CRITICAL*" if urgency == "critical" else \
                 ":orange_circle: *HIGH*" if urgency == "high" else ":white_circle:"
        client.chat_postMessage(channel=SLACK_CHANNEL, text=f"{prefix} {message}")
        return True
    except Exception as e:
        print(f"[Slack] Push error: {e}")
        return False

def start_slack_listener():
    if not SLACK_BOT_TOKEN:
        return
    try:
        from slack_bolt.async_app import AsyncApp
        from slack_bolt.adapter.socket_mode.async_handler import AsyncSocketModeHandler
        app = AsyncApp(token=SLACK_BOT_TOKEN)

        @app.message("alfred")
        async def handle_message(message, say):
            text = message.get("text", "")
            try:
                from alfred import chat
                response, _ = chat(text, [])
                await say(response[:3000])
            except Exception as e:
                await say(f"Error: {e}")

        def _run():
            asyncio.run(AsyncSocketModeHandler(app, os.getenv("SLACK_APP_TOKEN", "")).start_async())
        threading.Thread(target=_run, daemon=True, name="SlackBot").start()
        print("[Slack] Bot listener started.")
    except Exception as e:
        print(f"[Slack] Bot start error: {e}")
```

**interrupt_bus wire (NOW — not future):**
```python
# alfred_slack.py — on any Slack message:
from interrupt_bus import fire, HIGH, MEDIUM
priority = HIGH if is_urgent(msg) else MEDIUM
fire(priority, source="slack", content=msg.text, data={"channel": msg.channel})
```

**Files to modify:** `synthesis_loop.py` (push critical/high alerts in `_queue_alert()`), `server.py` (start listener in startup).

**Steps:** Create Slack app at api.slack.com → get Bot Token + App Token → `pip install slack-bolt slack-sdk` → add env vars → create `alfred_slack.py`.

---

### 29. Postiz — `github.com/gitroomhq/postiz-app`

**What it is:** AI social media scheduling platform. Open-source (AGPL-3.0). Supports 16+ platforms (Instagram, YouTube, X, TikTok, LinkedIn, Facebook, Reddit, Bluesky, Mastodon, Telegram, Discord, Pinterest, Threads, Dribbble, Slack, VK). AI content generation + Canva-like visual editor. Full REST API + N8N/Make.com integration. No feature difference between hosted and self-hosted.

**Alfred layer:** Creator arm social publishing layer. Replaces the AiToEarn MCP for multi-platform social publishing — Postiz is self-hostable, AGPL, and directly API-accessible without a third-party service dependency.

**Architecture decision:** Postiz vs AiToEarn:
- **Use Postiz** for pure social scheduling/publishing across 16 platforms (the scheduling/distribution layer).
- **Use AiToEarn** if the monetization marketplace features (CPS/CPE/CPM, engagement automation) are needed. These are complementary: AiToEarn generates + monetizes; Postiz schedules + distributes.
- Both can run simultaneously. `alfred_creator.py` routes to Postiz for scheduling and optionally to AiToEarn's MCP for monetization tracking.

**New file:** `alfred_postiz.py`
```python
"""
Alfred — alfred_postiz.py
Postiz social media scheduling client — Creator arm's distribution layer.
"""
import os, requests

POSTIZ_URL = os.getenv("POSTIZ_URL", "http://localhost:5000")
POSTIZ_API_KEY = os.getenv("POSTIZ_API_KEY", "")

def _headers():
    return {"Authorization": f"Bearer {POSTIZ_API_KEY}", "Content-Type": "application/json"}

def schedule_post(content: str, platforms: list, media_url: str = "", schedule_time: str = "") -> dict:
    """
    Schedule a post to one or more platforms.
    platforms: list of platform slugs e.g. ["instagram", "linkedin", "x"]
    schedule_time: ISO 8601 string, or "" for immediate
    """
    try:
        payload = {
            "content": content,
            "platforms": platforms,
            "media": [{"url": media_url}] if media_url else [],
            "scheduledAt": schedule_time or None,
        }
        r = requests.post(f"{POSTIZ_URL}/api/v1/posts",
                          headers=_headers(), json=payload, timeout=15)
        return r.json() if r.status_code in (200, 201) else {"error": r.status_code}
    except Exception as e:
        return {"error": str(e)}

def get_post_analytics(post_id: str) -> dict:
    """Fetch engagement analytics for a published post."""
    try:
        r = requests.get(f"{POSTIZ_URL}/api/v1/posts/{post_id}/analytics",
                         headers=_headers(), timeout=10)
        return r.json() if r.status_code == 200 else {}
    except Exception:
        return {}
```

**Files to modify:** `alfred_creator.py` (route final content to `schedule_post()`), `tools.py` (register `schedule_social_post`, `get_post_analytics`), `orca.py` (Creator arm `tool_affinity`).

**Steps:** `git clone https://github.com/gitroomhq/postiz-app && docker compose up` → configure OAuth for each platform → add `POSTIZ_URL` and `POSTIZ_API_KEY` to `.env`.

---

## ━━━ GROUP 10: MEDIA ACQUISITION & GENERATION ━━━

### 30. yt-dlp — `github.com/yt-dlp/yt-dlp`

**What it is:** Feature-rich command-line audio/video downloader. 1000+ supported sites (YouTube, Twitch, Vimeo, SoundCloud, etc.). Subtitle/transcript extraction, metadata embedding, playlist downloads, format selection (4K/8K/AV1/HDR), audio extraction (MP3/AAC/FLAC/Opus), chapter markers, sponsorblock, cookies from browser. Python API (`from yt_dlp import YoutubeDL`).

**Alfred layer:** Multi-purpose corpus acquisition tool.
- **Researcher arm:** Download lecture videos, conference talks, academic presentations as audio → feed to `corpus_manager.py` via transcription.
- **Financier arm:** Download analyst briefings, earnings calls (YouTube/Vimeo) for the MQL5 corpus.
- **Creator arm:** Download reference clips for LTX-Video style transfer or MoneyPrinterTurbo background video.
- **Sentinel arm:** Download security conference talks (DEF CON, Black Hat recordings) for threat intelligence corpus.

**Note on CamoFox:** CamoFox's YouTube transcript endpoint wraps yt-dlp internally. Use CamoFox's endpoint for quick in-conversation transcript extraction. Use yt-dlp directly (below) for bulk corpus downloads where you want full control over format, quality, and metadata.

**New file:** `alfred_ytdlp.py`
```python
"""
Alfred — alfred_ytdlp.py
yt-dlp integration — multi-arm corpus acquisition.
Transcript extraction, audio downloads, bulk playlist ingestion.
"""
import os
from pathlib import Path

CORPUS_AUDIO_DIR = Path("C:/Alfred/corpus/audio")
CORPUS_VIDEO_DIR = Path("C:/Alfred/corpus/video")

def extract_transcript(url: str) -> str:
    """Extract transcript/subtitles from a YouTube video. No download."""
    try:
        from yt_dlp import YoutubeDL
        opts = {
            "writesubtitles": True, "writeautomaticsub": True,
            "subtitleslangs": ["en"], "skip_download": True,
            "quiet": True, "no_warnings": True,
        }
        with YoutubeDL(opts) as ydl:
            info = ydl.extract_info(url, download=False)
            # Return auto-subtitle text if available
            subs = info.get("automatic_captions", {}).get("en", [])
            if subs:
                return " ".join(s.get("url", "") for s in subs[:3])
            return info.get("description", "")[:2000]
    except Exception as e:
        return f"yt-dlp transcript error: {e}"

def download_audio(url: str, output_dir: Path = None) -> str:
    """Download audio as MP3 for corpus ingestion."""
    try:
        from yt_dlp import YoutubeDL
        out = output_dir or CORPUS_AUDIO_DIR
        out.mkdir(parents=True, exist_ok=True)
        opts = {
            "format": "bestaudio/best",
            "postprocessors": [{"key": "FFmpegExtractAudio", "preferredcodec": "mp3"}],
            "outtmpl": str(out / "%(title)s.%(ext)s"),
            "quiet": True,
        }
        with YoutubeDL(opts) as ydl:
            info = ydl.extract_info(url)
            return str(out / f"{info.get('title', 'audio')}.mp3")
    except Exception as e:
        return f"yt-dlp download error: {e}"

def batch_download_playlist(playlist_url: str, arm: str = "researcher") -> dict:
    """
    Download a playlist's audio to the relevant arm's corpus dir.
    arm: 'researcher' | 'financier' | 'sentinel' | 'creator'
    """
    arm_dirs = {
        "researcher": CORPUS_AUDIO_DIR / "researcher",
        "financier":  CORPUS_AUDIO_DIR / "financier",
        "sentinel":   CORPUS_AUDIO_DIR / "sentinel",
        "creator":    CORPUS_AUDIO_DIR / "creator",
    }
    target = arm_dirs.get(arm, CORPUS_AUDIO_DIR)
    try:
        from yt_dlp import YoutubeDL
        target.mkdir(parents=True, exist_ok=True)
        opts = {
            "format": "bestaudio/best",
            "postprocessors": [{"key": "FFmpegExtractAudio", "preferredcodec": "mp3"}],
            "outtmpl": str(target / "%(playlist_index)s - %(title)s.%(ext)s"),
            "quiet": True, "ignoreerrors": True,
        }
        with YoutubeDL(opts) as ydl:
            info = ydl.extract_info(playlist_url)
            count = len(info.get("entries", []))
            return {"downloaded": count, "dir": str(target)}
    except Exception as e:
        return {"error": str(e)}
```

**Files to modify:** `corpus_manager.py` (add `yt_dlp_fetch(arm, playlist_url)` as a corpus source type), `research_tools.py` (add `research_download_lecture(url)`), `tools.py` (register `extract_transcript`, `download_audio`, `batch_download_playlist`).

**Steps:** `pip install yt-dlp` → `pip install ffmpeg-python` (or install FFmpeg binary) → create `alfred_ytdlp.py` → register tools.

**Why it upgrades Alfred:** CamoFox handles YouTube transcripts in conversation. yt-dlp handles bulk corpus building overnight — download an entire conference playlist, an analyst's full channel, or a researcher's lecture series into the appropriate arm's corpus dir, ready for fact extraction on the next synthesis pass.

---

### 31. HyperFrames — `npm install -g hyperframes`

**What it is:** CLI tool: HTML/CSS/GSAP/Three.js → deterministic MP4 video. Write a web page → render it as video. Agent-friendly.

**New file:** `alfred_video.py`
```python
"""
Alfred — alfred_video.py
HyperFrames video briefing generation.
Alfred writes HTML → HyperFrames renders MP4.
Requires: npm install -g hyperframes
"""
import subprocess, tempfile, os
from pathlib import Path

OUTPUT_DIR = Path("C:/Alfred/reports/video")

def generate_briefing_video(title: str, content: str, output_name: str = "briefing") -> str:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    output_path = OUTPUT_DIR / f"{output_name}.mp4"
    html = f"""<!DOCTYPE html>
<html>
<head>
  <style>
    body {{ background: #0a0a0a; color: #e0e0e0; font-family: 'Courier New', monospace; padding: 40px; }}
    h1 {{ color: #00ff88; font-size: 2em; margin-bottom: 20px; }}
    .content {{ font-size: 1.1em; line-height: 1.8; white-space: pre-wrap; }}
    .timestamp {{ color: #666; font-size: 0.8em; margin-top: 30px; }}
  </style>
</head>
<body>
  <h1>{title}</h1>
  <div class="content">{content[:800]}</div>
  <div class="timestamp">Alfred — {__import__('datetime').datetime.now().strftime('%Y-%m-%d %H:%M')}</div>
</body>
</html>"""
    with tempfile.TemporaryDirectory() as tmp:
        html_path = Path(tmp) / "index.html"
        html_path.write_text(html, encoding="utf-8")
        try:
            result = subprocess.run(
                ["npx", "hyperframes", "render", "--input", str(html_path),
                 "--output", str(output_path), "--duration", "15"],
                capture_output=True, text=True, timeout=120, cwd=tmp,
            )
            if output_path.exists():
                # After generating, trigger Jellyfin refresh
                try:
                    from alfred_media import refresh_library
                    refresh_library()
                except Exception:
                    pass
                return str(output_path)
            return f"HyperFrames error: {result.stderr[:200]}"
        except FileNotFoundError:
            return "HyperFrames not installed. Run: npm install -g hyperframes"
        except Exception as e:
            return f"Video generation error: {e}"
```

**Files to modify:** `synthesis_loop.py` (add `_generate_daily_briefing()` on 86400s cadence, triggered via Kronos webhook), `tools.py` (register `generate_video_briefing`).

**world_state wire:**
```python
ws_set("last_video_rendered", output_path, confidence=0.99, source="alfred_creator", ttl=86400)
```

---

### 32. VoxCPM2 — `huggingface.co/openbmb/VoxCPM2`

**What it is:** Tokenizer-free TTS, 2B params, 30 languages, 48kHz, voice design + cloning, LoRA fine-tunable, Apache-2.0. Runs on RTX 2070 Max-Q (same "doesn't compete with jarvis" framing as Kronos — only loads when called).

**Alfred layer:** Creator arm audio layer — narration for HyperFrames briefings, voiceovers for MoneyPrinterTurbo/LTX-Video content, optional Slack voice messages.

**New file:** `alfred_voice.py`
```python
"""
Alfred — alfred_voice.py
VoxCPM2 local TTS client.
Runs on RTX 2070 Max-Q. Only loads when called — no VRAM competition with jarvis.
"""
import os
from pathlib import Path

VOXCPM2_MODEL_DIR = os.getenv("VOXCPM2_MODEL_DIR", "C:/Alfred/models/voxcpm2")

def synthesize(text: str, output_path: str, voice: str = "default") -> str:
    """
    Synthesize speech from text. Returns path to generated audio file.
    """
    try:
        # VoxCPM2 inference via ComfyUI node or direct model call
        # See: github.com/Saganaki22/ComfyUI-VoxCPM2
        from voxcpm2 import VoxCPM2
        model = VoxCPM2.from_pretrained(VOXCPM2_MODEL_DIR)
        audio = model.synthesize(text, voice=voice)
        audio.save(output_path)
        return output_path
    except ImportError:
        return "VoxCPM2 not installed. Download from HuggingFace openbmb/VoxCPM2"
    except Exception as e:
        return f"TTS error: {e}"
```

**Files to modify:** `alfred_video.py` (add narration track to HyperFrames output), `alfred_creator.py` (voice synthesis step in content pipeline).

---

### 33. MoneyPrinterTurbo — `github.com/harry0703/MoneyPrinterTurbo`

**What it is:** AI short-video generator (script → visuals → voice → assembled video). Note: maintenance mode since Dec 2025 — stable but low active development.

**Alfred layer:** `alfred_creator.py` visual assembly layer. Baseline; ready to swap its video-assembly step for LTX-Video if it falls behind.

**Integration:** `alfred_creator.py` calls MoneyPrinterTurbo's API for script-to-video generation. VoxCPM2 handles the voice layer locally (don't use MoneyPrinterTurbo's TTS — it uses external APIs).

---

### 34. LTX-Video — `github.com/Lightricks/LTX-Video`

**What it is:** Fast open-weight video generation model. High-quality short clips.

**Alfred layer:** Higher-quality visual generator for `alfred_creator.py`. Either as MoneyPrinterTurbo's visual backend (plugin swap) or directly for clips that don't need the full pipeline.

---

### 35. AiToEarn — `github.com/yikart/AiToEarn`

**What it is:** Full-stack MIT-licensed platform. AI generates content → publishes to 14 platforms (TikTok, YouTube, Instagram, Douyin, Xiaohongshu, Bilibili, LinkedIn, X, etc.) → tracks engagement → CPS/CPE/CPM monetization marketplace. **Has native MCP support.**

**Alfred layer:** Creator arm monetization layer. **Postiz handles scheduling/distribution; AiToEarn handles monetization marketplace and advanced engagement automation.**

**New file:** `alfred_creator.py` (orchestrates the full pipeline):
```python
"""
Alfred — alfred_creator.py
Content pipeline orchestrator.
MoneyPrinterTurbo/LTX-Video → VoxCPM2 → Postiz (publish) → AiToEarn (monetize) → Jellyfin (archive)
Default: draft-only. Auto-publish only when Jay explicitly enables it.
"""
```

**Always draft-only by default.** `AUTO_PUBLISH = os.getenv("ALFRED_CREATOR_AUTO_PUBLISH", "false") == "true"`. Jay reviews before any content goes live.

---

## ━━━ GROUP 11: CODE INTELLIGENCE ━━━

### 36. CodeGraph — (binary install)

**What it is:** Code-to-graph analysis tool. Maps an entire codebase into a queryable structure. Understands dependencies, call graphs, data flow.

**Alfred layer:** Builder arm code comprehension. Before any major refactor, Alfred indexes the target repo and queries the graph rather than re-reading files.

**New file:** `alfred_codegraph.py`

**world_state wire (critical):**
```python
from world_state import set as ws_set
ws_set(f"codegraph_indexed_{repo_name}", True, confidence=0.99, source="codegraph", ttl=86400)
ws_set(f"codegraph_last_result_{repo_name}", result_summary, confidence=0.99, source="codegraph", ttl=3600)
```
→ `assert_belief("codegraph_indexed_alfred")` before any Builder task. Alfred knows if the index is fresh before wasting a re-index.

---

### 37. Spec Kit

**What it is:** `/plan`, `/tasks` slash commands that turn a feature description into a structured spec → plan → task breakdown.

**Alfred layer:** Builder arm pre-coding structure. Spec Kit produces `spec.md` / `plan.md` / `tasks.md` → OpenHands/coder executes against the checklist. One big ambiguous request becomes a checklist.

**New file:** `alfred_spec.py` — when Builder arm receives a "build X" task above a complexity threshold, runs Spec Kit flow first, then hands the task list to OpenHands.

---

### 38. Superpowers — `github.com/obra/superpowers`

**What it is:** 21-skill Claude Code plugin: TDD workflow, git worktrees, subagent-driven development, plan execution, root-cause debugging.

**Integration:** Curriculum Month 1. Distilled skills become standing instructions in `agent.py`'s coder role system prompt as habits, not tools.

---

## ━━━ GROUP 12: RESEARCH INTELLIGENCE ━━━

### 39. Elicit.com — `elicit.com`

**What it is:** AI research assistant for systematic literature review. Semantic search across 125M+ academic papers. Sentence-level citations (every claim linked to exact source sentence). Custom column data extraction across hundreds of papers simultaneously. Generates citation-backed research summaries. Automates systematic review criteria generation, screening, and report drafting. Saves ~80% time vs manual review.

**Alfred layer:** Researcher arm — this is a web service, not an OSS repo, but it has a UI and data patterns worth extracting as Alfred methodology.

**Integration mode:** METHODOLOGY EXTRACTION + API if available.

**What you take:**
- **Structured extraction pattern:** Elicit's custom-column extraction (extract methodology/sample_size/findings from 200 papers simultaneously) → blueprint for `deep_search.py`'s synthesis step. Instead of Alfred reading papers and summarizing free-form, structure the output as typed columns. Add `structured_extract` parameter to `deep_search.py`'s `synthesize()` function.
- **Semantic search over no-keyword-match papers:** Elicit finds relevant papers even without exact keyword matches. Pattern: use the Researcher arm's embedding layer (already in LanceDB) for the same concept — search Alfred's corpus by concept, not keyword.
- **Systematic review workflow:** The 5-step systematic review pattern (question → find → screen → extract → synthesize) becomes a named workflow in `alfred_spec.py`'s task templates.
- **Sentence-level citation tracking:** When `deep_search.py` synthesizes an answer, track which source sentence each claim comes from. Adds credibility and enables fact-checking. Wire into the synthesis output format.

**Files to modify:** `deep_search.py` (add structured column extraction, sentence-level citation tracking), `alfred_spec.py` (add systematic review as a named task template for Researcher arm).

---

### 40. Similarities Search — `similaritiessearch.com`

**What it is:** Semantic similarity search engine for research. Finds papers and concepts similar to a given input using vector similarity. Good for discovering adjacent literature Alfred's keyword searches would miss.

**Integration mode:** USE AS DATA SOURCE within `deep_search.py`.

**What you take:**
- Cross-reference Alfred's existing arXiv/PWC searches with this service for "second-opinion" paper discovery — papers that are semantically related but wouldn't surface on keyword search.
- Wire as an additional source in `corpus_manager.py`'s Researcher arm corpus, alongside arXiv and PWC.

---

## ━━━ GROUP 13: WELLNESS & LIFESTYLE ━━━

### 41. MuscleWiki — `musclewiki.com` + `api.musclewiki.com`

**What it is:** Exercise database with 1,900+ exercises, 7,500+ video demonstrations, filtering by muscle group, equipment, force type, experience level. REST API (FastAPI). Three response levels (minimal/standard/detailed).

**Alfred layer:** Steward arm wellness tool. Alfred can build and track Jay's workout programming.

**Integration mode:** USE API.

**New capability in `tools.py`:**
```python
def get_exercises(muscle: str = "", equipment: str = "", level: str = "") -> list:
    """Query MuscleWiki API for exercises by target muscle/equipment/level."""
    try:
        import requests
        params = {}
        if muscle: params["target"] = muscle
        if equipment: params["category"] = equipment
        if level: params["level"] = level
        r = requests.get("https://api.musclewiki.com/exercises", params=params, timeout=10)
        return r.json().get("exercises", [])[:10] if r.status_code == 200 else []
    except Exception:
        return []

def get_workout_plan(push_or_pull: str = "push") -> dict:
    """Get a structured workout plan from MuscleWiki."""
    try:
        import requests
        r = requests.get(f"https://api.musclewiki.com/workouts/{push_or_pull}", timeout=10)
        return r.json() if r.status_code == 200 else {}
    except Exception:
        return {}
```

**Files to modify:** `tools.py` (register above), `orca.py` (Steward arm `tool_affinity`).

**Anytype integration:** When Alfred generates a workout plan, create it as an Anytype note via `alfred_anytype.py` → Jay has it in his knowledge base.

---

## ━━━ GROUP 14: PRIVACY TOOLS ━━━

### 42. 10 Minute Mail — (service pattern)

**What it is:** Temporary email service. No API publicly documented, but the *pattern* is the value.

**Alfred layer:** Sentinel arm operational security. When Alfred needs to test a service, register for a trial, or probe a site without using Jay's real email, Alfred has a temporary identity.

**Integration:** Wire `deep_search.py` to navigate to a temp-mail service (via `alfred_browser.py`) and extract the generated address + inbox. No permanent file needed — this is a Browser Use task: `browse("get a temporary email address from 10minutemail.com")`.

---

### 43. Temp Number — (service pattern)

**What it is:** Temporary phone number service for SMS verification.

**Alfred layer:** Sentinel arm operational security — same pattern as 10 Minute Mail.

**Integration:** Browser Use task for Sentinel arm when SMS verification is needed for a test account. `browse("get a temporary phone number for SMS verification")`.

---

### 44. Wayback Machine — `web.archive.org`

**What it is:** Internet Archive's historical web snapshot database. CDX API for programmatic access. Retrieve any URL as it appeared at any date.

**Alfred layer:** Researcher arm and Sentinel arm — historical context access.

**What you take:**
```python
def wayback_get(url: str, timestamp: str = "") -> str:
    """
    Retrieve a historical version of a URL via Wayback Machine CDX API.
    timestamp: YYYYMMDD format, or "" for closest available.
    """
    try:
        import requests
        if timestamp:
            archive_url = f"https://web.archive.org/web/{timestamp}/{url}"
        else:
            # Get the most recent snapshot
            r = requests.get(
                "http://archive.org/wayback/available",
                params={"url": url}, timeout=10
            )
            archive_url = r.json().get("archived_snapshots", {}).get("closest", {}).get("url", "")
            if not archive_url:
                return f"No snapshot found for {url}"
        content_r = requests.get(archive_url, timeout=15)
        return content_r.text[:3000]
    except Exception as e:
        return f"Wayback error: {e}"
```

Add to `research_tools.py` and `osiris_tools.py`. Uses: retrieve deleted pages, get historical site content, verify past claims, research how a threat actor's infrastructure looked at a specific date.

---

## ━━━ GROUP 15: REAL-WORLD INTELLIGENCE ━━━

### 45. FlightRadar24 — `flightradar24.com` (not open-source — use unofficial API pattern)

**What it is:** Real-time aircraft tracking. Unofficial Python libraries exist (`flightradar24-python`, `pyflightradar24`).

**Alfred layer:** Sentinel-Physical sub-arm situational awareness OR Steward arm travel intelligence (Jay's flight tracking).

**Integration mode:** USE UNOFFICIAL API (with appropriate rate limiting).

```python
def track_flight(flight_number: str) -> dict:
    """Track a specific flight in real-time."""
    try:
        from FlightRadar24 import FlightRadar24API
        fr_api = FlightRadar24API()
        flights = fr_api.get_flights(airline="", registration="", aircraft_type="")
        # Filter by flight_number
        matching = [f for f in flights if f.callsign == flight_number.upper()]
        if matching:
            f = matching[0]
            return {
                "flight": f.callsign, "origin": f.origin_airport_iata,
                "destination": f.destination_airport_iata,
                "altitude": f.altitude, "speed": f.ground_speed,
                "status": "airborne" if f.altitude > 0 else "grounded"
            }
        return {"error": f"Flight {flight_number} not found or not currently airborne"}
    except Exception as e:
        return {"error": str(e)}
```

Add to `tools.py` and Steward arm `tool_affinity`. Also useful for Sentinel arm if monitoring infrastructure that depends on air logistics.

**Steps:** `pip install FlightRadar24` → register tool.

---

### 46. Windy.com — `windy.com` (API available)

**What it is:** Advanced weather and meteorological data. Professional forecast layers, wind/rain/temperature, historical weather data. API available (free tier: 100k/day requests).

**Alfred layer:** Researcher arm data source (climate data for research) + Steward arm contextual awareness (Jay's local weather for daily briefings).

**Integration:**
```python
WINDY_API_KEY = os.getenv("WINDY_API_KEY", "")

def get_weather_forecast(lat: float, lon: float, model: str = "gfs") -> dict:
    """Get weather forecast for coordinates via Windy API."""
    try:
        import requests
        r = requests.post(
            "https://api.windy.com/api/point-forecast/v2",
            json={
                "lat": lat, "lon": lon, "model": model,
                "parameters": ["wind", "temp", "precip"],
                "levels": ["surface"], "key": WINDY_API_KEY,
            },
            timeout=10,
        )
        return r.json() if r.status_code == 200 else {}
    except Exception as e:
        return {"error": str(e)}
```

Add to `research_tools.py` and `tools.py`. Steward arm can surface weather in daily briefings alongside calendar awareness.

---

## ━━━ GROUP 16: EDUCATIONAL RESOURCES ━━━

### 47. Open Culture — `openculture.com`

**What it is:** Curated directory of 1,000+ free online courses, 1,200+ free audiobooks, 1,000+ free movies, 800+ free textbooks, MIT/Stanford/Yale open courseware aggregation. Not a repo — a site.

**Alfred layer:** Researcher arm corpus discovery layer. When Alfred needs foundational material on a topic, check Open Culture before arXiv (theory before papers).

**Integration mode:** FEED CRAWL4AI / SCRAPE with ScrapeGraphAI.

**What you take:**
- Add `https://www.openculture.com/freeonlinecourses` and `https://www.openculture.com/free_ebooks` as Researcher arm corpus discovery URLs in `corpus_manager.py`'s Researcher arm source list.
- When the Researcher arm needs background on a new domain (e.g. "learn the basics of options trading for context"), Alfred checks Open Culture's course list before defaulting to Wikipedia.
- Periodic crawl (weekly, via Kronos webhook): `_run_crawl4ai_batch(["https://www.openculture.com/freeonlinecourses"])` to keep the index fresh.

---

### 48. FuturMe.org — `futureme.org`

**What it is:** Write a letter to your future self, schedule delivery for 1-50 years from now. Not an API service — a concept.

**Alfred layer:** This is a pattern, not a tool integration.

**What you take:** The "time-delayed message to self" concept maps to Alfred's own long-horizon planning. Adapt it as a Steward arm feature: Alfred can compose "future briefings" — notes Alfred writes to himself about long-term concerns that synthesize_loop should revisit in N days/months. Store in Anytype with a scheduled delivery date. Kronos fires the reminder webhook → interrupt_bus wakes the Steward arm → Alfred re-reads the note with fresh context.

**Files to modify:** `alfred_anytype.py` (add `create_future_note(content, deliver_at)` that sets a scheduled reminder), `alfred_calendar.py` (register the delivery date as a Cal.com event that fires via `interrupt_bus`).

---

## ━━━ GROUP 17: INFRASTRUCTURE TOOLS ━━━

### 49. Tldraw — `github.com/tldraw/tldraw`

**What it is:** Infinite canvas SDK for React. Multiplayer (self-hosted via `@tldraw/sync`). AI canvas primitives for building with LLMs. Custom shapes, tools, bindings. Runtime API (drive the canvas programmatically). `tldraw` license — free in dev, production requires license key.

**Alfred layer:** Builder arm design/diagramming output. When Alfred produces architecture diagrams, system maps, or planning visualizations, tldraw is the canvas they render on.

**Integration mode:** EMBED IN ALFRED'S FRONTEND (Tauri/web UI).

**What you take:**
- Tldraw's runtime Editor API → `alfred_canvas.py` — Alfred can programmatically create and populate a canvas with a system diagram (e.g. "draw Alfred's current architecture as boxes and arrows").
- AI canvas primitives → Alfred can annotate a tldraw canvas in response to questions like "show me how world_state connects to conscience".
- This sits in the same visual layer as `alfred_video.py` (HyperFrames for video) and `alfred_taste.py` (design critique) — three outputs: video, interactive canvas, and static exports.

**Note on license:** Use tldraw's open SDK layer (MIT starter kits) for Alfred's internal use. License key needed only for public-facing products.

---

### 50. PenPot — `github.com/penpot/penpot`

**What it is:** Open-source Figma alternative. API for programmatic design file creation and export. Self-hostable.

**Alfred layer:** Builder arm design output. When Jay asks for a mockup rather than working code, Alfred produces a PenPot file via its API instead of (or alongside) a coded artifact.

**New file:** Part of the `alfred_taste.py` pipeline — taste critique can run on PenPot exports, not just code.

---

### 51. Syncthing — `github.com/syncthing/syncthing`

**What it is:** P2P sync for files between machines without cloud routing.

**Alfred layer:** Infrastructure — sync Alfred's `corpus/`, `memory/`, and `alfred_curriculum/` directories across Jay's Windows dev box and any Coolify-hosted server. Pure config, no new Python file.

---

### 52. escrcpy / scrcpy — `github.com/viarotel-org/escrcpy`

**What it is:** Electron GUI wrapper around scrcpy for Android screen mirroring/control.

**Alfred layer:** Builder arm Android testing — shells out to escrcpy/scrcpy CLI for launching connected device, running automated UI interactions for testing patched APKs, pulling screenshots/logs back for Alfred to inspect.

**New file:** `alfred_android.py` — Builder arm tool, used when a task involves testing an Android build.

---

## ━━━ GROUP 18: PHYSICAL SENSING ━━━

### 53. RuView — `github.com/ruvnet/RuView`

**What it is:** Turns commodity WiFi Channel State Information (via $9 ESP32 nodes) into presence/pose/vital-sign sensing without cameras. **Caveat:** Maintainability Index 48/100, 3,741-line god-object `main.rs`, cyclomatic complexity 65. Life-safety claims (disaster survivor detection, vital signs) require rigorous verification currently absent.

**Alfred layer:** Sentinel-Physical sub-arm — sandboxed only for now.

**New file:** `sentinel_physical.py` — reads RuView's local sensor-mesh API (`presence_state`, `movement`). Useful for contextual awareness (e.g. "don't run the loud fine-tune job while Jay's in the room").

**DO NOT** wire vitals/fall-detection into alerts or actions until RuView's upstream quality issues resolve. Treat output as "interesting signal" not "fact."

---

## ━━━ GROUP 19: SECURITY ARM (ANTHROPIC SKILLS) ━━━

### 54. Anthropic-Cybersecurity-Skills — `github.com/mukul975/Anthropic-Cybersecurity-Skills`

**What it is:** 754 skills across 26 security domains. MITRE ATT&CK, NIST CSF 2.0, MITRE ATLAS, D3FEND, NIST AI RMF mapped. agentskills.io standard.

**Integration (curriculum Month 2):** Don't ingest all 754. Claude Code picks the relevant subset: OSINT/recon, web app testing (pairs with ZAP/web-check), threat intel monitoring, and AI-security/ATLAS skills (relevant since Alfred is an AI system — this doubles as Alfred's own self-defense curriculum). Audit gate (ZAP + AgentShield + CyberSandbox) applies — this is exactly what the audit gate exists for.

**TradingAgents — `github.com/TauricResearch/TradingAgents`:** Mine the four analyst-role prompts (Fundamentals, Sentiment, News, Technical) and debate/aggregation pattern into `finance_tools.py` as additional reasoning personas for the Financier arm alongside Fincept's investor personas. **Do not run it as a separate system** (LangGraph dependency, OpenAI-focused).

---

## ━━━ UNIFIED ARCHITECTURE MAP ━━━

```
                         ┌──────────────────────────────────────────────────┐
                         │                  ALFRED CORE                      │
                         │  agent.py | orca.py | synthesis_loop.py          │
                         │  interrupt_bus.py ✓ | model_manager              │
                         │  world_state.py ✓ | conscience.py ✓              │
                         └──────────────┬───────────────────────────────────┘
                                        │
    ┌───────────┬──────────┬────────────┼──────────────┬──────────┬──────────┐
    ▼           ▼          ▼                           ▼          ▼          ▼
WORLD FEEDS  FINANCIER  SENTINEL                  BUILDER    STEWARD    CREATOR
(Osiris)     ARM        (digital)  SENTINEL-      ARM        ARM        ARM
                                   PHYSICAL
mql5_feed ✓  Kronos     ZAP        RuView         CodeGraph  Twenty CRM  Postiz
corpus_mgr ✓ AutoHedge  CrowdSec   (sandboxed)    OpenHands  Anytype     AiToEarn
deep_srch ✓  Vibe-Trade web-check                 ECC skills Cal.com     Jellyfin
nim_obsvr ✓  Fincept    Cybersec-Skills            Spec Kit   Inbox Zero  MoneyPrinter
Crawl4AI     TradingAgents                         Superpowers Slack      LTX-Video
Browser Use  Supadata                              alfred_taste Papermark  VoxCPM2
CamoFox      MuscleWiki                            tldraw     Documenso   HyperFrames
yt-dlp       Windy      AgentShield                PenPot     FuturMe
Wayback      FlightRdr                             Syncthing  Wayback
Open Culture                                       escrcpy
Elicit (methodology)
SimilaritiesSearch

              ┌──────────────────┐              ┌──────────────────────┐
              │  REASONING CORE  │              │    LEARNING CORE     │
              │  substrate.py ✓  │              │  trickle_learn.py ✓  │
              │  identity.py ✓   │              │  metacog.py ✓        │
              │  conscience.py ✓ │              │  prompt_evol.py ✓    │
              │  world_state.py ✓│              │  nim_observer.py ✓   │
              └──────────────────┘              └──────────────────────┘

              ┌────────────────────────────────────────┐
              │         CURRICULUM LAYER               │
              │  alfred_curriculum/ (Part 0)           │
              │  ECC → AgentShield + instinct system   │
              │  Audit gate: CyberSandbox + ZAP        │
              │                + AgentShield (ECC)     │
              └────────────────────────────────────────┘
```

✓ = confirmed real file, read, and wired into this plan

---

## ━━━ UNIFIED PRIORITY QUEUE ━━━

| Priority | Item | Effort | Why |
|---|---|---|---|
| 🔴 P0 | Wire `interrupt_bus.drain()` into ORCA tick | 1 hour | Bus exists. ORCA exists. Highest leverage per effort in the entire plan. |
| 🔴 P0 | Wire `world_state.infer_and_update()` after every action | 2 hours | Fully built, sitting unused. |
| 🔴 P0 | Wire `conscience.check_action()` into server.py tool dispatch | 2-3 hours | Ideology forming. Conscience has no dispatcher. Actions run unchecked. |
| 🔴 P0 | Wire `identity.get_current_identity()` into system prompt | 1 hour | Built. Not injected anywhere. |
| 🔴 P0 | Wire `identity.run_integration_pass()` into sleep Stage 3 | 1 hour | Paired with above. |
| 🔴 P0 | Crawl4AI + Stirling PDF | Low-Med | Cheapest corpus wins. 30 min + 1 hour. |
| 🟠 P1 | ECC — run AgentShield on Alfred's own repo first | 1 hour | Security audit of Alfred's own agent configs before anything else. |
| 🟠 P1 | Wire `metacog.record_interaction()` after every chat() | 1 hour | Counter and logic exist. No call site. |
| 🟠 P1 | Wire `trickle_learn.run_metabolism_pass()` into synthesis idle | 1 hour | Already in docstring. No wire. |
| 🟠 P1 | Wire Slack + Cal.com → `interrupt_bus.fire()` | 2 hours each | Bus exists. No [FUTURE]. Wire now. |
| 🟠 P1 | `alfred_curriculum/` scaffold + ECC Month 1 distillation | Medium | Everything skill-based depends on this. |
| 🟠 P1 | Browser Use / CamoFox as `deep_search.py` fetch backend | Low-Med | Closes JS-page blindspot. |
| 🟠 P1 | yt-dlp corpus pipeline (`alfred_ytdlp.py`) | Low | `pip install` + one file. Unlocks all 4 arms' audio corpus. |
| 🟠 P1 | CrowdSec deploy + `sentinel_crowdsec.py` | Low-Med | Alfred's own infrastructure protection + threat feed. |
| 🟡 P2 | AutoHedge + Vibe-Trading patterns → `finance_tools.py` | Low | No new infra — pattern extraction only. |
| 🟡 P2 | Anytype deploy + `alfred_anytype.py` | Low-Med | Jay already uses it. MCP server exists. Quick wire. |
| 🟡 P2 | Postiz deploy + `alfred_postiz.py` | Low-Med | Creator arm distribution layer. Self-hostable. |
| 🟡 P2 | Twenty CRM + `alfred_crm.py` | Low-Med | Steward arm relationship intelligence. |
| 🟡 P2 | Papermark + `alfred_papermark.py` | Low | Tracked document delivery for reports. |
| 🟡 P2 | MuscleWiki API | Low | `pip install requests` + 20 lines. Steward arm wellness. |
| 🟡 P2 | metacog → trickle_learn pair feed | 1 hour | Low effort, high learning signal. |
| 🟡 P2 | deep_search → world_state cache | 30 min | Prevents re-searches. One line. |
| 🟡 P2 | VoxCPM2 | Low-Med | Local TTS for HyperFrames + Creator pipeline. |
| 🟡 P2 | Elicit methodology → `deep_search.py` structured output | Medium | Column extraction + sentence citations. |
| 🟢 P3 | Jellyfin deploy + `alfred_media.py` | Low | Creator arm video archive. |
| 🟢 P3 | Immich deploy + MCP config | Low | Visual memory layer. MCP server exists. |
| 🟢 P3 | Inbox Zero + `alfred_inbox.py` | Low-Med | Steward arm email intelligence. |
| 🟢 P3 | FlightRadar24 + Windy API tools | Low | `pip install` + 20 lines each. Situational awareness. |
| 🟢 P3 | Taste-Skill → `alfred_taste.py` | Medium | Builder output quality. |
| 🟢 P3 | AiToEarn MCP + Creator arm monetization | Medium | Revenue layer. Draft-only by default. |
| 🟢 P3 | ZAP + `sentinel_zap.py` | Low-Med | Sentinel tool + curriculum audit gate. |
| 🟢 P3 | web-check + `sentinel_webcheck.py` | Low | OSINT recon tool. Docker pull. |
| 🟢 P3 | Wayback Machine `wayback_get()` | Low | 20 lines in research_tools.py. |
| 🟢 P3 | Documenso + `alfred_documenso.py` | Low-Med | Steward arm e-signature. |
| 🟢 P3 | Open Culture corpus sources | Low | Add URLs to corpus_manager.py. 5 min. |
| 🟢 P3 | Similarities Search as corpus source | Low | Add to corpus_manager.py. 5 min. |
| 🔵 P4 | OpenHands deploy + `openhands_client.py` | Medium | Builder arm complex coding sub-agent. |
| 🔵 P4 | Dify + `dify_client.py` | Medium | External RAG for large doc collections. |
| 🔵 P4 | Coolify infrastructure platform | Medium | Service health management. |
| 🔵 P4 | Kronos finance model + `kronos_client.py` | High | Quantitative price forecasting. |
| 🔵 P4 | HyperFrames + `alfred_video.py` | Low | Video briefings. `npm install`. |
| 🔵 P4 | Cal.com + `alfred_calendar.py` | Low | Calendar awareness. |
| 🔵 P4 | PenPot | Low | Design file output. |
| 🔵 P4 | tldraw embed | Medium | Interactive architecture canvas. |
| 🔵 P4 | Syncthing | Low | Config only. Cross-machine corpus sync. |
| 🔵 P4 | escrcpy + `alfred_android.py` | Low | Android test automation. |
| 🔵 P4 | Anthropic-Cybersecurity-Skills (curated) | Medium | Month 2 curriculum. Needs audit gate first. |
| 🔵 P4 | TradingAgents patterns → `finance_tools.py` | Low | Analyst debate personas. Pattern-mine only. |
| 🔵 P4 | RuView (sandboxed only) | Low | Interesting signal. Unvalidated. |
| 🔵 P4 | MoneyPrinterTurbo / LTX-Video | Medium | Creator arm visuals. After Postiz is running. |
| ⏸ Deferred | Redis pub/sub | — | For multi-process Alfred. In-process bus sufficient now. |
| ⏸ Open question | Burp Suite | — | Pro license? Default: manual-only. ZAP covers scripted case. |
| ⏸ Open question | FuturMe pattern → Alfred scheduled notes | — | Wire after Anytype + Cal.com are running. |
| ⏸ Open question | 10 Minute Mail / Temp Number | — | Browser Use tasks. No dedicated integration needed. |

---

## ━━━ ALL FILES SUMMARY ━━━

### New files to create

| File | Purpose | Group |
|---|---|---|
| `alfred_browser.py` | Browser Use + CamoFox wrapper | Web Intelligence |
| `alfred_db.py` | Supabase relational storage client | Data Infrastructure |
| `alfred_slack.py` | Slack push alerts + bot listener | Communication |
| `alfred_video.py` | HyperFrames video briefing generation | Media Generation |
| `alfred_voice.py` | VoxCPM2 local TTS client | Media Generation |
| `alfred_creator.py` | Content pipeline orchestrator (Postiz + AiToEarn + Jellyfin) | Media Generation |
| `alfred_postiz.py` | Postiz social scheduling client | Communication |
| `alfred_media.py` | Jellyfin media library client | Media Library |
| `alfred_anytype.py` | Anytype knowledge base client | Personal Library |
| `alfred_crm.py` | Twenty CRM contact/relationship client | Data Infrastructure |
| `alfred_inbox.py` | Inbox Zero email intelligence client | Communication |
| `alfred_papermark.py` | Papermark tracked document sharing | Document Intelligence |
| `alfred_documenso.py` | Documenso e-signature client | Document Intelligence |
| `alfred_calendar.py` | Cal.com calendar wrapper | Scheduling |
| `alfred_android.py` | escrcpy/scrcpy Android test automation | Infrastructure |
| `alfred_ytdlp.py` | yt-dlp corpus acquisition (multi-arm) | Media Acquisition |
| `alfred_codegraph.py` | CodeGraph Builder arm wrapper | Code Intelligence |
| `alfred_spec.py` | Spec Kit + Elicit systematic review workflow | Code Intelligence |
| `alfred_eval.py` | ECC eval harness distilled — Alfred self-scoring | Code Intelligence |
| `alfred_taste.py` | Taste critique/regeneration loop (Builder frontend) | Code Intelligence |
| `fincept_bridge.py` | Fincept Terminal Python scripts wrapper | Financial |
| `kronos_client.py` | Kronos finance model inference client | Financial |
| `openhands_client.py` | OpenHands autonomous coding sub-agent | Agent Infrastructure |
| `dify_client.py` | Dify external RAG query client | Agent Infrastructure |
| `corpus_processor.py` | Batch PDF → text via Stirling PDF | Document Intelligence |
| `sentinel_zap.py` | OWASP ZAP REST client — scan + audit gate | Security |
| `sentinel_webcheck.py` | web-check OSINT domain intelligence | Security |
| `sentinel_crowdsec.py` | CrowdSec threat intelligence + IP reputation | Security |
| `sentinel_ecc_shield.py` | ECC AgentShield security scanner | Security |
| `sentinel_physical.py` | RuView sensor-mesh reader (sandboxed) | Physical Sensing |
| `alfred_curriculum/` | Teaching layer directory + ledger | Curriculum |

### Files to modify (cumulative)

`orca.py` — interrupt_bus drain at tick start; arm `tool_affinity` extensions for all new tools; new Creator arm; Steward arm CRM/calendar/email/Anytype tools  
`synthesis_loop.py` — world_state load+infer; conscience gate; trickle_learn idle; identity REM pass; metacog recording; world_state reconcile; Kronos job registration; Slack push in `_queue_alert`; daily briefing cadence; corpus crawl cadence  
`server.py` — conscience WebSocket surface; new status endpoints; Slack listener start; CrowdSec monitor start; webhook endpoints for Kronos + Cal.com; Coolify health  
`agent.py` — identity system prompt injection; world_state belief assertions before Builder tasks; OpenHands routing for complex coding  
`tools.py` — register all new tools  
`finance_tools.py` — Fincept fetchers; Kronos predict; AutoHedge debate pass; Vibe-Trading strategy templates + correlation matrix; TradingAgents analyst personas; MuscleWiki; FlightRadar; Windy  
`research_tools.py` — YouTube transcript; Dify query; Elicit structured extraction pattern; Wayback Machine; Similarities Search  
`osiris_tools.py` — `osint_browse`; `osint_browse_stealth`; `osint_youtube_transcript`; `osint_webcheck`; Wayback Machine  
`sentinel_tools.py` — ZAP scan; CrowdSec IP check; ECC AgentShield scan  
`corpus_manager.py` — Crawl4AI as URL source; Fincept as Financier source; Public APIs filter pass; Open Culture + Similarities Search as Researcher sources; yt-dlp as audio corpus type  
`trickle_learn.py` — ECC instinct-system confidence-scoring improvements  
`deep_search.py` — Browser Use as JS-heavy fetch backend; Elicit structured column extraction; sentence-level citation tracking  
`concern_register.py` — Supabase dual-write  
`principle_engine.py` — Supabase logging  
`alfred_watchdog.py` — Coolify service health checks + resurrection  
`nim_observer.py` — confirm `get_observation_pairs()` export for trickle_learn  

### Environment variables to add (`.env`)

```
# Web Intelligence
SUPADATA_API_KEY=
CAMOFOX_URL=http://localhost:9377

# Agent Infrastructure
OPENHANDS_URL=http://localhost:3000
DIFY_URL=http://localhost:80
DIFY_API_KEY=

# Data Infrastructure
SUPABASE_URL=http://localhost:8000
SUPABASE_ANON_KEY=
COOLIFY_URL=http://localhost:8000
COOLIFY_TOKEN=

# Financial
KRONOS_URL=http://localhost:9175

# PDF / Documents
STIRLING_PDF_URL=http://localhost:8081

# Communication
SLACK_BOT_TOKEN=
SLACK_APP_TOKEN=
SLACK_CHANNEL=#alfred

# Scheduling
CALCOM_API_KEY=

# CRM & Personal
TWENTY_URL=http://localhost:3000
TWENTY_API_KEY=
ANYTYPE_API_BASE_URL=http://127.0.0.1:31009
ANYTYPE_API_KEY=

# Document Sharing
PAPERMARK_URL=http://localhost:3001
PAPERMARK_API_KEY=
DOCUMENSO_URL=http://localhost:3000
DOCUMENSO_API_KEY=

# Media
JELLYFIN_URL=http://localhost:8096
JELLYFIN_API_KEY=

# Creator / Publishing
POSTIZ_URL=http://localhost:5000
POSTIZ_API_KEY=
AITOEARN_MCP_URL=
ALFRED_CREATOR_AUTO_PUBLISH=false

# Security
ZAP_URL=http://localhost:8090
ZAP_API_KEY=
WEBCHECK_URL=http://localhost:3000
CROWDSEC_LAPI_URL=http://localhost:8080
CROWDSEC_API_KEY=

# Code Intelligence
CODEGRAPH_INDEX_PATH=
OPENSANDBOX_URL=

# Voice & TTS
VOXCPM2_MODEL_DIR=C:/Alfred/models/voxcpm2

# Design
PENPOT_URL=
PENPOT_TOKEN=

# Real-world Intelligence
WINDY_API_KEY=

# Inbox
INBOX_ZERO_URL=http://localhost:3000
INBOX_ZERO_API_KEY=
```

---

## ━━━ OPEN ITEMS (still need Jay) ━━━

1. **Burp Suite** — Pro license (REST API) or manual-only? Default: manual-only. ZAP covers the scripted case.
2. **Longcat-Video avatar** — exact repo link (for Creator arm talking-head layer).
3. **Creator arm auto-publish** — `ALFRED_CREATOR_AUTO_PUBLISH` always false by default. Jay explicitly sets to true when ready.
4. **`compound.py`** — confirm `_write_private()` and `TENSION_FILE` exist at module level (`conscience.py` imports both).
5. **`nim_observer.py` pair export** — confirm `get_observation_pairs()` function exists or wire the integration explicitly.
6. **`model_manager.call_model()`** — confirm the signature `(model, messages, temperature, keep_alive)` matches what `model_manager.py` actually exports.
7. **AiToEarn vs Postiz final scope** — confirm whether both run in parallel (recommended) or one is primary.
8. **ECC Pro** — the OSS layer is free (MIT). ECC Pro ($19/seat/mo) is for private repo GitHub App features. Alfred's use of the OSS layer (local install, curriculum distillation) is free. Decide whether to pay for the GitHub App integration on Alfred's own repo.
9. Upload remaining unconfirmed files: `compound.py`, `osiris_tools.py`, `sentinel_ng.py`, `live_feeds.py`, `alfred_watchdog.py`, `model_manager.py`, `agent.py`, `orca.py`, `synthesis_loop.py` for a final correction pass.
