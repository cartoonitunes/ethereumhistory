#!/usr/bin/env npx tsx
/**
 * Backfill sourcify_match for all contracts that have verificationMethod set
 * or that we've cracked (exact_bytecode_match / near_exact_match / author_published_source)
 * or that are etherscan_verified.
 *
 * Checks Sourcify API for each and updates DB.
 * Rate limit: 1 req/second
 */

import postgres from "postgres";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const dbUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("ERROR: POSTGRES_URL (or DATABASE_URL) not set in environment");
  process.exit(1);
}

function isPoolerUrl(url: string): boolean {
  try {
    return new URL(url).hostname.includes("pooler");
  } catch {
    return url.includes("pooler");
  }
}

const sql = postgres(dbUrl, {
  ssl: isPoolerUrl(dbUrl) ? "require" : { rejectUnauthorized: false },
  max: 1,
});

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function checkSourcify(address: string): Promise<string | null> {
  try {
    const url = `https://sourcify.dev/server/v2/contract/1/${address}`;
    const res = await fetch(url, {
      headers: { "Accept": "application/json" },
      signal: AbortSignal.timeout(10000),
    });

    if (res.status === 404) {
      return null; // Not on Sourcify
    }

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json() as {
      runtimeMatch?: string | null;
      creationMatch?: string | null;
      match?: string | null;
    };

    // If runtimeMatch is non-null (any value), it's verified
    if (data.runtimeMatch != null) {
      return "match";
    }

    return null;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("404")) return null;
    throw err;
  }
}

async function main() {
  console.log("Fetching contracts with verificationMethod set or etherscan_verified...");

  const contracts = await sql<{ address: string; verification_method: string | null; sourcify_match: string | null }[]>`
    SELECT address, verification_method, sourcify_match
    FROM contracts
    WHERE verification_method IS NOT NULL
    ORDER BY deployment_block ASC NULLS LAST
  `;

  console.log(`Found ${contracts.length} contracts to check`);

  let updated = 0;
  let already = 0;
  let notFound = 0;
  let errors = 0;

  for (let i = 0; i < contracts.length; i++) {
    const contract = contracts[i];
    const { address, sourcify_match: existingMatch } = contract;

    // Skip if already set
    if (existingMatch != null) {
      already++;
      continue;
    }

    // Rate limit: 1 req/second
    if (i > 0) {
      await sleep(1000);
    }

    try {
      const result = await checkSourcify(address);

      if (result != null) {
        await sql`
          UPDATE contracts
          SET sourcify_match = ${result}, updated_at = NOW()
          WHERE address = ${address}
        `;
        updated++;
        console.log(`[${i + 1}/${contracts.length}] ✓ ${address} → ${result}`);
      } else {
        notFound++;
        if ((i + 1) % 10 === 0 || notFound <= 5) {
          console.log(`[${i + 1}/${contracts.length}] ✗ ${address} → not on Sourcify`);
        }
      }
    } catch (err) {
      errors++;
      console.error(`[${i + 1}/${contracts.length}] ERROR ${address}:`, err);
      // Back off on errors
      await sleep(2000);
    }

    // Progress every 20 contracts
    if ((i + 1) % 20 === 0) {
      console.log(`--- Progress: ${i + 1}/${contracts.length} | updated=${updated} already=${already} notFound=${notFound} errors=${errors} ---`);
    }
  }

  console.log("\n=== Backfill complete ===");
  console.log(`Total checked:  ${contracts.length}`);
  console.log(`Updated:        ${updated}`);
  console.log(`Already set:    ${already}`);
  console.log(`Not on Sourcify: ${notFound}`);
  console.log(`Errors:         ${errors}`);

  await sql.end();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
