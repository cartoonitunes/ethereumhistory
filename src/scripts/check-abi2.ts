import { getDb } from "../lib/db-client";
import { sql } from "drizzle-orm";

async function main() {
  const db = getDb();
  
  // Which exact cracks have ABI?
  const withAbi = await db.execute(sql`
    SELECT address, etherscan_contract_name, token_name
    FROM contracts 
    WHERE verification_method = 'exact_bytecode_match' AND abi IS NOT NULL
    LIMIT 10
  `);
  console.log("Exact cracks with ABI:");
  for (const r of withAbi as any[]) {
    console.log(' ', r.address, r.etherscan_contract_name || r.token_name || '(unnamed)');
  }
  
  // Check one of these against the ABI endpoint
}
main().catch(console.error);
