-- Migration 055: Store deployment receipt data and deploy status
--
-- deploy_status: 'success' | 'failed' | null (not yet fetched)
-- deploy_gas_limit: gas sent with the deploy tx (from eth_getTransactionByHash.gas)
-- creation_bytecode: raw constructor input data (from deploy tx .input field)
--   - Separate from runtime_bytecode (which is what ends up on-chain)
--   - Needed for exact bytecode verification
-- deployed_bytecode: ground-truth on-chain code from eth_getCode
--   (already exists in schema but not consistently populated)

ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS deploy_status TEXT,         -- 'success' | 'failed'
  ADD COLUMN IF NOT EXISTS deploy_gas_limit INTEGER,   -- gas field on deploy tx
  ADD COLUMN IF NOT EXISTS deploy_nonce INTEGER,       -- deployer nonce at deploy time
  ADD COLUMN IF NOT EXISTS creation_bytecode TEXT;     -- constructor input (deploy tx .input)

-- Index for quickly finding failed deploys
CREATE INDEX IF NOT EXISTS idx_contracts_deploy_status
  ON contracts (deploy_status) WHERE deploy_status IS NOT NULL;

COMMENT ON COLUMN contracts.deploy_status IS
  'success = tx status 0x1 (code written), failed = tx status 0x0 (nothing on chain)';
COMMENT ON COLUMN contracts.creation_bytecode IS
  'Full constructor input from deploy tx — includes runtime + constructor args. Different from runtime_bytecode.';
COMMENT ON COLUMN contracts.deploy_gas_limit IS
  'Gas limit sent with deploy tx. If gas_used ≈ gas_limit, likely OOG failure.';
