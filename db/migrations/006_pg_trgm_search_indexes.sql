-- Enable pg_trgm + add search indexes for homepage unified search
-- Safe to run multiple times.

-- Required for fast ILIKE '%...%' substring matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- -----------------------------------------------------------------------------
-- Contracts: unified search columns
-- -----------------------------------------------------------------------------

-- Address search (supports partial/substring matches)
CREATE INDEX IF NOT EXISTS contracts_address_trgm_idx
  ON contracts
  USING gin (address gin_trgm_ops);

-- Small text fields (high ROI)
CREATE INDEX IF NOT EXISTS contracts_token_name_trgm_idx
  ON contracts
  USING gin (token_name gin_trgm_ops)
  WHERE token_name IS NOT NULL;

CREATE INDEX IF NOT EXISTS contracts_token_symbol_trgm_idx
  ON contracts
  USING gin (token_symbol gin_trgm_ops)
  WHERE token_symbol IS NOT NULL;

CREATE INDEX IF NOT EXISTS contracts_etherscan_contract_name_trgm_idx
  ON contracts
  USING gin (etherscan_contract_name gin_trgm_ops)
  WHERE etherscan_contract_name IS NOT NULL;

-- Large text fields (higher storage cost, but matches current query shape)
CREATE INDEX IF NOT EXISTS contracts_decompiled_code_trgm_idx
  ON contracts
  USING gin (decompiled_code gin_trgm_ops)
  WHERE decompiled_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS contracts_source_code_trgm_idx
  ON contracts
  USING gin (source_code gin_trgm_ops)
  WHERE source_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS contracts_abi_trgm_idx
  ON contracts
  USING gin (abi gin_trgm_ops)
  WHERE abi IS NOT NULL;

-- -----------------------------------------------------------------------------
-- People: homepage unified search also includes people + wallets
-- -----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS people_name_trgm_idx
  ON people
  USING gin (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS people_role_trgm_idx
  ON people
  USING gin (role gin_trgm_ops)
  WHERE role IS NOT NULL;

CREATE INDEX IF NOT EXISTS people_short_bio_trgm_idx
  ON people
  USING gin (short_bio gin_trgm_ops)
  WHERE short_bio IS NOT NULL;

CREATE INDEX IF NOT EXISTS people_bio_trgm_idx
  ON people
  USING gin (bio gin_trgm_ops)
  WHERE bio IS NOT NULL;

-- Wallet lookup uses ILIKE/substring matching; primary key btree doesn't help for '%...%'
CREATE INDEX IF NOT EXISTS people_wallets_address_trgm_idx
  ON people_wallets
  USING gin (address gin_trgm_ops);

