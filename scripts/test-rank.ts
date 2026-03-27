import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";

async function main() {
  const client = postgres(process.env.DATABASE_URL!);
  const db = drizzle(client);

  // Get a few contracts that have tx_index set
  const sample = await db.execute(sql`
    SELECT address, deployment_block, deployment_tx_index, etherscan_contract_name, token_name
    FROM contracts
    WHERE deployment_tx_index IS NOT NULL AND deployment_block BETWEEN 1 AND 1149999
    ORDER BY deployment_block ASC, deployment_tx_index ASC
    LIMIT 5
  `);

  for (const row of sample as any[]) {
    const rankResult = await db.execute(sql`
      SELECT COUNT(*)::int AS count FROM contracts
      WHERE
        deployment_block < ${row.deployment_block}
        OR (deployment_block = ${row.deployment_block} AND deployment_tx_index < ${row.deployment_tx_index})
    `);
    const rank = Number((rankResult as any)[0].count) + 1;
    console.log(`${row.address} (${row.token_name || row.etherscan_contract_name || 'unknown'}) → rank #${rank}`);
  }

  await client.end();
}
main();
