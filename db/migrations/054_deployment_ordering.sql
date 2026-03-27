-- Migration 054: Add deployment ordering columns for live rank computation
--
-- deployment_tx_index: position of the deploy tx within its block (0-based)
-- deployment_trace_index: position within block's CREATE traces (for factory-created contracts)
--   - For direct deploys: same as tx_index (trace_index = NULL means use tx_index)
--   - For factory-created: sub-index within the tx's internal calls
--
-- Rank is never stored. It's computed on demand as:
--   SELECT COUNT(*) + 1 FROM contracts
--   WHERE deployment_block < $block
--      OR (deployment_block = $block AND deployment_tx_index < $tx_index)
--      OR (deployment_block = $block AND deployment_tx_index = $tx_index AND deployment_trace_index < $trace_index)
--
-- This means fixing one contract auto-corrects all ranks downstream. No cascade errors.
-- Failed deploys are never in this table (no address = no row), so no special handling needed.

ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS deployment_tx_index INTEGER,
  ADD COLUMN IF NOT EXISTS deployment_trace_index INTEGER;

-- Composite index supports both rank queries and ORDER BY for listing
CREATE INDEX IF NOT EXISTS idx_contracts_deployment_order
  ON contracts (deployment_block ASC, deployment_tx_index ASC NULLS LAST, deployment_trace_index ASC NULLS LAST);

COMMENT ON COLUMN contracts.deployment_tx_index IS
  'Position of deploy transaction within its block (0-based). NULL = not yet backfilled.';

COMMENT ON COLUMN contracts.deployment_trace_index IS
  'For factory-created contracts: sub-index within block CREATE traces. NULL for direct deploys.';
