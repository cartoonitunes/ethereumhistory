import { getDb } from "../lib/db-client";
import { sql } from "drizzle-orm";

async function main() {
  const db = getDb();
  const result = await db.execute(sql`
    SELECT 
      verification_method,
      abi IS NOT NULL as has_abi,
      COUNT(*)::int as count
    FROM contracts
    WHERE verification_method IN ('exact_bytecode_match', 'etherscan_verified', 'near_exact_match', 'author_published')
    GROUP BY verification_method, (abi IS NOT NULL)
    ORDER BY verification_method, has_abi DESC
  `);
  console.log("verification_method | has_abi | count");
  for (const row of result as any[]) {
    console.log(`${row.verification_method} | ${row.has_abi} | ${row.count}`);
  }
}
main().catch(console.error);
