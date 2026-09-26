# Alfred × External Repos — Accurate Integration Master Plan

**What this is:** A corrected, Alfred-specific integration guide. Every claim
is grounded in Alfred's actual codebase. Files referenced exist or are explicitly
marked as new. Use-cases are Alfred's, not generic agent demos.

---

## WHAT THIS DOCUMENT CORRECTS

The original plan had several category errors worth naming before diving in:

- **`world_state.py`** — does not exist. Alfred's world data lives in `osiris_tools.py`,
  `sentinel_ng.py`, `live_feeds.py`, and the synthesis loop. Integrations go there.
- **`nim_observer.py`** — does not exist. Alfred uses `llama-server` (llama.cpp), not
  NVIDIA NIM in production. Any observability hooks go into `model_manager.py`.
- **`corpus_downloader.py`** — does not exist. Corpus logic currently lives inside
  `synthesis_loop.py` and the referenced `corpus_manager.py` (partially built).
- **Supabase replacing LanceDB** — Alfred's memory is a deliberate four-layer
  architecture: RAM → LanceDB (vectors) → NetworkX graph → fine-tuned weights.
  Supabase doesn't replace this; it can complement it for structured relational data.
- **`compound.py` as orchestration** — compound.py is Alfred's private
  introspection/ideology/imagination process. It is not an orchestration layer.
  OpenHands integrates with `agent.py` and `orca.py`, not compound.py.
- **`identity.py` / `conscience.py`** — not yet built. These are on Alfred's roadmap
  per `concern_register.py`. Integrations that target them are listed as
  future-phase work.
- **`mql5_feed.py`** — referenced but not in the provided codebase. It's a planned
  file for the Financier arm's TA article ingestion. Integration points are noted accordingly.
- **`interrupt_bus.py`** — referenced in the newer `synthesis_loop.py` version but not
  in the provided file listing. It exists or is about to. Integration with Kronos cron
  is valid but the import already exists in the latest synthesis_loop.py.
- **`trickle_learn.py`** — referenced in synthesis_loop.py but not in the file listing.
  On the roadmap. Weight metabolism integrations target this once it lands.
- **`alfred_watchdog.py`** — exists per memory notes, not in the provided listing.
  Relevant to Coolify integration (service resurrection).

---

## HOW TO READ THIS DOCUMENT

Each integration gets:
- **What it actually is** (precise)
- **Which Alfred file(s) it touches** (exact, verified)
- **Files to modify** — what changes and why
- **New files to create** — what they contain
- **Step-by-step** — concrete, ordered
- **Why it upgrades Alfred** — the specific capability gap it closes

---

## ━━━ GROUP 1: FINANCIAL INTELLIGENCE ━━━

---

### 1. Fincept Terminal
`github.com/Fincept-Corporation/FinceptTerminal`

**What it actually is:** C++20 + Qt6 + embedded Python terminal with 80+ data
fetcher scripts (FRED, IMF, World Bank, Yahoo Finance, Polygon, Kraken, DBnomics),
DCF/VaR/Sharpe analytics, and 37 "investor persona" prompt templates (Buffett, Graham, etc.).
The Python scripts folder is the valuable part — the Qt UI is irrelevant to Alfred.

**Alfred layer:** Financier arm world feeds, financier corpus data sources.

**What this closes:** Alfred's Financier arm currently only has `finance_tools.py`
(CoinGecko, Fear & Greed, basic macro). No access to traditional macro data
(FRED, IMF, World Bank). No DCF tools. No analyst-style reasoning templates.

#### Files to Modify

**`finance_tools.py`** — add new tool functions wrapping Fincept's Python scripts.
Each script becomes a callable Alfred tool. Pattern:
```python
def finance_fred(series_id: str = "DFF", limit: int = 10) -> str:
    """Federal Reserve Economic Data — interest rates, GDP, inflation."""
    # subprocess call into fincept's script, capture JSON, format for Alfred
    import subprocess, json
    result = subprocess.run(
        ["python", "fincept_scripts/fred_fetcher.py", series_id, str(limit)],
        capture_output=True, text=True, timeout=15
    )
    return result.stdout[:2000] if result.returncode == 0 else f"FRED error: {result.stderr}"
```
Then add to `FINANCE_TOOLS` dict and register in `server.py` startup.

**`orca.py`** — extend Financier arm's `world_feeds` list:
```python
"financier": {
    "world_feeds": [
        "finance_crypto",
        "finance_fear_greed",
        "finance_macro",
        "finance_trending_crypto",
        "finance_defi",
        "finance_news",
        "finance_fred",        # NEW — Fed data
        "finance_world_bank",  # NEW — macro development indicators
        "finance_imf",         # NEW — IMF datasets
    ],
```

#### New Files to Create

**`fincept_bridge.py`** — thin wrapper module:
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

#### Steps
1. `git clone https://github.com/Fincept-Corporation/FinceptTerminal` into `C:/Alfred/external/fincept/`
2. `pip install -r fincept-qt/requirements.txt` (Python analytics deps only — skip Qt)
3. Create `fincept_bridge.py`
4. Add 5-10 tool functions to `finance_tools.py` wrapping the most useful fetchers
5. Extend Financier arm `world_feeds` in `orca.py`
6. Register new tools in `server.py` startup block

**Why it upgrades Alfred:** The Financier arm currently reasons about crypto
signals in a macro vacuum. FRED, IMF, and World Bank data give Alfred the
macroeconomic context that drives crypto cycles — rate decisions, dollar strength,
capital flows. Alfred stops being a crypto-only analyst.

---

### 2. Kronos Finance Model
`github.com/shiyu-coder/Kronos`

**What it actually is:** AAAI 2026 paper. Decoder-only transformer pre-trained
on 12 billion OHLCV K-line records from 45 exchanges. Tokenizes candlestick data
like a language model tokenizes text. Zero-shot beats all existing time-series
foundation models on price forecasting (+93% RankIC on rank correlation).
HuggingFace: `shiyu-coder/Kronos-*`. Has fine-tune scripts.

**Alfred layer:** Financier arm — price forecasting tool called during ORCA
reasoning passes when the Financier arm needs a forward prediction.

**What this closes:** Alfred's Financier arm currently reasons qualitatively
about price action. It has no quantitative forecasting primitive. Kronos gives
it one. This is a second model running alongside jarvis — not a replacement.

**Hardware note:** Kronos is a smaller specialized model (financial domain only).
It runs inference on your RTX 2070 Max-Q. It does NOT compete with jarvis
for VRAM because it only runs when explicitly called by the Financier arm.

#### Files to Modify

