/**
 * pull-and-cache.ts
 *
 * Comprehensive on-chain data pull. Fetches raw API responses, writes them to
 * disk cache (T7 Shield), then derives and updates all DB columns from cache.
 *
 * Principle: fetch once, store everything, never re-hit APIs for stored data.
 * All raw responses go to /Volumes/T7 Shield/eth-contract-cache/ before any
 * DB write. Future columns are derived from cache, not new API calls.
 *
 * Cache layout:
 *   tx/<txhash>.json          → eth_getTransactionByHash (from, input, gasPrice, gas, nonce, ...)
 *   receipt/<txhash>.json     → eth_getTransactionReceipt (status, gasUsed, contractAddress, logs)
 *   code/<address>.json       → eth_getCode (deployed runtime bytecode — ground truth)
 *   creation/<address>.json   → Etherscan getContractCreation (for missing tx_hash)
 *
 * Columns populated:
 *   deployment_tx_index       ← tx.transactionIndex
 *   deploy_status             ← receipt.status (0x1=success, 0x0=failed)
 *   gas_used                  ← receipt.gasUsed
 *   gas_price                 ← tx.gasPrice
 *   deploy_gas_limit          ← tx.gas
 *   deploy_nonce              ← tx.nonce
 *   deployer_address          ← tx.from (if missing)
 *   deployment_block          ← tx.blockNumber (if missing)
 *   creation_bytecode         ← tx.input
 *   deployed_bytecode         ← eth_getCode result
 *   code_size_bytes           ← len(deployed_bytecode) / 2 - 1  [corrected from deployed code]
 *   runtime_bytecode          ← set to '0x' if deploy_status=failed (correct bad seed data)
 *
 * Usage:
 *   npx tsx --conditions=node scripts/pull-and-cache.ts [options]
 *
 * Options:
 *   --phase tx          Fetch tx data (default)
 *   --phase receipt     Fetch receipts
 *   --phase code        Fetch deployed bytecode
 *   --phase creation    Fetch Etherscan creation (missing tx_hash only)
 *   --phase all         Run all phases in order
 *   --era frontier|homestead|all
 *   --from-block N / --to-block N
 *   --limit N
 *   --dry-run           Don't write to DB (still writes cache)
 *   --force             Re-fetch even if cache file exists
 */

import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql, isNull, isNotNull, and, gte, lte, or, eq } from "drizzle-orm";
import { contracts } from "../src/lib/schema";
import fs from "fs";
import path from "path";

// ─── Config ──────────────────────────────────────────────────────────────────

const CACHE_ROOT   = "/Volumes/T7 Shield/eth-contract-cache";
const TX_DIR       = path.join(CACHE_ROOT, "tx");
const RECEIPT_DIR  = path.join(CACHE_ROOT, "receipt");
const CODE_DIR     = path.join(CACHE_ROOT, "code");
const CREATION_DIR = path.join(CACHE_ROOT, "creation");

for (const d of [TX_DIR, RECEIPT_DIR, CODE_DIR, CREATION_DIR]) {
  fs.mkdirSync(d, { recursive: true });
}

const ALCHEMY_URL    = process.env.ETHEREUM_RPC_URL!;
const ETHERSCAN_KEY  = "AHMV3WAI75TQVJI2XEFUUKFKK1KJTFY1BD";
const ETHERSCAN_BASE = `https://api.etherscan.io/v2/api?chainid=1&apikey=${ETHERSCAN_KEY}`;

const ALCHEMY_BATCH    = 20;   // requests per JSON-RPC batch
const ETHERSCAN_BATCH  = 5;    // addresses per getContractCreation call
const ETHERSCAN_DELAY  = 250;  // ms between Etherscan calls
const ALCHEMY_DELAY    = 80;   // ms between Alchemy batches

// ─── CLI args ────────────────────────────────────────────────────────────────

const args     = process.argv.slice(2);
const DRY_RUN  = args.includes("--dry-run");
const FORCE    = args.includes("--force");
const LIMIT    = parseInt(args.find(a => a.startsWith("--limit="))?.split("=")[1]      ?? "0");
const ERA      = args.find(a => a.startsWith("--era="))?.split("=")[1]                  ?? "all";
const PHASE    = args.find(a => a.startsWith("--phase="))?.split("=")[1]                ?? "tx";
const FROM_BLK = parseInt(args.find(a => a.startsWith("--from-block="))?.split("=")[1]  ?? "0");
const TO_BLK   = parseInt(args.find(a => a.startsWith("--to-block="))?.split("=")[1]    ?? "99999999");

