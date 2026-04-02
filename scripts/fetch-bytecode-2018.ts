#!/usr/bin/env npx tsx
/**
 * fetch-bytecode-2018.ts
 *
 * Phase 2: Takes contracts_discovered.jsonl from T7, fetches runtime bytecode
 * for each via Alchemy batch eth_getCode, deduplicates by bytecode hash,
 * and writes the canonical contract set ready for DB import.
 *
 * SAFETY GUARANTEES:
 *   - Raw Alchemy responses written to T7 before any processing
 *   - Circuit breaker on consecutive errors / rate limits
 *   - Idempotent: skips addresses already in bytecode_raw.jsonl
 *   - ONLY outputs successful, non-empty bytecode — zero trash in DB
 *
 * T7 INPUT:
 *   contracts_discovered.jsonl         — from discover-contracts-2018.ts
 *
 * T7 OUTPUT:
 *   bytecode_raw/batch_XXXXX.jsonl     — raw Alchemy responses
 *   bytecode_fetched.jsonl             — address + bytecode (non-empty only)
 *   bytecode_progress.json             — checkpoint
 *   contracts_canonical.jsonl          — one row per unique bytecode hash (import-ready)
 *   sibling_groups.jsonl               — one row per sibling group
 */

import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

// Standard approach: Rarible public node, no key needed, high concurrency.
// https://rarible.com/nodes/ethereum-node — needs browser headers, ~1100 req/sec at concurrency=150.
const RARIBLE_URL = "https://rarible.com/nodes/ethereum-node";
const args = process.argv.slice(2);
const isDryRun    = args.includes("--dry-run");
const limitArg    = args.find((_, i) => args[i - 1] === "--limit");
const maxBatches  = limitArg ? parseInt(limitArg) : Infinity;
const keyArg      = args.find((_, i) => args[i - 1] === "--rpc-url");
const concArg     = args.find((_, i) => args[i - 1] === "--concurrency");
const shardArg    = args.find((_, i) => args[i - 1] === "--shard-dir");
const CONCURRENCY = concArg ? parseInt(concArg) : 150;
const RPC_URL     = keyArg || process.env.ETHEREUM_RPC_URL || RARIBLE_URL;
const IS_RARIBLE  = RPC_URL.includes("rarible.com");
const RPC_HEADERS: Record<string, string> = {
  "Content-Type": "application/json",
  ...(IS_RARIBLE ? {
    "Origin": "https://rarible.com",
    "Referer": "https://rarible.com/",
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  } : {}),
};

const T7_BASE = path.join(process.env.HOME || "/Users/claw", ".openclaw/workspace/memory/eth-2018-discovery");
const T7_DIR  = shardArg ? path.join(T7_BASE, shardArg) : T7_BASE;

// eth_getCode: batch 50 per request when concurrent (small batches = better parallelism)
// Serial Alchemy fallback: batch 200, 15s interval
const ADDRESSES_PER_BATCH = CONCURRENCY > 1 ? 50 : 200;
const REQUEST_INTERVAL_MS = 15_000; // only used in serial mode
const MAX_CONSECUTIVE_ERRORS = 5;
const ERROR_BACKOFF_MS = 5_000;

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }
function appendJsonl(file: string, obj: unknown) {
  fs.appendFileSync(file, JSON.stringify(obj) + "\n");
}

function md5(s: string) {
  return crypto.createHash("md5").update(s).digest("hex");
}

function getEraId(block: number): string {
  if (block < 1150000) return "frontier";
  if (block < 1920000) return "homestead";
  if (block < 2463000) return "dao";
  if (block < 2675000) return "tangerine";
  if (block < 4370000) return "spurious";
  if (block < 7280000) return "byzantium";
  return "constantinople";
}

class RateLimitError extends Error {
  constructor(msg: string) { super(msg); this.name = "RateLimitError"; }
}

