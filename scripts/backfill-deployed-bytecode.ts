#!/usr/bin/env npx tsx

/**
 * Backfill deployed_bytecode and deployed_bytecode_hash columns.
 *
 * The existing runtime_bytecode column stores CREATION bytecode (init+runtime),
 * not the on-chain deployed code. This script fetches the actual deployed
 * bytecode via Etherscan's eth_getCode proxy, strips the Swarm/IPFS metadata
 * suffix, and stores the result for correct sibling detection.
 *
 * Usage:
 *   npx tsx scripts/backfill-deployed-bytecode.ts              # backfill all
 *   npx tsx scripts/backfill-deployed-bytecode.ts --max=100    # limit to 100
 *   npx tsx scripts/backfill-deployed-bytecode.ts --dry-run    # preview only
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../src/lib/schema";
import { sql } from "drizzle-orm";
import { eq } from "drizzle-orm";
import * as dotenv from "dotenv";
import * as crypto from "crypto";

dotenv.config({ path: ".env.local" });

const ETHERSCAN_API_KEY = "AHMV3WAI75TQVJI2XEFUUKFKK1KJTFY1BD";
const RATE_LIMIT_MS = 200; // 5 req/sec
const LOG_INTERVAL = 100;

// Swarm bzzr0 metadata marker
const BZZR0_MARKER = "a165627a7a72305820";
// Swarm bzzr1 metadata marker
const BZZR1_MARKER = "a265627a7a72315820";
// IPFS/CBOR metadata marker (solc >=0.6)
const CBOR_MARKER = "a264697066735822";

const dbUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("ERROR: POSTGRES_URL (or DATABASE_URL) not set");
  process.exit(1);
}

const client = postgres(dbUrl, { prepare: false, max: 5 });
const db = drizzle(client, { schema });

function stripMetadataSuffix(bytecode: string): string {
  // Try each marker, take the one that appears last (closest to the end)
  const hex = bytecode.toLowerCase();
  let cutIndex = -1;

  for (const marker of [BZZR0_MARKER, BZZR1_MARKER, CBOR_MARKER]) {
    const idx = hex.lastIndexOf(marker);
    if (idx > cutIndex) {
      cutIndex = idx;
    }
  }

  if (cutIndex > 0) {
    return bytecode.slice(0, cutIndex);
  }

  // No metadata found — return as-is
  return bytecode;
}

function md5(input: string): string {
  return crypto.createHash("md5").update(input).digest("hex");
}

async function fetchDeployedBytecode(address: string): Promise<string | null> {
  const url = `https://api.etherscan.io/api?module=proxy&action=eth_getCode&address=${address}&tag=latest&apikey=${ETHERSCAN_API_KEY}`;

  const res = await fetch(url);
  if (!res.ok) {
    console.error(`  HTTP ${res.status} for ${address}`);
    return null;
  }

  const json = await res.json();
  if (json.result && json.result !== "0x" && json.result.length > 2) {
    return json.result;
  }
  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const maxArg = args.find((a) => a.startsWith("--max="));
  const maxContracts = maxArg ? parseInt(maxArg.split("=")[1], 10) : Infinity;

  console.log("=== Backfill deployed_bytecode ===");
  console.log(`Mode: ${dryRun ? "DRY RUN" : "LIVE"}`);
  if (maxContracts < Infinity) console.log(`Max contracts: ${maxContracts}`);

  // Fetch contracts missing deployed_bytecode
  const rows = await db
    .select({ address: schema.contracts.address })
    .from(schema.contracts)
    .where(sql`deployed_bytecode IS NULL AND runtime_bytecode IS NOT NULL`)
    .limit(maxContracts < Infinity ? maxContracts : 100000);

  console.log(`Found ${rows.length} contracts to backfill\n`);

  if (dryRun) {
    console.log("Dry run — exiting without changes.");
    await client.end();
    return;
  }

  let processed = 0;
  let updated = 0;
  let errors = 0;
  let selfDestructed = 0;

  for (const row of rows) {
    try {
      const deployed = await fetchDeployedBytecode(row.address);

      if (!deployed) {
        // Contract self-destructed or empty
        selfDestructed++;
        processed++;
        if (processed % LOG_INTERVAL === 0) {
          console.log(
            `Progress: ${processed}/${rows.length} | updated=${updated} empty=${selfDestructed} errors=${errors}`
          );
        }
        await sleep(RATE_LIMIT_MS);
        continue;
      }

      const stripped = stripMetadataSuffix(deployed);
      const hash = md5(stripped);

      await db
        .update(schema.contracts)
        .set({
          deployedBytecode: stripped,
          deployedBytecodeHash: hash,
        })
        .where(eq(schema.contracts.address, row.address));

      updated++;
    } catch (err) {
      console.error(`  Error processing ${row.address}:`, err);
      errors++;
    }

    processed++;
    if (processed % LOG_INTERVAL === 0) {
      console.log(
        `Progress: ${processed}/${rows.length} | updated=${updated} empty=${selfDestructed} errors=${errors}`
      );
    }

    await sleep(RATE_LIMIT_MS);
  }

  console.log(`\n=== Done ===`);
  console.log(`Processed: ${processed}`);
  console.log(`Updated: ${updated}`);
  console.log(`Self-destructed/empty: ${selfDestructed}`);
  console.log(`Errors: ${errors}`);

  await client.end();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
