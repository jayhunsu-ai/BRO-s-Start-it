#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::Serialize;
use sysinfo::{System, Disks};
use std::sync::Mutex;
use std::process::{Child, Command};
use std::path::PathBuf;
use std::time::{Duration, Instant};
use tauri::{State, Manager};
#[cfg(windows)]
use std::os::windows::process::CommandExt;

// ── Windows flag: no console window ──────────────────────────────────────────
#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x08000000;

// ── Hard-coded paths (match your machine) ────────────────────────────────────
// Model config below follows ALFRED — Qwen3.6-35B-A3B Deployment Runbook v1.0
// (11 Sept 2026): RTX 2070 8GB VRAM + 24GB system RAM, first-benchmark baseline.
const VENV_PYTHON:   &str = r"C:\Users\DELL\Desktop\Alfred\venv\Scripts\python.exe";
const ALFRED_DIR:    &str = r"C:\Users\DELL\Desktop\Alfred";
const GGUF_PATH:     &str = r"E:\Alfred\models\Qwen3.6-35B-A3B\Qwen3.6-35B-A3B-UD-Q4_K_XL.gguf";
const LLAMA_SERVER:  &str = r"C:\Users\DELL\Desktop\Alfred\llama.cpp\build\bin\llama-server.exe";

// llama-server launch parameters
const LLAMA_HOST:    &str = "127.0.0.1";
const LLAMA_PORT:    &str = "8080";
const LLAMA_CTX:     &str = "262144"; // 256K — this is Qwen3.6-35B-A3B's confirmed NATIVE max
                                       // (not extended/YaRN), so no rope-scaling flags needed. Cheaper
                                       // than it looks: only 10 of the model's 40 layers use standard
                                       // (quadratic-growth) attention — the other 30 are GatedDeltaNet
                                       // linear-attention layers with a constant-size state that doesn't
                                       // grow with context. If llama-server OOMs or the watchdog loops,
                                       // drop this back to "65536" first and confirm stability before
                                       // stepping back up.
const LLAMA_GPU:     &str = "99";     // Every layer's *non-expert* tensors (attention, norms,
                                       // embed/output) plus the KV cache — always fully on GPU
                                       // regardless of the MoE split below. Safe to leave high.
const LLAMA_N_CPU_MOE: &str = "36";   // Out of 40 total layers: 36 layers' MoE expert blocks forced
                                       // to CPU/RAM, leaving 4 layers' worth on GPU. This is a STARTING
                                       // GUESS, not a measured value — llama-server prints per-tensor
                                       // VRAM usage at startup, so watch that log and raise this number
                                       // (fewer layers on GPU) if it OOMs, or lower it (more layers on
                                       // GPU, if there's headroom left after the 256K KV cache) if you
                                       // want to try squeezing more onto the card. All 256 experts in a
                                       // layer are one fused tensor in the GGUF — there's no way to pin
                                       // individual "hot" experts, only whole layers.

// ── Types ─────────────────────────────────────────────────────────────────────

#[derive(Serialize, Clone)]
pub struct SystemStats {
    pub cpu:  f32,
    pub ram:  f32,
    pub disk: f32,
}

pub struct AppState {
    sys: Mutex<System>,
}

/// Holds both child processes so we can kill them on window close.
/// llama is Arc so the watchdog thread can share ownership.
pub struct BackendProcesses {
    llama:   std::sync::Arc<Mutex<Option<Child>>>,
    uvicorn: Mutex<Option<Child>>,
}

// ── Commands ──────────────────────────────────────────────────────────────────

