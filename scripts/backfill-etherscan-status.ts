#!/usr/bin/env npx tsx
/**
 * Fill in `etherscan_verified` / `etherscan_match_type` for contracts that have never
 * been checked.
 *
 * The column was added in migration 078. Before it, "verified on Etherscan" was derived
 * from `verification_method = 'etherscan_verified'`, which is EthereumHistory's own
 * provenance field: a contract whose source EH cracked itself, or that Etherscan serves
 * through a Similar Match, both reported false. Page enrichment now records the real
 * status on first visit; this fills in the contracts people are most likely to look at
 * without waiting for someone to visit them.
 *
 *   npx tsx scripts/backfill-etherscan-status.ts [--limit N] [--all]
 *
 * Default scope is documented contracts and contracts that already hold source.
 */
import postgres from "postgres";
import * as dotenv from "dotenv";
import { fetchEtherscanSourceCode } from "../src/lib/etherscan";

dotenv.config({ path: ".env.local" });

const dbUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("ERROR: POSTGRES_URL (or DATABASE_URL) not set");
  process.exit(1);
}
const sql = postgres(dbUrl, { max: 1, prepare: false });

const args = process.argv.slice(2);
const limitArg = args.indexOf("--limit");
const LIMIT = limitArg >= 0 ? Number(args[limitArg + 1]) : 2000;
const ALL = args.includes("--all");

async function main() {
  const rows = ALL
    ? await sql<{ address: string }[]>`
        SELECT address FROM contracts
        WHERE etherscan_verified IS NULL
        ORDER BY deployment_timestamp ASC NULLS LAST
        LIMIT ${LIMIT}`
    : await sql<{ address: string }[]>`
        SELECT address FROM contracts
        WHERE etherscan_verified IS NULL
          AND (is_documented = TRUE OR source_code IS NOT NULL)
        ORDER BY deployment_timestamp ASC NULLS LAST
        LIMIT ${LIMIT}`;

  console.log(`${rows.length} contracts to check`);
  let direct = 0;
  let similar = 0;
  let unverified = 0;
  let failed = 0;

  for (const [i, row] of rows.entries()) {
    let source: Awaited<ReturnType<typeof fetchEtherscanSourceCode>> = null;
    try {
      source = await fetchEtherscanSourceCode(row.address);
    } catch {
      source = null;
    }
    if (!source) {
      // A failed lookup is left NULL rather than recorded as unverified, so the next run
      // retries it instead of writing a wrong answer.
      failed += 1;
    } else {
      const matchType = source.isVerified ? (source.isSimilarMatch ? "similar" : "direct") : null;
      if (!source.isVerified) unverified += 1;
      else if (source.isSimilarMatch) similar += 1;
      else direct += 1;
      await sql`
        UPDATE contracts
        SET etherscan_verified = ${source.isVerified},
            etherscan_match_type = ${matchType},
            etherscan_checked_at = NOW()
        WHERE address = ${row.address}`;
    }
    if ((i + 1) % 100 === 0) {
      console.log(`  ${i + 1}/${rows.length}  direct=${direct} similar=${similar} unverified=${unverified} failed=${failed}`);
    }
    await new Promise((r) => setTimeout(r, 220));
  }

  console.log(`done: direct=${direct} similar=${similar} unverified=${unverified} failed=${failed}`);
}

main()
  .catch((err) => {
    console.error("Backfill failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sql.end({ timeout: 5 });
  });
