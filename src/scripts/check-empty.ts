import { getDb } from "../lib/db-client";
import { sql } from "drizzle-orm";

async function main() {
  const db = getDb();
  
  const result = await db.execute(sql`
    SELECT 
      COUNT(*)::int as total,
      COUNT(*) FILTER (WHERE code_size_bytes = 0 OR code_size_bytes IS NULL) as empty_or_null,
      COUNT(*) FILTER (WHERE code_size_bytes = 0) as zero_bytes,
      COUNT(*) FILTER (WHERE code_size_bytes IS NULL) as null_bytes,
      COUNT(*) FILTER (WHERE code_size_bytes > 0) as has_code
    FROM contracts
  `);
  console.log("Contract counts:", result[0]);
  
  // How many of the "documented" are zero-byte?
  const documented = await db.execute(sql`
    SELECT COUNT(*)::int as count
    FROM contracts
    WHERE (code_size_bytes = 0 OR code_size_bytes IS NULL)
    AND (
      (short_description IS NOT NULL AND short_description != '')
      OR verification_method IS NOT NULL
      OR canonical_address IS NOT NULL
    )
  `);
  console.log("Zero-byte contracts counted as documented:", documented[0]);
}
main().catch(console.error);