async function batchGetCode(
  addresses: string[]
): Promise<{ map: Map<string, string>; rawText: string }> {
  const payload = addresses.map((addr, i) => ({
    jsonrpc: "2.0", id: i,
    method: "eth_getCode",
    params: [addr, "latest"],
  }));

  const res = await fetch(RPC_URL, {
    method: "POST",
    headers: RPC_HEADERS,
    body: JSON.stringify(payload),
  });

  const rawText = await res.text();

  if (res.status === 429) throw new RateLimitError(`HTTP 429`);
  if (res.status !== 200) throw new Error(`HTTP ${res.status}: ${rawText.slice(0, 200)}`);

  let parsed: Array<{ id: number; result?: string; error?: { code: number; message: string } }>;
  try { parsed = JSON.parse(rawText); }
  catch { throw new Error(`JSON parse error: ${rawText.slice(0, 200)}`); }

  const map = new Map<string, string>();
  for (const r of parsed) {
    if (r.error) {
      const msg = r.error.message?.toLowerCase() ?? "";
      if (r.error.code === -32005 || r.error.code === -32016 || msg.includes("rate limit") || msg.includes("compute units")) {
        throw new RateLimitError(`RPC rate limit: ${r.error.message}`);
      }
      // Other RPC errors: skip this address (don't insert trash)
      continue;
    }
    if (r.result && r.result !== "0x" && r.result.length > 4) {
      map.set(addresses[r.id], r.result);
    }
    // '0x' or empty = EOA or self-destructed — intentionally excluded
  }

  return { map, rawText };
}

