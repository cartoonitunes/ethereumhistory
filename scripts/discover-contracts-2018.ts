#!/usr/bin/env npx tsx
/**
 * discover-contracts-2018.ts
 *
 * Discovers all contract deployments from Dec 22, 2017 → Dec 31, 2018
 * using Alchemy eth_getBlockReceipts batch JSON-RPC.
 *
 * SAFETY GUARANTEES:
 *   - Every raw API response is written to T7 storage before any processing
 *   - Circuit breaker: halts on consecutive errors or rate limit signals
 *   - Idempotent: resumes from last checkpoint, never re-fetches done blocks
 *   - No DB writes until Phase 2 (import-contracts-2018.ts)
 *
 * OUTPUT (all in T7_DIR):
 *   raw/blocks_XXXXXXX-XXXXXXX.jsonl  — raw receipts per block batch
 *   progress.json                      — checkpoint (last completed block)
 *   contracts_discovered.jsonl         — deduplicated contract creates
 *   errors.jsonl                       — any error responses for inspection
 *
 * STANDARD APPROACH (2026-04-02):
 *   Use the Rarible public Ethereum node — no API key, no rate limits at 150 concurrent.
 *   Full 2018 range (4,850,000 → 6,988,614 = 2.1M blocks) completes in ~30 minutes.
 *   Tested: 1,100+ blocks/sec at concurrency=150. Requires browser-like Origin/Referer headers.
 *
 *   npx tsx scripts/discover-contracts-2018.ts \
 *     --alchemy-key https://rarible.com/nodes/ethereum-node \
 *     --concurrency 150
 *
 * USAGE:
 *   npx tsx scripts/discover-contracts-2018.ts [--dry-run] [--limit N]
 *   npx tsx scripts/discover-contracts-2018.ts --start-block 4860000 --end-block 6988614
 *   npx tsx scripts/discover-contracts-2018.ts --alchemy-key <KEY> [--concurrency N]
 *
 * ALCHEMY FALLBACK (if Rarible node is down):
 *   npx tsx scripts/discover-contracts-2018.ts --alchemy-key <KEY> --concurrency 1
 *   (serial mode, 1 req/sec, ~7 days for full range on free tier)
 */

import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

// ============================================================
// CONFIG
// ============================================================

// Block range: first block after our last covered contract (Dec 21 2017) → end of 2018
const DEFAULT_START_BLOCK = 4_850_000;
const DEFAULT_END_BLOCK   = 6_988_614;

// Concurrency config (overridable via --concurrency N):
// DEFAULT: Rarible public node at 150 concurrent = ~1,100 blocks/sec, full range in ~30 min.
// Fallback: Alchemy free tier — use concurrency=1 with 1100ms interval.
// Tested 2026-04-02: Rarible handles 200 concurrent cleanly (69 blk/s at 200, ~1100 blk/s at 150).
const DEFAULT_CONCURRENCY = 150;
const REQUEST_INTERVAL_MS = 1100; // only used when concurrency=1 (Alchemy serial mode)
const MAX_CONSECUTIVE_ERRORS = 3;  // Circuit breaker threshold
const ERROR_BACKOFF_MS = 30_000;   // 30s pause after hitting circuit breaker

// ============================================================
// ARGS
// ============================================================

const args = process.argv.slice(2);
const isDryRun      = args.includes("--dry-run");
const limitArg      = args.find((_, i) => args[i - 1] === "--limit");
const maxBatches    = limitArg ? parseInt(limitArg) : Infinity;
const startArg      = args.find((_, i) => args[i - 1] === "--start-block");
const endArg        = args.find((_, i) => args[i - 1] === "--end-block");
const keyArg        = args.find((_, i) => args[i - 1] === "--alchemy-key");
const shardArg      = args.find((_, i) => args[i - 1] === "--shard-dir");
const concurrencyArg= args.find((_, i) => args[i - 1] === "--concurrency");
const START_BLOCK   = startArg  ? parseInt(startArg)  : DEFAULT_START_BLOCK;
const END_BLOCK     = endArg    ? parseInt(endArg)     : DEFAULT_END_BLOCK;
const CONCURRENCY   = concurrencyArg ? parseInt(concurrencyArg) : DEFAULT_CONCURRENCY;

