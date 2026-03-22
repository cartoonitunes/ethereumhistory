import postgres from "postgres";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { prepare: false });

  const audit = await sql`
    SELECT
      COUNT(*) as total,
      COUNT(CASE WHEN deployment_block IS NULL THEN 1 END) as missing_block,
      COUNT(CASE WHEN deployment_tx_hash IS NULL THEN 1 END) as missing_tx,
      COUNT(CASE WHEN deployer_address IS NULL THEN 1 END) as missing_deployer,
      COUNT(CASE WHEN deployed_bytecode IS NULL THEN 1 END) as missing_deployed_bc,
      COUNT(CASE WHEN deployed_bytecode_hash IS NULL THEN 1 END) as missing_deployed_hash,
      COUNT(CASE WHEN runtime_bytecode IS NULL THEN 1 END) as missing_runtime_bc,
      COUNT(CASE WHEN era_id IS NULL THEN 1 END) as missing_era,
      COUNT(DISTINCT deployer_address) as unique_deployers
    FROM contracts
  `;
  console.log("=== EH Database Audit ===");
  for (const [k, v] of Object.entries(audit[0])) console.log(`  ${k}: ${Number(v as any).toLocaleString()}`);

  const eraFix = await sql`SELECT COUNT(*) as c FROM contracts WHERE deployment_block IS NOT NULL AND era_id IS NULL`;
  console.log(`  fixable_era: ${eraFix[0].c}`);

  const selfDest = await sql`SELECT COUNT(*) as c FROM contracts WHERE deployed_bytecode = '0x'`;
  console.log(`  self_destructed: ${selfDest[0].c}`);

  const nullBoth = await sql`SELECT COUNT(*) as c FROM contracts WHERE runtime_bytecode IS NULL AND deployed_bytecode IS NULL`;
  console.log(`  null_both_bytecodes: ${nullBoth[0].c}`);

  const noName = await sql`SELECT COUNT(*) as c FROM contracts WHERE etherscan_contract_name IS NULL AND token_name IS NULL AND ens_name IS NULL`;
  console.log(`  no_name_at_all: ${noName[0].c}`);

  await sql.end();
}
main().catch(e => { console.error(e); process.exit(1); });
