/**
 * Backfill deployment_tx_index and deployment_trace_index
 * for contracts in the EH database.
 *
 * Strategy:
 *   For each unique block that contains deployed contracts:
 *   1. Fetch block tx list from Etherscan to get tx positions
 *   2. For factory-created contracts (no direct tx): fetch trace_block to get trace order
 *
 * Run with: npx tsx scripts/backfill-deployment-ordering.ts [--era frontier] [--dry-run] [--limit 100]
 *
 * Flags:
 *   --era frontier|homestead|all   Filter by era (default: all)
 *   --dry-run                       Print updates without writing to DB
 *   --limit N                       Max contracts to process (default: all)
 *   --from-block N                  Start from this block
 *   --to-block N                    End at this block
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { contracts } from "../src/lib/schema";
import { isNull, isNotNull, and, gte, lte, sql } from "drizzle-orm";

const ETHERSCAN_KEY = "AHMV3WAI75TQVJI2XEFUUKFKK1KJTFY1BD";
const ETHERSCAN_BASE = `https://api.etherscan.io/v2/api?chainid=1&apikey=${ETHERSCAN_KEY}`;
const ALCHEMY_URL = process.env.ETHEREUM_RPC_URL || "";
const BATCH_SIZE = 20; // tx lookups per Alchemy batch call

// Parse CLI args
const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const ERA = args.find((a) => a.startsWith("--era="))?.split("=")[1] || "all";
const LIMIT = parseInt(args.find((a) => a.startsWith("--limit="))?.split("=")[1] || "0");
const FROM_BLOCK = parseInt(args.find((a) => a.startsWith("--from-block="))?.split("=")[1] || "0");
const TO_BLOCK = parseInt(args.find((a) => a.startsWith("--to-block="))?.split("=")[1] || "99999999");

// Era block ranges
const ERA_RANGES: Record<string, [number, number]> = {
  frontier: [1, 1149999],
  homestead: [1150000, 2462999],
  dao: [2463000, 2674999],
  tangerine: [2675000, 2999999],
  all: [0, 99999999],
};

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchJson(url: string, retries = 5): Promise<any> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      // Etherscan rate limit — back off and retry
      if (data?.message === "NOTOK" && typeof data?.result === "string" && data.result.includes("rate limit")) {
        await sleep(1000 * (i + 2));
        continue;
      }
      return data;
    } catch (e) {
      if (i === retries - 1) throw e;
      await sleep(1000 * (i + 1));
    }
  }
}

/**
 * Batch fetch tx indices via Alchemy JSON-RPC batch.
 * Returns map of txHash (lowercase) -> transactionIndex
 */