#[tauri::command]
fn get_system_stats(state: State<AppState>) -> SystemStats {
    let mut sys = state.sys.lock().unwrap();
    sys.refresh_cpu_usage();
    sys.refresh_memory();

    let cpu_avg = {
        let cpus = sys.cpus();
        if cpus.is_empty() { 0.0 }
        else { cpus.iter().map(|c| c.cpu_usage()).sum::<f32>() / cpus.len() as f32 }
    };

    let total_mem = sys.total_memory() as f32;
    let used_mem  = sys.used_memory()  as f32;
    let ram_pct   = if total_mem > 0.0 { (used_mem / total_mem) * 100.0 } else { 0.0 };

    let disks    = Disks::new_with_refreshed_list();
    let disk_pct = disks.iter().next().map(|d| {
        let total     = d.total_space()     as f32;
        let available = d.available_space() as f32;
        if total > 0.0 { ((total - available) / total) * 100.0 } else { 0.0 }
    }).unwrap_or(0.0);

    SystemStats {
        cpu:  (cpu_avg * 10.0).round() / 10.0,
        ram:  (ram_pct  * 10.0).round() / 10.0,
        disk: (disk_pct * 10.0).round() / 10.0,
    }
}

// ── Port helpers ──────────────────────────────────────────────────────────────

fn port_in_use(port: u16) -> bool {
    std::net::TcpListener::bind(("127.0.0.1", port)).is_err()
}

/// Block until the given port is open (process is accepting connections)
/// or the timeout expires. Returns true if ready, false if timed out.
fn wait_for_port(port: u16, timeout: Duration) -> bool {
    let start = Instant::now();
    while start.elapsed() < timeout {
        if port_in_use(port) {
            return true;
        }
        std::thread::sleep(Duration::from_millis(300));
    }
    false
}

/// Poll llama-server's `/health` endpoint until it reports ready (HTTP 200),
/// or the timeout expires.
///
/// This exists because `wait_for_port` can't tell you what you actually need
/// to know: llama.cpp opens its listening socket almost immediately on
/// startup, but keeps returning HTTP 503 ("Loading model") on every route —
/// including the ones uvicorn's model_manager calls — until the GGUF is
/// fully loaded. On this rig (Qwen3.6-35B-A3B, --cpu-moe, 8GB VRAM) that load
/// can take minutes, not seconds. Checking the port alone gives a false
/// "ready" the instant the process starts listening, well before it can
/// actually serve a request — which is exactly the 503 storm in the logs.
fn wait_for_llama_ready(host: &str, port: u16, timeout: Duration) -> bool {
    use std::io::{Read, Write};
    use std::net::TcpStream;

    let start = Instant::now();
    let addr = format!("{host}:{port}");

    while start.elapsed() < timeout {
        if let Ok(mut stream) = TcpStream::connect(&addr) {
            stream.set_read_timeout(Some(Duration::from_secs(2))).ok();
            stream.set_write_timeout(Some(Duration::from_secs(2))).ok();

            let request =
                format!("GET /health HTTP/1.1\r\nHost: {host}\r\nConnection: close\r\n\r\n");

            if stream.write_all(request.as_bytes()).is_ok() {
                let mut buf = String::new();
                if stream.read_to_string(&mut buf).is_ok() {
                    // Status line looks like "HTTP/1.1 200 OK" once the model
                    // is loaded; it's a 503 with a JSON "Loading model" body
                    // before that.
                    if let Some(status_line) = buf.lines().next() {
                        if status_line.contains(" 200 ") {
                            return true;
                        }
                    }
                }
            }
        }
        std::thread::sleep(Duration::from_secs(1));
    }
    false
}

// ── Kill any process already using a port ────────────────────────────────────

#[cfg(windows)]
fn kill_port(port: u16) {
    let _ = Command::new("cmd")
        .args(["/C", &format!(
            "FOR /F \"tokens=5\" %p IN ('netstat -ano ^| findstr :{port}') DO taskkill /F /PID %p"
        )])
        .creation_flags(CREATE_NO_WINDOW)
        .output();
    // Give the OS time to fully release the port before we try to bind it
    std::thread::sleep(Duration::from_millis(1500));
}

#[cfg(not(windows))]
fn kill_port(port: u16) {
    // fuser -k <port>/tcp on Linux; lsof + kill on macOS
    #[cfg(target_os = "linux")]
    let _ = Command::new("fuser").args(["-k", &format!("{}/tcp", port)]).output();
    #[cfg(target_os = "macos")]
    {
        if let Ok(out) = Command::new("lsof")
            .args(["-ti", &format!("tcp:{}", port)])
            .output()
        {
            let pid = String::from_utf8_lossy(&out.stdout).trim().to_string();
            if !pid.is_empty() {
                let _ = Command::new("kill").args(["-9", &pid]).output();
            }
        }
    }
    std::thread::sleep(Duration::from_millis(1500));
}

