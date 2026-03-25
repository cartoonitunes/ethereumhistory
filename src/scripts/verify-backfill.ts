import { getDb } from "../lib/db-client";
import { sql } from "drizzle-orm";
async function main() {
  const db = getDb();
  const r = await db.execute(sql`
    SELECT COUNT(*)::int as still_null FROM contracts WHERE runtime_bytecode IS NULL
  `);
  console.log("Still null:", (r[0] as any).still_null, "(was 144383, should be 144363)");
  
  // Sample one of the newly updated
  const sample = await db.execute(sql`
    SELECT address, code_size_bytes, LEFT(runtime_bytecode, 20) as start
    FROM contracts
    WHERE runtime_bytecode IS NOT NULL
    ORDER BY updated_at DESC NULLS LAST
    LIMIT 3
  `);
  console.log("Recently updated:", sample);
}
main().catch(console.error);
