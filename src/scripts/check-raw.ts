import { getDb } from "../lib/db-client";
import { sql } from "drizzle-orm";

async function main() {
  const db = getDb();
  
  for (const addr of ['0x7acaaf26ea27b94286149542e9db9ee478f0fafb', '0xd01283628e32197d3211bab7b34705004478f6b5']) {
    const [row] = await db.execute(sql`
      SELECT 
        address,
        code_size_bytes,
        OCTET_LENGTH(runtime_bytecode) as runtime_bytes_stored,
        LEFT(runtime_bytecode, 10) as runtime_hex_start,
        OCTET_LENGTH(deployed_bytecode) as deployed_bytes_stored,
        LEFT(deployed_bytecode, 10) as deployed_hex_start
      FROM contracts WHERE address = ${addr}
    `) as any[];
    console.log(addr, ':', row);
  }
  
  // Also check: does the app fetch bytecode live from Etherscan at render time?
  // Look for any live-fetch logic in the contract page data loading
}
main().catch(console.error);