// ── 1. Start llama-server ─────────────────────────────────────────────────────

fn start_llama_server() -> Option<Child> {
    if port_in_use(LLAMA_PORT.parse().unwrap_or(8080)) {
        println!("[llama-server] Port {} already in use — assuming already running", LLAMA_PORT);
        return None;
    }

    let exe = PathBuf::from(LLAMA_SERVER);
    if !exe.exists() {
        eprintln!(
            "[llama-server] Not found at {LLAMA_SERVER}\n\
             Download llama.cpp from https://github.com/ggerganov/llama.cpp/releases\n\
             and extract llama-server.exe alongside this binary."
        );
        return None;
    }

    let gguf = PathBuf::from(GGUF_PATH);
    if !gguf.exists() {
        eprintln!(
            "[llama-server] GGUF not found at {GGUF_PATH}\n\
             Expected the UD-Q4_K_XL file on E:\\Alfred\\models\\Qwen3.6-35B-A3B\\.\n\
             If E: is spinning storage rather than an SSD, the runbook flags that as an\n\
             archive/storage tier, not an active-inference tier — expect slow load times."
        );
        return None;
    }

    println!("[llama-server] Starting on port {LLAMA_PORT}…");

    // ── Placement / offload strategy for Qwen3.6-35B-A3B (sparse MoE, 40 layers,
    // 256 experts/layer, ~35B total / ~3B active params per token) on an 8GB
    // RTX 2070 + 24GB system RAM ─────────────────────────────────────────────
    //
    // --n-cpu-moe 36 (of 40) : forces 36 of the 40 layers' MoE expert blocks into
    //                        system RAM, leaving 4 layers' worth on GPU as
    //                        headroom allows — "most on CPU, a little on GPU"
    //                        rather than the old blanket --cpu-moe (all 40).
    //                        This is a STARTING GUESS (see LLAMA_N_CPU_MOE
    //                        above) — llama-server logs per-tensor VRAM usage
    //                        at startup; raise the number if it OOMs, lower it
    //                        if there's headroom left after the 256K KV cache.
    //
    //                        Important nuance: every one of the 40 layers runs
    //                        on EVERY token — there's no such thing as a layer
    //                        that fires less often. What's sparse is which 8-of-
    //                        256 experts activate *within* a layer, chosen fresh
    //                        by the router each token — and all 256 experts in
    //                        a layer are one fused tensor in the GGUF, so there's
    //                        no way to pin specific "hot" experts, only whole
    //                        layers. Any layer left on CPU pays RAM-bandwidth
    //                        cost every token regardless of which 8 experts got
    //                        picked; any layer moved to GPU gets full VRAM
    //                        bandwidth for its expert lookups every token.
    //
    // --n-gpu-layers 99    : independent of the MoE split above — pushes every
    //                        layer's non-expert tensors (attention, norms,
    //                        embedding/output head) plus the KV cache onto the
    //                        GPU. This is the "always resident" compute path
    //                        plus the KV cache, and it's what you always want
    //                        on VRAM regardless of how the MoE split above is
    //                        tuned.
    //
    // --jinja              : use the GGUF's embedded chat template rather than a
    //                        built-in llama.cpp fallback — needed for correct
    //                        <think>...</think> parsing and any per-request
    //                        chat_template_kwargs overrides.
    //
    // --reasoning-format deepseek
    //                      : Qwen3.6-35B-A3B ships with thinking mode ON by default
    //                        (unlike the small Qwen3.5 dense models, which needed an
    //                        explicit enable_thinking override — dropped here since
    //                        it's no longer needed). "deepseek" is llama.cpp's format
    //                        for splitting <think> blocks into a separate
    //                        reasoning_content field; it's the documented-correct
    //                        choice for Qwen3's think-tag style. The old "--reasoning
    //                        on" flag from the 9B config isn't a real llama.cpp
    //                        server flag — likely vestigial/silently ignored.
    //
    // --flash-attn on      : required for correct/fast attention on Qwen's sliding-
    //                        window attention layers.
    //
    // --cache-reuse 256    : minimum similarity score for KV cache hits — cuts prompt
    //                        reprocessing on repeated prefixes (system prompt, brain).
    //
    // --cache-type-k q8_0  : runbook section 7 — q8_0 is the explicit first-benchmark
    // --cache-type-v q8_0    KV quantization for this model (replaces bf16, which was
    //                        tuned for the old 9B config). Only drop precision further
    //                        after this baseline is confirmed stable. Worth watching
    //                        closely at 256K context — this is the first time this
    //                        quant has been tested at anywhere near this context size.
    //
    // NOTE: the old config also hard-set --no-kv-offload. That flag actually *disables*
    // KV-cache offload to GPU (forces it into system RAM) — the opposite of what its
    // old comment claimed, and the opposite of what we want now that the KV cache is
    // supposed to live on the GPU alongside the always-active tensors. It's dropped
    // entirely here so the default (offload KV to GPU when GPU layers are present)
    // applies.
    //
    // Sampling — Qwen3.6-35B-A3B official thinking-mode, general-task recommendation
    // (Qwen/Qwen3.6-35B-A3B model card, current as of this write-up): temp=1.0,
    // top_p=0.95, top_k=20, min_p=0.0, presence_penalty=1.5, repetition_penalty=1.0.
    // This replaces the old 9B-tuned values (temp 0.6 + mirostat 2), which were a
    // workaround for a different, smaller model's looping tendencies. presence_penalty
    // is this model's own anti-repetition mechanism per its card, so mirostat and a
    // non-1.0 repeat_penalty are dropped rather than stacked on top of it.

    let common_args: Vec<&str> = vec![
        "-m",                    GGUF_PATH,
        "--host",                LLAMA_HOST,
        "--port",                LLAMA_PORT,
        "-c",                    LLAMA_CTX,
        "--parallel",            "1",
        "--n-gpu-layers",        LLAMA_GPU,
        "--n-cpu-moe",           LLAMA_N_CPU_MOE,
        "--fit",                 "off",
        "-b",                    "512",
        "-ub",                   "512",
        "--jinja",
        "--reasoning-format",    "deepseek",
        "--flash-attn",          "on",
        "--cache-reuse",         "256",
        "--cache-type-k",        "q8_0",
        "--cache-type-v",        "q8_0",
        "--temp",                "1.0",
        "--top-k",               "20",
        "--top-p",               "0.95",
        "--min-p",               "0.0",
        // "--presence-penalty",    "1.5",
        "--repeat-penalty",      "1.0",
    ];

    // Pipe stdout + stderr so all llama-server logs appear in the Tauri console.
    #[cfg(windows)]
    let result = Command::new(&exe)
        .args(&common_args)
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .creation_flags(CREATE_NO_WINDOW)
        .spawn();

    #[cfg(not(windows))]
    let result = Command::new(&exe)
        .args(&common_args)
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn();

    match result {
        Ok(mut child) => {
            let pid = child.id();
            println!("[llama-server] Started (pid {})", pid);

            // Pipe stdout — categorize into perf / memory / general signal lines.
            // Exact wording can drift slightly between llama-server builds — if
            // something clearly relevant isn't showing up, widen the match lists
            // below rather than assuming it's not being printed at all.
            if let Some(stdout) = child.stdout.take() {
                std::thread::spawn(move || {
                    use std::io::{BufRead, BufReader};
                    for line in BufReader::new(stdout).lines().flatten() {
                        let l = line.to_lowercase();

                        // Perf: prompt/generation speed — the whole point of the
                        // current A/B test. Previously swallowed entirely.
                        if l.contains("tokens per second")
                            || l.contains("tok/s")
                            || l.contains("t/s")
                            || l.contains("eval time")
                            || l.contains("prompt eval")
                            || l.contains("ms per token")
                            || l.contains("ms/token")
                        {
                            println!("[llama/perf] {}", line);
                            continue;
                        }

                        // Memory: per-tensor VRAM/RAM buffer allocations at load
                        // time. This is how you confirm LLAMA_N_CPU_MOE actually
                        // landed where expected, and the first place an OOM shows
                        // up before it crashes the process.
                        if l.contains("buffer size")
                            || l.contains("kv_cache")
                            || l.contains("kv cache")
                            || l.contains("cuda0")
                            || l.contains("cuda_host")
                            || l.contains("vram")
                            || l.contains(" mib")
                            || l.contains(" gib")
                            || l.contains("ctx_size")
                            || l.contains("n_ctx")
                            || l.contains("cpu_moe")
                            || l.contains("n_cpu_moe")
                        {
                            println!("[llama/mem] {}", line);
                            continue;
                        }

                        // General lifecycle/status signal lines.
                        if l.contains("error")
                            || l.contains("warning")
                            || l.contains("listening")
                            || l.contains("ready")
                            || l.contains("failed")
                            || l.contains("loaded")
                            || l.contains("slot")
                        {
                            println!("[llama] {}", line);
                        }
                        // Everything else (raw HTTP access logs, etc.) still
                        // swallowed on purpose.
                    }
                });
            }

            // Pipe stderr — errors and warnings only
            if let Some(stderr) = child.stderr.take() {
                std::thread::spawn(move || {
                    use std::io::{BufRead, BufReader};
                    for line in BufReader::new(stderr).lines().flatten() {
                        let l = line.to_lowercase();
                        if l.contains("error")
                            || l.contains("warning")
                            || l.contains("failed")
                            || l.contains("assert")
                            || l.contains("panic")
                        {
                            eprintln!("[llama/err] {}", line);
                        }
                    }
                });
            }

            // Port-open just means the process is listening — it does NOT mean
            // the model is loaded. llama.cpp answers 503 "Loading model" on
            // every route until the GGUF is fully in memory, so wait on
            // /health instead. 5 minutes because a 35B GGUF on an 8GB card
            // with --cpu-moe genuinely takes a while to load into system RAM.
            if wait_for_llama_ready(LLAMA_HOST, LLAMA_PORT.parse().unwrap_or(8080), Duration::from_secs(300)) {
                println!("[llama-server] Model loaded — ready on port {LLAMA_PORT} ✓");
            } else {
                eprintln!("[llama-server] Model still not ready after 5 min — continuing anyway (expect 503s downstream until it finishes loading)");
            }
            Some(child)
        }
        Err(e) => {
            eprintln!("[llama-server] Failed to start: {e}");
            None
        }
    }
}

