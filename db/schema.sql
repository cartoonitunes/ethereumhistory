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
  token_logo TEXT,

  -- Editorial / historical content
  short_description TEXT,
  description TEXT,
  historical_summary TEXT,
  historical_significance TEXT,
  historical_context TEXT,
  featured BOOLEAN NOT NULL DEFAULT FALSE,

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
CREATE INDEX IF NOT EXISTS contracts_featured_flag_idx ON contracts (featured) WHERE featured = TRUE;

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
-- historians (editor accounts)
-- =============================================================================

CREATE TABLE IF NOT EXISTS historians (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  token_hash TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  trusted BOOLEAN NOT NULL DEFAULT FALSE,
  trusted_override BOOLEAN DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS historians_email_unique ON historians (email);
CREATE INDEX IF NOT EXISTS historians_active_idx ON historians (active);
CREATE INDEX IF NOT EXISTS historians_trusted_idx ON historians (trusted);

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
  created_by INTEGER REFERENCES historians(id) ON DELETE SET NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS historical_links_contract_idx ON historical_links (contract_address);
CREATE INDEX IF NOT EXISTS historical_links_url_idx ON historical_links (url);
CREATE INDEX IF NOT EXISTS historical_links_created_by_idx ON historical_links (created_by);

-- =============================================================================
-- contract_edits
-- =============================================================================
CREATE TABLE IF NOT EXISTS contract_edits (
  id SERIAL PRIMARY KEY,
  contract_address TEXT NOT NULL REFERENCES contracts(address) ON DELETE CASCADE,
  historian_id INTEGER NOT NULL REFERENCES historians(id) ON DELETE CASCADE,
  edited_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fields_changed TEXT[] -- Array of field names that were changed in this edit
);

CREATE INDEX IF NOT EXISTS contract_edits_historian_idx ON contract_edits (historian_id, edited_at DESC);
CREATE INDEX IF NOT EXISTS contract_edits_contract_idx ON contract_edits (contract_address, historian_id);
CREATE INDEX IF NOT EXISTS contract_edits_edited_at_idx ON contract_edits (edited_at DESC);
CREATE INDEX IF NOT EXISTS contract_edits_first_edit_idx ON contract_edits (contract_address, historian_id, edited_at);

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

-- =============================================================================
-- people
-- =============================================================================
CREATE TABLE IF NOT EXISTS people (
  address TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  role TEXT,
  short_bio TEXT,
  bio TEXT,
  highlights JSONB,
  website_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS people_slug_idx ON people (slug);

-- =============================================================================
-- people_wallets
-- =============================================================================
CREATE TABLE IF NOT EXISTS people_wallets (
  address TEXT PRIMARY KEY,
  person_address TEXT NOT NULL REFERENCES people(address) ON DELETE CASCADE,
  label TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS people_wallets_person_idx ON people_wallets (person_address);

-- =============================================================================
-- historian_invitations
-- =============================================================================
CREATE TABLE IF NOT EXISTS historian_invitations (
  id SERIAL PRIMARY KEY,
  inviter_id INTEGER NOT NULL REFERENCES historians(id) ON DELETE CASCADE,
  invitee_id INTEGER REFERENCES historians(id) ON DELETE SET NULL,
  invite_token TEXT NOT NULL UNIQUE,
  invited_email TEXT,
  invited_name TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  accepted_at TIMESTAMP,
  expires_at TIMESTAMP,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS historian_invitations_token_idx ON historian_invitations (invite_token);
CREATE INDEX IF NOT EXISTS historian_invitations_inviter_idx ON historian_invitations (inviter_id);
CREATE INDEX IF NOT EXISTS historian_invitations_invitee_idx ON historian_invitations (invitee_id);
CREATE INDEX IF NOT EXISTS historian_invitations_expires_idx ON historian_invitations (expires_at);
CREATE UNIQUE INDEX IF NOT EXISTS historian_invitations_token_unique ON historian_invitations (invite_token);

-- =============================================================================
-- Capability Classification (Beta)
-- =============================================================================
CREATE TABLE IF NOT EXISTS contract_capabilities (
  contract_address TEXT NOT NULL REFERENCES contracts(address) ON DELETE CASCADE,
  capability_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'probable',
  confidence REAL NOT NULL DEFAULT 0.5,
  primary_evidence_type TEXT,
  detector_version TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (contract_address, capability_key)
);

CREATE INDEX IF NOT EXISTS contract_capabilities_key_idx ON contract_capabilities (capability_key);
CREATE INDEX IF NOT EXISTS contract_capabilities_status_idx ON contract_capabilities (status);
CREATE INDEX IF NOT EXISTS contract_capabilities_confidence_idx ON contract_capabilities (confidence);

CREATE TABLE IF NOT EXISTS capability_evidence (
  id SERIAL PRIMARY KEY,
  contract_address TEXT NOT NULL REFERENCES contracts(address) ON DELETE CASCADE,
  capability_key TEXT NOT NULL,
  evidence_type TEXT NOT NULL,
  evidence_key TEXT,
  evidence_value TEXT,
  snippet TEXT,
  confidence REAL NOT NULL DEFAULT 0.5,
  detector_version TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS capability_evidence_contract_idx ON capability_evidence (contract_address);
CREATE INDEX IF NOT EXISTS capability_evidence_key_idx ON capability_evidence (capability_key);
CREATE INDEX IF NOT EXISTS capability_evidence_type_idx ON capability_evidence (evidence_type);

