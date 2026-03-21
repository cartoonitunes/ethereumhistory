-- Add self_destructed flag to contracts
-- Populated by checking eth_getCode == '0x' for contracts that have creation TX data

ALTER TABLE contracts ADD COLUMN IF NOT EXISTS self_destructed boolean DEFAULT NULL;

COMMENT ON COLUMN contracts.self_destructed IS 
  'True if eth_getCode returns 0x (contract no longer exists on-chain). NULL = unknown, False = confirmed live.';
