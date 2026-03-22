-- Migration 039: Add deployed_bytecode columns for correct sibling detection
-- The existing runtime_bytecode column stores CREATION bytecode (init+runtime),
-- not the actual deployed runtime code. Since constructor args are embedded in
-- creation code, md5(runtime_bytecode) is unique per contract, making sibling
-- detection useless. This adds proper deployed bytecode columns.

ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS deployed_bytecode TEXT;

ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS deployed_bytecode_hash TEXT;

CREATE INDEX IF NOT EXISTS contracts_deployed_bytecode_hash_idx
  ON contracts (deployed_bytecode_hash)
  WHERE deployed_bytecode_hash IS NOT NULL;
