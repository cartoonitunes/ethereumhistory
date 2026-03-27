import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";

async function main() {
  const client = postgres(process.env.DATABASE_URL!);
  const db = drizzle(client);
  const r = await db.execute(sql`
    SELECT 
      COUNT(*) as total,
      COUNT(deployment_tx_index) as with_tx_index,
      COUNT(*) FILTER (WHERE deployment_tx_index IS NULL AND deployment_block BETWEEN 1 AND 1149999) as frontier_missing
    FROM contracts
  `);
  console.log(r[0]);
  await client.end();
}
main();
