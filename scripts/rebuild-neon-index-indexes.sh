#!/usr/bin/env bash
# Recreate the secondary indexes on neon_contract_index after the bulk load.
#
# Plain CREATE INDEX, not CONCURRENTLY: nothing reads this table yet
# (INDEX_SOURCE=turso), so the ACCESS EXCLUSIVE lock it takes is uncontended,
# and a non-concurrent build is roughly twice as fast and leaves a denser index.
# Once the table IS serving traffic, any future rebuild must use CONCURRENTLY.
#
# Each index is built in its own psql invocation so a failure is isolated and
# re-runnable (IF NOT EXISTS makes the whole script idempotent).
#
# MEMORY SETTINGS — do not raise these without checking the compute size first.
# An earlier version set maintenance_work_mem = '1GB', which on this project's
# Neon compute (shared_buffers 128MB, i.e. the smallest tier, ~1GB RAM) OOM'd a
# parallel index worker and took the whole compute down with it. No data was
# lost — Postgres rolled the build back and restarted — but nothing was gained
# either. 12M-row btree builds do not need a big sort buffer; they just spill to
# a temp file and take longer. max_parallel_maintenance_workers = 0 matters as
# much as the buffer size, because each worker reserves maintenance_work_mem
# of its own.
#
# Check before changing: SELECT setting FROM pg_settings WHERE name='shared_buffers';
set -uo pipefail
cd "$(dirname "$0")/.." || exit 1
# shellcheck disable=SC1091
set -a; . ./.env.local; set +a
U="${DATABASE_URL_UNPOOLED:-${POSTGRES_URL_NON_POOLING:-$DATABASE_URL}}"

build() {
  local name="$1" ddl="$2"
  printf '  %-46s ' "$name"
  local start=$SECONDS
  if out=$(psql "$U" -v ON_ERROR_STOP=1 -q \
        -c "SET maintenance_work_mem = '64MB';" \
        -c "SET max_parallel_maintenance_workers = 0;" \
        -c "SET statement_timeout = 0;" \
        -c "$ddl" 2>&1); then
    echo "done in $((SECONDS - start))s"
  else
    echo "FAILED after $((SECONDS - start))s"
    echo "$out" | sed 's/^/      /'
    return 1
  fi
}

echo "rebuilding secondary indexes on neon_contract_index"
rc=0
build neon_contract_index_deployer_block_idx \
  "CREATE INDEX IF NOT EXISTS neon_contract_index_deployer_block_idx ON neon_contract_index (deployer, block_number);" || rc=1
build neon_contract_index_deployer_era_idx \
  "CREATE INDEX IF NOT EXISTS neon_contract_index_deployer_era_idx ON neon_contract_index (deployer, era);" || rc=1
build neon_contract_index_era_block_idx \
  "CREATE INDEX IF NOT EXISTS neon_contract_index_era_block_idx ON neon_contract_index (era, block_number);" || rc=1
build neon_contract_index_year_block_idx \
  "CREATE INDEX IF NOT EXISTS neon_contract_index_year_block_idx ON neon_contract_index (year, block_number);" || rc=1
build neon_contract_index_block_idx \
  "CREATE INDEX IF NOT EXISTS neon_contract_index_block_idx ON neon_contract_index (block_number);" || rc=1
build neon_contract_index_code_size_idx \
  "CREATE INDEX IF NOT EXISTS neon_contract_index_code_size_idx ON neon_contract_index (code_size);" || rc=1
build neon_contract_index_bytecode_hash_idx \
  "CREATE INDEX IF NOT EXISTS neon_contract_index_bytecode_hash_idx ON neon_contract_index (bytecode_hash);" || rc=1
build neon_contract_index_era_year_idx \
  "CREATE INDEX IF NOT EXISTS neon_contract_index_era_year_idx ON neon_contract_index (era, year);" || rc=1

echo "analyzing"
psql "$U" -q -c "SET statement_timeout = 0;" -c "SET max_parallel_workers_per_gather = 0;" \
  -c "ANALYZE neon_contract_index;" -c "ANALYZE neon_bytecode_families;" \
  && echo "  ANALYZE done" || rc=1

echo
psql "$U" -c "SELECT indexname, pg_size_pretty(pg_relation_size(indexname::regclass)) AS size
              FROM pg_indexes WHERE tablename='neon_contract_index' ORDER BY indexname;"
exit $rc
