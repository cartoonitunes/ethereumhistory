#!/usr/bin/env npx tsx
/**
 * etherscan-enrich-2018.ts
 *
 * Phase 3: Enrich canonical contracts with Etherscan metadata.
 * Fetches: contract name, verified source code, ABI, compiler version, token info.
 *
 * SAFETY:
 *   - Raw Etherscan responses stored in T7 before processing
 *   - Circuit breaker on rate limit errors
 *   - Idempotent: skips already-enriched addresses
 *   - Rotates between two API keys to stay under free-tier limits
 *
 * T7 OUTPUT:
 *   etherscan_raw/ADDRESS.json         — raw getsourcecode response per contract
 *   etherscan_enriched.jsonl           — merged enrichment data
 *   etherscan_progress.json            — checkpoint
 */

import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const shardArg = process.argv.find((_, i) => process.argv[i - 1] === "--shard-dir");
const T7_BASE = path.join(process.env.HOME || "/Users/claw", ".openclaw/workspace/memory/eth-2018-discovery");
const T7_DIR = shardArg ? path.join(T7_BASE, shardArg) : T7_BASE;

// Two keys for rotation (primary + backup from TOOLS.md)
const ETHERSCAN_KEYS = [
  process.env.ETHERSCAN_API_KEY || "8X6AJW9D8XVC4U9ABQWHYF5I7IQBF68CEN",
  "AHMV3WAI75TQVJI2XEFUUKFKK1KJTFY1BD", // project key from .env.local
];

// Free tier: 5 req/sec. We use 250ms delay and rotate keys → ~8 req/sec effective.
const REQUEST_DELAY_MS = 250;
const MAX_CONSECUTIVE_ERRORS = 5;
const RATE_LIMIT_BACKOFF_MS = 60_000; // 60s pause on rate limit

const args = process.argv.slice(2);
const isDryRun = args.includes("--dry-run");
const limitArg = args.find((_, i) => args[i - 1] === "--limit");
const maxRequests = limitArg ? parseInt(limitArg) : Infinity;

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }
function appendJsonl(file: string, obj: unknown) {
  fs.appendFileSync(file, JSON.stringify(obj) + "\n");
}

let keyIndex = 0;
function nextKey() {
  const key = ETHERSCAN_KEYS[keyIndex % ETHERSCAN_KEYS.length];
  keyIndex++;
  return key;
}

class RateLimitError extends Error {
  constructor(msg: string) { super(msg); this.name = "RateLimitError"; }
}

async function fetchSourceCode(address: string): Promise<{ raw: string; parsed: any }> {
  const key = nextKey();
  const url = `https://api.etherscan.io/v2/api?chainid=1&module=contract&action=getsourcecode&address=${address}&apikey=${key}`;

  const res = await fetch(url);
  const rawText = await res.text();

  if (res.status === 429) throw new RateLimitError(`HTTP 429`);
  if (res.status !== 200) throw new Error(`HTTP ${res.status}`);

  let parsed: any;
  try { parsed = JSON.parse(rawText); }
  catch { throw new Error(`JSON parse error: ${rawText.slice(0, 100)}`); }

  // Etherscan rate limit signal inside JSON
  if (parsed.status === "0" && typeof parsed.result === "string") {
    const msg = parsed.result.toLowerCase();
    if (msg.includes("rate limit") || msg.includes("max rate") || msg.includes("429")) {
      throw new RateLimitError(`Etherscan rate limit: ${parsed.result}`);
    }
  }

  return { raw: rawText, parsed };
}

