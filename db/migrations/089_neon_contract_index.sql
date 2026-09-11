-- Migration 089: Neon-resident copy of the Turso contract index.
--
-- WHAT
-- ----
-- Creates `neon_contract_index` (parallel to Turso's 12M-row `contract_index`)
-- and `neon_bytecode_families` (parallel to `bytecode_families`), plus the
-- indexes the browse / deployer / resolver / cron queries need.
--
-- Purely ADDITIVE. Nothing existing is dropped, altered, or renamed. The tables
-- are created empty; until `INDEX_SOURCE=neon` is set, nothing reads them, so
-- applying this migration on its own changes no behavior whatsoever.
--
-- COLUMN TYPE CHOICES (these are load-bearing — see lib/schema.ts)
-- ----------------------------------------------------------------
--   is_internal / is_cracked / is_* : INTEGER, never BOOLEAN. The application
--     compares `row.is_internal === 1` and relies on 0/1 truthiness. A boolean
--     column returns true/false and every one of those tests would silently
--     flip.
--   value_wei : NUMERIC, never BIGINT. Observed values run to 26 digits, past
--     int64. postgres.js returns NUMERIC as a string, which matches the
--     existing `valueWei?: string` type exactly.
--   address / deployer : TEXT, stored lowercase. Every call site lowercases
--     before querying, so lookups are a plain `=` against the primary key.
--     Do NOT add a LOWER() functional index or wrap the column in LOWER() —
--     that converts a PK lookup into a 12M-row sequential scan.
--   bytecode_hash : 32-char lowercase hex, no 0x prefix, NULL for ~2.1M rows.
--
-- INDEX CREATION IS NOT `CONCURRENTLY`, deliberately. The tables are created
-- empty in this same file, so every index build here is instant and locks
-- nothing. It also has to be this way mechanically: scripts/migrate.ts sends
-- each file as one multi-statement simple query, which Postgres wraps in an
-- implicit transaction, and `CREATE INDEX CONCURRENTLY` cannot run inside a
-- transaction block.
--
-- NOTE ON THE BULK LOAD: when the 12M rows are copied in, drop these indexes
-- first and recreate them afterwards (CONCURRENTLY, from a standalone psql
-- session). Loading into an indexed table is several times slower and leaves
-- the indexes bloated.
--
-- Idempotent: IF NOT EXISTS throughout, safe to re-run.

CREATE TABLE IF NOT EXISTS neon_contract_index (
  address                 TEXT PRIMARY KEY,
  deployer                TEXT    NOT NULL,
  block_number            INTEGER NOT NULL,
  timestamp               INTEGER NOT NULL,      -- unix seconds
  bytecode_hash           TEXT,
  code_size               INTEGER NOT NULL,
  era                     TEXT    NOT NULL,      -- verbose ("dao-fork"), not the app id
  year                    INTEGER NOT NULL,
  is_internal             INTEGER NOT NULL DEFAULT 0,
  gas_used                INTEGER,
  value_wei               NUMERIC,

  -- enrichment columns
  is_documented           INTEGER DEFAULT 0,
  is_cracked              INTEGER DEFAULT 0,
  verification_method     TEXT,
  etherscan_contract_name TEXT,
  contract_type           TEXT,
  manual_categories       TEXT,
  has_writeup             INTEGER DEFAULT 0,
  cracked_sibling_address TEXT,
  proof_url               TEXT,
  is_erc20_like           INTEGER DEFAULT 0,
  is_proxy                INTEGER DEFAULT 0,
  has_selfdestruct        INTEGER DEFAULT 0,
  is_self_destructed      INTEGER DEFAULT 0,
  token_name              TEXT,
  token_symbol            TEXT,
  token_decimals          INTEGER,
  ens_name                TEXT,
  deployer_ens_name       TEXT,
  sourcify_verified       INTEGER DEFAULT 0,
  sourcify_match_type     TEXT,
  creation_tx_hash        TEXT
);

CREATE TABLE IF NOT EXISTS neon_bytecode_families (
  bytecode_hash   TEXT PRIMARY KEY,
  sibling_count   INTEGER NOT NULL DEFAULT 0,
  is_cracked      INTEGER NOT NULL DEFAULT 0,
  cracked_address TEXT,
  proof_url       TEXT
);

-- Deployer pages: WHERE deployer = $1 [AND era = $2] ORDER BY block_number.
CREATE INDEX IF NOT EXISTS neon_contract_index_deployer_block_idx
  ON neon_contract_index (deployer, block_number);
CREATE INDEX IF NOT EXISTS neon_contract_index_deployer_era_idx
  ON neon_contract_index (deployer, era);

-- Browse index mode: era / year filters paired with a block_number sort.
CREATE INDEX IF NOT EXISTS neon_contract_index_era_block_idx
  ON neon_contract_index (era, block_number);
CREATE INDEX IF NOT EXISTS neon_contract_index_year_block_idx
  ON neon_contract_index (year, block_number);

-- Unfiltered browse sorts.
CREATE INDEX IF NOT EXISTS neon_contract_index_block_idx
  ON neon_contract_index (block_number);
CREATE INDEX IF NOT EXISTS neon_contract_index_code_size_idx
  ON neon_contract_index (code_size);

-- Family join (min_siblings filter, resolver lookup).
CREATE INDEX IF NOT EXISTS neon_contract_index_bytecode_hash_idx
  ON neon_contract_index (bytecode_hash);

-- The hourly cron's single-pass GROUP BY (era, year).
CREATE INDEX IF NOT EXISTS neon_contract_index_era_year_idx
  ON neon_contract_index (era, year);
