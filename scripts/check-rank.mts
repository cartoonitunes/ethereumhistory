import { sql } from 'drizzle-orm';
import { getDb } from '../src/lib/db-client.js';

const db = getDb();
const r = await db.execute(sql.raw(`
  SELECT 
    COUNT(*) FILTER (WHERE (runtime_bytecode IS NULL OR runtime_bytecode IN ('0x','')) AND creation_bytecode IS NOT NULL AND creation_bytecode NOT IN ('0x','') AND deployment_tx_index IS NOT NULL) as self_destructed_with_creation,
    COUNT(*) FILTER (WHERE code_size_bytes > 0 AND runtime_bytecode IS NOT NULL AND runtime_bytecode NOT IN ('0x','') AND deployment_tx_index IS NOT NULL) as active_by_runtime,
    COUNT(*) FILTER (WHERE deployment_tx_index IS NOT NULL AND creation_bytecode IS NOT NULL AND creation_bytecode NOT IN ('0x','')) as deployed_with_creation,
    COUNT(*) FILTER (WHERE deployment_tx_index IS NOT NULL) as total_with_tx_index
  FROM contracts
`));
console.log(r.rows[0]);
process.exit(0);
