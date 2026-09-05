-- Migration 082: Replace wrapper_registry with a `wrapper_of` column on contracts.
--
-- WHY
-- ---
-- A wrapper relationship is a fact about a contract, not a separate entity. As
-- its own table it was invisible to the contract page, unreachable from the
-- manage API, and editable only by writing SQL. As a column it becomes ordinary
-- editorial data: a historian sets it in the same form as every other field,
-- and contract Y's page can list the wrappers pointing at it with one indexed
-- query.
--
-- Reads as: "this contract is a wrapper OF that one."
--   contracts.wrapper_of = the historic contract this token wraps.
--   NULL = not a wrapper, which is almost every row.
--
-- Distinct from the existing `canonical_address`, which links bytecode-identical
-- deployments of the SAME contract. A wrapper is a different contract that
-- represents another one.
--
-- Idempotent: safe to re-run.

-- ============================================================================
-- 1. Column, constraints, index.
-- ============================================================================

ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS wrapper_of TEXT;

DO $$
BEGIN
  -- Lowercase, so lookups use the index instead of degrading to LOWER(...).
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contracts_wrapper_of_lowercase') THEN
    ALTER TABLE contracts ADD CONSTRAINT contracts_wrapper_of_lowercase
      CHECK (wrapper_of IS NULL OR wrapper_of = lower(wrapper_of));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contracts_wrapper_of_shape') THEN
    ALTER TABLE contracts ADD CONSTRAINT contracts_wrapper_of_shape
      CHECK (wrapper_of IS NULL OR wrapper_of ~ '^0x[0-9a-f]{40}$');
  END IF;

  -- A contract cannot wrap itself. Without this, one bad edit makes a token
  -- its own wrapper and the scanner credits it to itself forever.
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contracts_wrapper_of_not_self') THEN
    ALTER TABLE contracts ADD CONSTRAINT contracts_wrapper_of_not_self
      CHECK (wrapper_of IS NULL OR wrapper_of <> address);
  END IF;
END $$;

-- Partial: only a handful of rows are wrappers, so the index stays tiny while
-- still answering "which contracts wrap this one" for the contract page.
CREATE INDEX IF NOT EXISTS contracts_wrapper_of_idx
  ON contracts (wrapper_of)
  WHERE wrapper_of IS NOT NULL;

-- ============================================================================
-- 2. Carry the verified mappings across from wrapper_registry.
--
-- Only rows with a real underlying move. WETH and WBTC were recorded there with
-- a NULL underlying purely so a scan could recognise and skip them; neither
-- wraps an Ethereum contract, so neither has a `wrapper_of` to set. They simply
-- become ordinary contracts, and both are undocumented, so the card's new
-- is_documented filter excludes them anyway.
--
-- Guarded on the table still existing so this runs cleanly on a database that
-- never had 081's table.
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'wrapper_registry') THEN
    UPDATE contracts c
    SET wrapper_of = wr.underlying_address
    FROM wrapper_registry wr
    WHERE c.address = wr.wrapper_address
      AND wr.underlying_address IS NOT NULL
      AND wr.underlying_address <> c.address
      AND c.wrapper_of IS DISTINCT FROM wr.underlying_address;

    DROP TABLE wrapper_registry;
  END IF;
END $$;
