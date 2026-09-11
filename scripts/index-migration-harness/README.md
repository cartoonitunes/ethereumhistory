# Index-migration parity harnesses

The three harnesses used to prove the Neon index queries match the Turso ones.
They run against a **throwaway local Postgres** plus a sample of the enriched
SQLite index — they never touch production.

## Setup

```bash
export PATH=/opt/homebrew/opt/postgresql@16/bin:$PATH
export LC_ALL=C                      # else Postgres 16 on macOS refuses to start
SP=/tmp/eh-index-harness; mkdir -p $SP /tmp/ehpg
initdb -D $SP/pgdata -U postgres --auth=trust
pg_ctl -D $SP/pgdata -o "-p 55433 -k /tmp/ehpg -c listen_addresses=127.0.0.1" -l $SP/pg.log start
createdb -h 127.0.0.1 -p 55433 -U postgres ehtest
psql "postgres://postgres@127.0.0.1:55433/ehtest" -f db/migrations/089_neon_contract_index.sql

# Sample the enriched index (every 300th row ≈ 40k rows) plus ALL families.
DB=~/.openclaw/enrichment-pipeline/enriched_index.db
sqlite3 "$DB" -cmd ".mode csv" "SELECT address,deployer,block_number,timestamp,bytecode_hash,code_size,era,year,is_internal,gas_used,value_wei,is_documented,is_cracked,verification_method,etherscan_contract_name,contract_type,manual_categories,has_writeup,cracked_sibling_address,proof_url,is_erc20_like,is_proxy,has_selfdestruct,is_self_destructed,token_name,token_symbol,token_decimals,ens_name,deployer_ens_name,sourcify_verified,sourcify_match_type,creation_tx_hash FROM contract_index WHERE rowid % 300 = 0;" > $SP/ci.csv
sqlite3 "$DB" -cmd ".mode csv" "SELECT bytecode_hash,sibling_count,is_cracked,cracked_address,proof_url FROM bytecode_families;" > $SP/bf.csv
```

Load both CSVs with `\copy … WITH (FORMAT csv, NULL '')`, then build a matching
SQLite sample DB at `$SP/sample.db`.

**Gotcha that cost an hour:** Turso's `bytecode_families` declares its columns
with no type, so a plain `.import` of the CSV stores `sibling_count` as TEXT and
`bf.sibling_count >= 1000` then compares TEXT to INTEGER — in SQLite every text
value sorts above every integer, so the filter matches far too many rows. The
real enriched DB stores INTEGER (`SELECT typeof(sibling_count)` to confirm).
Declare the sample table's columns as INTEGER, or the harness reports a
difference that does not exist in production.

## Running

```bash
SP=$SP node scripts/index-migration-harness/sql-parity.mjs      # 135 assertions
npx tsx scripts/index-migration-harness/module-parity.ts        #  43 assertions
cp scripts/index-migration-harness/cron-parity.ts scripts/_tmp.ts && npx tsx scripts/_tmp.ts && rm scripts/_tmp.ts
```

`cron-parity.ts` imports `drizzle-orm` directly, so it has to run from inside
the repo tree for module resolution to find it — hence the copy.

`ANALYZE` after loading, or the planner seq-scans and the timings mean nothing.