**`finance_tools.py`** — add Kronos inference function:
```python
def finance_kronos_predict(symbol: str, ohlcv_data: str, horizon: int = 5) -> str:
    """
    Kronos price forecast. ohlcv_data: JSON string of OHLCV rows.
    horizon: number of future candles to predict.
    Requires Kronos model loaded via kronos_client.py.
    """
    try:
        from kronos_client import KronosClient
        client = KronosClient()  # loads from C:/Alfred/external/kronos/
        result = client.predict(symbol=symbol, data=ohlcv_data, steps=horizon)
        return f"Kronos forecast for {symbol} (+{horizon} candles):\n{result}"
    except Exception as e:
        return f"Kronos unavailable: {e}"
```

**`orca.py`** — add `finance_kronos_predict` to Financier arm `tool_affinity`.

#### New Files to Create

**`kronos_client.py`** — inference wrapper:
```python
"""
Alfred — kronos_client.py
Kronos model inference client.
Kronos is a specialized financial time-series model (AAAI 2026).
It does NOT run through llama-server — it has its own inference path via qlib.
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
        import json, numpy as np
        rows = json.loads(data)
        # ... format OHLCV into Kronos token format ...
        # ... run inference ...
        return "prediction output"  # implement per Kronos API
```

#### Steps
1. `pip install qlib` (Kronos dependency)
2. `git clone https://github.com/shiyu-coder/Kronos` into `C:/Alfred/external/kronos/`
3. Download model weights: `huggingface-cli download shiyu-coder/Kronos-base`
4. Create `kronos_client.py`
5. Add `finance_kronos_predict` to `finance_tools.py`
6. Add to Financier arm tool_affinity in `orca.py`
7. Register in `server.py`

**Why it upgrades Alfred:** Alfred's Financier arm currently reasons about price
direction using qualitative signals (fear/greed, news sentiment, TA descriptions).
Kronos adds a quantitative forecast primitive — a number, not an opinion. The arm
can now say "Kronos gives 0.72 probability of continuation" alongside its reasoning.

---

## ━━━ GROUP 2: WEB INTELLIGENCE ━━━

---

### 3. Crawl4AI
`github.com/unclecode/crawl4ai`

**What it actually is:** Async Python web crawler. Renders JavaScript, parallel
crawls, outputs clean markdown. No API keys. Runs entirely offline after install.
50k+ stars. Best free option for bulk LLM-ready content extraction.

**Alfred layer:** Synthesis loop corpus building, Researcher arm world feeds.

**What this closes:** Alfred's `synthesis_loop.py` currently calls static
RSS/API feeds. It can't bulk-crawl documentation sites, research repositories,
or long-form content. Crawl4AI gives it that capability.

#### Files to Modify

**`synthesis_loop.py`** — add a new function `_run_crawl4ai_pass()` and a
corresponding cadence entry. Also add `crawl_for_corpus` as a helper:
```python
async def _crawl_url_for_corpus(url: str) -> str:
    """Crawl a URL and return clean markdown for fact extraction."""
    try:
        from crawl4ai import AsyncWebCrawler
        async with AsyncWebCrawler(verbose=False) as crawler:
            result = await crawler.arun(url=url)
            return result.markdown[:3000] if result.success else ""
    except ImportError:
        return ""
    except Exception as e:
        return f"Crawl error: {e}"

def _run_crawl4ai_batch(urls: list[str]):
    """Blocking wrapper — runs async crawl from synthesis loop thread."""
    import asyncio
    loop = asyncio.new_event_loop()
    try:
        results = []
        for url in urls:
            raw = loop.run_until_complete(_crawl_url_for_corpus(url))
            if raw:
                salience = score_salience(raw)
                if salience >= 0.3:
                    facts = _extract_facts(raw, f"crawl4ai:{url[:40]}")
                    _consolidate_facts(facts)
                    results.append(len(facts))
        return results
    finally:
        loop.close()
```

**`tools.py` / STELLA** — expose as a tool Alfred can call on demand:
```python
TOOLS["crawl_url"] = lambda url, **_: _run_crawl4ai_batch([url])
```

**`osiris_tools.py`** — add `crawl_document(url)` for when Alfred needs to
pull a specific document during OSINT research.

#### Steps
1. `pip install crawl4ai`
2. `python -m crawl4ai.setup` (installs Playwright browsers)
3. Add `_crawl_url_for_corpus` and `_run_crawl4ai_batch` to `synthesis_loop.py`
4. Add cadence entry: `"crawl4ai_pass": 7200` (2hr cadence, runs against a rotating URL list)
5. Add `crawl_url` tool to `tools.py`
6. Register in `server.py`

**Why it upgrades Alfred:** The synthesis loop is currently fed by point-APIs
(USGS, CoinGecko, arXiv API). It cannot pull documentation pages, blog posts,
long reports, or any URL without a dedicated API. Crawl4AI removes that constraint.
The Researcher arm can now say "crawl this paper's full text" instead of just
reading abstracts.

---

### 4. Browser Use
`github.com/browser-use/browser-use`

**What it actually is:** Python library that wraps Playwright + LLM reasoning
for browser automation. Takes a natural language task, browses, returns structured
results. Works with local LLMs via OpenAI-compatible endpoints — which is exactly
what llama-server exposes.

**Alfred layer:** Osiris world feeds — active browsing when APIs are unavailable.
Also useful as an ORCA tool for the Researcher arm.

**Critical compatibility note:** Browser Use works with Alfred's llama-server
because llama-server exposes an OpenAI-compatible `/v1/chat/completions` endpoint.
Point it at `http://127.0.0.1:8080/v1` instead of OpenAI.

#### New Files to Create

**`alfred_browser.py`** — Alfred's browser agent:
```python
"""
Alfred — alfred_browser.py
Browser agent using Browser Use + jarvis via llama-server.
Uses the same model as Alfred (jarvis) — no external API calls.
"""
import asyncio
from typing import Optional

async def browse(task: str, url: Optional[str] = None) -> str:
    """
    Alfred browses the web via Browser Use + jarvis.
    task: natural language instruction
    url: optional starting URL
    """
    try:
        from browser_use import Agent
        from langchain_openai import ChatOpenAI

        # Point at Alfred's own llama-server — no external API
        llm = ChatOpenAI(
            model="jarvis",
            base_url="http://127.0.0.1:8080/v1",
            api_key="no-key-needed",
            temperature=0.3,
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
    """Synchronous wrapper for Alfred's tool dispatch."""
    return asyncio.run(browse(task, url))
```

#### Files to Modify

