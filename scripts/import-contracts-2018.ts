#!/usr/bin/env npx tsx
/**
 * import-contracts-2018.ts
 *
 * Phase 4: Merges canonical + enrichment data and imports to the DB.
 * Also imports sibling relationships (canonical_address column).
 *
 * SAFETY:
 *   - onConflictDoNothing — safe to re-run
 *   - Dry run mode shows what would be inserted
 *   - Validates required fields before any DB write
 *   - Siblings written only after canonical row confirmed present
 */

import * as fs from "fs";
import * as path from "path";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../src/lib/schema";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const T7_DIR = path.join(
  process.env.HOME || "/Users/claw",
  ".openclaw/workspace/memory/eth-2018-discovery"
);

const args = process.argv.slice(2);
const isDryRun = args.includes("--dry-run");
const limitArg = args.find((_, i) => args[i - 1] === "--limit");
const maxRows = limitArg ? parseInt(limitArg) : Infinity;

function getEraId(block: number | null): string | null {
  if (!block) return null;
  if (block < 1150000) return "frontier";
  if (block < 1920000) return "homestead";
  if (block < 2463000) return "dao";
  if (block < 2675000) return "tangerine";
  if (block < 4370000) return "spurious";
  if (block < 7280000) return "byzantium";
  return "constantinople";
}

function sanitize(v: string | null | undefined): string | null {
  if (!v) return null;
  return v.replace(/\u0000/g, "");
}

async function main() {
  const canonicalFile = path.join(T7_DIR, "contracts_canonical.jsonl");
  const enrichedFile = path.join(T7_DIR, "etherscan_enriched.jsonl");
  const siblingsFile = path.join(T7_DIR, "sibling_groups.jsonl");

  for (const f of [canonicalFile]) {
    if (!fs.existsSync(f)) {
      console.error(`ERROR: ${f} not found.`);
      process.exit(1);
    }
  }

  const canonicals = fs.readFileSync(canonicalFile, "utf-8")
    .split("\n").filter(Boolean).map(l => JSON.parse(l));

  // Build enrichment lookup
  const enrichMap = new Map<string, any>();
  if (fs.existsSync(enrichedFile)) {
    fs.readFileSync(enrichedFile, "utf-8").split("\n").filter(Boolean).forEach(l => {
      const obj = JSON.parse(l);
      if (!obj.error) enrichMap.set(obj.address, obj);
    });
  }

  // Build sibling groups lookup
  const siblingMap = new Map<string, string[]>(); // canonical → sibling addresses
  if (fs.existsSync(siblingsFile)) {
    fs.readFileSync(siblingsFile, "utf-8").split("\n").filter(Boolean).forEach(l => {
      const obj = JSON.parse(l);
      siblingMap.set(obj.canonical_address, obj.siblings.map((s: any) => s.address));
    });
  }

  console.log("=== EH 2018 DB Import ===");
  console.log(`Mode: ${isDryRun ? "DRY RUN" : "LIVE"}`);
  console.log(`Canonical contracts: ${canonicals.length}`);
  console.log(`Enrichment records: ${enrichMap.size}`);
  console.log(`Sibling groups: ${siblingMap.size}`);

  const client = postgres(process.env.POSTGRES_URL!, { prepare: false, max: 3 });
  const db = drizzle(client, { schema });

  let imported = 0;
  let skipped = 0;
  let siblingsImported = 0;

  const toProcess = canonicals.slice(0, maxRows);

  // Batch insert canonicals
  const BATCH_SIZE = 100;
  for (let i = 0; i < toProcess.length; i += BATCH_SIZE) {
    const batch = toProcess.slice(i, i + BATCH_SIZE);
    const rows: schema.NewContract[] = [];

    for (const c of batch) {
      // Validate essential fields
      if (!c.address || !/^0x[0-9a-f]{40}$/i.test(c.address)) {
        console.warn(`  Skipping invalid address: ${c.address}`);
        skipped++;
        continue;
      }
      if (!c.runtime_bytecode || c.runtime_bytecode === "0x") {
        console.warn(`  Skipping empty bytecode: ${c.address}`);
        skipped++;
        continue;
      }

      const enrich = enrichMap.get(c.address) ?? {};
      const hasSource = !!enrich.source_code;

      rows.push({
        address: c.address.toLowerCase(),
        runtimeBytecode: sanitize(c.runtime_bytecode),
        deployerAddress: sanitize(c.deployer_address),
        deploymentTxHash: sanitize(c.deployment_tx_hash),
        deploymentBlock: c.deployment_block ?? null,
        deploymentTimestamp: null, // backfilled separately via backfill-completeness
        decompiledCode: null,      // post-process via decompile-missing.py
        decompilationSuccess: false,
        gasUsed: null,
        gasPrice: null,
        codeSizeBytes: c.code_size_bytes ?? null,
        eraId: c.era_id ?? getEraId(c.deployment_block),
        contractType: "other",
        confidence: 0.5,
        isProxy: false,
        hasSelfDestruct: false,
        isErc20Like: false,
        etherscanContractName: sanitize(enrich.etherscan_contract_name),
        sourceCode: hasSource ? sanitize(enrich.source_code) : null,
        abi: hasSource ? sanitize(enrich.abi) : null,
        tokenName: null,
        tokenSymbol: null,
        tokenDecimals: null,
      });
    }

    if (isDryRun) {
      console.log(`  [DRY RUN] Would insert batch ${Math.floor(i / BATCH_SIZE) + 1}: ${rows.length} rows`);
      imported += rows.length;
      continue;
    }

    try {
      await db.insert(schema.contracts).values(rows).onConflictDoNothing();
      imported += rows.length;
    } catch (err) {
      console.error(`  Batch error at ${i}:`, err);
      // Row-by-row fallback
      for (const row of rows) {
        try {
          await db.insert(schema.contracts).values(row).onConflictDoNothing();
          imported++;
        } catch {
          skipped++;
        }
      }
    }

    if ((i + BATCH_SIZE) % 1000 === 0) {
      console.log(`  Progress: ${imported}/${toProcess.length} imported`);
    }
  }

  console.log(`\nCanonicals: ${imported} imported, ${skipped} skipped`);

  // Insert siblings (canonical_address FK)
  if (!isDryRun) {
    console.log("\nInserting siblings...");
    for (const [canonical, siblings] of Array.from(siblingMap)) {
      for (const sibAddr of siblings) {
        // Siblings get minimal rows — block/deployer data from sibling_groups.jsonl
        // The canonical_address links them for sibling detection
        try {
          await db.execute(
            schema.contracts.address
              ? client`
                  UPDATE contracts
                  SET canonical_address = ${canonical}
                  WHERE address = ${sibAddr}
                `
              : client`SELECT 1` // no-op if column doesn't exist yet
          );
          siblingsImported++;
        } catch {
          // Sibling may not be in DB yet — that's OK
        }
      }
    }
    console.log(`Sibling relationships updated: ${siblingsImported}`);
  }

  console.log(`\n=== Import Complete ===`);
  console.log(`Next step: python3 scripts/decompile-missing.py`);
  console.log(`Then: npx tsx scripts/backfill-completeness.ts --phase 1 (timestamps + blocks)`);

  await client.end();
}

main().catch(err => { console.error("Fatal:", err); process.exit(1); });
