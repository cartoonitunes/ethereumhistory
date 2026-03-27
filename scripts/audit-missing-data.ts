/**
 * Audit what data is missing across all contracts in the DB.
 * Tells us exactly what needs to be pulled before we write the cache/fetch scripts.
 */
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";

async function main() {
  const client = postgres(process.env.DATABASE_URL!);
  const db = drizzle(client);

  const r = await db.execute(sql`
    SELECT
      COUNT(*)                                                              AS total,
      COUNT(*) FILTER (WHERE deployment_tx_hash IS NULL)                   AS missing_tx_hash,
      COUNT(*) FILTER (WHERE deployment_tx_hash IS NOT NULL
                         AND deployment_tx_index IS NULL)                  AS has_hash_no_index,
      COUNT(*) FILTER (WHERE deployment_block IS NULL)                     AS missing_block,
      COUNT(*) FILTER (WHERE deployer_address IS NULL)                     AS missing_deployer,
      COUNT(*) FILTER (WHERE runtime_bytecode IS NULL
                          OR runtime_bytecode IN ('0x',''))                AS missing_bytecode,
      COUNT(*) FILTER (WHERE code_size_bytes IS NULL)                      AS missing_code_size,
      COUNT(*) FILTER (WHERE deployment_timestamp IS NULL)                 AS missing_timestamp,
      -- era breakdown for missing tx_index
      COUNT(*) FILTER (WHERE deployment_tx_index IS NULL
                         AND deployment_block BETWEEN 1 AND 1149999)       AS frontier_no_index,
      COUNT(*) FILTER (WHERE deployment_tx_index IS NULL
                         AND deployment_block BETWEEN 1150000 AND 2462999) AS homestead_no_index,
      COUNT(*) FILTER (WHERE deployment_tx_index IS NULL
                         AND deployment_block > 2462999)                   AS post_homestead_no_index
    FROM contracts
  `);

  const row = r[0] as Record<string, string>;
  console.log("\n=== Contract Data Audit ===\n");
  console.log(`Total contracts:           ${row.total}`);
  console.log(`Missing tx_hash:           ${row.missing_tx_hash}`);
  console.log(`Has hash, no tx_index:     ${row.has_hash_no_index}`);
  console.log(`Missing block:             ${row.missing_block}`);
  console.log(`Missing deployer:          ${row.missing_deployer}`);
  console.log(`Missing bytecode:          ${row.missing_bytecode}`);
  console.log(`Missing code_size_bytes:   ${row.missing_code_size}`);
  console.log(`Missing timestamp:         ${row.missing_timestamp}`);
  console.log(`\n--- tx_index gaps by era ---`);
  console.log(`Frontier missing index:    ${row.frontier_no_index}`);
  console.log(`Homestead missing index:   ${row.homestead_no_index}`);
  console.log(`Post-Homestead missing:    ${row.post_homestead_no_index}`);

  await client.end();
}
main();