**`osiris_tools.py`** — add `osint_browse` tool:
```python
from alfred_browser import browse_sync

def osint_browse(task: str, url: str = "", **kwargs) -> str:
    """Active web browsing — uses jarvis to navigate and extract."""
    return browse_sync(task, url or None)

OSIRIS_TOOLS["osint_browse"] = lambda task, url="", **_: osint_browse(task, url)
```

**`orca.py`** — add `osint_browse` to Researcher arm `tool_affinity` and
Sentinel arm `tool_affinity` (for OSINT research on threats).

#### Steps
1. `pip install browser-use langchain-openai`
2. `playwright install chromium`
3. Create `alfred_browser.py`
4. Add `osint_browse` to `osiris_tools.py`
5. Add to Researcher and Sentinel arm tool_affinity in `orca.py`
6. Register in `server.py`

**Why it upgrades Alfred:** Currently if a data source doesn't have an API,
Alfred can't reach it. Browser Use means Alfred can research any website the
way a human would — navigate, read, extract. The Researcher arm can now say
"browse that GitHub issue thread" or "check what the site says about X" without
a custom scraper.

---

### 5. CamoFox Browser
`github.com/jo-inc/camofox-browser`

**What it actually is:** Anti-detection browser server. Wraps Camoufox — a
Firefox fork with C++-level fingerprint spoofing. REST API + stealth browsing.
yt-dlp integration for YouTube transcripts. Bypasses Cloudflare and bot detection
that blocks Playwright-based Browser Use.

**Alfred layer:** Osiris — stealth fallback when Browser Use gets blocked.

**What this closes:** Browser Use uses Playwright which many sites detect
and block. CamoFox is the fallback for protected sites — dark web mirrors,
financial portals, sites behind Cloudflare.

#### Files to Modify

**`alfred_browser.py`** — add CamoFox fallback:
```python
CAMOFOX_URL = "http://127.0.0.1:9377"

async def browse_stealth(task: str, url: str) -> str:
    """
    Stealth browse via CamoFox — use when standard browser gets blocked.
    """
    try:
        import requests
        # Create session
        session_r = requests.post(f"{CAMOFOX_URL}/sessions", json={})
        sid = session_r.json()["id"]
        # Navigate
        requests.post(f"{CAMOFOX_URL}/sessions/{sid}/navigate", json={"url": url})
        # Extract
        content_r = requests.get(f"{CAMOFOX_URL}/sessions/{sid}/content")
        requests.delete(f"{CAMOFOX_URL}/sessions/{sid}")
        return content_r.json().get("text", "")[:3000]
    except Exception as e:
        return f"CamoFox unavailable (is it running?): {e}"

def youtube_transcript(video_id: str) -> str:
    """Get YouTube transcript via CamoFox's yt-dlp endpoint."""
    try:
        import requests
        r = requests.post(
            f"{CAMOFOX_URL}/youtube/transcript",
            json={"video_id": video_id}
        )
        return r.json().get("transcript", "")[:4000]
    except Exception as e:
        return f"YouTube transcript error: {e}"
```

**`osiris_tools.py`** — add `osint_youtube_transcript`:
```python
from alfred_browser import youtube_transcript

OSIRIS_TOOLS["osint_youtube_transcript"] = lambda video_id, **_: youtube_transcript(video_id)
```

#### Steps
1. `git clone https://github.com/jo-inc/camofox-browser`
2. `npm install && npm start` — runs on port 9377
3. (Optional) wrap in a Windows service or add to `alfred_watchdog.py` resurrection list
4. Add stealth browse functions to `alfred_browser.py`
5. Add `osint_youtube_transcript` to `osiris_tools.py`
6. Register new tools in `server.py`

**Why it upgrades Alfred:** YouTube is the largest repository of technical
lectures, market analysis, and research talks in existence. Alfred currently
cannot access any of it. CamoFox + yt-dlp gives the Researcher and Financier
arms access to YouTube content as text — conference talks, analyst videos,
educational content for the corpus.

---

### 6. ScrapeGraphAI
`github.com/ScrapeGraphAI/Scrapegraph-ai`

**What it actually is:** NLP-prompted web scraper. You describe what you want
in natural language → it builds the extraction graph. Works with local LLMs
via Ollama-compatible endpoints. Self-healing when sites change structure.

**Alfred layer:** Corpus building — structured data extraction from specific sites
Alfred knows it will visit repeatedly.

**What this closes:** Crawl4AI gives Alfred raw markdown. ScrapeGraphAI gives
Alfred structured JSON — specifically useful when Alfred needs to extract
tables, lists, or specific data fields from pages it visits repeatedly.

#### Files to Modify

**`synthesis_loop.py`** — add `_run_scrapegraph_extraction()` for structured
corpus building from known sources:
```python
def _scrapegraph_extract(url: str, prompt: str) -> dict:
    """Extract structured data from a URL using NLP prompt + local Qwen."""
    try:
        from scrapegraphai.graphs import SmartScraperGraph
        config = {
            "llm": {
                "model": "ollama/jarvis",
                "base_url": "http://127.0.0.1:8080/v1",
                "api_key": "no-key",
            }
        }
        graph = SmartScraperGraph(prompt=prompt, source=url, config=config)
        return graph.run()
    except ImportError:
        return {}
    except Exception as e:
        return {"error": str(e)}
```

#### Steps
1. `pip install scrapegraphai`
2. Add `_scrapegraph_extract` helper to `synthesis_loop.py`
3. Add `scrape_structured` to `tools.py` as a STELLA-accessible tool
4. Register in `server.py`
5. Use via: `TOOLS["scrape_structured"] = lambda url, prompt="Extract all information", **_: _scrapegraph_extract(url, prompt)`

**Why it upgrades Alfred:** When Alfred needs structured data from a specific
page — paper titles and abstracts from a research aggregator, price tables from
a financial site, CVE details from a security database — ScrapeGraphAI lets him
describe what he wants in plain English and get JSON back. No CSS selectors,
no brittle parsers.

---

### 7. Supadata
`pip install supadata` (API service, free tier: 100 credits/month)

**What it actually is:** API service providing structured data from YouTube,
web pages, and social media. Most useful feature: YouTube transcript extraction
with AI Whisper fallback when captions don't exist.

**Alfred layer:** Researcher arm corpus — YouTube academic/research content.

**Note:** CamoFox also has yt-dlp for YouTube. Use Supadata as primary (cleaner
transcripts), CamoFox as fallback (no API key required, unlimited).

#### Files to Modify

