/**
 * pull-and-cache.ts
 *
 * Pulls raw on-chain data for all contracts, writes full API responses to disk cache,
 * then derives and updates DB columns from the cached data.
 *
 * Cache location: /Volumes/T7 Shield/eth-contract-cache/
 *   tx/<hash>.json          → full eth_getTransactionByHash response
 *   creation/<address>.json → Etherscan getContractCreation response
 *
 * Usage:
 *   npx tsx --conditions=node scripts/pull-and-cache.ts [options]
 *
 * Options:
 *   --phase tx-index        Backfill deployment_tx_index from tx cache (default)
 *   --phase creation        Fetch/cache Etherscan creation data (for missing tx_hash)
 *   --phase all             Run both phases
 *   --dry-run               Don't write to DB
 *   --limit N               Cap number of contracts processed
 *   --from-block N / --to-block N
 *   --era frontier|homestead|all
 *   --force                 Re-fetch even if cache file exists
 */

import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql, isNull, and, isNotNull, gte, lte } from "drizzle-orm";
import { contracts } from "../src/lib/schema";
import fs from "fs";
import path from "path";

// ─── Config ──────────────────────────────────────────────────────────────────

const CACHE_ROOT = "/Volumes/T7 Shield/eth-contract-cache";
const TX_CACHE = path.join(CACHE_ROOT, "tx");
const CREATION_CACHE = path.join(CACHE_ROOT, "creation");

const ALCHEMY_URL = process.env.ETHEREUM_RPC_URL!;
const ETHERSCAN_KEY = "AHMV3WAI75TQVJI2XEFUUKFKK1KJTFY1BD";
const ETHERSCAN_BASE = `https://api.etherscan.io/v2/api?chainid=1&apikey=${ETHERSCAN_KEY}`;

const ALCHEMY_BATCH = 20;        // tx lookups per Alchemy JSON-RPC batch
const ETHERSCAN_BATCH = 5;       // addresses per Etherscan getContractCreation call
const ETHERSCAN_DELAY_MS = 250;  // ~4 req/s

// ─── Args ────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const DRY_RUN  = args.includes("--dry-run");
const FORCE    = args.includes("--force");
const LIMIT    = parseInt(args.find(a => a.startsWith("--limit="))?.split("=")[1] ?? "0");
const ERA      = args.find(a => a.startsWith("--era="))?.split("=")[1] ?? "all";
const PHASE    = args.find(a => a.startsWith("--phase="))?.split("=")[1] ?? "tx-index";
const FROM_BLOCK = parseInt(args.find(a => a.startsWith("--from-block="))?.split("=")[1] ?? "0");
const TO_BLOCK   = parseInt(args.find(a => a.startsWith("--to-block="))?.split("=")[1]   ?? "99999999");

const ERA_RANGES: Record<string, [number, number]> = {
  frontier:  [1,       1149999],
  homestead: [1150000, 2462999],
  dao:       [2463000, 2674999],
  all:       [0,       99999999],
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

function txCachePath(hash: string)      { return path.join(TX_CACHE, `${hash.toLowerCase()}.json`); }
function creationCachePath(addr: string){ return path.join(CREATION_CACHE, `${addr.toLowerCase()}.json`); }

function readCache(p: string): any | null {
  try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; }
}

function writeCache(p: string, data: any) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(data, null, 2));
}

