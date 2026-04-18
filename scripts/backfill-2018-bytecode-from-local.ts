#!/usr/bin/env npx tsx
/**
 * backfill-2018-bytecode-from-local.ts
 *
 * Backfills 2018 DB rows from the already-fetched local bytecode corpus:
 *   memory/eth-2018-discovery/bytecode_fetched.jsonl
 *
 * Fields populated:
 *   - runtime_bytecode
 *   - runtime_bytecode_hash
 *   - code_size_bytes
 *
 * Optimized for large runs:
 *   - dedupes local file by address in-memory as it streams
 *   - batches DB updates via VALUES tuples
 *   - checkpoints progress to disk so resume is safe after interruption
 */

import * as fs from "fs";
import * as path from "path";
import { createInterface } from "readline";
import postgres from "postgres";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const T7_DIR = path.join(
  process.env.HOME || "/Users/claw",
  ".openclaw/workspace/memory/eth-2018-discovery"
);
const CHECKPOINT_FILE = path.join(T7_DIR, "bytecode_db_backfill_progress.json");
const BATCH_SIZE = 2000;

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const reset = args.includes("--reset-progress");
const limitArg = args.find((_, i) => args[i - 1] === "--limit");
const maxUniqueRows = limitArg ? parseInt(limitArg) : Infinity;

async function* readJsonl(file: string): AsyncGenerator<any> {
  const rl = createInterface({
    input: fs.createReadStream(file),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    if (!line.trim()) continue;
    yield JSON.parse(line);
  }
}

function loadCheckpoint(): { completedUnique: number } {
  if (reset || !fs.existsSync(CHECKPOINT_FILE)) return { completedUnique: 0 };
  return JSON.parse(fs.readFileSync(CHECKPOINT_FILE, "utf-8"));
}

function saveCheckpoint(completedUnique: number) {
  fs.writeFileSync(
    CHECKPOINT_FILE,
    JSON.stringify({ completedUnique, updatedAt: new Date().toISOString() }, null, 2)
  );
}

async function main() {
  const bytecodeFile = path.join(T7_DIR, "bytecode_fetched.jsonl");
  if (!fs.existsSync(bytecodeFile)) {
    console.error(`ERROR: ${bytecodeFile} not found.`);
    process.exit(1);
  }

  const checkpoint = loadCheckpoint();
  const sql = postgres(process.env.POSTGRES_URL!, { prepare: false, max: 3 });

  console.log("=== EH 2018 Local Bytecode Backfill ===");
  console.log(`Mode: ${dryRun ? "DRY RUN" : "LIVE"}`);
  console.log(`Resume from unique row: ${checkpoint.completedUnique}`);

  let scanned = 0;
  let uniqueSeen = 0;
  let uniqueProcessed = 0;
  let duplicates = 0;
  let applied = 0;
  const seenAddresses = new Set<string>();
  let batch: Array<[string, string, string, number]> = [];

  async function flushBatch() {
    if (batch.length === 0) return;

    if (dryRun) {
      applied += batch.length;
      batch = [];
      return;
    }

    const values = sql(batch);
    await sql`
      UPDATE contracts AS c
      SET runtime_bytecode = COALESCE(c.runtime_bytecode, NULLIF(v.runtime_bytecode, '')),
          runtime_bytecode_hash = COALESCE(c.runtime_bytecode_hash, NULLIF(v.runtime_bytecode_hash, '')),
          code_size_bytes = COALESCE(c.code_size_bytes, NULLIF(v.code_size_bytes, -1))
      FROM (
        SELECT
          address::text AS address,
          runtime_bytecode::text AS runtime_bytecode,
          runtime_bytecode_hash::text AS runtime_bytecode_hash,
          code_size_bytes::integer AS code_size_bytes
        FROM (VALUES ${values}) AS raw(address, runtime_bytecode, runtime_bytecode_hash, code_size_bytes)
      ) AS v
      WHERE c.address = v.address
        AND c.deployment_block BETWEEN 4850000 AND 6988614
        AND c.runtime_bytecode IS NULL
    `;

    applied += batch.length;
    batch = [];
    saveCheckpoint(checkpoint.completedUnique + uniqueProcessed);
  }

  for await (const obj of readJsonl(bytecodeFile)) {
    scanned++;
    const address = String(obj.address || "").toLowerCase();
    if (!address) continue;
    if (seenAddresses.has(address)) {
      duplicates++;
      continue;
    }
    seenAddresses.add(address);
    uniqueSeen++;

    if (uniqueSeen <= checkpoint.completedUnique) {
      continue;
    }
    if (uniqueProcessed >= maxUniqueRows) break;

    uniqueProcessed++;
    const runtimeBytecode = typeof obj.runtime_bytecode === "string" ? obj.runtime_bytecode : "";
    const runtimeBytecodeHash = typeof obj.runtime_bytecode_hash === "string" ? obj.runtime_bytecode_hash : "";
    const codeSizeBytes = Number.isInteger(obj.code_size_bytes) ? obj.code_size_bytes : -1;

    batch.push([
      address,
      runtimeBytecode,
      runtimeBytecodeHash,
      codeSizeBytes,
    ]);

    if (batch.length >= BATCH_SIZE) {
      await flushBatch();
    }

    if (uniqueProcessed % 50000 === 0) {
      console.log(`  scanned=${scanned} unique_seen=${uniqueSeen} processed=${uniqueProcessed} applied=${applied} duplicates=${duplicates}`);
    }
  }

  await flushBatch();

  console.log("\n=== Backfill Complete ===");
  console.log(`Scanned rows: ${scanned}`);
  console.log(`Unique addresses seen: ${uniqueSeen}`);
  console.log(`Unique rows processed this run: ${uniqueProcessed}`);
  console.log(`Rows applied-attempted: ${applied}`);
  console.log(`Duplicate bytecode rows skipped: ${duplicates}`);

  await sql.end();
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
