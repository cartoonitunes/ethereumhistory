import { getDb } from "../lib/db-client";
import { sql } from "drizzle-orm";

async function main() {
  const db = getDb();
  
  // Sample Spurious contracts that have decompiled_code but no code_size_bytes
  const sample = await db.execute(sql`
    SELECT 
      address,
      era_id,
      LENGTH(runtime_bytecode) as runtime_bytecode_len,
      LENGTH(decompiled_code) as decompiled_code_len,
      LEFT(runtime_bytecode, 20) as runtime_start,
      LEFT(decompiled_code, 100) as decompiled_start,
      code_size_bytes,
      deployment_tx_hash
    FROM contracts
    WHERE era_id = 'spurious'
    AND code_size_bytes IS NULL
    AND decompiled_code IS NOT NULL
    LIMIT 5
  `);
  
  console.log("Spurious contracts with decompiled_code but no code_size_bytes:");
  for (const r of sample as any[]) {
    console.log({
      address: r.address,
      runtime_bytecode_len: r.runtime_bytecode_len,
      decompiled_code_len: r.decompiled_code_len,
      runtime_start: r.runtime_start,
      decompiled_start: r.decompiled_start?.slice(0,80),
      has_deploy_tx: !!r.deployment_tx_hash
    });
  }
  
  // Also check: what's in the schema for runtime_bytecode column
  const colInfo = await db.execute(sql`
    SELECT column_name, data_type, character_maximum_length
    FROM information_schema.columns
    WHERE table_name = 'contracts'
    AND column_name IN ('runtime_bytecode', 'deployed_bytecode', 'decompiled_code', 'code_size_bytes', 'source_code')
    ORDER BY column_name
  `);
  console.log("\nColumn definitions:");
  for (const r of colInfo as any[]) console.log(r);
}
main().catch(console.error);
