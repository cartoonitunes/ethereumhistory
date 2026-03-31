import postgres from 'postgres';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  const sql = postgres(process.env.DATABASE_URL!);

  // Update GR1
  let r = await sql`
    UPDATE contracts
    SET
      short_description = 'The official Ethereum GlobalRegistrar deployed by the go-ethereum team in August 2015. This was the canonical name registry contract embedded as pre-compiled bytecode directly in the geth client. Deployed at block 50,466, it was the 19th contract on the Ethereum mainnet.'
    WHERE address = '0x1392a4f1642c22bc6e3380bb156193e790770c35'
    RETURNING address, short_description
  `;
  console.log('GR1:', r[0].address, '- description set');

  // Update GR2
  r = await sql`
    UPDATE contracts
    SET
      short_description = 'The second deployment of the official Ethereum GlobalRegistrar, deployed nine days after the first. Both deployments use identical bytecode pre-compiled and embedded by the go-ethereum team in commit 83ee39448e. This is contract rank 24 on Ethereum mainnet, block 51,245.'
    WHERE address = '0xf436ceba3850bd3b0e853b018212d6fc2b6267d0'
    RETURNING address, short_description
  `;
  console.log('GR2:', r[0].address, '- description set');

  await sql.end();
}

main().catch(console.error);
