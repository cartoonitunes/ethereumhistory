import { getDb } from "../lib/db-client";
import { sql } from "drizzle-orm";

async function main() {
  const db = getDb();
  // Find contracts with old method name
  const old = await db.execute(sql`
    SELECT address, etherscan_contract_name FROM contracts WHERE verification_method = 'author_published_source'
  `);
  console.log("Contracts with author_published_source:");
  for (const r of old as any[]) console.log(' ', r.address, r.etherscan_contract_name);
  
  // How many proofs would show if we use the right filter
  const counts = await db.execute(sql`
    SELECT COUNT(DISTINCT runtime_bytecode_hash) as deduped_count, COUNT(*) as raw_count
    FROM contracts
    WHERE verification_method IN ('exact_bytecode_match', 'near_exact_match', 'author_published', 'author_published_source')
      AND source_code IS NOT NULL
  `);
  console.log("\nProofs page counts (deduped by runtime hash):", counts);
}
main().catch(console.error);
