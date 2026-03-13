-- Migration 036: Add runtime_bytecode_hash for fast bytecode family lookups
-- This enables the "Same Bytecode" feature: group contracts compiled from same source/settings

ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS runtime_bytecode_hash TEXT;

CREATE INDEX IF NOT EXISTS contracts_bytecode_hash_idx
  ON contracts (runtime_bytecode_hash)
  WHERE runtime_bytecode_hash IS NOT NULL;

-- Backfill: compute md5 hash for all contracts with known runtime bytecode
UPDATE contracts
  SET runtime_bytecode_hash = md5(runtime_bytecode)
  WHERE runtime_bytecode IS NOT NULL
    AND runtime_bytecode != ''
    AND runtime_bytecode_hash IS NULL;