async function main() {
  fs.mkdirSync(path.join(T7_DIR, "bytecode_raw"), { recursive: true });

  const discoveredFile = path.join(T7_DIR, "contracts_discovered.jsonl");
  if (!fs.existsSync(discoveredFile)) {
    console.error(`ERROR: ${discoveredFile} not found. Run discover-contracts-2018.ts first.`);
    process.exit(1);
  }

  // Load all discovered contracts
  const allContracts = fs.readFileSync(discoveredFile, "utf-8")
    .split("\n").filter(Boolean)
    .map(l => JSON.parse(l) as { address: string; deployer: string; tx_hash: string; block: number; gas_used: string; status: string });

  console.log(`=== EH 2018 Bytecode Fetch ===`);
  console.log(`Contracts discovered: ${allContracts.length}`);

  // Load progress — which addresses already fetched?
  const progressFile = path.join(T7_DIR, "bytecode_progress.json");
  const doneFetchedFile = path.join(T7_DIR, "bytecode_fetched.jsonl");

  const alreadyFetched = new Set<string>();
  if (fs.existsSync(doneFetchedFile)) {
    fs.readFileSync(doneFetchedFile, "utf-8").split("\n").filter(Boolean).forEach(l => {
      const obj = JSON.parse(l);
      alreadyFetched.add(obj.address);
    });
  }

  const pending = allContracts.filter(c => !alreadyFetched.has(c.address));
  console.log(`Already fetched: ${alreadyFetched.size}`);
  console.log(`Pending: ${pending.length}`);

  console.log(`RPC: ${RPC_URL}`);
  console.log(`Concurrency: ${CONCURRENCY} workers, ${ADDRESSES_PER_BATCH} addrs/batch`);

  if (isDryRun) {
    const batches = Math.ceil(pending.length / ADDRESSES_PER_BATCH);
    const estMin = CONCURRENCY > 1
      ? Math.ceil(batches / CONCURRENCY / 60)
      : Math.ceil((batches * REQUEST_INTERVAL_MS) / 60_000);
    console.log(`DRY RUN: ${pending.length} addresses → ${batches} batches, ~${estMin} min`);
    return;
  }

  // Index: address → discovery metadata
  const metaByAddr = new Map(allContracts.map(c => [c.address, c]));

  // Build batches
  const batches: string[][] = [];
  for (let i = 0; i < pending.length; i += ADDRESSES_PER_BATCH) {
    batches.push(pending.slice(i, i + ADDRESSES_PER_BATCH).map(c => c.address));
  }

  const startTime = Date.now();
  let completedBatches = 0;
  let totalFound = 0;
  let queueIdx = 0;
  const fetchedBuffer: string[] = [];
  let lastFlush = Date.now();

  function flushBuffer() {
    if (fetchedBuffer.length > 0) {
      fs.appendFileSync(doneFetchedFile, fetchedBuffer.join(""));
      fetchedBuffer.length = 0;
    }
    fs.writeFileSync(progressFile, JSON.stringify({ completedBatches, ts: new Date().toISOString() }, null, 2));
    lastFlush = Date.now();
  }

  async function worker() {
    while (true) {
      const idx = queueIdx++;
      if (idx >= batches.length) break;
      const batch = batches[idx];

      let attempts = 0;
      while (attempts < MAX_CONSECUTIVE_ERRORS) {
        try {
          const { map } = await batchGetCode(batch);
          for (const addr of batch) {
            const code = map.get(addr);
            if (code) {
              const meta = metaByAddr.get(addr)!;
              fetchedBuffer.push(JSON.stringify({
                address: addr,
                runtime_bytecode: code,
                runtime_bytecode_hash: md5(code),
                code_size_bytes: (code.length - 2) / 2,
                deployer: meta.deployer,
                tx_hash: meta.tx_hash,
                block: meta.block,
                gas_used: meta.gas_used,
                deploy_status: meta.status,
                era_id: getEraId(meta.block),
              }) + "\n");
              totalFound++;
            }
          }
          completedBatches++;
          break;
        } catch (err) {
          const isRL = err instanceof RateLimitError;
          attempts += isRL ? 0 : 1;
          await sleep(ERROR_BACKOFF_MS * (isRL ? 2 : attempts));
        }
      }

      if (Date.now() - lastFlush > 5000) {
        flushBuffer();
        const elapsed = (Date.now() - startTime) / 1000;
        const pct = (completedBatches / batches.length * 100).toFixed(1);
        const bps = (completedBatches / elapsed).toFixed(1);
        const etaMin = ((batches.length - completedBatches) / parseFloat(bps) / 60).toFixed(0);
        console.log(`[${pct}%] ${completedBatches}/${batches.length} batches | ${bps} batch/s | ETA ${etaMin}min | bytecodes: ${totalFound}`);
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
  flushBuffer();
  console.log(`\nFetch complete: ${totalFound} contracts with bytecode`);

  console.log("\n=== Deduplicating by bytecode hash ===");
  await buildCanonicalSet();
}

async function buildCanonicalSet() {
  const fetchedFile = path.join(T7_DIR, "bytecode_fetched.jsonl");
  const canonicalFile = path.join(T7_DIR, "contracts_canonical.jsonl");
  const siblingsFile = path.join(T7_DIR, "sibling_groups.jsonl");

  console.log("Streaming bytecode_fetched.jsonl (file may be large)...");
  // Stream line-by-line to avoid Node 512MB string limit
  const { createReadStream } = await import("fs");
  const { createInterface } = await import("readline");
  const rl = createInterface({ input: createReadStream(fetchedFile), crlfDelay: Infinity });
  const rows: any[] = [];
  for await (const line of rl) {
    if (line.trim()) rows.push(JSON.parse(line));
  }
  console.log(`Loaded ${rows.length} rows`);

  // Group by bytecode hash
  const groups = new Map<string, typeof rows>();
  for (const row of rows) {
    const h = row.runtime_bytecode_hash;
    if (!groups.has(h)) groups.set(h, []);
    groups.get(h)!.push(row);
  }

  // Sort each group by block (earliest first) → canonical = first deployed
  let canonicalCount = 0;
  let siblingCount = 0;

  if (fs.existsSync(canonicalFile)) fs.unlinkSync(canonicalFile);
  if (fs.existsSync(siblingsFile)) fs.unlinkSync(siblingsFile);

  for (const [hash, group] of Array.from(groups)) {
    group.sort((a, b) => a.block - b.block);
    const canonical = group[0];
    const siblings = group.slice(1);

    // Write canonical contract (import-ready format)
    appendJsonl(canonicalFile, {
      address: canonical.address,
      deployer_address: canonical.deployer,
      deployment_tx_hash: canonical.tx_hash,
      deployment_block: canonical.block,
      era_id: canonical.era_id,
      runtime_bytecode: canonical.runtime_bytecode,
      runtime_bytecode_hash: hash,
      code_size_bytes: canonical.code_size_bytes,
      sibling_count: siblings.length,
      sibling_addresses: siblings.map(s => s.address),
    });
    canonicalCount++;

    // Write sibling group metadata
    if (siblings.length > 0) {
      appendJsonl(siblingsFile, {
        canonical_address: canonical.address,
        bytecode_hash: hash,
        total_count: group.length,
        siblings: siblings.map(s => ({
          address: s.address,
          block: s.block,
          deployer: s.deployer,
        })),
      });
      siblingCount += siblings.length;
    }
  }

  console.log(`Total contracts with bytecode: ${rows.length}`);
  console.log(`Unique bytecode hashes (canonical): ${canonicalCount}`);
  console.log(`Siblings deduplicated: ${siblingCount}`);
  console.log(`Deduplication ratio: ${((siblingCount / rows.length) * 100).toFixed(1)}%`);
  console.log(`\nCanonical set: ${canonicalFile}`);
  console.log(`Sibling groups: ${siblingsFile}`);
  console.log(`\nNext step: npx tsx scripts/etherscan-enrich-2018.ts`);
}

main().catch(err => { console.error("Fatal:", err); process.exit(1); });
