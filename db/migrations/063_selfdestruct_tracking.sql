-- Migration 063: Add selfdestruct tracking columns
-- Enables accurate detection of contract lifecycle state:
--   alive (has code), selfdestructed (had code, now empty),
--   gas_failure (code never stored due to insufficient gas),
--   zombie (creation with empty init code)

ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS live_code_checked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_self_destructed BOOLEAN DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS self_destruct_detected_block INTEGER;

-- Index for filtering selfdestructed contracts in browse/queries
CREATE INDEX IF NOT EXISTS idx_contracts_self_destructed
  ON contracts (is_self_destructed)
  WHERE is_self_destructed IS NOT NULL;

COMMENT ON COLUMN contracts.live_code_checked_at IS 'When eth_getCode was last called for this contract';
COMMENT ON COLUMN contracts.is_self_destructed IS 'true = had code but eth_getCode now returns 0x. false = confirmed alive. NULL = not yet checked.';
COMMENT ON COLUMN contracts.self_destruct_detected_block IS 'Block number at which selfdestruct was detected (approximate upper bound)';
