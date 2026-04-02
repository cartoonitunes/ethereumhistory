#!/usr/bin/env python3
"""
decompile-bytecode-2018.py

Phase 2b (parallel with Etherscan enrichment):
Runs Palkeoramix (panoramix) decompiler on all canonical contracts.
Uses subprocess-per-contract for true parallelism + proper timeout isolation.

INSTALL:
  python3.11 -m venv /Users/claw/.openclaw/tools/panoramix-env
  /Users/claw/.openclaw/tools/panoramix-env/bin/pip install panoramix-decompiler

T7 INPUT:  memory/eth-2018-discovery/<shard>/contracts_canonical.jsonl
T7 OUTPUT: memory/eth-2018-discovery/<shard>/decompiled/
             results.jsonl      — one row per contract with decompiled text
             errors.jsonl       — failed/timed-out contracts
             progress.json      — checkpoint

USAGE:
  /Users/claw/.openclaw/tools/panoramix-env/bin/python3 scripts/decompile-bytecode-2018.py \
    --shard-dir rarible-full --workers 8 --timeout 30
"""

import os
import sys
import json
import time
import subprocess
import argparse
import threading
from pathlib import Path
from datetime import datetime, timezone
from concurrent.futures import ThreadPoolExecutor, as_completed

# ============================================================
# ARGS
# ============================================================

parser = argparse.ArgumentParser()
parser.add_argument("--shard-dir", default="rarible-full")
parser.add_argument("--dry-run", action="store_true")
parser.add_argument("--limit", type=int, default=None)
parser.add_argument("--workers", type=int, default=8)
parser.add_argument("--timeout", type=int, default=30, help="Max seconds per contract")
parser.add_argument("--min-bytes", type=int, default=10)
parser.add_argument("--max-siblings", type=int, default=1000)
args = parser.parse_args()

PYTHON  = str(Path(sys.executable))  # use same venv python
SCRIPT_DIR = Path(__file__).parent

# ============================================================
# PATHS — all T7, nothing in /tmp
# ============================================================

T7_BASE    = Path.home() / ".openclaw/workspace/memory/eth-2018-discovery"
T7_DIR     = T7_BASE / args.shard_dir
DECOMP_DIR = T7_DIR / "decompiled"
DECOMP_DIR.mkdir(parents=True, exist_ok=True)

CANONICAL_FILE = T7_DIR / "contracts_canonical.jsonl"
RESULTS_FILE   = DECOMP_DIR / "results.jsonl"
ERRORS_FILE    = DECOMP_DIR / "errors.jsonl"
PROGRESS_FILE  = DECOMP_DIR / "progress.json"
LOG_FILE       = T7_BASE / "logs" / "eh-decompile.log"
LOG_FILE.parent.mkdir(parents=True, exist_ok=True)

# ============================================================
# LOGGING
# ============================================================

log_lock = threading.Lock()

def log(msg: str):
    ts = datetime.now(timezone.utc).strftime("%H:%M:%S")
    line = f"[{ts}] {msg}"
    print(line, flush=True)
    with log_lock:
        with open(LOG_FILE, "a") as f:
            f.write(line + "\n")

# ============================================================
# DECOMPILE via subprocess (isolates SIGALRM + memory)
# ============================================================

# Inline Python script that panoramix runs as a subprocess
DECOMPILE_WORKER = """
import sys, re, json
sys.path.insert(0, '')
from panoramix.decompiler import decompile_bytecode
bytecode = sys.argv[1]
result = decompile_bytecode(bytecode)
clean = re.sub(r'\\x1b\\[[0-9;]*m', '', result.text or '')
print(json.dumps({"text": clean}))
"""

def decompile_subprocess(address: str, bytecode: str, timeout: int) -> dict:
    """Run panoramix in a subprocess with hard timeout."""
    try:
        proc = subprocess.run(
            [PYTHON, "-W", "ignore", "-c", DECOMPILE_WORKER, bytecode],
            capture_output=True,
            text=True,
            timeout=timeout,
            cwd=str(SCRIPT_DIR.parent),
        )
        if proc.returncode == 0 and proc.stdout.strip():
            data = json.loads(proc.stdout.strip().splitlines()[-1])
            return {"text": data.get("text", "")}
        else:
            stderr = proc.stderr.strip()[-200:] if proc.stderr else ""
            return {"error": f"exit {proc.returncode}: {stderr}"}
    except subprocess.TimeoutExpired:
        return {"error": f"timeout after {timeout}s"}
    except Exception as e:
        return {"error": str(e)}

