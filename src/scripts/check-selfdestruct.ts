import { getDb } from "../lib/db-client";
import { sql } from "drizzle-orm";
async function main() {
  const db = getDb();
  
  // How many have has_selfdestruct true (from bytecode heuristics)?
  const r = await db.execute(sql`
    SELECT 
      COUNT(*)::int as total,
      COUNT(*) FILTER (WHERE has_selfdestruct = true)::int as has_selfdestruct_opcode,
      COUNT(*) FILTER (WHERE code_size_bytes = 0)::int as zero_size,
      COUNT(*) FILTER (WHERE runtime_bytecode = '0x')::int as zero_x_bytecode,
      COUNT(*) FILTER (WHERE LENGTH(runtime_bytecode) <= 2)::int as tiny_bytecode
    FROM contracts
  `);
  console.log(r[0]);
}
main().catch(console.error);
