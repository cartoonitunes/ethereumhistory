/**
 * Submit all function/event signatures from verified EH contracts to 4byte.directory.
 * Uses the text_signature POST endpoint. Duplicates are silently ignored.
 * 
 * Run: npx tsx --conditions=node scripts/submit-signatures.ts [--dry-run]
 */
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";

const FOURBYTE_API = "https://www.4byte.directory/api/v1/signatures/";
const DRY_RUN = process.argv.includes("--dry-run");

async function main() {
  const client = postgres(process.env.DATABASE_URL!);
  const db = drizzle(client);

  const rows = await db.execute(sql`
    SELECT address, abi, etherscan_contract_name, token_name, deployment_timestamp
    FROM contracts
    WHERE abi IS NOT NULL AND abi != ''
    AND verification_method IN ('exact_bytecode_match', 'near_exact_match', 'author_published_source', 'etherscan_verified')
    ORDER BY deployment_timestamp ASC
  `);

  console.log(`\n${(rows as any[]).length} verified contracts with ABIs`);

  // Extract unique text signatures with source attribution
  const signatures = new Map<string, string>(); // sig → contract address
  for (const row of rows as any[]) {
    try {
      const abi = JSON.parse(row.abi);
      for (const item of abi) {
        if (item.type !== "function" && item.type !== "event") continue;
        if (!item.name) continue;
        const paramTypes = (item.inputs ?? []).map((i: any) => i.type).join(",");
        const sig = `${item.name}(${paramTypes})`;
        if (!signatures.has(sig)) signatures.set(sig, row.address);
      }
    } catch {}
  }

  console.log(`${signatures.size} unique signatures to submit\n`);

  if (DRY_RUN) {
    console.log("DRY RUN — signatures that would be submitted:");
    for (const [sig] of signatures) console.log(`  ${sig}`);
    await client.end();
    return;
  }

  let submitted = 0, duplicates = 0, errors = 0;

  for (const [sig, addr] of signatures) {
    try {
      const res = await fetch(FOURBYTE_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text_signature: sig }),
      });
      const data = await res.json() as any;

      if (data?.text_signature?.includes?.("already exists")) {
        duplicates++;
      } else if (data?.text_signature) {
        submitted++;
        console.log(`  ✓ submitted: ${sig} (from ${addr})`);
      } else {
        submitted++;
      }
      await new Promise(r => setTimeout(r, 150));
    } catch (e: any) {
      console.error(`  ✗ error submitting ${sig}: ${e.message}`);
      errors++;
    }
  }

  console.log(`\nDone. Submitted: ${submitted} | Already existed: ${duplicates} | Errors: ${errors}`);
  await client.end();
}
main();
