import { getDb } from "../lib/db-client";
import { sql } from "drizzle-orm";

async function main() {
  const db = getDb();
  
  const result = await db.execute(sql`
    SELECT 
      COUNT(*)::int as total,
      COUNT(*) FILTER (WHERE runtime_bytecode IS NULL AND code_size_bytes IS NULL)::int as both_null,
      COUNT(*) FILTER (WHERE runtime_bytecode IS NOT NULL)::int as has_runtime,
      COUNT(*) FILTER (WHERE code_size_bytes IS NOT NULL)::int as has_size,
      COUNT(*) FILTER (WHERE runtime_bytecode IS NULL AND code_size_bytes IS NOT NULL)::int as size_but_no_runtime,
      COUNT(*) FILTER (WHERE runtime_bytecode IS NOT NULL AND code_size_bytes IS NULL)::int as runtime_but_no_size
    FROM contracts
  `);
  console.log(result[0]);
  
  // Per era breakdown of truly missing (both null)
  const byEra = await db.execute(sql`
    SELECT era_id, COUNT(*)::int as truly_missing
    FROM contracts
    WHERE runtime_bytecode IS NULL AND code_size_bytes IS NULL
    GROUP BY era_id ORDER BY truly_missing DESC
  `);
  console.log("\nBy era (both null):");
  for (const r of byEra as any[]) console.log(r);
}
main().catch(console.error);
