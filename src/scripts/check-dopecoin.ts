import { getDb } from "../lib/db-client";
import { sql } from "drizzle-orm";

async function main() {
  const db = getDb();
  
  const r = await db.execute(sql`
    SELECT address, verification_method, abi IS NOT NULL as has_abi, runtime_bytecode_hash
    FROM contracts 
    WHERE address = '0xff2947b1851bb16a7c8e71c6a8458d29600f9d6a'
  `);
  console.log("dopecoin:", r[0]);
  
  const row = r[0] as any;
  if (row?.runtime_bytecode_hash) {
    const siblings = await db.execute(sql`
      SELECT address, verification_method, abi IS NOT NULL as has_abi
      FROM contracts
      WHERE runtime_bytecode_hash = ${row.runtime_bytecode_hash}
        AND verification_method IS NOT NULL
      LIMIT 5
    `);
    console.log("verified siblings:", siblings);
  }
  
  // Also check: how many exact_bytecode_match contracts have ABI in DB?
  const abiCheck = await db.execute(sql`
    SELECT COUNT(*)::int as with_abi, 
           (SELECT COUNT(*)::int FROM contracts WHERE verification_method = 'exact_bytecode_match') as total_exact
    FROM contracts 
    WHERE verification_method = 'exact_bytecode_match' AND abi IS NOT NULL
  `);
  console.log("exact_bytecode_match with ABI:", abiCheck[0]);
}
main().catch(console.error);
