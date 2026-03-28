-- Migration 057: Add stored deployment_rank column
--
-- Rank is computed once via window function and stored for fast reads on list pages.
-- Only contracts with code (code_size_bytes > 0, runtime_bytecode non-empty) and
-- a known tx index are ranked. Failed deploys and zombie accounts are excluded.
--
-- To refresh ranks after new backfill runs:
--   UPDATE contracts SET deployment_rank = NULL WHERE deployment_tx_index IS NOT NULL;
--   (then re-run the UPDATE below)
--
-- This replaces the live correlated subquery approach which was too slow for lists.

ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS deployment_rank INTEGER;

CREATE INDEX IF NOT EXISTS idx_contracts_deployment_rank
  ON contracts (deployment_rank ASC NULLS LAST)
  WHERE deployment_rank IS NOT NULL;

-- Populate ranks: one pass, window function, fast
-- Ranks contracts ordered by (deployment_block, deployment_tx_index, deployment_trace_index)
-- excluding empty-code accounts (failed deploys, zombie accounts)
UPDATE contracts
SET deployment_rank = ranked.rank
FROM (
  SELECT
    address,
    RANK() OVER (
      ORDER BY deployment_block ASC, deployment_tx_index ASC, deployment_trace_index ASC NULLS LAST
    )::integer AS rank
  FROM contracts
  WHERE
    deployment_tx_index IS NOT NULL
    AND code_size_bytes > 0
    AND runtime_bytecode IS NOT NULL
    AND runtime_bytecode NOT IN ('0x', '')
) AS ranked
WHERE contracts.address = ranked.address;
