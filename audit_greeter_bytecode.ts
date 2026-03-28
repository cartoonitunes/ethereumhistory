import postgres from 'postgres';
const sql = postgres(process.env.DATABASE_URL!, { ssl: 'require' });

async function main() {
    // First: understand the full schema for bytecode-related fields
    const cols = await sql`
        SELECT column_name, data_type, character_maximum_length
        FROM information_schema.columns
        WHERE table_name = 'contracts'
        AND column_name ILIKE ANY(ARRAY['%bytecode%', '%hash%', '%code%', '%size%'])
        ORDER BY ordinal_position
    `;
    console.log('=== BYTECODE-RELATED SCHEMA FIELDS ===');
    for (const c of cols) console.log(`  ${c.column_name}: ${c.data_type}${c.character_maximum_length ? `(${c.character_maximum_length})` : ''}`);
    
    // Second: current state of ALL 85 frontier greeters
    const rows = await sql`
        SELECT 
            address,
            code_size_bytes,
            length(runtime_bytecode) / 2 - 1 as rtb_stored_bytes,
            left(runtime_bytecode, 12) as rtb_prefix,
            runtime_bytecode_hash,
            deployed_bytecode_hash,
            verification_method,
            verification_status
        FROM contracts
        WHERE etherscan_contract_name = 'Greeter' AND era_id = 'frontier'
        ORDER BY deployment_block
    `;
    
    console.log('\n=== ALL 85 FRONTIER GREETERS — CURRENT STATE ===');
    console.log(`${'address'.padEnd(44)} | ${'code_size'.padEnd(9)} | ${'rtb_stored'.padEnd(10)} | ${'rtb_hash'.padEnd(20)} | ${'dbh'.padEnd(20)} | vm`);
    for (const r of rows) {
        const rtbStored = r.rtb_stored_bytes ?? 'NULL';
        const rtbHash = r.runtime_bytecode_hash?.slice(0,16) ?? 'NULL';
        const dbh = r.deployed_bytecode_hash?.slice(0,16) ?? 'NULL';
        console.log(`${r.address} | ${String(r.code_size_bytes).padEnd(9)} | ${String(rtbStored).padEnd(10)} | ${rtbHash.padEnd(20)} | ${dbh.padEnd(20)} | ${r.verification_method ?? '-'}`);
    }
    
    // Third: summary by (code_size, rtb_stored) combo
    const summary = await sql`
        SELECT 
            code_size_bytes,
            length(runtime_bytecode)/2 - 1 as rtb_stored_bytes,
            runtime_bytecode_hash,
            COUNT(*) as n
        FROM contracts
        WHERE etherscan_contract_name = 'Greeter' AND era_id = 'frontier'
        GROUP BY code_size_bytes, length(runtime_bytecode)/2 - 1, runtime_bytecode_hash
        ORDER BY n DESC, code_size_bytes
    `;
    console.log('\n=== SUMMARY BY (code_size, rtb_stored, hash) ===');
    for (const r of summary) {
        console.log(`  code_size=${r.code_size_bytes}  rtb_stored=${r.rtb_stored_bytes ?? 'NULL'}  hash=${r.runtime_bytecode_hash?.slice(0,16) ?? 'NULL'}  count=${r.n}`);
    }

    await sql.end();
}
main().catch(console.error);