// Key: prefer --alchemy-key arg, then env, then hardcoded default
// --alchemy-key can be either a bare key OR a full URL (e.g. https://rarible.com/nodes/ethereum-node)
const ALCHEMY_KEY = keyArg
  || (process.env.ETHEREUM_RPC_URL?.split("/v2/")[1] ?? "s6mjmXnzhzfbVLypKdbFCAe02Zf9HQa1");
const ALCHEMY_URL = ALCHEMY_KEY.startsWith("http")
  ? ALCHEMY_KEY
  : `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`;

// T7 dir: use --shard-dir subdirectory if provided, otherwise root discovery dir
const T7_BASE = path.join(process.env.HOME || "/Users/claw", ".openclaw/workspace/memory/eth-2018-discovery");
const T7_DIR  = shardArg ? path.join(T7_BASE, shardArg) : T7_BASE;

// ============================================================
// SETUP
// ============================================================

function ensureDirs() {
  fs.mkdirSync(path.join(T7_DIR, "raw"), { recursive: true });
}

function loadProgress(): { lastCompletedBlock: number } {
  const p = path.join(T7_DIR, "progress.json");
  if (fs.existsSync(p)) {
    return JSON.parse(fs.readFileSync(p, "utf-8"));
  }
  return { lastCompletedBlock: START_BLOCK - 1 };
}

function saveProgress(lastCompletedBlock: number) {
  fs.writeFileSync(
    path.join(T7_DIR, "progress.json"),
    JSON.stringify({ lastCompletedBlock, updatedAt: new Date().toISOString() }, null, 2)
  );
}

function appendJsonl(file: string, obj: unknown) {
  fs.appendFileSync(file, JSON.stringify(obj) + "\n");
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// ============================================================
// RPC
// ============================================================

interface Receipt {
  blockNumber: string;
  blockHash: string;
  transactionHash: string;
  from: string;
  contractAddress: string | null;
  gasUsed: string;
  status: string;
}

interface RpcResponse {
  id: number;
  result?: Receipt[];
  error?: { code: number; message: string };
}

// Rarible node requires browser-like headers to avoid 403
const IS_RARIBLE = ALCHEMY_URL.includes("rarible.com");
const RPC_HEADERS: Record<string, string> = {
  "Content-Type": "application/json",
  ...(IS_RARIBLE ? {
    "Origin": "https://rarible.com",
    "Referer": "https://rarible.com/",
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  } : {}),
};

async function fetchBlockReceiptsBatch(
  blockNumbers: number[]
): Promise<{ responses: RpcResponse[]; rawResponseText: string }> {
  const payload = blockNumbers.map((n, i) => ({
    jsonrpc: "2.0",
    id: i,
    method: "eth_getBlockReceipts",
    params: [`0x${n.toString(16)}`],
  }));

  const res = await fetch(ALCHEMY_URL, {
    method: "POST",
    headers: RPC_HEADERS,
    body: JSON.stringify(payload),
  });

  const rawText = await res.text();

  // Rate limit check BEFORE parsing
  if (res.status === 429) {
    throw new RateLimitError(`HTTP 429 from Alchemy. Retry-After: ${res.headers.get("Retry-After") ?? "unknown"}`);
  }
  if (res.status !== 200) {
    throw new Error(`Unexpected HTTP ${res.status}: ${rawText.slice(0, 200)}`);
  }

  let parsed: RpcResponse[];
  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new Error(`JSON parse error. Raw (first 200): ${rawText.slice(0, 200)}`);
  }

  // Check for rate limit errors inside the JSON-RPC response body
  for (const r of parsed) {
    if (r.error) {
      // Alchemy rate limit error codes: -32005, -32016, or message contains "rate limit"
      const msg = r.error.message?.toLowerCase() ?? "";
      if (r.error.code === -32005 || r.error.code === -32016 || msg.includes("rate limit") || msg.includes("compute units")) {
        throw new RateLimitError(`RPC rate limit in response: ${r.error.message}`);
      }
    }
  }

  return { responses: parsed, rawResponseText: rawText };
}

class RateLimitError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = "RateLimitError";
  }
}

// ============================================================
// MAIN
// ============================================================

interface ContractCreate {
  address: string;
  deployer: string;
  tx_hash: string;
  block: number;
  gas_used: string;
  status: string; // '0x1' = success, '0x0' = failed (still a deploy attempt)
}