# ============================================================
# MAIN
# ============================================================

def main():
    if not CANONICAL_FILE.exists():
        log(f"ERROR: {CANONICAL_FILE} not found.")
        sys.exit(1)

    # Load already completed
    already_done: set[str] = set()
    for f in [RESULTS_FILE, ERRORS_FILE]:
        if f.exists():
            with open(f) as fh:
                for line in fh:
                    line = line.strip()
                    if line:
                        try:
                            already_done.add(json.loads(line)["address"])
                        except Exception:
                            pass

    # Stream canonical contracts
    contracts = []
    with open(CANONICAL_FILE) as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            obj = json.loads(line)
            if obj["address"] in already_done:
                continue
            code = obj.get("runtime_bytecode", "")
            code_bytes = (len(code) - 2) // 2 if code.startswith("0x") else len(code) // 2
            if code_bytes < args.min_bytes:
                continue
            if obj.get("sibling_count", 0) > args.max_siblings:
                continue
            contracts.append(obj)
            if args.limit and len(contracts) >= args.limit:
                break

    log(f"=== EH 2018 Decompile (Palkeoramix) ===")
    log(f"Shard: {args.shard_dir}")
    log(f"Total canonical: {len(already_done) + len(contracts)}")
    log(f"Already done: {len(already_done)}")
    log(f"Pending: {len(contracts)}")
    log(f"Workers: {args.workers} | Timeout: {args.timeout}s/contract | max_siblings: {args.max_siblings}")
    log(f"Output: {DECOMP_DIR}")

    if args.dry_run:
        # Rough estimate: ~5s per contract at 8 workers
        est_min = len(contracts) * 5 / args.workers / 60
        log(f"DRY RUN: ~{est_min:.0f} min estimated at {args.workers} workers")
        return

    if not contracts:
        log("Nothing to do.")
        return

    start = time.time()
    completed = 0
    errors = 0
    write_lock = threading.Lock()
    last_log_time = [time.time()]

    def process(contract: dict):
        bytecode = contract.get("runtime_bytecode", "")
        result = decompile_subprocess(contract["address"], bytecode, timeout=args.timeout)
        row = {
            "address": contract["address"],
            "deployment_block": contract.get("deployment_block"),
            "era_id": contract.get("era_id"),
            "code_size_bytes": contract.get("code_size_bytes"),
            "sibling_count": contract.get("sibling_count", 0),
            "ts": datetime.now(timezone.utc).isoformat(),
        }
        is_error = "error" in result
        if is_error:
            row["error"] = result["error"]
        else:
            row["decompiled_text"] = result.get("text", "")
        return (is_error, row)

    with ThreadPoolExecutor(max_workers=args.workers) as executor:
        futures = {executor.submit(process, c): c for c in contracts}
        for future in as_completed(futures):
            try:
                is_error, row = future.result()
            except Exception as e:
                is_error = True
                row = {"address": "unknown", "error": str(e), "ts": datetime.now(timezone.utc).isoformat()}

            with write_lock:
                target = ERRORS_FILE if is_error else RESULTS_FILE
                with open(target, "a") as f:
                    f.write(json.dumps(row) + "\n")
                if is_error:
                    errors += 1
                completed += 1

                if time.time() - last_log_time[0] > 15:
                    elapsed = time.time() - start
                    pct = completed / len(contracts) * 100
                    rps = completed / elapsed if elapsed > 0 else 0
                    eta = (len(contracts) - completed) / rps / 60 if rps > 0 else 0
                    log(f"[{pct:.1f}%] {completed}/{len(contracts)} | {rps:.2f}/s | ETA {eta:.0f}min | errors: {errors}")
                    with open(PROGRESS_FILE, "w") as f:
                        json.dump({"completed": completed, "total": len(contracts), "errors": errors,
                                   "ts": datetime.now(timezone.utc).isoformat()}, f, indent=2)
                    last_log_time[0] = time.time()

    elapsed = time.time() - start
    log(f"\n=== Decompile Complete ===")
    log(f"Processed: {completed} | Errors: {errors} | Elapsed: {elapsed/60:.1f}min")
    log(f"Results: {RESULTS_FILE}")
    with open(PROGRESS_FILE, "w") as f:
        json.dump({"completed": completed, "total": len(contracts), "errors": errors,
                   "done": True, "ts": datetime.now(timezone.utc).isoformat()}, f, indent=2)

if __name__ == "__main__":
    main()