**`research_tools.py`** — add:
```python
import os
SUPADATA_KEY = os.getenv("SUPADATA_API_KEY", "")

def research_youtube_transcript(video_id: str) -> str:
    """
    Get YouTube video transcript via Supadata API.
    Falls back to CamoFox/yt-dlp if key not set.
    """
    if not SUPADATA_KEY:
        # Fallback to CamoFox
        try:
            from alfred_browser import youtube_transcript
            return youtube_transcript(video_id)
        except Exception:
            return "No YouTube transcript method available. Set SUPADATA_API_KEY or run CamoFox."

    try:
        from supadata import Supadata
        s = Supadata(api_key=SUPADATA_KEY)
        result = s.youtube.transcript(video_id=video_id, text=True)
        return str(result)[:4000]
    except Exception as e:
        return f"Supadata error: {e}"
```

Add `research_youtube_transcript` to `RESEARCH_TOOLS` dict and to Researcher
arm `tool_affinity` in `orca.py`.

#### Steps
1. Get free API key from supadata.ai
2. Add `SUPADATA_API_KEY` to `.env`
3. Add function to `research_tools.py`
4. Register in `server.py`

---

## ━━━ GROUP 3: AGENT INFRASTRUCTURE ━━━

---

### 8. OpenHands
`github.com/OpenHands/OpenHands`

**What it actually is:** Open-source autonomous software engineering platform
(formerly OpenDevin). CodeAct paradigm — agents write and execute real code.
SWE-Bench state-of-the-art. Supports any LLM backend. Has Docker sandbox execution.

**Alfred layer:** Builder arm autonomous coding — a dedicated coding sub-agent
that Alfred's Builder arm can delegate to for complex implementation tasks.

**What this closes:** Alfred's Builder arm currently delegates coding to the
`coder` role in `agent.py`, which is the same jarvis model with a different system
prompt. OpenHands is a specialized coding system with its own scaffolding, tool
use, bash execution, and test-run loops. It can handle multi-file refactors and
debugging sessions that would exhaust Alfred's 12-iteration tool loop.

**Architecture note:** OpenHands runs as a separate service with its own model
calls. Point it at jarvis via llama-server for zero API cost. Alfred calls it
as a tool — it's a sub-agent, not a replacement.

#### New Files to Create

**`openhands_client.py`**:
```python
"""
Alfred — openhands_client.py
OpenHands integration — Alfred's autonomous coding arm.
OpenHands runs as a service (default :3000).
Alfred delegates multi-step coding tasks to it.
"""
import requests
import os

OPENHANDS_URL = os.getenv("OPENHANDS_URL", "http://127.0.0.1:3000")

def openhands_task(task: str, working_dir: str = "") -> str:
    """
    Submit a coding task to OpenHands.
    OpenHands handles: file reading, writing, bash execution, test loops.
    Returns the final result/summary.
    """
    try:
        # OpenHands headless API (check their docs for exact endpoint)
        payload = {
            "task": task,
            "llm_config": {
                "model": "jarvis",
                "base_url": "http://127.0.0.1:8080/v1",
                "api_key": "no-key",
            },
            "workspace": working_dir or "C:/Users/DELL/Desktop/Alfred",
        }
        r = requests.post(f"{OPENHANDS_URL}/api/conversations", json=payload, timeout=300)
        if r.status_code == 200:
            return r.json().get("result", "OpenHands completed task.")
        return f"OpenHands error: {r.status_code}"
    except Exception as e:
        return f"OpenHands unavailable: {e}"
```

#### Files to Modify

**`agent.py`** — add OpenHands as an alternative to the `coder` role for
complex tasks. In `run_agent()`, when `role == "coder"` and the task is
sufficiently complex (multi-file, multi-step), optionally route to OpenHands:
```python
# Near the top of run_agent():
if role == "coder" and _is_complex_coding_task(task):
    try:
        from openhands_client import openhands_task
        result = openhands_task(task, context)
        if result and "unavailable" not in result:
            return result
    except Exception:
        pass  # fall through to standard coder agent
```

**`orca.py`** — add `openhands_task` to Builder arm `tool_affinity`.

**`tools.py`** — register:
```python
from openhands_client import openhands_task
TOOLS["openhands_code"] = lambda task, working_dir="", **_: openhands_task(task, working_dir)
```

#### Steps
1. Install: `pip install openhands-ai` or Docker deploy
2. Configure to use llama-server at `http://127.0.0.1:8080/v1`
3. Create `openhands_client.py`
4. Add complexity check helper `_is_complex_coding_task()` to `agent.py`
5. Add `openhands_code` tool to `tools.py`
6. Register in `server.py`
7. Add to Builder arm `tool_affinity` in `orca.py`

**Why it upgrades Alfred:** Alfred's current coder agent is good for single-file
changes and specific functions. It struggles with "refactor this entire module"
or "fix all the failing tests in this project." OpenHands is built specifically
for that scope of task — it can run tests, see failures, fix, re-run, iterate.
The Builder arm gets a coding specialist instead of just another jarvis instance.

---

### 9. Dify
`github.com/langgenius/dify`

**What it actually is:** Production-hardened LLM app platform. Visual workflow
builder + RAG engine + model management + observability. Full API surface.
MCP server support. Better production characteristics than Langflow.

**Alfred layer:** External RAG pipeline for documents Alfred needs to query
without loading into LanceDB, and observability for Alfred's NIM/API calls.

**What this closes:** Alfred currently loads everything into LanceDB in-process.
For large document collections (legal docs, long research papers, full codebases
from other projects), an external RAG service avoids bloating Alfred's in-process
DB. Also gives Alfred observability it currently lacks entirely.

**Relationship to Alfred's memory:** Dify does NOT replace `memory.py` or
LanceDB. Alfred's own memories (conversations, facts, graph) stay in LanceDB.
Dify handles external document knowledge bases Alfred queries but doesn't own.

#### New Files to Create