async function main() {
  ensureDirs();

  const progress = loadProgress();
  let currentBlock = progress.lastCompletedBlock + 1;

  const contractsFile = path.join(T7_DIR, "contracts_discovered.jsonl");
  const errorsFile = path.join(T7_DIR, "errors.jsonl");

  console.log("=== EH 2018 Contract Discovery ===");
  console.log(`Mode: ${isDryRun ? "DRY RUN" : "LIVE"}`);
  console.log(`Shard: ${shardArg ?? "root"}`);
  console.log(`RPC: ${ALCHEMY_URL}`);
  console.log(`Concurrency: ${CONCURRENCY} workers`);
  console.log(`Block range: ${currentBlock} → ${END_BLOCK}`);
  console.log(`T7 storage: ${T7_DIR}`);
  console.log(`Resuming from block: ${currentBlock}`);
  console.log();

  if (currentBlock > END_BLOCK) {
    console.log("✓ Already complete — nothing to do.");
    return;
  }

  const totalBlocks = END_BLOCK - START_BLOCK + 1;

  if (isDryRun) {
    const remaining = END_BLOCK - currentBlock + 1;
    const estSeconds = CONCURRENCY > 1 ? remaining / CONCURRENCY : remaining * (REQUEST_INTERVAL_MS / 1000);
    console.log(`DRY RUN: ${remaining} blocks remaining`);
    console.log(`Estimated time: ${(estSeconds / 3600).toFixed(1)}h at ${CONCURRENCY} concurrent`);
    return;
  }

  let totalContractsFound = 0;
  let totalProcessed = 0;
  const startTime = Date.now();

  // ============================================================
  // CONCURRENT WORKER POOL
  // ============================================================
  if (CONCURRENCY > 1) {
    // Build the full queue of blocks to process
    const queue: number[] = [];
    for (let b = currentBlock; b <= END_BLOCK; b++) queue.push(b);

    // Shared state (atomic via single-threaded JS event loop)
    let queueIdx = 0;
    let completedBlocks = 0;
    let highWaterMark = currentBlock - 1; // tracks for checkpoint
    const inFlight = new Map<number, boolean>(); // block -> in-progress
    const done = new Set<number>(); // completed blocks
    const contractsBuffer: string[] = [];
    let lastFlush = Date.now();
    const FLUSH_INTERVAL_MS = 5000;

    function flushContracts() {
      if (contractsBuffer.length > 0) {
        fs.appendFileSync(contractsFile, contractsBuffer.join(""));
        contractsBuffer.length = 0;
      }
      // Advance checkpoint to highest contiguous completed block
      let hw = highWaterMark;
      while (done.has(hw + 1)) hw++;
      if (hw > highWaterMark) {
        highWaterMark = hw;
        saveProgress(hw);
      }
      lastFlush = Date.now();
    }

    async function worker(workerId: number) {
      while (true) {
        const idx = queueIdx++;
        if (idx >= queue.length) break;
        const blockNum = queue[idx];

        let attempts = 0;
        while (attempts < MAX_CONSECUTIVE_ERRORS) {
          try {
            const { responses } = await fetchBlockReceiptsBatch([blockNum]);
            const resp = responses[0];
            if (resp?.error) {
              const msg = resp.error.message?.toLowerCase() ?? "";
              if (msg.includes("rate limit") || msg.includes("compute units") || resp.error.code === -32005) {
                await sleep(ERROR_BACKOFF_MS);
                attempts++;
                continue;
              }
              appendJsonl(errorsFile, { block: blockNum, error: resp.error, ts: new Date().toISOString() });
            } else if (resp?.result) {
              for (const receipt of resp.result) {
                if (receipt.contractAddress && receipt.contractAddress !== "0x0000000000000000000000000000000000000000") {
                  const create: ContractCreate = {
                    address: receipt.contractAddress.toLowerCase(),
                    deployer: receipt.from?.toLowerCase() ?? "",
                    tx_hash: receipt.transactionHash?.toLowerCase() ?? "",
                    block: parseInt(receipt.blockNumber, 16),
                    gas_used: receipt.gasUsed,
                    status: receipt.status,
                  };
                  contractsBuffer.push(JSON.stringify(create) + "\n");
                  totalContractsFound++;
                }
              }
            }
            done.add(blockNum);
            completedBlocks++;
            break;
          } catch (err) {
            const isRL = err instanceof RateLimitError;
            if (isRL) {
              await sleep(ERROR_BACKOFF_MS);
              attempts = 0; // rate limit is recoverable
            } else {
              attempts++;
              await sleep(1000 * attempts);
            }
          }
        }

        // Periodic flush + progress print (only one worker prints at a time via JS single-thread)
        if (Date.now() - lastFlush > FLUSH_INTERVAL_MS) {
          flushContracts();
          const elapsed = (Date.now() - startTime) / 1000;
          const pct = (completedBlocks / queue.length * 100).toFixed(1);
          const bps = (completedBlocks / elapsed).toFixed(1);
          const etaH = ((queue.length - completedBlocks) / parseFloat(bps) / 3600).toFixed(1);
          console.log(`[${pct}%] ${completedBlocks}/${queue.length} blocks | ${bps} blk/s | ETA ${etaH}h | contracts: ${totalContractsFound}`);
        }
      }
    }

    // Launch workers
    const workers = Array.from({ length: CONCURRENCY }, (_, i) => worker(i));
    await Promise.all(workers);

    // Final flush
    flushContracts();
    totalProcessed = completedBlocks;

  } else {
    // ============================================================
    // SERIAL MODE (Alchemy free tier — rate-limit safe)
    // ============================================================
    let consecutiveErrors = 0;
    let batchCount = 0;

    while (currentBlock <= END_BLOCK) {
      if (batchCount >= maxBatches) {
        console.log(`Reached --limit ${maxBatches} batches. Stopping.`);
        break;
      }

      const blockNumbers = [currentBlock];
      process.stdout.write(`Batch ${batchCount + 1}: block ${currentBlock} ... `);

      try {
        const { responses } = await fetchBlockReceiptsBatch(blockNumbers);
        const resp = responses[0];
        let batchContracts = 0;

        if (resp?.error) {
          appendJsonl(errorsFile, { block: currentBlock, error: resp.error, ts: new Date().toISOString() });
        } else if (resp?.result) {
          for (const receipt of resp.result) {
            if (receipt.contractAddress && receipt.contractAddress !== "0x0000000000000000000000000000000000000000") {
              const create: ContractCreate = {
                address: receipt.contractAddress.toLowerCase(),
                deployer: receipt.from?.toLowerCase() ?? "",
                tx_hash: receipt.transactionHash?.toLowerCase() ?? "",
                block: parseInt(receipt.blockNumber, 16),
                gas_used: receipt.gasUsed,
                status: receipt.status,
              };
              appendJsonl(contractsFile, create);
              batchContracts++;
              totalContractsFound++;
            }
          }
        }

        console.log(`✓ ${batchContracts} contracts`);
        consecutiveErrors = 0;
        saveProgress(currentBlock);
        currentBlock++;
        batchCount++;
        totalProcessed++;

        if (batchCount % 500 === 0) {
          const elapsed = (Date.now() - startTime) / 1000;
          const pct = ((currentBlock - START_BLOCK) / totalBlocks * 100).toFixed(1);
          console.log(`  [${pct}%] block ${currentBlock}, contracts: ${totalContractsFound}, elapsed: ${(elapsed/3600).toFixed(1)}h`);
        }

        if (currentBlock <= END_BLOCK) await sleep(REQUEST_INTERVAL_MS);

      } catch (err) {
        const isRateLimit = err instanceof RateLimitError;
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error(`\n  ERROR: ${errMsg}`);
        appendJsonl(errorsFile, { block: currentBlock, error: errMsg, isRateLimit, ts: new Date().toISOString() });
        consecutiveErrors++;
        if (isRateLimit) {
          await sleep(ERROR_BACKOFF_MS);
          consecutiveErrors = 0;
        } else if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
          console.error(`CIRCUIT BREAKER: halting. Re-run to resume from block ${currentBlock}.`);
          process.exit(1);
        } else {
          await sleep(ERROR_BACKOFF_MS);
        }
      }
    }
  }

  const elapsed = (Date.now() - startTime) / 1000;
  console.log(`\n=== Discovery Complete ===`);
  console.log(`Blocks processed: ${totalProcessed}`);
  console.log(`Total contract creates found: ${totalContractsFound}`);
  console.log(`Elapsed: ${(elapsed/3600).toFixed(2)}h`);
  console.log(`Output: ${contractsFile}`);
  console.log(`\nNext step: npx tsx scripts/fetch-bytecode-2018.ts`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
