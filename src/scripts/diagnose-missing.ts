import { getDb } from "../lib/db-client";
import { sql } from "drizzle-orm";

async function main() {
  const db = getDb();
  
  // 1. Breakdown by era for contracts missing bytecode
  const byEra = await db.execute(sql`
    SELECT 
      era_id,
      COUNT(*)::int as total,
      COUNT(*) FILTER (WHERE code_size_bytes IS NOT NULL)::int as has_bytecode,
      COUNT(*) FILTER (WHERE code_size_bytes IS NULL)::int as missing_bytecode,
      COUNT(*) FILTER (WHERE runtime_bytecode IS NOT NULL)::int as has_runtime_hex,
      MIN(deployment_timestamp)::text as earliest,
      MAX(deployment_timestamp)::text as latest
    FROM contracts
    GROUP BY era_id
    ORDER BY earliest
  `);
  console.log("\n=== By Era ===");
  for (const r of byEra as any[]) {
    console.log(`${r.era_id}: total=${r.total}, has_bytecode=${r.has_bytecode}, missing=${r.missing_bytecode}, has_runtime_hex=${r.has_runtime_hex}`);
  }
  
  // 2. What's in the decompiled_code column for missing contracts?
  const decompiled = await db.execute(sql`
    SELECT 
      COUNT(*)::int as total,
      COUNT(*) FILTER (WHERE decompiled_code IS NOT NULL)::int as has_decompiled_text,
      COUNT(*) FILTER (WHERE decompilation_success = true AND decompiled_code IS NULL)::int as success_but_no_text
    FROM contracts
    WHERE code_size_bytes IS NULL
  `);
  console.log("\n=== Missing bytecode decompilation status ===");
  console.log(decompiled[0]);
  
  // 3. Check if there's a data_loader or migration that set decompilation_success without data
  const migrations = await db.execute(sql`
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name
  `);
  console.log("\n=== DB Tables ===");
  console.log((migrations as any[]).map((r: any) => r.table_name).join(', '));
  
  // 4. Sample a few missing contracts with different eras to understand pattern
  const sample = await db.execute(sql`
    SELECT 
      address, era_id, deployment_block,
      code_size_bytes, runtime_bytecode IS NOT NULL as has_runtime,
      decompilation_success, decompiled_code IS NOT NULL as has_decompiled,
      etherscan_verified
    FROM contracts
    WHERE code_size_bytes IS NULL
    AND era_id IS NOT NULL
    ORDER BY RANDOM()
    LIMIT 5
  `);
  console.log("\n=== Random sample of missing contracts ===");
  for (const r of sample as any[]) console.log(r);
}
main().catch(console.error);
