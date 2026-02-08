-- Migration 016: Additional search indexes for performance
-- These indexes improve query performance for common access patterns
-- as the platform scales to handle more traffic.

-- Index for searching by token name (used in search, browse, sitemap)
CREATE INDEX IF NOT EXISTS contracts_token_name_idx ON contracts (token_name);

-- Index for searching by token symbol
CREATE INDEX IF NOT EXISTS contracts_token_symbol_idx ON contracts (token_symbol);

-- Index for filtering by deployer address (for deployer profile pages)
CREATE INDEX IF NOT EXISTS contracts_deployer_address_idx ON contracts (deployer_address);

-- Index for the etherscan contract name (used in search)
CREATE INDEX IF NOT EXISTS contracts_etherscan_name_idx ON contracts (etherscan_contract_name);

-- Composite index for documented contracts browse (short_description not null + era_id)
CREATE INDEX IF NOT EXISTS contracts_documented_era_idx
  ON contracts (era_id)
  WHERE short_description IS NOT NULL AND short_description != '';

-- Index for contract edits by contract address (for edit history display)
CREATE INDEX IF NOT EXISTS contract_edits_address_idx ON contract_edits (contract_address, edited_at DESC);

-- Index for edit suggestions by contract address and status
CREATE INDEX IF NOT EXISTS edit_suggestions_contract_status_idx
  ON edit_suggestions (contract_address, status);