async function batchGetTxIndices(txHashes: string[]): Promise<Map<string, number>> {
  if (!ALCHEMY_URL || txHashes.length === 0) return new Map();

  const payload = txHashes.map((hash, i) => ({
    jsonrpc: "2.0",
    id: i,
    method: "eth_getTransactionByHash",
    params: [hash],
  }));

  const res = await fetch(ALCHEMY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error(`Alchemy HTTP ${res.status}`);
  const results: Array<{ id: number; result: { transactionIndex: string } | null }> = await res.json();

  const map = new Map<string, number>();
  for (const r of results) {
    if (r.result?.transactionIndex != null) {
      map.set(txHashes[r.id].toLowerCase(), parseInt(r.result.transactionIndex, 16));
    }
  }
  return map;
}

/** Get tx list for a block — returns map of txHash -> txIndex */
async function getBlockTxPositions(blockNumber: number): Promise<Map<string, number>> {
  const hexBlock = "0x" + blockNumber.toString(16);
  // boolean=true returns full tx objects; boolean=false returns bare hashes.
  // Early Frontier blocks return bare strings — handle both formats.
  const data = await fetchJson(
    `${ETHERSCAN_BASE}&module=proxy&action=eth_getBlockByNumber&tag=${hexBlock}&boolean=true`
  );
  const txs: Array<string | { hash: string }> = data?.result?.transactions || [];
  const map = new Map<string, number>();
  txs.forEach((tx, i) => {
    const hash = typeof tx === "string" ? tx : tx.hash;
    if (hash) map.set(hash.toLowerCase(), i);
  });
  return map;
}

/**
 * For factory-created contracts: use Etherscan's getInternalTransactionsByBlockNumber
 * to find CREATE trace order within the block.
 * Returns map of contractAddress -> trace position (0-based, CREATE traces only)
 */
async function getBlockCreateTracePositions(blockNumber: number): Promise<Map<string, { txIndex: number; traceIndex: number }>> {
  await sleep(200); // gentle rate limiting
  const data = await fetchJson(
    `${ETHERSCAN_BASE}&module=account&action=txlistinternal&startblock=${blockNumber}&endblock=${blockNumber}&sort=asc`
  );
  const traces = data?.result || [];
  const map = new Map<string, { txIndex: number; traceIndex: number }>();
  let tracePos = 0;
  for (const t of traces) {
    if (t.type === "create" && t.contractAddress) {
      map.set(t.contractAddress.toLowerCase(), {
        txIndex: parseInt(t.transactionIndex || "0"),
        traceIndex: tracePos++,
      });
    }
  }
  return map;
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL not set");

  const client = postgres(connectionString);
  const db = drizzle(client);

  const [eraMin, eraMax] = ERA_RANGES[ERA] || ERA_RANGES.all;
  const blockMin = Math.max(FROM_BLOCK, eraMin);
  const blockMax = Math.min(TO_BLOCK, eraMax);

  console.log(`Mode: ${DRY_RUN ? "DRY RUN" : "LIVE"}`);
  console.log(`Era: ${ERA} (blocks ${blockMin}–${blockMax})`);

  // Fetch all contracts needing backfill (no tx_index yet)
  let query = db
    .select({
      address: contracts.address,
      deploymentBlock: contracts.deploymentBlock,
      deploymentTxHash: contracts.deploymentTxHash,
    })
    .from(contracts)
    .where(
      and(
        isNull(contracts.deploymentTxIndex),
        isNotNull(contracts.deploymentBlock),
        gte(contracts.deploymentBlock, blockMin),
        lte(contracts.deploymentBlock, blockMax)
      )
    )
    .orderBy(contracts.deploymentBlock);

  if (LIMIT > 0) query = query.limit(LIMIT) as typeof query;

  const rows = await query;
  console.log(`Found ${rows.length} contracts to backfill`);

  if (rows.length === 0) {
    console.log("Nothing to do.");
    await client.end();
    return;
  }

  let processed = 0;
  let errors = 0;

  // Flatten all rows — batch by tx hash regardless of block
  const allRows = rows.filter(r => r.deploymentBlock != null);
  const withHash = allRows.filter(r => r.deploymentTxHash);
  const noHash = allRows.filter(r => !r.deploymentTxHash); // genesis / state-init

  console.log(`  ${withHash.length} with tx hash (batch via Alchemy), ${noHash.length} genesis/no-hash`);

  // Handle genesis contracts first (no tx — rank as block 0)
  for (const contract of noHash) {
    console.log(`  ${contract.address} block=${contract.deploymentBlock} genesis/state-init → tx_index=0 trace_index=0`);
    if (!DRY_RUN) {
      await db.update(contracts).set({ deploymentTxIndex: 0, deploymentTraceIndex: 0 })
        .where(sql`address = ${contract.address}`);
    }
    processed++;
  }

  // Batch process contracts with tx hashes via Alchemy
  const hashes = withHash.map(r => r.deploymentTxHash!);
  for (let i = 0; i < hashes.length; i += BATCH_SIZE) {
    const batch = withHash.slice(i, i + BATCH_SIZE);
    const batchHashes = batch.map(r => r.deploymentTxHash!);

    let txIndexMap: Map<string, number>;
    try {
      txIndexMap = await batchGetTxIndices(batchHashes);
    } catch (err: any) {
      console.error(`  ERROR batch ${i}–${i + BATCH_SIZE}: ${err?.message}`);
      errors += batch.length;
      await sleep(2000);
      continue;
    }

    for (const contract of batch) {
      const txHash = contract.deploymentTxHash!.toLowerCase();
      const txIndex = txIndexMap.get(txHash) ?? null;

      if (txIndex === null) {
        console.warn(`  WARN: ${contract.address} block ${contract.deploymentBlock} — tx not found (${txHash})`);
        errors++;
        continue;
      }

      console.log(`  ${contract.address} block=${contract.deploymentBlock} tx_index=${txIndex}`);

      if (!DRY_RUN) {
        await db.update(contracts).set({ deploymentTxIndex: txIndex, deploymentTraceIndex: null })
          .where(sql`address = ${contract.address}`);
      }

      processed++;
    }

    // Progress checkpoint
    if (Math.floor((i + BATCH_SIZE) / 100) > Math.floor(i / 100)) {
      console.log(`  [progress] ${processed} written, ${errors} errors (${i + BATCH_SIZE}/${hashes.length})`);
    }

    // Brief pause between batches — Alchemy is generous but be polite
    await sleep(100);
  }

  console.log(`\nDone. Processed: ${processed}, Errors: ${errors}${DRY_RUN ? " (dry run — no writes)" : ""}`);
  await client.end();
}

main().catch(console.error);
