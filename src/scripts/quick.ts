import { getDb } from "../lib/db-client";
import { sql } from "drizzle-orm";
async function main() {
  const db = getDb();
  const r = await db.execute(sql`
    SELECT address, code_size_bytes, has_selfdestruct,
           LEFT(runtime_bytecode, 20) as rt_start,
           LENGTH(decompiled_code) as decomp_len
    FROM contracts WHERE address = '0xf9c2a99482823c30062ded531e049163034273c2'
  `);
  console.log(r[0] || 'NOT IN DB');
}
main().catch(console.error);
