import { getDb } from "../lib/db-client";
import { sql } from "drizzle-orm";

async function main() {
  const db = getDb();
  
  const row = await db.execute(sql`
    SELECT address, code_size_bytes, 
           LENGTH(runtime_bytecode) as runtime_len,
           LEFT(runtime_bytecode, 20) as runtime_start
    FROM contracts
    WHERE address = '0xd96ef97b605db94d35be577beb0f0c185a6ce65f'
  `);
  console.log("DB row:", row[0]);
  
  // Also check the null count again more carefully
  const nullCheck = await db.execute(sql`
    SELECT COUNT(*)::int as truly_null
    FROM contracts
    WHERE runtime_bytecode IS NULL AND code_size_bytes IS NULL
    AND decompiled_code IS NOT NULL
    LIMIT 1
  `);
  console.log("Truly null with decompiled:", nullCheck[0]);
  
  // Get a contract that is actually null
  const actualNull = await db.execute(sql`
    SELECT address, era_id, code_size_bytes, 
           runtime_bytecode IS NULL as runtime_null,
           decompiled_code IS NOT NULL as has_decompiled
    FROM contracts
    WHERE runtime_bytecode IS NULL AND code_size_bytes IS NULL
    LIMIT 3
  `);
  console.log("Actual null contracts:", actualNull);
}
main().catch(console.error);
