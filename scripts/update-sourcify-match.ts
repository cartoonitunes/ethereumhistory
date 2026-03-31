import postgres from 'postgres';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  const address = process.argv[2];
  const matchValue = process.argv[3] || 'match';

  if (!address) {
    console.error('Usage: npx tsx scripts/update-sourcify-match.ts <address> [match|partial_match]');
    process.exit(1);
  }

  const sql = postgres(process.env.DATABASE_URL!);
  const result = await sql`
    UPDATE contracts 
    SET sourcify_match = ${matchValue}
    WHERE address = ${address.toLowerCase()}
    RETURNING address, etherscan_contract_name, sourcify_match
  `;

  if (result.length === 0) {
    console.error('No contract found for address:', address);
  } else {
    console.log('Updated sourcify_match:', JSON.stringify(result[0]));
  }

  await sql.end();
}

main().catch(console.error);