**`dify_client.py`**:
```python
"""
Alfred — dify_client.py
Dify RAG client — queries external knowledge bases Alfred doesn't own.
Run Dify: docker compose up -d in dify/docker/
Default: http://localhost:80
"""
import os
import requests

DIFY_URL     = os.getenv("DIFY_URL", "http://localhost:80")
DIFY_API_KEY = os.getenv("DIFY_API_KEY", "")

def dify_query(knowledge_base: str, query: str) -> str:
    """
    Query a Dify knowledge base.
    knowledge_base: the dataset ID or name configured in Dify.
    """
    if not DIFY_API_KEY:
        return "DIFY_API_KEY not set. Deploy Dify and configure an API key."
    try:
        r = requests.post(
            f"{DIFY_URL}/v1/datasets/{knowledge_base}/retrieve",
            headers={"Authorization": f"Bearer {DIFY_API_KEY}"},
            json={"query": query, "top_k": 5},
            timeout=15,
        )
        if r.status_code != 200:
            return f"Dify error {r.status_code}: {r.text[:200]}"
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

#### Files to Modify

**`tools.py`** — register:
```python
from dify_client import dify_query
TOOLS["dify_query"] = lambda knowledge_base, query, **_: dify_query(knowledge_base, query)
```

**`research_tools.py`** — add `research_dify` as a Researcher arm tool for
querying document collections Alfred has ingested into Dify.

**`server.py`** — register tools at startup.

#### Steps
1. `git clone https://github.com/langgenius/dify && cd dify/docker && docker compose up -d`
2. Access Dify Studio at `localhost:80`, create knowledge bases for:
   - Alfred's project documentation
   - Research papers corpus
   - MQL5 articles
3. Add `DIFY_URL` and `DIFY_API_KEY` to `.env`
4. Create `dify_client.py`
5. Register `dify_query` in `tools.py` and `server.py`
6. Add to Researcher arm `tool_affinity` in `orca.py`

**Why it upgrades Alfred:** When Alfred has ingested 10,000 research papers
into a corpus, querying them in-process (LanceDB) adds latency and memory
pressure to the main process. Dify offloads that to a dedicated service with
better chunking, hybrid retrieval, and document management UI you can actually
use without writing code.

---

## ━━━ GROUP 4: DATA INFRASTRUCTURE ━━━

---

### 10. Supabase (Self-Hosted)
`github.com/supabase/supabase`

**What it actually is:** PostgreSQL + Auth + Auto REST/GraphQL APIs + Realtime
subscriptions + Vector support. Self-hostable via Docker. Key differentiator
from Alfred's current storage: **relational structure** and **realtime push**.

**Alfred layer:** Structured relational storage that Alfred's current jsonl/pickle
approach can't provide. NOT a replacement for LanceDB (vectors) or NetworkX (graph).

**What this closes:** Alfred currently stores everything in flat `.jsonl` files
(traces.jsonl, alfred_concerns.json, principles, tensions, etc.). These don't
support queries like "all open concerns above pressure 0.8 in the builder domain
ordered by age" without loading everything into memory. Supabase gives Alfred
proper relational storage for structured data while LanceDB keeps vectors.

**What stays in LanceDB:** embeddings, vector search, semantic similarity.
**What moves to Supabase:** concern_register, principle_store, prediction_ledger,
orca logs, calibration data, blackboard history.

#### New Files to Create

**`alfred_db.py`** — Supabase client layer:
```python
"""
Alfred — alfred_db.py
Supabase client for structured relational storage.
Complements memory.py (LanceDB vectors + NetworkX graph).
LanceDB: semantic search, embeddings.
Supabase: structured queries, relational data, realtime.
"""
import os
from typing import Optional

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

def get_open_concerns_db(domain: str = "", min_pressure: float = 0.0) -> list[dict]:
    try:
        q = _client().table("concerns").select("*").eq("open", True)
        if domain:
            q = q.eq("domain", domain)
        if min_pressure > 0:
            q = q.gte("pressure", min_pressure)
        return q.order("pressure", desc=True).execute().data
    except Exception as e:
        print(f"[DB] Concerns query error: {e}")
        return []

def log_orca_reasoning(arm: str, task: str, result: str, chain_steps: int):
    try:
        _client().table("orca_log").insert({
            "arm": arm, "task": task[:200],
            "result": result[:400], "chain_steps": chain_steps
        }).execute()
    except Exception as e:
        print(f"[DB] ORCA log error: {e}")
```

#### Files to Modify

**`concern_register.py`** — add dual-write to Supabase alongside existing JSON:
```python
def add_concern(gap, domain, why, what_closes, pressure=0.7):
    # ... existing jsonl logic ...
    # Dual-write to Supabase
    try:
        from alfred_db import upsert_concern
        upsert_concern({
            "id": concern_id, "gap": gap, "domain": domain,
            "why_it_matters": why, "what_would_close_it": what_closes,
            "pressure": pressure, "open": True,
        })
    except Exception:
        pass  # never block on DB failure
```

**`principle_engine.py`** — add Supabase logging for principles and predictions.

**`orca.py`** — log arm reasoning passes to Supabase via `log_orca_reasoning`.

#### Steps
1. `git clone https://github.com/supabase/supabase && cd supabase/docker`
2. `cp .env.example .env` — set passwords
3. `docker compose up -d` — Postgres :5432, API :8000, Studio :3000
4. Create tables via Supabase Studio: `concerns`, `principles`, `predictions`,
   `orca_log`, `blackboard_history`, `calibration_data`
5. `pip install supabase`
6. Add env vars to `.env`
7. Create `alfred_db.py`
8. Add dual-write to `concern_register.py`, `principle_engine.py`
9. Add ORCA logging to `orca.py`

**Why it upgrades Alfred:** Alfred's concern_register, principle_store, and
calibration data all live in flat files that get re-read entirely on every
access. Supabase gives Alfred real queries — "what are the top 3 open concerns
in the builder domain by pressure?" becomes a single SQL call. Also enables
the Tauri frontend to subscribe to realtime updates — concern pressure ticking
up shows in the UI without polling.

---

### 11. Coolify
`github.com/coollabsio/coolify`

**What it actually is:** Self-hosted PaaS. One-click Docker service deploys,
automatic SSL/HTTPS, health monitoring, Git-based autodeploys, REST API for
automation. Think of it as Alfred's infrastructure control plane.

**Alfred layer:** Service orchestration — hosts and manages all external services
Alfred depends on (Supabase, Dify, Stirling PDF, CamoFox, OpenHands, etc.).

**What this closes:** Currently Alfred's external services (if any are running)
are just Docker commands you ran once and hope didn't crash. Coolify gives Alfred
health monitoring, automatic restart, and — critically — an API endpoint Alfred
can call to trigger its own redeployment after a Gödel self-patch.

#### Files to Modify

**`alfred_watchdog.py`** — add Coolify health check and service resurrection:
```python
COOLIFY_URL = os.getenv("COOLIFY_URL", "http://localhost:8000")
COOLIFY_TOKEN = os.getenv("COOLIFY_TOKEN", "")

def check_service_health(service_name: str) -> bool:
    """Check if an Alfred-dependent service is healthy via Coolify."""
    try:
        import requests
        r = requests.get(
            f"{COOLIFY_URL}/api/v1/services",
            headers={"Authorization": f"Bearer {COOLIFY_TOKEN}"},
            timeout=5
        )
        services = r.json().get("data", [])
        for svc in services:
            if svc.get("name") == service_name:
                return svc.get("status") == "running"
        return False
    except Exception:
        return False
```

