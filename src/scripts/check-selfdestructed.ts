import { getDb } from "../lib/db-client";
import { sql } from "drizzle-orm";

async function main() {
  const db = getDb();
  
  // How many contracts have code_size_bytes set but no live bytecode (self-destructed)?
  // We don't store live bytecode status directly, but check via decompilation_success
  const result = await db.execute(sql`
    SELECT 
      COUNT(*) FILTER (WHERE code_size_bytes IS NOT NULL) as has_size,
      COUNT(*) FILTER (WHERE code_size_bytes IS NOT NULL AND decompilation_success = false) as size_but_no_decompile,
      COUNT(*) FILTER (WHERE code_size_bytes IS NOT NULL AND decompilation_success = true) as size_and_decompiled,
      COUNT(*) FILTER (WHERE code_size_bytes IS NOT NULL AND verification_method IS NOT NULL) as size_and_verified
    FROM contracts
  `);
  console.log(result[0]);
  
  // Check the specific self-destructed example
  const ex = await db.execute(sql`
    SELECT code_size_bytes, decompilation_success, verification_method, short_description
    FROM contracts WHERE address = '0x61a9c3ee0fdc982630ccb79ffb53f277bc545606'
  `);
  console.log("Greeter example:", ex[0]);
}
main().catch(console.error);
