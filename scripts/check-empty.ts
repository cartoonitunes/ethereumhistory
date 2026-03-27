import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
async function main() {
  const client = postgres(process.env.DATABASE_URL!);
  const db = drizzle(client);
  const r = await db.execute(sql`
    SELECT COUNT(*) as empty_code_count FROM contracts
    WHERE deployment_tx_index IS NOT NULL
    AND (runtime_bytecode IS NULL OR runtime_bytecode = '0x' OR runtime_bytecode = '')
  `);
  console.log('Empty-code contracts with tx_index:', (r as any)[0]);
  await client.end();
}
main();
