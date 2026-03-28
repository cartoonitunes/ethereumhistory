import postgres from "postgres";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
const client = postgres(process.env.DATABASE_URL!, { prepare: false });
async function main() {
  const zombies = await client`
    SELECT address, deployment_block FROM contracts
    WHERE deploy_status = 'success' AND (code_size_bytes = 0 OR runtime_bytecode = '0x')
    AND deployment_block < 50000
    ORDER BY deployment_block ASC
    LIMIT 10
  `;
  console.log('Zombie addresses:', zombies.map((r: any) => r.address));
  await client.end();
}
main().catch(e => { console.error(e); process.exit(1); });
