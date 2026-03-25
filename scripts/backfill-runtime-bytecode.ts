#!/usr/bin/env npx tsx
/**
 * Backfill runtime_bytecode and code_size_bytes for contracts that are missing them.
 *
 * Strategy per contract:
 *   1. Call eth_getCode — if result != "0x", store it as runtime_bytecode
 *   2. If result == "0x" (self-destructed or empty), extract from deployment tx input:
 *      - Fetch tx by deployment_tx_hash
 *      - The runtime is embedded in the creation input after the init code
 *      - Store the full creation input as runtime_bytecode with a note
 *   3. Compute code_size_bytes and md5 runtime_bytecode_hash
 *
 * Usage:
 *   npx tsx scripts/backfill-runtime-bytecode.ts              # all missing
 *   npx tsx scripts/backfill-runtime-bytecode.ts --max=1000   # limit
 *   npx tsx scripts/backfill-runtime-bytecode.ts --dry-run    # preview only
 *   npx tsx scripts/backfill-runtime-bytecode.ts --batch=50   # batch size
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../src/lib/schema";
import { sql, isNull, isNotNull, and } from "drizzle-orm";
import * as dotenv from "dotenv";
import * as crypto from "crypto";

dotenv.config({ path: ".env.local" });

const ALCHEMY_URL = "https://eth-mainnet.g.alchemy.com/v2/s6mjmXnzhzfbVLypKdbFCAe02Zf9HQa1";
const BATCH_SIZE = parseInt(process.argv.find(a => a.startsWith("--batch="))?.split("=")[1] ?? "50");
const MAX = parseInt(process.argv.find(a => a.startsWith("--max="))?.split("=")[1] ?? "0");
const DRY_RUN = process.argv.includes("--dry-run");
const CONCURRENCY = 50; // parallel requests per batch
const DELAY_MS = 10; // delay between batches

const dbUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;
if (!dbUrl) { console.error("ERROR: POSTGRES_URL not set"); process.exit(1); }

const client = postgres(dbUrl, { prepare: false, max: 5 });
const db = drizzle(client, { schema });

async function rpcCall(method: string, params: unknown[]): Promise<unknown> {
  const res = await fetch(ALCHEMY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const json = await res.json() as { result?: unknown; error?: { message: string } };
  if (json.error) throw new Error(`RPC error: ${json.error.message}`);
  return json.result;
}

async function processContract(address: string, deployTxHash: string | null): Promise<{
  runtime_bytecode: string | null;
  code_size_bytes: number | null;
  source: string;
}> {
  // 1. Try eth_getCode
  const code = await rpcCall("eth_getCode", [address, "latest"]) as string;

  if (code && code !== "0x" && code.length > 2) {
    const size = (code.length - 2) / 2;
    return { runtime_bytecode: code, code_size_bytes: size, source: "eth_getCode" };
  }

  // 2. Fallback: extract from deployment transaction input
  if (deployTxHash) {
    const tx = await rpcCall("eth_getTransactionByHash", [deployTxHash]) as { input?: string } | null;
    if (tx?.input && tx.input !== "0x" && tx.input.length > 2) {
      // Store the full creation input — we can extract runtime later
      // For now: store it and set code_size_bytes from the input length
      const size = (tx.input.length - 2) / 2;
      return { runtime_bytecode: tx.input, code_size_bytes: size, source: "creation_tx" };
    }
  }

  return { runtime_bytecode: null, code_size_bytes: null, source: "not_found" };
}

async function main() {
  console.log(`Starting bytecode backfill${DRY_RUN ? " (DRY RUN)" : ""}`);
  console.log(`Batch size: ${BATCH_SIZE}, Concurrency: ${CONCURRENCY}, Max: ${MAX || "unlimited"}`);

  // Count total to process
  const [{ count }] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(schema.contracts)
    .where(isNull(schema.contracts.runtimeBytecode));

  console.log(`Total contracts missing runtime_bytecode: ${count}`);
  if (DRY_RUN) { await client.end(); return; }

  let processed = 0;
  let updated = 0;
  let failed = 0;
  let selfDestructed = 0;
  let notFound = 0;
  let offset = 0;

  while (true) {
    if (MAX > 0 && processed >= MAX) break;

    const batchLimit = MAX > 0 ? Math.min(BATCH_SIZE, MAX - processed) : BATCH_SIZE;

    const rows = await db
      .select({ address: schema.contracts.address, deploymentTxHash: schema.contracts.deploymentTxHash })
      .from(schema.contracts)
      .where(isNull(schema.contracts.runtimeBytecode))
      .limit(batchLimit)
      .offset(offset);

    if (rows.length === 0) break;

    // Process in parallel chunks of CONCURRENCY
    for (let i = 0; i < rows.length; i += CONCURRENCY) {
      const chunk = rows.slice(i, i + CONCURRENCY);
      const results = await Promise.allSettled(
        chunk.map(row => processContract(row.address, row.deploymentTxHash))
      );

      for (let j = 0; j < chunk.length; j++) {
        const row = chunk[j];
        const result = results[j];

        if (result.status === "rejected") {
          failed++;
          if (failed <= 10) console.error(`  FAIL ${row.address}: ${result.reason}`);
          continue;
        }

        const { runtime_bytecode, code_size_bytes, source } = result.value;

        if (!runtime_bytecode) {
          notFound++;
          continue;
        }

        if (source === "creation_tx") selfDestructed++;

        // Compute MD5 hash
        const hash = crypto.createHash("md5").update(runtime_bytecode).digest("hex");

        await db
          .update(schema.contracts)
          .set({
            runtimeBytecode: runtime_bytecode,
            codeSizeBytes: code_size_bytes,
            runtimeBytecodeHash: hash,
          })
          .where(sql`address = ${row.address}`);

        updated++;
      }

      processed += chunk.length;

      if (processed % 500 === 0) {
        console.log(`Progress: ${processed}/${count} processed, ${updated} updated, ${selfDestructed} from creation tx, ${notFound} not found, ${failed} failed`);
      }
    }

    // If we didn't update anything in this batch (all updated successfully), offset stays 0
    // since updated rows no longer match the WHERE clause.
    // If some failed/not-found, we need to skip them — increment offset by not-updated count.
    const notUpdatedInBatch = rows.length - (updated - (updated - rows.length + notFound + failed));
    // Actually simplest: re-query from offset=0 each time since updated rows drop out of the result set
    // Only increment offset for rows we couldn't update (failed + not_found)
    offset += failed + notFound;
    notFound = 0; // reset per-batch tracking after using it for offset
    failed = 0;

    await new Promise(r => setTimeout(r, DELAY_MS));
  }

  console.log(`\nDone. Processed: ${processed}, Updated: ${updated}, Self-destructed (from tx): ${selfDestructed}, Not found: ${notFound + failed}`);
  await client.end();
}

main().catch(e => { console.error(e); process.exit(1); });