const ERA_RANGES: Record<string, [number, number]> = {
  frontier:  [1,        1149999],
  homestead: [1150000,  2462999],
  dao:       [2463000,  2674999],
  all:       [0,        99999999],
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
const cachePath = (dir: string, key: string) => path.join(dir, `${key.toLowerCase()}.json`);
const readCache  = (p: string): any | null => { try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; } };
const writeCache = (p: string, d: any) => fs.writeFileSync(p, JSON.stringify(d));

function hexToInt(hex: string | null | undefined): number | null {
  if (!hex) return null;
  const n = parseInt(hex, 16);
  return isNaN(n) ? null : n;
}

function deployedCodeSize(hex: string | null | undefined): number {
  if (!hex || hex === "0x" || hex === "") return 0;
  return Math.floor((hex.length - 2) / 2);
}

/** Alchemy JSON-RPC batch. Returns array of results in same order as methods. */
async function alchemyBatch(
  requests: Array<{ method: string; params: any[] }>
): Promise<any[]> {
  const payload = requests.map((r, i) => ({ jsonrpc: "2.0", id: i, ...r }));
  const res = await fetch(ALCHEMY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Alchemy HTTP ${res.status}`);
  const results: Array<{ id: number; result: any; error?: any }> = await res.json();
  const out = new Array(requests.length).fill(null);
  for (const r of results) out[r.id] = r.result ?? null;
  return out;
}

async function etherscanCreationBatch(addresses: string[]): Promise<Map<string, any>> {
  const map = new Map<string, any>();
  for (let attempt = 0; attempt < 5; attempt++) {
    const res  = await fetch(`${ETHERSCAN_BASE}&module=contract&action=getcontractcreation&contractaddresses=${addresses.join(",")}`);
    const data = await res.json() as any;
    if (data?.message === "NOTOK" && String(data?.result).includes("rate limit")) {
      await sleep(2000 * (attempt + 1));
      continue;
    }
    for (const item of (data?.result ?? [])) map.set(item.contractAddress.toLowerCase(), item);
    return map;
  }
  return map;
}

// ─── Progress tracker ────────────────────────────────────────────────────────

class Progress {
  fetched = 0; cached = 0; written = 0; errors = 0; skipped = 0;
  log(i: number, total: number) {
    if (i % 500 === 0 || i === total) {
      process.stdout.write(`\r  [${i}/${total}] fetched=${this.fetched} cached=${this.cached} written=${this.written} errors=${this.errors} skipped=${this.skipped}    `);
      if (i === total) process.stdout.write("\n");
    }
  }
}

// ─── Phase: tx ───────────────────────────────────────────────────────────────
// eth_getTransactionByHash for all contracts with a deployment_tx_hash.
// Populates: deployment_tx_index, deploy_gas_limit, deploy_nonce, gas_price,
//            deployer_address (if missing), deployment_block (if missing),
//            creation_bytecode.

async function phaseTx(db: ReturnType<typeof drizzle>) {
  console.log("\n── Phase: tx (eth_getTransactionByHash) ──");
  const [eraMin, eraMax] = ERA_RANGES[ERA] ?? ERA_RANGES.all;
  const blockMin = Math.max(FROM_BLK, eraMin), blockMax = Math.min(TO_BLK, eraMax);

  let q = db.select({
    address: contracts.address,
    deploymentTxHash: contracts.deploymentTxHash,
  }).from(contracts).where(and(
    isNotNull(contracts.deploymentTxHash),
    gte(contracts.deploymentBlock, blockMin),
    lte(contracts.deploymentBlock, blockMax),
  )).orderBy(contracts.deploymentBlock) as any;
  if (LIMIT > 0) q = q.limit(LIMIT);
  const rows = await q;
  console.log(`${rows.length} contracts`);

  const p = new Progress();
  for (let i = 0; i < rows.length; i += ALCHEMY_BATCH) {
    const batch = rows.slice(i, i + ALCHEMY_BATCH);
    const toFetch: typeof batch = [];

    // Check cache first
    const cached: Map<string, any> = new Map();
    for (const row of batch) {
      const cp = cachePath(TX_DIR, row.deploymentTxHash!);
      if (!FORCE && fs.existsSync(cp)) {
        const d = readCache(cp);
        if (d) { cached.set(row.address, d); p.cached++; continue; }
      }
      toFetch.push(row);
    }

    // Fetch misses
    if (toFetch.length > 0) {
      try {
        const results = await alchemyBatch(toFetch.map((r: any) => ({
          method: "eth_getTransactionByHash",
          params: [r.deploymentTxHash!],
        })));
        for (let j = 0; j < toFetch.length; j++) {
          const data = results[j];
          if (data) {
            writeCache(cachePath(TX_DIR, toFetch[j].deploymentTxHash!), data);
            cached.set(toFetch[j].address, data);
            p.fetched++;
          } else {
            p.errors++;
          }
        }
        await sleep(ALCHEMY_DELAY);
      } catch (e: any) {
        console.error(`\n  ERROR batch ${i}: ${e.message}`);
        p.errors += toFetch.length;
      }
    }

    // Derive and write to DB
    if (!DRY_RUN) {
      for (const row of batch) {
        const d = cached.get(row.address);
        if (!d) continue;
        const patch: Record<string, any> = {};
        const txIdx = hexToInt(d.transactionIndex);
        if (txIdx !== null) patch.deploymentTxIndex = txIdx;
        if (d.gasPrice)    patch.gasPrice        = d.gasPrice;
        if (d.gas)         patch.deployGasLimit  = hexToInt(d.gas);
        if (d.nonce)       patch.deployNonce     = hexToInt(d.nonce);
        if (d.from)        patch.deployerAddress = d.from.toLowerCase();
        if (d.blockNumber) patch.deploymentBlock = hexToInt(d.blockNumber);
        if (d.input && d.input !== "0x") patch.creationBytecode = d.input;
        if (Object.keys(patch).length > 0) {
          await db.update(contracts).set(patch).where(sql`address = ${row.address}`);
          p.written++;
        } else {
          p.skipped++;
        }
      }
    } else {
      p.written += cached.size;
    }

    p.log(i + batch.length, rows.length);
  }
  console.log(`Done. fetched=${p.fetched} cached=${p.cached} written=${p.written} errors=${p.errors}${DRY_RUN ? " (dry run)" : ""}`);
}

// ─── Phase: receipt ──────────────────────────────────────────────────────────
// eth_getTransactionReceipt for all contracts with a deployment_tx_hash.
// Populates: deploy_status, gas_used.
// Side-effect: sets runtime_bytecode='0x', code_size_bytes=0 for failed deploys.

async function phaseReceipt(db: ReturnType<typeof drizzle>) {
  console.log("\n── Phase: receipt (eth_getTransactionReceipt) ──");
  const [eraMin, eraMax] = ERA_RANGES[ERA] ?? ERA_RANGES.all;
  const blockMin = Math.max(FROM_BLK, eraMin), blockMax = Math.min(TO_BLK, eraMax);

  let q = db.select({
    address: contracts.address,
    deploymentTxHash: contracts.deploymentTxHash,
  }).from(contracts).where(and(
    isNotNull(contracts.deploymentTxHash),
    isNull(contracts.deployStatus),           // only fetch what we don't have yet
    gte(contracts.deploymentBlock, blockMin),
    lte(contracts.deploymentBlock, blockMax),
  )).orderBy(contracts.deploymentBlock) as any;
  if (LIMIT > 0) q = q.limit(LIMIT);
  const rows = await q;
  console.log(`${rows.length} contracts`);

  const p = new Progress();
  let failedDeploys = 0;

  for (let i = 0; i < rows.length; i += ALCHEMY_BATCH) {
    const batch = rows.slice(i, i + ALCHEMY_BATCH);
    const toFetch: typeof batch = [];
    const cached: Map<string, any> = new Map();

    for (const row of batch) {
      const cp = cachePath(RECEIPT_DIR, row.deploymentTxHash!);
      if (!FORCE && fs.existsSync(cp)) {
        const d = readCache(cp);
        if (d) { cached.set(row.address, d); p.cached++; continue; }
      }
      toFetch.push(row);
    }

    if (toFetch.length > 0) {
      try {
        const results = await alchemyBatch(toFetch.map((r: any) => ({
          method: "eth_getTransactionReceipt",
          params: [r.deploymentTxHash!],
        })));
        for (let j = 0; j < toFetch.length; j++) {
          const data = results[j];
          if (data) {
            writeCache(cachePath(RECEIPT_DIR, toFetch[j].deploymentTxHash!), data);
            cached.set(toFetch[j].address, data);
            p.fetched++;
          } else {
            p.errors++;
          }
        }
        await sleep(ALCHEMY_DELAY);
      } catch (e: any) {
        console.error(`\n  ERROR batch ${i}: ${e.message}`);
        p.errors += toFetch.length;
      }
    }

    if (!DRY_RUN) {
      for (const row of batch) {
        const d = cached.get(row.address);
        if (!d) continue;
        const status = d.status === "0x1" ? "success" : "failed";
        const gasUsed = hexToInt(d.gasUsed);
        const patch: Record<string, any> = { deployStatus: status };
        if (gasUsed !== null) patch.gasUsed = gasUsed;

        if (status === "failed") {
          // Correct bad seed data — nothing was written on-chain
          patch.runtimeBytecode = "0x";
          patch.codeSizeBytes   = 0;
          patch.deploymentTxIndex = null; // exclude from rank
          failedDeploys++;
        }

        await db.update(contracts).set(patch).where(sql`address = ${row.address}`);
        p.written++;
      }
    } else {
      p.written += cached.size;
    }

    p.log(i + batch.length, rows.length);
  }
  console.log(`Done. fetched=${p.fetched} cached=${p.cached} written=${p.written} failed_deploys=${failedDeploys} errors=${p.errors}${DRY_RUN ? " (dry run)" : ""}`);
}

// ─── Phase: code ─────────────────────────────────────────────────────────────
// eth_getCode for all contracts — ground-truth deployed bytecode.
// Populates: deployed_bytecode, code_size_bytes (corrected).
// Skips contracts already marked deploy_status='failed'.

async function phaseCode(db: ReturnType<typeof drizzle>) {
  console.log("\n── Phase: code (eth_getCode) ──");
  const [eraMin, eraMax] = ERA_RANGES[ERA] ?? ERA_RANGES.all;
  const blockMin = Math.max(FROM_BLK, eraMin), blockMax = Math.min(TO_BLK, eraMax);

  let q = db.select({ address: contracts.address })
    .from(contracts)
    .where(and(
      gte(contracts.deploymentBlock, blockMin),
      lte(contracts.deploymentBlock, blockMax),
      // Skip known failures — no point fetching code we know is empty
      or(isNull(contracts.deployStatus), eq(contracts.deployStatus, "success")),
      isNull(contracts.deployedBytecode),   // only what we don't have
    ))
    .orderBy(contracts.deploymentBlock) as any;
  if (LIMIT > 0) q = q.limit(LIMIT);
  const rows = await q;
  console.log(`${rows.length} contracts`);

  const p = new Progress();

  for (let i = 0; i < rows.length; i += ALCHEMY_BATCH) {
    const batch = rows.slice(i, i + ALCHEMY_BATCH);
    const toFetch: { address: string }[] = [];
    const cached: Map<string, string> = new Map(); // address → bytecode hex

    for (const row of batch) {
      const cp = cachePath(CODE_DIR, row.address);
      if (!FORCE && fs.existsSync(cp)) {
        const d = readCache(cp);
        if (d?.code !== undefined) { cached.set(row.address, d.code); p.cached++; continue; }
      }
      toFetch.push(row);
    }

    if (toFetch.length > 0) {
      try {
        const results = await alchemyBatch(toFetch.map((r: any) => ({
          method: "eth_getCode",
          params: [r.address, "latest"],
        })));
        for (let j = 0; j < toFetch.length; j++) {
          const code = results[j] ?? "0x";
          writeCache(cachePath(CODE_DIR, toFetch[j].address), { code, address: toFetch[j].address });
          cached.set(toFetch[j].address, code);
          p.fetched++;
        }
        await sleep(ALCHEMY_DELAY);
      } catch (e: any) {
        console.error(`\n  ERROR batch ${i}: ${e.message}`);
        p.errors += toFetch.length;
      }
    }

    if (!DRY_RUN) {
      for (const row of batch) {
        const code = cached.get(row.address);
        if (code === undefined) continue;
        const codeSize = deployedCodeSize(code);
        const patch: Record<string, any> = {
          deployedBytecode: code,
          codeSizeBytes: codeSize,
        };
        // Correct any seed data that had wrong bytecode
        if (code === "0x" || code === "") {
          patch.runtimeBytecode   = "0x";
          patch.codeSizeBytes     = 0;
          patch.deployStatus      = "failed";
          patch.deploymentTxIndex = null;
        }
        await db.update(contracts).set(patch).where(sql`address = ${row.address}`);
        p.written++;
      }
    } else {
      p.written += cached.size;
    }

    p.log(i + batch.length, rows.length);
  }
  console.log(`Done. fetched=${p.fetched} cached=${p.cached} written=${p.written} errors=${p.errors}${DRY_RUN ? " (dry run)" : ""}`);
}

// ─── Phase: creation ─────────────────────────────────────────────────────────
// Etherscan getContractCreation for contracts missing deployment_tx_hash.
// Populates: deployment_tx_hash, deployment_block, deployer_address.

async function phaseCreation(db: ReturnType<typeof drizzle>) {
  console.log("\n── Phase: creation (Etherscan getContractCreation) ──");

  let q = db.select({ address: contracts.address })
    .from(contracts)
    .where(isNull(contracts.deploymentTxHash)) as any;
  if (LIMIT > 0) q = q.limit(LIMIT);
  const rows = await q;
  console.log(`${rows.length} contracts missing tx_hash`);

  const p = new Progress();

  for (let i = 0; i < rows.length; i += ETHERSCAN_BATCH) {
    const batch = rows.slice(i, i + ETHERSCAN_BATCH);
    const toFetch: string[] = [];
    const cached: Map<string, any> = new Map();

    for (const row of batch) {
      const cp = cachePath(CREATION_DIR, row.address);
      if (!FORCE && fs.existsSync(cp)) {
        const d = readCache(cp);
        if (d) { if (!d._not_found) cached.set(row.address, d); p.cached++; continue; }
      }
      toFetch.push(row.address);
    }

    if (toFetch.length > 0) {
      try {
        const map = await etherscanCreationBatch(toFetch);
        for (const addr of toFetch) {
          const data = map.get(addr);
          writeCache(cachePath(CREATION_DIR, addr), data ?? { _not_found: true, address: addr });
          if (data) { cached.set(addr, data); p.fetched++; }
          else p.errors++;
        }
        await sleep(ETHERSCAN_DELAY);
      } catch (e: any) {
        console.error(`\n  ERROR batch ${i}: ${e.message}`);
        p.errors += toFetch.length;
      }
    }

    if (!DRY_RUN) {
      for (const row of batch) {
        const d = cached.get(row.address);
        if (!d) continue;
        const patch: Record<string, any> = {};
        if (d.txHash)           patch.deploymentTxHash = d.txHash;
        if (d.blockNumber)      patch.deploymentBlock  = parseInt(d.blockNumber, 10);
        if (d.contractCreator)  patch.deployerAddress  = d.contractCreator.toLowerCase();
        if (Object.keys(patch).length > 0) {
          await db.update(contracts).set(patch).where(sql`address = ${row.address}`);
          p.written++;
        }
      }
    } else {
      p.written += cached.size;
    }

    p.log(i + batch.length, rows.length);
  }
  console.log(`Done. fetched=${p.fetched} cached=${p.cached} written=${p.written} errors=${p.errors}${DRY_RUN ? " (dry run)" : ""}`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL not set");
  if (!ALCHEMY_URL) throw new Error("ETHEREUM_RPC_URL not set");

  const client = postgres(process.env.DATABASE_URL);
  const db     = drizzle(client);

  const phases = PHASE === "all"
    ? ["tx", "receipt", "code", "creation"]
    : [PHASE];

  console.log(`Mode: ${DRY_RUN ? "DRY RUN" : "LIVE"} | Era: ${ERA} | Phases: ${phases.join(", ")} | Force: ${FORCE}`);
  console.log(`Cache: ${CACHE_ROOT}\n`);

  for (const phase of phases) {
    if (phase === "tx")       await phaseTx(db);
    if (phase === "receipt")  await phaseReceipt(db);
    if (phase === "code")     await phaseCode(db);
    if (phase === "creation") await phaseCreation(db);
  }

  await client.end();
  console.log("\nAll phases complete.");
}

main().catch(e => { console.error(e); process.exit(1); });
