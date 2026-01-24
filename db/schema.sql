-- ============================================================================
-- ethereumhistory.com Database Schema (Drizzle-compatible)
-- ============================================================================
-- This schema matches `src/lib/schema.ts` and is intended for:
-- - Local PostgreSQL (docker-compose or native Postgres)
-- - Vercel Postgres / Neon / Supabase
-- ============================================================================

-- =============================================================================
-- contracts
-- =============================================================================
CREATE TABLE IF NOT EXISTS contracts (
  address TEXT PRIMARY KEY,

  -- On-chain / provenance
  runtime_bytecode TEXT,
  deployer_address TEXT,
  deployment_tx_hash TEXT,
  deployment_block INTEGER,
  deployment_timestamp TIMESTAMP,

  -- Decompiled code
  decompiled_code TEXT,
  decompilation_success BOOLEAN DEFAULT FALSE,

  -- Deployment info
  gas_used INTEGER,
  gas_price TEXT,
  code_size_bytes INTEGER,

  -- Era classification
  era_id TEXT,

  -- Heuristics
  contract_type TEXT,
  confidence REAL DEFAULT 0.5,
  is_proxy BOOLEAN DEFAULT FALSE,
  has_selfdestruct BOOLEAN DEFAULT FALSE,
  is_erc20_like BOOLEAN DEFAULT FALSE,

  -- External data
  etherscan_contract_name TEXT,
  source_code TEXT,
  abi TEXT,

  -- Token metadata
  token_name TEXT,
  token_symbol TEXT,
  token_decimals INTEGER,

  -- Editorial / historical content
  short_description TEXT,
  description TEXT,
  historical_summary TEXT,
  historical_significance TEXT,
  historical_context TEXT,

  -- Fingerprints
  trigram_hash TEXT,
  control_flow_signature TEXT,
  shape_signature TEXT,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS contracts_era_idx ON contracts (era_id);
CREATE INDEX IF NOT EXISTS contracts_deployment_idx ON contracts (deployment_timestamp);
CREATE INDEX IF NOT EXISTS contracts_type_idx ON contracts (contract_type);
CREATE INDEX IF NOT EXISTS contracts_decompiled_idx ON contracts (decompilation_success);
CREATE INDEX IF NOT EXISTS contracts_featured_idx ON contracts (short_description);

-- =============================================================================
-- similarity_index
-- =============================================================================
CREATE TABLE IF NOT EXISTS similarity_index (
  contract_address TEXT NOT NULL,
  matched_address TEXT NOT NULL,

  similarity_score REAL NOT NULL,
  ngram_similarity REAL,
  control_flow_similarity REAL,
  shape_similarity REAL,

  similarity_type TEXT,

  explanation TEXT,
  shared_patterns TEXT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (contract_address, matched_address)
);

CREATE INDEX IF NOT EXISTS similarity_contract_idx ON similarity_index (contract_address);
CREATE INDEX IF NOT EXISTS similarity_score_idx ON similarity_index (similarity_score);

-- =============================================================================
-- function_signatures (optional)
-- =============================================================================
CREATE TABLE IF NOT EXISTS function_signatures (
  selector TEXT PRIMARY KEY,
  signature TEXT,
  name TEXT,
  source TEXT
);

CREATE INDEX IF NOT EXISTS signatures_name_idx ON function_signatures (name);

-- =============================================================================
-- historical_links
-- =============================================================================
CREATE TABLE IF NOT EXISTS historical_links (
  id SERIAL PRIMARY KEY,
  contract_address TEXT NOT NULL REFERENCES contracts(address) ON DELETE CASCADE,
  title TEXT,
  url TEXT NOT NULL,
  source TEXT,
  note TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS historical_links_contract_idx ON historical_links (contract_address);
CREATE INDEX IF NOT EXISTS historical_links_url_idx ON historical_links (url);

-- =============================================================================
-- contract_metadata
-- =============================================================================
CREATE TABLE IF NOT EXISTS contract_metadata (
  id SERIAL PRIMARY KEY,
  contract_address TEXT NOT NULL REFERENCES contracts(address) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT,
  json_value JSONB,
  source_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS contract_metadata_contract_idx ON contract_metadata (contract_address);
CREATE INDEX IF NOT EXISTS contract_metadata_key_idx ON contract_metadata (key);

