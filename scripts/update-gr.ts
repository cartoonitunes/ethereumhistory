import postgres from 'postgres';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  const sql = postgres(process.env.DATABASE_URL!);
  
  const updates = [
    {
      address: "0x1392a4f1642c22bc6e3380bb156193e790770c35",
    },
    {
      address: "0xf436ceba3850bd3b0e853b018212d6fc2b6267d0",
    }
  ];
  
  for (const u of updates) {
    const result = await sql`
      UPDATE contracts 
      SET 
        verification_method = 'exact_bytecode_match',
        verification_proof_url = 'https://github.com/cartoonitunes/globalregistrar-verification',
        verification_notes = 'Bytecode pre-compiled and embedded in go-ethereum commit 83ee39448e. Creation TX input matches GlobalRegistrarCode constant byte-for-byte.',
        compiler_commit = 'go-ethereum/83ee39448e',
        compiler_language = 'Solidity'
      WHERE address = ${u.address.toLowerCase()}
      RETURNING address, verification_method, verification_proof_url
    `;
    console.log('Updated:', JSON.stringify(result[0]));
  }
  
  await sql.end();
}

main().catch(console.error);