**`server.py`** — add `/services/status` endpoint that queries Coolify for
the health of Alfred's dependent services.

#### Steps
1. `curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash` (on Windows: use Docker Desktop or WSL)
2. Web dashboard at `:8000`
3. Deploy each service through Coolify: Supabase, Dify, Stirling PDF, CamoFox, OpenHands
4. Add `COOLIFY_URL` and `COOLIFY_TOKEN` to `.env`
5. Add `check_service_health` to `alfred_watchdog.py`
6. Add `/services/status` endpoint to `server.py`

**Why it upgrades Alfred:** Alfred currently has `alfred_watchdog.py` watching
himself and llama-server. He can't see the health of anything else. Coolify
makes Alfred infrastructure-aware — he knows if Dify is down before trying
to use it, can request service restarts, and can trigger his own redeploy
after a Gödel patch is confirmed.

---

## ━━━ GROUP 5: DOCUMENT INTELLIGENCE ━━━

---

### 12. Stirling PDF
`github.com/Stirling-Tools/Stirling-PDF`

**What it actually is:** Locally hosted Docker app. 60+ PDF operations via
REST API. OCR, text extraction, convert, split, merge. Swagger docs at
`/swagger-ui/index.html`. Zero outbound calls, all in-memory processing.

**Alfred layer:** Corpus ingestion pipeline — PDF → text before feeding to
`synthesis_loop.py` fact extraction.

**What this closes:** Alfred's corpus currently can't process PDF files.
Research papers, financial reports, technical documentation — all arrive as
PDFs. Stirling PDF converts them to extractable text before Alfred's
`_extract_facts()` pass runs on them.

**Note:** Alfred already has `read_pdf` in `tools.py` using `pdfplumber`.
Stirling PDF is for bulk/batch processing and OCR on scanned PDFs that
pdfplumber can't handle.

#### Files to Modify

**`tools.py`** — add Stirling PDF as an alternative for complex PDFs:
```python
STIRLING_PDF_URL = "http://localhost:8080"

def read_pdf_stirling(path: str, **kwargs) -> str:
    """
    Extract text from PDF via Stirling PDF API.
    Handles scanned PDFs (OCR) that pdfplumber cannot read.
    Falls back to pdfplumber if Stirling is unavailable.
    """
    import requests
    from pathlib import Path
    p = Path(path)
    if not p.exists():
        return f"File not found: {path}"
    try:
        with open(p, 'rb') as f:
            r = requests.post(
                f"{STIRLING_PDF_URL}/api/v1/misc/extract-text",
                files={"fileInput": f},
                timeout=60,
            )
        if r.status_code == 200:
            return r.json().get("text", "")[:10000]
        return f"Stirling error {r.status_code} — falling back to pdfplumber"
    except Exception:
        return read_pdf(path)  # pdfplumber fallback
```

Add `read_pdf_stirling` to `TOOLS` and register in `server.py`.

#### New Files to Create

**`corpus_processor.py`** — batch PDF processing pipeline:
```python
"""
Alfred — corpus_processor.py
Batch PDF → text pipeline via Stirling PDF.
Run this to process a folder of PDFs into Alfred's corpus.
"""
import requests
from pathlib import Path

STIRLING_URL = "http://localhost:8080"
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
                r = requests.post(
                    f"{STIRLING_URL}/api/v1/misc/extract-text",
                    files={"fileInput": f},
                    timeout=120
                )
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

#### Steps
1. `docker pull frooodle/s-pdf && docker run -d -p 8080:8080 frooodle/s-pdf`
   (Note: `8080` conflicts with llama-server. Use `8081:8080` if needed.)
2. Add `read_pdf_stirling` to `tools.py`
3. Create `corpus_processor.py`
4. Register in `server.py`
5. Add `process_corpus_pdfs` as a tool Alfred can call: `TOOLS["process_corpus_pdfs"] = lambda **_: str(process_pdf_batch())`

**Port conflict note:** llama-server runs on `:8080`. Run Stirling on `:8081`:
`docker run -d -p 8081:8080 frooodle/s-pdf` and set `STIRLING_PDF_URL = "http://localhost:8081"`.

**Why it upgrades Alfred:** Alfred's corpus is text-only right now. The majority
of research papers, financial reports, and technical documentation comes as PDF.
Stirling PDF is the OCR + extraction layer that makes those files usable. The
Researcher and Financier arm corpuses grow significantly once PDFs become
processable.

---

## ━━━ GROUP 6: SCHEDULING ━━━

---

### 13. ostafen/Kronos (Scheduler)
`github.com/ostafen/kronos`

**What it actually is:** Lightweight cron job scheduler with webhook notifications.
JSON DSL for job definitions, REST API for management, distributed execution,
proper cron expressions. Go binary — single executable, no runtime deps.

**Alfred layer:** `interrupt_bus.py` cron trigger source — Alfred gets
time-based interrupts from Kronos webhooks.

**What this closes:** Alfred's `synthesis_loop.py` uses `time.sleep()` and
a cadence dict. It works but is fragile — if the loop thread hangs, everything
stops silently. Kronos is an external scheduler that fires webhooks at Alfred
regardless of whether the synthesis loop is healthy. It also lets Alfred register
and remove scheduled tasks at runtime via REST, which the current hardcoded
cadence dict can't do.

#### Files to Modify

**`server.py`** — add webhook receiver endpoint:
```python
@app.post("/webhook/kronos")
async def kronos_webhook(body: dict):
    """Receives scheduled job triggers from ostafen/Kronos."""
    job_name = body.get("job_name", "")
    try:
        from interrupt_bus import push, HIGH, NORMAL
        priority = HIGH if "critical" in job_name else NORMAL
        push({
            "content": f"Scheduled trigger: {job_name}",
            "source": "kronos",
            "priority": priority,
            "job": job_name,
        })
        return {"ok": True}
    except Exception as e:
        return {"ok": False, "error": str(e)}