// ── 2. Start uvicorn (Alfred backend) ────────────────────────────────────────

fn start_uvicorn() -> Option<Child> {
    if port_in_use(8000) {
        println!("[uvicorn] Port 8000 already in use — skipping launch");
        return None;
    }

    let python = PathBuf::from(VENV_PYTHON);
    if !python.exists() {
        eprintln!(
            "[uvicorn] Python not found at {VENV_PYTHON}\n\
             Expected venv at C:\\Users\\DELL\\Desktop\\Alfred\\venv\\"
        );
        return None;
    }

    println!("[uvicorn] Starting Alfred backend on port 8000…");

    // Pipe stdout + stderr so all Python/uvicorn/server.py logs appear in
    // the Tauri console — tool registration, weight init, ORCA startup, etc.
    // -u  = force unbuffered stdout/stderr. Python switches to 4-8 KB block
    // buffering when no console is attached (CREATE_NO_WINDOW). Every print()
    // sits in that buffer forever — nothing writes to disk, no logs visible.
    // PYTHONUNBUFFERED=1 is belt-and-suspenders: covers threads + subprocesses
    // that bypass the interpreter flag.
    #[cfg(windows)]
    let result = Command::new(&python)
        .args(["-u", "-m", "uvicorn", "server:app", "--host", "127.0.0.1", "--port", "8000"])
        .env("PYTHONUNBUFFERED", "1")
        .current_dir(ALFRED_DIR)
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .creation_flags(CREATE_NO_WINDOW)
        .spawn();

    #[cfg(not(windows))]
    let result = Command::new(&python)
        .args(["-u", "-m", "uvicorn", "server:app", "--host", "127.0.0.1", "--port", "8000"])
        .env("PYTHONUNBUFFERED", "1")
        .current_dir(ALFRED_DIR)
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn();

    match result {
        Ok(mut child) => {
            let pid = child.id();
            println!("[uvicorn] Started (pid {})", pid);

            // Pipe stdout — Python logs come through with their own prefixes
            // ([Synthesis], [Trickle], [Weights], [ORCA], etc.) — don't wrap them.
            // Only add [uvicorn] prefix to uvicorn's own startup/access lines.
            if let Some(stdout) = child.stdout.take() {
                std::thread::spawn(move || {
                    use std::io::{BufRead, BufReader};
                    for line in BufReader::new(stdout).lines().flatten() {
                        // Alfred's subsystems already tag themselves — print as-is
                        if line.starts_with('[') {
                            println!("{}", line);
                        } else {
                            // uvicorn's own lines (startup, access log, etc.)
                            println!("[uvicorn] {}", line);
                        }
                    }
                });
            }

            // Pipe stderr — Python tracebacks, uvicorn warnings
            if let Some(stderr) = child.stderr.take() {
                std::thread::spawn(move || {
                    use std::io::{BufRead, BufReader};
                    for line in BufReader::new(stderr).lines().flatten() {
                        if line.starts_with('[') {
                            eprintln!("{}", line);
                        } else {
                            eprintln!("[uvicorn/err] {}", line);
                        }
                    }
                });
            }

            if wait_for_port(8000, Duration::from_secs(60)) {
                println!("[uvicorn] Ready on port 8000");
            } else {
                eprintln!("[uvicorn] Did not become ready in 60s — continuing anyway");
            }
            Some(child)
        }
        Err(e) => {
            eprintln!("[uvicorn] Failed to start: {e}");
            None
        }
    }
}

