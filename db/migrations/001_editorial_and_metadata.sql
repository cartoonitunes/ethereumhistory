-- Migration: add editorial fields + metadata tables
-- Safe to run multiple times.

ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS short_description TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS historical_summary TEXT,
  ADD COLUMN IF NOT EXISTS historical_significance TEXT,
  ADD COLUMN IF NOT EXISTS historical_context TEXT;

CREATE INDEX IF NOT EXISTS contracts_featured_idx ON contracts (short_description);

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