```

**`synthesis_loop.py`** — `start()` function registers Alfred's scheduled jobs
with Kronos on startup:
```python
def _register_kronos_jobs():
    """Register synthesis loop jobs with ostafen/Kronos on startup."""
    import requests, json

    KRONOS_URL = os.getenv("KRONOS_URL", "http://localhost:9175")

    jobs = [
        {"name": "alfred_hebbian_pass",   "cron": "0 */30 * * * *"},  # every 30min
        {"name": "alfred_finetune_check", "cron": "0 0 * * * *"},      # every hour
        {"name": "alfred_corpus_pass",    "cron": "0 0 */2 * * *"},    # every 2hr
    ]

    for job in jobs:
        try:
            requests.post(
                f"{KRONOS_URL}/jobs",
                json={
                    "name":    job["name"],
                    "cron":    job["cron"],
                    "webhook": f"http://127.0.0.1:{SERVER_PORT}/webhook/kronos",
                    "payload": {"job_name": job["name"]},
                },
                timeout=5,
            )
        except Exception:
            pass  # Kronos being down never blocks Alfred
```

#### Steps
1. Download `kronos` binary from `github.com/ostafen/kronos/releases`
2. `docker run -d -p 9175:9175 ghcr.io/ostafen/kronos` (or run binary directly)
3. Add `KRONOS_URL` to `.env`
4. Add `/webhook/kronos` endpoint to `server.py`
5. Add `_register_kronos_jobs()` to `synthesis_loop.start()`
6. (Optional) add Kronos to `alfred_watchdog.py` resurrection list

**Why it upgrades Alfred:** Alfred's scheduled work (Hebbian pass, corpus
extraction, fine-tune check) currently depends on a `while True: sleep(30)`
loop. If that thread dies or hangs, everything stops with no alerting. Kronos
is an independent process with its own health checks. It fires Alfred's webhooks
on schedule regardless of Alfred's internal state. Alfred becomes more resilient.

---

## ━━━ GROUP 7: COMMUNICATION ━━━

---

### 14. Slack SDK
`pip install slack-bolt`

**What it actually is:** Slack's official Python Bolt framework. Receive messages,
send messages, respond to events. Async support.

**Alfred layer:** Human-Alfred interface supplement — Alfred can push alerts to
Slack and receive commands from Slack when you're not at the desktop.

**What this closes:** Alfred's `interrupt_bus.py` can queue alerts but has no
outbound push channel. If Alfred is running and detects a critical CVE or a
major market move while Jay is away from the machine, the alert just sits in
`alfred_alerts.jsonl` until the next conversation. Slack gives Alfred the ability
to reach Jay asynchronously.

#### New Files to Create

**`alfred_slack.py`**:
```python
"""
Alfred — alfred_slack.py
Slack integration — Alfred's async communication channel.
Receives commands. Pushes critical alerts.
"""
import os
import asyncio
from typing import Optional

SLACK_BOT_TOKEN = os.getenv("SLACK_BOT_TOKEN", "")
SLACK_CHANNEL   = os.getenv("SLACK_CHANNEL", "#alfred")

def push_alert(message: str, urgency: str = "normal") -> bool:
    """Push an alert to Slack. Used by synthesis_loop for critical findings."""
    if not SLACK_BOT_TOKEN:
        return False
    try:
        from slack_sdk import WebClient
        client = WebClient(token=SLACK_BOT_TOKEN)
        prefix = ":red_circle: *CRITICAL*" if urgency == "critical" else \
                 ":orange_circle: *HIGH*"   if urgency == "high"     else ":white_circle:"
        client.chat_postMessage(
            channel=SLACK_CHANNEL,
            text=f"{prefix} {message}"
        )
        return True
    except Exception as e:
        print(f"[Slack] Push error: {e}")
        return False

def start_slack_listener():
    """Start Slack bot listener. Receives commands and routes to Alfred."""
    if not SLACK_BOT_TOKEN:
        return
    try:
        from slack_bolt.async_app import AsyncApp
        from slack_bolt.adapter.socket_mode.async_handler import AsyncSocketModeHandler
        import threading

        app = AsyncApp(token=SLACK_BOT_TOKEN)

        @app.message("alfred")
        async def handle_message(message, say):
            text = message.get("text", "")
            # Route to Alfred's chat function
            try:
                from alfred import chat
                response, _ = chat(text, [])
                await say(response[:3000])
            except Exception as e:
                await say(f"Error: {e}")

        def _run():
            asyncio.run(
                AsyncSocketModeHandler(app, os.getenv("SLACK_APP_TOKEN", "")).start_async()
            )

        threading.Thread(target=_run, daemon=True, name="SlackBot").start()
        print("[Slack] Bot listener started.")
    except Exception as e:
        print(f"[Slack] Bot start error: {e}")
```

#### Files to Modify

**`synthesis_loop.py`** — push critical alerts to Slack:
```python
def _queue_alert(message: str, urgency: str = "normal", source: str = ""):
    # ... existing jsonl write ...
    # Also push critical/high to Slack immediately
    if urgency in ("critical", "high"):
        try:
            from alfred_slack import push_alert
            push_alert(message, urgency)
        except Exception:
            pass
```

**`server.py`** — start Slack listener in `startup()`:
```python
try:
    from alfred_slack import start_slack_listener
    start_slack_listener()
except Exception as e:
    print(f"[Slack] Unavailable: {e}")
```

#### Steps
1. Create a Slack app at api.slack.com → get Bot Token and App Token
2. `pip install slack-bolt slack-sdk`
3. Add `SLACK_BOT_TOKEN`, `SLACK_APP_TOKEN`, `SLACK_CHANNEL` to `.env`
4. Create `alfred_slack.py`
5. Add Slack push to `_queue_alert()` in `synthesis_loop.py`
6. Add `start_slack_listener()` call to `server.py` startup

**Why it upgrades Alfred:** Alfred is autonomous but currently silent when you're
not in front of the machine. A critical CVE affecting your Django stack, a major
BTC price move, a security breach — all go unnoticed until the next conversation.
Slack push turns Alfred from a pull interface into a push interface. He reaches
you instead of waiting.

---

## ━━━ GROUP 8: MEDIA GENERATION ━━━

---

### 15. HyperFrames
`npm install -g hyperframes`

**What it actually is:** CLI tool: HTML/CSS/GSAP/Three.js → deterministic MP4 video.
Write a web page → render it as video. Agent-friendly.

**Alfred layer:** Output layer — Alfred generates video briefings from his
synthesis loop outputs and ORCA reports.

**What this closes:** Alfred's synthesis loop produces facts and alerts.
Currently those go to a text queue. HyperFrames lets Alfred produce a 30-second
video briefing of the daily market summary or security digest — a format
Jay can watch rather than read.

#### New Files to Create

**`alfred_video.py`**:
```python
"""
Alfred — alfred_video.py
HyperFrames video briefing generation.
Alfred writes HTML → HyperFrames renders MP4.
Requires: npm install -g hyperframes
"""
import subprocess
import tempfile
import os
from pathlib import Path

