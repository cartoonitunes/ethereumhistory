import { getDb } from "../lib/db-client";
import { sql } from "drizzle-orm";

async function main() {
  const db = getDb();
  
  // What data DO the 144K null-bytecode contracts have?
  const sample = await db.execute(sql`
    SELECT 
      address,
      era_id,
      deployment_timestamp,
      deployment_block,
      deployer_address,
      etherscan_contract_name,
      short_description,
      decompilation_success,
      gas_used
    FROM contracts
    WHERE code_size_bytes IS NULL
    ORDER BY deployment_timestamp ASC NULLS LAST
    LIMIT 10
  `);
  console.log("Sample of null-bytecode contracts:");
  for (const r of sample as any[]) {
    console.log(JSON.stringify(r));
  }
  
  // How many have deployment data vs nothing?
  const stats = await db.execute(sql`
    SELECT 
      COUNT(*)::int as total,
      COUNT(*) FILTER (WHERE deployment_block IS NOT NULL)::int as has_block,
      COUNT(*) FILTER (WHERE deployment_timestamp IS NOT NULL)::int as has_timestamp,
      COUNT(*) FILTER (WHERE deployer_address IS NOT NULL)::int as has_deployer,
      COUNT(*) FILTER (WHERE era_id IS NOT NULL)::int as has_era,
      COUNT(*) FILTER (WHERE gas_used IS NOT NULL)::int as has_gas,
      COUNT(*) FILTER (WHERE decompilation_success = true)::int as decompiled_true,
      COUNT(*) FILTER (WHERE runtime_bytecode IS NOT NULL)::int as has_runtime_bytecode
    FROM contracts
    WHERE code_size_bytes IS NULL
  `);
  console.log("\nStats for null code_size_bytes contracts:");
  console.log(stats[0]);
}
main().catch(console.error);
