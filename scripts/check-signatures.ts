/**
 * Check how many function signatures from our verified contracts
 * are not yet in 4byte.directory.
 */
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";

async function main() {
  const client = postgres(process.env.DATABASE_URL!);
  const db = drizzle(client);

  // Get all ABIs from verified contracts
  const rows = await db.execute(sql`
    SELECT address, abi, etherscan_contract_name, token_name
    FROM contracts
    WHERE abi IS NOT NULL AND abi != ''
    AND verification_method IN ('exact_bytecode_match', 'near_exact_match', 'author_published_source', 'etherscan_verified')
    ORDER BY deployment_timestamp ASC
  `);

  console.log(`\n${(rows as any[]).length} verified contracts with ABIs\n`);

  // Extract all unique text signatures
  const signatures = new Set<string>();
  for (const row of rows as any[]) {
    try {
      const abi = JSON.parse(row.abi);
      for (const item of abi) {
        if (item.type !== "function" && item.type !== "event") continue;
        const paramTypes = (item.inputs ?? []).map((i: any) => i.type).join(",");
        const sig = `${item.name}(${paramTypes})`;
        signatures.add(sig);
      }
    } catch {}
  }

  console.log(`${signatures.size} unique function/event signatures\n`);

  // Check which are missing from 4byte
  let missing = 0, found = 0, errors = 0;
  const missingSigs: string[] = [];

  for (const sig of signatures) {
    try {
      const res = await fetch(`https://www.4byte.directory/api/v1/signatures/?text_signature=${encodeURIComponent(sig)}`);
      const data = await res.json() as any;
      if (data.count === 0) {
        missing++;
        missingSigs.push(sig);
        console.log(`  MISSING: ${sig}`);
      } else {
        found++;
      }
      await new Promise(r => setTimeout(r, 100));
    } catch {
      errors++;
    }
  }

  console.log(`\nFound in 4byte: ${found}`);
  console.log(`Missing from 4byte: ${missing}`);
  console.log(`Errors: ${errors}`);
  if (missingSigs.length > 0) {
    console.log(`\nMissing signatures:\n${missingSigs.join("\n")}`);
  }

  await client.end();
}
main();
