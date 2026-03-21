import { getDb } from '@/lib/db-client';
import { sql } from 'drizzle-orm';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const ETHERSCAN_KEY = "AHMV3WAI75TQVJI2XEFUUKFKK1KJTFY1BD";
const DELAY_MS = 200;

async function getCode(address: string): Promise<string> {
  const url = `https://api.etherscan.io/v2/api?chainid=1&module=proxy&action=eth_getCode&address=${address}&tag=latest&apikey=${ETHERSCAN_KEY}`;
  const res = await fetch(url);
  const d = await res.json() as any;
  return d.result || '';
}

async function main() {
  const db = getDb();
  const contracts = await db.execute(sql`
    SELECT address FROM contracts 
    WHERE self_destructed IS NULL AND code_size_bytes > 0
    ORDER BY deployment_timestamp ASC
  `) as any[];
  
  console.log(`Checking ${contracts.length} contracts...`);
  let alive = 0, dead = 0, i = 0;
  
  for (const { address } of contracts) {
    try {
      const code = await getCode(address);
      const selfDestructed = code === '0x' || code === '';
      await db.execute(sql`UPDATE contracts SET self_destructed = ${selfDestructed} WHERE address = ${address}`);
      if (selfDestructed) dead++; else alive++;
    } catch (e) { /* skip */ }
    i++;
    if (i % 100 === 0) console.log(`${i}/${contracts.length} — alive: ${alive}, dead: ${dead}`);
    await new Promise(r => setTimeout(r, DELAY_MS));
  }
  console.log(`\nDone! alive: ${alive}, self_destructed: ${dead}`);
}
main().then(() => process.exit(0)).catch(e => { console.error(e.message); process.exit(1); });