// ── Watchdog ──────────────────────────────────────────────────────────────────
// Polls llama-server every 15 s. If the port goes dark, restarts it.
// Runs as a detached daemon thread — lives for the entire process lifetime.
// Why Windows kills llama-server:
//   1. Windows memory manager OOM-kills processes when RAM pressure is high.
//      llama.cpp with a large GGUF sits at ~6-8 GB — prime OOM target.
//   2. Windows Defender / antivirus occasionally quarantines .exe files that
//      "appeared" after a build. Can happen silently with no notification.
//   3. llama-server crashes itself on a bad request (GGUF assert, GPU OOM).
//      Without a watchdog the crash is permanent until you reopen the app.
//   4. If Tauri's window loses focus for hours, Windows can throttle or
//      suspend background processes on battery/balanced power plans.
// The watchdog covers all four cases — any death triggers a restart.

fn start_watchdog(processes: std::sync::Arc<std::sync::Mutex<Option<std::process::Child>>>) {
    std::thread::spawn(move || {
        // Give the initial startup time to settle before we start polling.
        std::thread::sleep(Duration::from_secs(30));

        loop {
            std::thread::sleep(Duration::from_secs(15));

            let port: u16 = LLAMA_PORT.parse().unwrap_or(8080);
            if port_in_use(port) {
                // Still alive — nothing to do.
                continue;
            }

            // Port is dark — llama-server is gone.
            println!("[Watchdog] llama-server on port {port} is down — restarting…");

            // Clean up any zombie handle.
            {
                let mut guard = processes.lock().unwrap();
                if let Some(mut child) = guard.take() {
                    let _ = child.kill();
                    let _ = child.wait();
                }
            }

            // Brief pause so the OS can fully release the port.
            std::thread::sleep(Duration::from_secs(2));

            // Restart.
            let new_child = start_llama_server();
            if new_child.is_some() {
                println!("[Watchdog] llama-server restarted successfully ✓");
            } else {
                println!("[Watchdog] llama-server restart failed — will retry in 15 s");
            }

            let mut guard = processes.lock().unwrap();
            *guard = new_child;
        }
    });
}