async function fetchAlchemyBatch(txHashes: string[]): Promise<Map<string, any>> {
  const payload = txHashes.map((hash, i) => ({
    jsonrpc: "2.0", id: i,
    method: "eth_getTransactionByHash",
    params: [hash],
  }));
  const res = await fetch(ALCHEMY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Alchemy HTTP ${res.status}`);
  const results: Array<{ id: number; result: any }> = await res.json();
  const map = new Map<string, any>();
  for (const r of results) {
    if (r.result) map.set(txHashes[r.id].toLowerCase(), r.result);
  }
  return map;
}

async function fetchEtherscanCreation(addresses: string[]): Promise<Map<string, any>> {
  const joined = addresses.join(",");
  let retries = 5;
  while (retries-- > 0) {
    const res = await fetch(`${ETHERSCAN_BASE}&module=contract&action=getcontractcreation&contractaddresses=${joined}`);
    const data = await res.json() as any;
    if (data?.message === "NOTOK" && data?.result?.includes?.("rate limit")) {
      await sleep(2000);
      continue;
    }
    const map = new Map<string, any>();
    for (const item of (data?.result ?? [])) {
      map.set(item.contractAddress.toLowerCase(), item);
    }
    return map;
  }
  return new Map();
}

// ─── Phase: tx-index ─────────────────────────────────────────────────────────
// Fetch eth_getTransactionByHash for every contract that has a tx_hash but no
// tx_index. Write full response to cache. Derive tx_index from cache → DB.

async function phaseTxIndex(db: ReturnType<typeof drizzle>) {
  console.log("\n── Phase: tx-index ──");

  const [eraMin, eraMax] = ERA_RANGES[ERA] ?? ERA_RANGES.all;
  const blockMin = Math.max(FROM_BLOCK, eraMin);
  const blockMax = Math.min(TO_BLOCK, eraMax);

  let query = db
    .select({ address: contracts.address, deploymentTxHash: contracts.deploymentTxHash, deploymentBlock: contracts.deploymentBlock })
    .from(contracts)
    .where(and(
      isNotNull(contracts.deploymentTxHash),
      isNull(contracts.deploymentTxIndex),
      gte(contracts.deploymentBlock, blockMin),
      lte(contracts.deploymentBlock, blockMax),
    ))
    .orderBy(contracts.deploymentBlock);

  if (LIMIT > 0) query = query.limit(LIMIT) as typeof query;
  const rows = await query;
  console.log(`${rows.length} contracts to process`);

  let fetched = 0, cached = 0, written = 0, errors = 0;

  for (let i = 0; i < rows.length; i += ALCHEMY_BATCH) {
    const batch = rows.slice(i, i + ALCHEMY_BATCH);

    // Split into cache hits vs misses
    const hits  = new Map<string, number>(); // txHash → txIndex (from cache)
    const misses: typeof batch = [];

    for (const row of batch) {
      const hash = row.deploymentTxHash!.toLowerCase();
      const cachePath = txCachePath(hash);
      if (!FORCE && fs.existsSync(cachePath)) {
        const cached_data = readCache(cachePath);
        const idx = cached_data?.transactionIndex != null
          ? parseInt(cached_data.transactionIndex, 16)
          : null;
        if (idx !== null) { hits.set(hash, idx); cached++; continue; }
      }
      misses.push(row);
    }

    // Fetch misses from Alchemy
    if (misses.length > 0) {
      try {
        const txMap = await fetchAlchemyBatch(misses.map(r => r.deploymentTxHash!));
        for (const row of misses) {
          const hash = row.deploymentTxHash!.toLowerCase();
          const txData = txMap.get(hash);
          if (txData) {
            writeCache(txCachePath(hash), txData); // ← full response to disk
            const idx = parseInt(txData.transactionIndex, 16);
            hits.set(hash, idx);
            fetched++;
          } else {
            errors++;
          }
        }
      } catch (err: any) {
        console.error(`  ERROR batch ${i}: ${err.message}`);
        errors += misses.length;
      }
      await sleep(80); // polite pause between Alchemy batches
    }

    // Write tx_index to DB for all hits in this batch
    if (!DRY_RUN) {
      for (const row of batch) {
        const hash = row.deploymentTxHash!.toLowerCase();
        const idx = hits.get(hash);
        if (idx !== null && idx !== undefined) {
          await db.update(contracts)
            .set({ deploymentTxIndex: idx, deploymentTraceIndex: null })
            .where(sql`address = ${row.address}`);
          written++;
        }
      }
    } else {
      written += hits.size;
    }

    // Progress
    const total = i + batch.length;
    if (total % 500 === 0 || total === rows.length) {
      console.log(`  [${total}/${rows.length}] cache_hits=${cached} fetched=${fetched} written=${written} errors=${errors}`);
    }
  }

  console.log(`\nDone. fetched=${fetched} from_cache=${cached} written=${written} errors=${errors}${DRY_RUN ? " (dry run)" : ""}`);
}

// ─── Phase: creation ─────────────────────────────────────────────────────────
// For contracts missing deployment_tx_hash entirely, use Etherscan
// getContractCreation. Cache full response. Derive tx_hash, block, deployer → DB.

async function phaseCreation(db: ReturnType<typeof drizzle>) {
  console.log("\n── Phase: creation ──");

  let query = db
    .select({ address: contracts.address })
    .from(contracts)
    .where(isNull(contracts.deploymentTxHash))
    .orderBy(contracts.address);

  if (LIMIT > 0) query = query.limit(LIMIT) as typeof query;
  const rows = await query;
  console.log(`${rows.length} contracts missing tx_hash`);

  let fetched = 0, cached = 0, written = 0, errors = 0;

  for (let i = 0; i < rows.length; i += ETHERSCAN_BATCH) {
    const batch = rows.slice(i, i + ETHERSCAN_BATCH);

    const hits  = new Map<string, any>(); // address → creation data
    const misses: string[] = [];

    for (const row of batch) {
      const addr = row.address.toLowerCase();
      const cp = creationCachePath(addr);
      if (!FORCE && fs.existsSync(cp)) {
        const c = readCache(cp);
        if (c) { hits.set(addr, c); cached++; continue; }
      }
      misses.push(addr);
    }

    if (misses.length > 0) {
      try {
        const creationMap = await fetchEtherscanCreation(misses);
        for (const addr of misses) {
          const data = creationMap.get(addr);
          if (data) {
            writeCache(creationCachePath(addr), data); // ← full response to disk
            hits.set(addr, data);
            fetched++;
          } else {
            // Write a sentinel so we don't re-fetch known-missing
            writeCache(creationCachePath(addr), { _not_found: true, address: addr });
            errors++;
          }
        }
      } catch (err: any) {
        console.error(`  ERROR batch ${i}: ${err.message}`);
        errors += misses.length;
      }
      await sleep(ETHERSCAN_DELAY_MS);
    }

    // Derive columns and write to DB
    if (!DRY_RUN) {
      for (const row of batch) {
        const addr = row.address.toLowerCase();
        const data = hits.get(addr);
        if (!data || data._not_found) continue;

        const patch: Record<string, any> = {};
        if (data.txHash)           patch.deploymentTxHash  = data.txHash;
        if (data.blockNumber)      patch.deploymentBlock   = parseInt(data.blockNumber, 10);
        if (data.contractCreator)  patch.deployerAddress   = data.contractCreator.toLowerCase();

        if (Object.keys(patch).length > 0) {
          await db.update(contracts)
            .set(patch)
            .where(sql`address = ${addr}`);
          written++;
        }
      }
    } else {
      written += hits.size;
    }

    const total = i + batch.length;
    if (total % 100 === 0 || total === rows.length) {
      console.log(`  [${total}/${rows.length}] cache_hits=${cached} fetched=${fetched} written=${written} errors=${errors}`);
    }
  }

  console.log(`\nDone. fetched=${fetched} from_cache=${cached} written=${written} errors=${errors}${DRY_RUN ? " (dry run)" : ""}`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL not set");
  if (!ALCHEMY_URL && (PHASE === "tx-index" || PHASE === "all")) throw new Error("ETHEREUM_RPC_URL not set");

  const client = postgres(process.env.DATABASE_URL);
  const db = drizzle(client);

  console.log(`Mode: ${DRY_RUN ? "DRY RUN" : "LIVE"} | Era: ${ERA} | Phase: ${PHASE} | Force: ${FORCE}`);
  console.log(`Cache: ${CACHE_ROOT}`);

  if (PHASE === "tx-index" || PHASE === "all") await phaseTxIndex(db);
  if (PHASE === "creation" || PHASE === "all") await phaseCreation(db);

  await client.end();
}

main().catch(e => { console.error(e); process.exit(1); });
