import { getDb } from "../lib/db-client";
import { sql } from "drizzle-orm";

async function main() {
  const db = getDb();
  
  // What does the actual row look like for this contract?
  const row = await db.execute(sql`
    SELECT 
      address,
      code_size_bytes,
      LENGTH(runtime_bytecode) as runtime_len,
      LEFT(runtime_bytecode, 30) as runtime_start,
      deployed_bytecode IS NOT NULL as has_deployed,
      LENGTH(decompiled_code) as decompiled_len
    FROM contracts
    WHERE address = '0x4f42b35e4ec527a4add18a2d4efa57b8c9f8b169'
  `);
  console.log("Direct DB row:", row[0]);
  
  // Now recheck the stats — maybe the column used in the app is different
  const stats = await db.execute(sql`
    SELECT 
      COUNT(*)::int as total,
      COUNT(*) FILTER (WHERE code_size_bytes IS NULL)::int as null_code_size,
      COUNT(*) FILTER (WHERE runtime_bytecode IS NULL)::int as null_runtime,
      COUNT(*) FILTER (WHERE deployed_bytecode IS NULL)::int as null_deployed
    FROM contracts
  `);
  console.log("\nOverall stats:", stats[0]);
}
main().catch(console.error);