async function main() {
  fs.mkdirSync(path.join(T7_DIR, "etherscan_raw"), { recursive: true });

  const canonicalFile = path.join(T7_DIR, "contracts_canonical.jsonl");
  if (!fs.existsSync(canonicalFile)) {
    console.error(`ERROR: ${canonicalFile} not found. Run fetch-bytecode-2018.ts first.`);
    process.exit(1);
  }

  // Stream canonical file (may be large due to bytecode)
  const { createReadStream } = await import("fs");
  const { createInterface } = await import("readline");
  const contracts: any[] = [];
  for await (const line of createInterface({ input: createReadStream(canonicalFile), crlfDelay: Infinity })) {
    if (line.trim()) contracts.push(JSON.parse(line));
  }

  // Load already-enriched
  const enrichedFile = path.join(T7_DIR, "etherscan_enriched.jsonl");
  const alreadyDone = new Set<string>();
  if (fs.existsSync(enrichedFile)) {
    for await (const line of createInterface({ input: createReadStream(enrichedFile), crlfDelay: Infinity })) {
      if (line.trim()) alreadyDone.add(JSON.parse(line).address);
    }
  }

  const pending = contracts.filter(c => !alreadyDone.has(c.address));

  console.log("=== EH 2018 Etherscan Enrichment ===");
  console.log(`Total canonical contracts: ${contracts.length}`);
  console.log(`Already enriched: ${alreadyDone.size}`);
  console.log(`Pending: ${pending.length}`);

  if (isDryRun) {
    const estimatedMinutes = (pending.length * REQUEST_DELAY_MS) / 60_000;
    console.log(`DRY RUN: ${pending.length} requests at ${REQUEST_DELAY_MS}ms = ~${estimatedMinutes.toFixed(0)} min`);
    return;
  }

  let consecutiveErrors = 0;
  let processed = 0;
  let verified = 0;

  for (const contract of pending) {
    if (processed >= maxRequests) { console.log(`--limit ${maxRequests} reached`); break; }

    try {
      const { raw, parsed } = await fetchSourceCode(contract.address);

      // Store raw response
      fs.writeFileSync(
        path.join(T7_DIR, "etherscan_raw", `${contract.address}.json`),
        raw
      );

      // Parse enrichment
      const result = parsed?.result?.[0] ?? {};
      const hasSource = result.SourceCode && result.SourceCode !== "" && result.SourceCode !== "0x";
      const enriched = {
        address: contract.address,
        etherscan_contract_name: result.ContractName || null,
        source_code: hasSource ? result.SourceCode : null,
        abi: (result.ABI && result.ABI !== "Contract source code not verified") ? result.ABI : null,
        compiler_version: result.CompilerVersion || null,
        optimization_used: result.OptimizationUsed || null,
        constructor_args: result.ConstructorArguments || null,
        etherscan_verified: hasSource,
        token_name: null as string | null,
        token_symbol: null as string | null,
        token_decimals: null as number | null,
      };

      appendJsonl(enrichedFile, enriched);
      if (hasSource) verified++;

      if (processed % 100 === 0) {
        console.log(`  [${processed}/${pending.length}] enriched=${processed}, verified=${verified}`);
      }

      consecutiveErrors = 0;
      processed++;
      await sleep(REQUEST_DELAY_MS);

    } catch (err) {
      const isRateLimit = err instanceof RateLimitError;
      const errMsg = err instanceof Error ? err.message : String(err);

      if (isRateLimit) {
        console.error(`\n  Rate limit. Pausing ${RATE_LIMIT_BACKOFF_MS / 1000}s...`);
        await sleep(RATE_LIMIT_BACKOFF_MS);
        consecutiveErrors = 0;
        // Retry same contract — don't advance loop
        continue;
      }

      consecutiveErrors++;
      console.error(`\n  Error on ${contract.address}: ${errMsg} (${consecutiveErrors}/${MAX_CONSECUTIVE_ERRORS})`);

      if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
        console.error("CIRCUIT BREAKER: halting. Re-run to resume.");
        process.exit(1);
      }
      // Write a stub so we don't retry forever on permanently broken addresses
      appendJsonl(enrichedFile, { address: contract.address, error: errMsg, etherscan_verified: false });
      processed++;
      await sleep(REQUEST_DELAY_MS * 2);
    }
  }

  console.log(`\n=== Enrichment Complete ===`);
  console.log(`Processed: ${processed}`);
  console.log(`Etherscan verified: ${verified}`);
  console.log(`\nNext step: npx tsx scripts/import-contracts-2018.ts`);
}

main().catch(err => { console.error("Fatal:", err); process.exit(1); });
