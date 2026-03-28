import { sql } from 'drizzle-orm';
import { getDb } from '../src/lib/db-client';

const RUNTIME_BYTECODE_HASH = "143a4c9b8e904f318dd0351c58dd21dd";

const ABI = JSON.stringify([
  {"name":"kill","type":"function","inputs":[],"outputs":[],"stateMutability":"nonpayable"},
  {"name":"greet","type":"function","inputs":[],"outputs":[{"name":"","type":"string"}],"stateMutability":"view"},
  {"name":"mortal","type":"function","inputs":[],"outputs":[],"stateMutability":"nonpayable"}
]);

async function main() {
  const db = getDb();
  const result = await db.execute(sql.raw(`
    UPDATE contracts
    SET abi = '${ABI.replace(/'/g, "''")}'
    WHERE runtime_bytecode_hash = '${RUNTIME_BYTECODE_HASH}'
    AND (abi IS NULL OR abi = '')
  `));
  console.log(`Updated ${(result as any).rowCount ?? (result as any).count ?? '?'} contracts.`);
}
main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
