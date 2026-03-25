import { getDb } from "../lib/db-client";
import { sql } from "drizzle-orm";

async function main() {
  const db = getDb();
  
  // Get 10 random contracts that STILL have no runtime_bytecode after the backfill
  const sample = await db.execute(sql`
    SELECT address, era_id, deployment_block, LENGTH(decompiled_code) as decompiled_len
    FROM contracts
    WHERE runtime_bytecode IS NULL
    ORDER BY RANDOM()
    LIMIT 10
  `);
  
  for (const r of sample as any[]) {
    console.log(`${r.address} | ${r.era_id} | block ${r.deployment_block} | decompiled: ${r.decompiled_len} chars`);
  }
}
main().catch(console.error);