// ── Entry point ───────────────────────────────────────────────────────────────

fn main() {
    let sys = System::new_all();

    tauri::Builder::default()
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_fs::init())
        .manage(AppState { sys: Mutex::new(sys) })
        .manage(BackendProcesses {
            llama:   std::sync::Arc::new(Mutex::new(None)),
            uvicorn: Mutex::new(None),
        })

        .setup(|app| {
            let state = app.state::<BackendProcesses>();

            println!("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
            println!("[Alfred] Initialising services…");
            println!("  GGUF      : {GGUF_PATH}");
            println!("  llama.cpp : {LLAMA_SERVER}");
            println!("  Python    : {VENV_PYTHON}");
            println!("  Backend   : {ALFRED_DIR}");
            println!("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

            // Step 1: evict anything squatting on our ports
            if port_in_use(8080) {
                println!("[Alfred] Port 8080 in use — evicting…");
                kill_port(8080);
            }
            if port_in_use(8000) {
                println!("[Alfred] Port 8000 in use — evicting…");
                kill_port(8000);
            }

            // Step 2: llama-server first — uvicorn's model_manager talks to it on startup
            println!(
    "[Alfred] Step 1/2 — llama-server (ctx={LLAMA_CTX}, n-gpu-layers={LLAMA_GPU}, n-cpu-moe={LLAMA_N_CPU_MOE}/40, batch=512, ubatch=512)");
            let llama_child = start_llama_server();
            let llama_ok = llama_child.is_some() || port_in_use(LLAMA_PORT.parse().unwrap_or(8080));
            *state.llama.lock().unwrap() = llama_child;
            println!("[Alfred] llama-server: {}", if llama_ok { "RUNNING ✓" } else { "FAILED ✗" });

            // Start watchdog — monitors llama-server and auto-restarts on crash/OOM/kill
            start_watchdog(std::sync::Arc::clone(&state.llama));
            println!("[Alfred] Watchdog started — llama-server will auto-restart if killed ✓");

            // Step 3: Alfred Python backend
            println!("[Alfred] Step 2/2 — uvicorn / server.py");
            let uvicorn_child = start_uvicorn();
            let uvicorn_ok = uvicorn_child.is_some() || port_in_use(8000);
            *state.uvicorn.lock().unwrap() = uvicorn_child;
            println!("[Alfred] uvicorn:       {}", if uvicorn_ok { "RUNNING ✓" } else { "FAILED ✗" });

            println!("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
            println!("[Alfred] Services live:");
            println!("  llama-server → http://{LLAMA_HOST}:{LLAMA_PORT}");
            println!("  Alfred API   → http://127.0.0.1:8000");
            println!("  WebSocket    → ws://127.0.0.1:8000/ws");
            println!("  Health       → http://127.0.0.1:8000/health");
            println!("  Status       → http://127.0.0.1:8000/status");
            println!("  Weights      → http://127.0.0.1:8000/weights/status");
            println!("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
            println!("[Alfred] All logs from both services stream below.");
            println!("[Alfred] Mind active. Always becoming.");

            Ok(())
        })

        .on_window_event(|window, event| {
            if let tauri::WindowEvent::Destroyed = event {
                let state = window.state::<BackendProcesses>();

                // Take ownership of each child before the MutexGuard drops.
                // Binding the guard to a named variable lets the borrow checker
                // see that it is dropped at the end of the inner block, before
                // `state` itself is released.
                let uvicorn = { state.uvicorn.lock().unwrap().take() };
                let llama   = { state.llama.lock().unwrap().take() };

                if let Some(mut child) = uvicorn {
                    println!("[Alfred] Shutting down uvicorn (pid {})…", child.id());
                    let _ = child.kill();
                    let _ = child.wait();
                }

                if let Some(mut child) = llama {
                    println!("[Alfred] Shutting down llama-server (pid {})…", child.id());
                    let _ = child.kill();
                    let _ = child.wait();
                }
            }
        })

        .invoke_handler(tauri::generate_handler![get_system_stats])
        .run(tauri::generate_context!())
        .expect("error while running Alfred");
}
