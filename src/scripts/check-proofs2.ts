import { getDb } from "../lib/db-client";
import { sql } from "drizzle-orm";

async function main() {
  const db = getDb();
  const result = await db.execute(sql`
    SELECT 
      verification_method,
      source_code IS NOT NULL as has_source,
      COUNT(*)::int as count
    FROM contracts
    WHERE verification_method IS NOT NULL
    GROUP BY verification_method, (source_code IS NOT NULL)
    ORDER BY count DESC
  `);
  console.log("verification_method | has_source | count");
  for (const row of result as any[]) {
    console.log(`${row.verification_method} | ${row.has_source} | ${row.count}`);
  }
}
main().catch(console.error);
