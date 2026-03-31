import postgres from 'postgres';
import * as dotenv from 'dotenv';
dotenv.config({ path: '/Users/claw/Projects/ethereumhistory/.env.local' });
async function main() {
  const sql = postgres(process.env.DATABASE_URL!);
  const result = await sql`
    SELECT address, etherscan_contract_name, token_name, verification_method, compiler_commit,
           deployment_timestamp::date as deployed, rank
    FROM contracts
    WHERE rank >= 50 AND rank <= 100
    ORDER BY rank
  `;
  for (const r of result) {
    const name = r.etherscan_contract_name || r.token_name || 'unnamed';
    console.log(`${r.rank} | ${r.address} | ${name} | ${r.deployed || '?'} | ${r.verification_method || 'none'}`);
  }
  console.log('Total:', result.length);
  await sql.end();
}
main().catch(console.error);