OUTPUT_DIR = Path("C:/Alfred/reports/video")

def generate_briefing_video(title: str, content: str, output_name: str = "briefing") -> str:
    """
    Generate a video briefing from Alfred's report content.
    Returns path to the generated MP4 or error string.
    """
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    output_path = OUTPUT_DIR / f"{output_name}.mp4"

    # Generate HTML template
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
                return str(output_path)
            return f"HyperFrames error: {result.stderr[:200]}"
        except FileNotFoundError:
            return "HyperFrames not installed. Run: npm install -g hyperframes"
        except Exception as e:
            return f"Video generation error: {e}"
```

#### Files to Modify

**`synthesis_loop.py`** — after a high-salience synthesis pass, optionally
generate a video briefing. Gate this on a daily cadence:
```python
_FEED_CADENCES["daily_video_briefing"] = 86400  # once per day

def _generate_daily_briefing():
    """Generate daily video briefing from recent high-salience facts."""
    try:
        from alfred_video import generate_briefing_video
        from memory import search
        facts = search("market security crypto alfred daily summary", n=10)
        if facts:
            path = generate_briefing_video("Alfred Daily Briefing", facts, "daily")
            print(f"[Synthesis] Daily briefing generated: {path}")
    except Exception as e:
        print(f"[Synthesis] Briefing error: {e}")
```

**`tools.py`** — expose as a tool:
```python
from alfred_video import generate_briefing_video
TOOLS["generate_video_briefing"] = lambda title="Alfred Report", content="", **_: generate_briefing_video(title, content)
```

#### Steps
1. `npm install -g hyperframes`
2. Create `alfred_video.py`
3. Add `_generate_daily_briefing` to `synthesis_loop.py`
4. Add `generate_video_briefing` to `tools.py` and `server.py`

---

## ━━━ WHAT TO SKIP OR DEFER ━━━

**Langflow** — Dify covers the same ground with better production characteristics.
Run Dify, not both. If you want visual workflow prototyping, Langflow is P3 after
everything else is running.

**Maxun** — Covers the same ground as Crawl4AI + ScrapeGraphAI with more setup
overhead. Use those two first. Add Maxun only if you need robot automation for
specific sites Alfred visits repeatedly on a schedule.

**Open-Generative-AI / Media generation** — Useful eventually, P4 after the
intelligence and infrastructure layers are solid. Alfred generating images and
video is a nice-to-have. Alfred forecasting price, detecting threats, and
learning from documents is the core.

**Claude-SEO** — Alfred is not an SEO tool. The audit scripts may occasionally
be useful as STELLA-created tools if Jay asks. Not worth a dedicated integration.

**KAOS / spyrae/kronos-agent-os** — Extract the scheduler patterns and analytics
plugin concept only. Don't deploy it. ostafen/Kronos covers the scheduling need
with a fraction of the complexity.

---

## ━━━ PRIORITY ORDER ━━━

| Priority | Integration | Effort | Closes |
|---|---|---|---|
| P0 | **Stirling PDF** | 1hr — just Docker | Corpus PDF ingestion |
| P0 | **Crawl4AI** | 30min — `pip install` + 50 lines | Corpus URL crawling |
| P0 | **Supabase** | 2hrs — Docker + schema + dual-write | Structured storage, real queries on concerns/principles |
| P1 | **Browser Use** | 1hr | Alfred can browse the web for real |
| P1 | **CamoFox** | 1hr — Docker + alfred_browser.py | Stealth access + YouTube transcripts |
| P1 | **Fincept data fetchers** | 2hrs — extract scripts | Macroeconomic data for Financier arm |
| P1 | **Slack** | 1hr | Alfred pushes critical alerts asynchronously |
| P2 | **ostafen/Kronos** | 1hr | Resilient external scheduling |
| P2 | **Dify** | 2hrs | External RAG for large document collections |
| P2 | **ScrapeGraphAI** | 30min | Structured data extraction |
| P2 | **Supadata** | 30min | YouTube transcript corpus |
| P3 | **OpenHands** | 3hrs | Autonomous coding arm |
| P3 | **Kronos finance model** | 4hrs | Quantitative price forecasting |
| P3 | **Coolify** | 2hrs | Infrastructure management |
| P3 | **HyperFrames** | 1hr | Video briefings |

---

## ━━━ FILES SUMMARY ━━━

### Files to Modify (existing)

| File | What Changes |
|---|---|
| `finance_tools.py` | Add Fincept fetchers, Kronos predict tool |
| `orca.py` | Extend arm world_feeds and tool_affinity lists |
| `osiris_tools.py` | Add `osint_browse`, `osint_browse_stealth`, `osint_youtube_transcript` |
| `research_tools.py` | Add `research_youtube_transcript`, `research_dify` |
| `synthesis_loop.py` | Add crawl4ai pass, Slack push in `_queue_alert`, Kronos job registration, daily video briefing cadence |
| `concern_register.py` | Add Supabase dual-write |
| `principle_engine.py` | Add Supabase logging |
| `agent.py` | Add OpenHands routing for complex coding tasks |
| `tools.py` | Register all new tools |
| `server.py` | Register all new tools at startup, add webhook endpoints, start Slack listener |
| `alfred_watchdog.py` | Add Coolify service health checks |

### New Files to Create

| File | Purpose |
|---|---|
| `alfred_browser.py` | Browser Use + CamoFox wrapper — Alfred's browsing capability |
| `alfred_db.py` | Supabase client — structured relational storage layer |
| `alfred_slack.py` | Slack push alerts + bot listener |
| `alfred_video.py` | HyperFrames video briefing generation |
| `fincept_bridge.py` | Fincept Terminal Python scripts wrapper |
| `kronos_client.py` | Kronos finance model inference client |
| `openhands_client.py` | OpenHands autonomous coding API client |
| `dify_client.py` | Dify RAG query client |
| `corpus_processor.py` | Batch PDF → text pipeline via Stirling PDF |

### Environment Variables to Add (`.env`)

```
SUPADATA_API_KEY=
SUPABASE_URL=http://localhost:8000
SUPABASE_ANON_KEY=
COOLIFY_URL=http://localhost:8000
COOLIFY_TOKEN=
KRONOS_URL=http://localhost:9175
SLACK_BOT_TOKEN=
SLACK_APP_TOKEN=
SLACK_CHANNEL=#alfred
DIFY_URL=http://localhost:80
DIFY_API_KEY=
OPENHANDS_URL=http://localhost:3000
CAMOFOX_URL=http://localhost:9377
STIRLING_PDF_URL=http://localhost:8081
```
