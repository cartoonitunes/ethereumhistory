#!/usr/bin/env npx tsx

/**
 * Backfill capability classification v2
 *
 * Usage:
 *   npx tsx scripts/backfill-capabilities-beta.ts                    # dry-run, sample 200
 *   npx tsx scripts/backfill-capabilities-beta.ts --max=50           # dry-run, sample 50
 *   npx tsx scripts/backfill-capabilities-beta.ts --full             # dry-run, all contracts
 *   npx tsx scripts/backfill-capabilities-beta.ts --commit           # write data/capabilities-preview.json to DB
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../src/lib/schema";
import { sql } from "drizzle-orm";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import { classifyContract, type CapabilityRow } from "../src/lib/capabilities";

dotenv.config({ path: ".env.local" });

const dbUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("ERROR: POSTGRES_URL (or DATABASE_URL) not set");
  process.exit(1);
}

const client = postgres(dbUrl, { prepare: false, max: 5 });
const db = drizzle(client, { schema });

const DETECTOR_VERSION = "capability-v2";
const PREVIEW_FILE = path.join(process.cwd(), "data", "capabilities-preview.json");
const BATCH_SIZE = 500;

async function flushCapabilities(batch: CapabilityRow[]) {
  if (batch.length === 0) return;
  const values = batch.map(
    (r) =>
      sql`(${r.contractAddress}, ${r.capabilityKey}, ${r.status}, ${r.confidence}, ${r.primaryEvidenceType}, ${DETECTOR_VERSION}, NOW(), NOW())`
  );
  await db.execute(sql`
    INSERT INTO contract_capabilities (
      contract_address, capability_key, status, confidence, primary_evidence_type, detector_version, created_at, updated_at
    ) VALUES ${sql.join(values, sql`, `)}
    ON CONFLICT (contract_address, capability_key)
    DO UPDATE SET
      status = EXCLUDED.status,
      confidence = EXCLUDED.confidence,
      primary_evidence_type = EXCLUDED.primary_evidence_type,
      detector_version = EXCLUDED.detector_version,
      updated_at = NOW()
  `);
}

async function runDryRun(maxContracts: number, fullMode: boolean) {
  console.log("=== DRY RUN ===");
  console.log(fullMode ? "Mode: FULL (all contracts)" : `Mode: SAMPLE (max ${maxContracts})`);
  console.log("Reading contracts from DB...");

  const baseQuery = db
    .select({
      address: schema.contracts.address,
      runtimeBytecode: schema.contracts.runtimeBytecode,
      sourceCode: schema.contracts.sourceCode,
      decompiledCode: schema.contracts.decompiledCode,
      isErc20Like: schema.contracts.isErc20Like,
      contractType: schema.contracts.contractType,
      hasSelfDestruct: schema.contracts.hasSelfDestruct,
    })
    .from(schema.contracts)
    .where(sql`deployment_timestamp >= '2015-01-01'::timestamp AND deployment_timestamp < '2018-01-01'::timestamp`)
    .orderBy(sql`deployment_timestamp ASC NULLS LAST`);

  const contracts = fullMode ? await baseQuery : await baseQuery.limit(maxContracts);
  console.log(`Contracts to classify: ${contracts.length}`);

  const allRows: CapabilityRow[] = [];
  const stats: Record<string, number> = {};
  let processed = 0;
  const startTime = Date.now();

  for (const c of contracts) {
    const rows = classifyContract({
      address: c.address,
      runtimeBytecode: c.runtimeBytecode,
      sourceCode: c.sourceCode,
      decompiledCode: c.decompiledCode,
      isErc20Like: c.isErc20Like ?? undefined,
      contractType: c.contractType,
      hasSelfDestruct: c.hasSelfDestruct ?? undefined,
    });

    for (const row of rows) {
      allRows.push(row);
      const k = `${row.capabilityKey}:${row.status}`;
      stats[k] = (stats[k] || 0) + 1;
    }

    processed++;
    if (processed % 5000 === 0) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const rate = (processed / ((Date.now() - startTime) / 1000)).toFixed(0);
      console.log(`Processed ${processed}/${contracts.length} (${elapsed}s, ${rate}/s)`);
    }
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);

  // Write preview file
  const dataDir = path.dirname(PREVIEW_FILE);
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  fs.writeFileSync(
    PREVIEW_FILE,
    JSON.stringify({ detectorVersion: DETECTOR_VERSION, rows: allRows }, null, 2)
  );

  console.log(`\nClassified ${processed} contracts in ${totalTime}s`);
  console.log(`Total capability rows: ${allRows.length}`);
  console.log(`Preview written to: ${PREVIEW_FILE}`);

  console.log("\n--- Summary by capability ---");
  const sorted = Object.entries(stats).sort(([a], [b]) => a.localeCompare(b));
  for (const [key, count] of sorted) {
    console.log(`  ${key}: ${count}`);
  }
}

async function runCommit() {
  console.log("=== COMMIT MODE ===");

  if (!fs.existsSync(PREVIEW_FILE)) {
    console.error(`Preview file not found: ${PREVIEW_FILE}`);
    console.error("Run without --commit first to generate it.");
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(PREVIEW_FILE, "utf-8"));
  const rows: CapabilityRow[] = data.rows;

  if (!rows || rows.length === 0) {
    console.error("No rows in preview file.");
    process.exit(1);
  }

  console.log(`Rows to write: ${rows.length}`);
  console.log(`Detector version: ${data.detectorVersion}`);

  // Delete old rows from previous detector versions
  console.log("Deleting old capability rows...");
  await db.execute(sql`
    DELETE FROM contract_capabilities WHERE detector_version != ${DETECTOR_VERSION} OR detector_version IS NULL
  `);

  // Also delete rows from current version to do a clean re-insert
  await db.execute(sql`
    DELETE FROM contract_capabilities WHERE detector_version = ${DETECTOR_VERSION}
  `);

  console.log("Writing new rows...");
  let written = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    await flushCapabilities(batch);
    written += batch.length;
    if (written % 5000 === 0 || written === rows.length) {
      console.log(`  Written ${written}/${rows.length}`);
    }
  }

  console.log(`Done. ${written} rows committed.`);
}

async function run() {
  const argv = process.argv.slice(2);
  const commitMode = argv.includes("--commit");
  const fullMode = argv.includes("--full");
  const maxArg = argv.find((a) => a.startsWith("--max="));
  const maxContracts = maxArg
    ? Math.max(1, Number(maxArg.split("=")[1]) || 200)
    : fullMode
      ? Number.MAX_SAFE_INTEGER
      : 200;

  if (commitMode) {
    await runCommit();
  } else {
    await runDryRun(maxContracts, fullMode);
  }
}

run()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await client.end();
  });
