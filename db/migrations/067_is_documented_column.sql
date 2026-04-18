-- Migration 067: Precompute `is_documented` on contracts.
--
-- "Documented" = this contract (or any bytecode/canonical sibling of it) has
-- a short_description or a verification_method. The previous query-time CTE
-- that recomputed this flag had to scan ~1.4M rows with four correlated
-- subqueries on every stats request, and was the main reason homepage + browse
-- felt slow. Materializing the flag, indexing it, and keeping it fresh with a
-- trigger turns stats into index-aware aggregates.
--
-- Order matters:
--   1. Add the column and helper indexes we'll need.
--   2. Backfill once, with no trigger installed so the bulk UPDATE doesn't
--      fan out per-row cluster recomputes.
--   3. Install the trigger + watch-list that keeps it fresh going forward.

ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS is_documented BOOLEAN NOT NULL DEFAULT FALSE;

-- Indexes on column we reference from the trigger + a composite for the
-- stats GROUP BY path.
CREATE INDEX IF NOT EXISTS contracts_verification_method_idx
  ON contracts (verification_method)
  WHERE verification_method IS NOT NULL;

CREATE INDEX IF NOT EXISTS contracts_runtime_bytecode_hash_idx
  ON contracts (runtime_bytecode_hash)
  WHERE runtime_bytecode_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS contracts_is_documented_idx
  ON contracts (is_documented)
  WHERE is_documented = TRUE;

CREATE INDEX IF NOT EXISTS contracts_era_is_documented_idx
  ON contracts (era_id, is_documented);

-- Expression index for the per-year stats grouping. deployment_timestamp is
-- TIMESTAMP (no tz), so EXTRACT(YEAR …) is IMMUTABLE and indexable.
CREATE INDEX IF NOT EXISTS contracts_year_is_documented_idx
  ON contracts ((EXTRACT(YEAR FROM deployment_timestamp)::int), is_documented)
  WHERE deployment_timestamp IS NOT NULL;

-- Backfill. Done in a single UPDATE against the existing CTE-style predicate
-- so every row converges to the same cluster-aware truth.
UPDATE contracts AS c
SET is_documented = EXISTS (
  SELECT 1 FROM contracts AS s
  WHERE ((s.short_description IS NOT NULL AND s.short_description <> '')
         OR s.verification_method IS NOT NULL)
    AND (
      s.address = c.address
      OR (c.canonical_address IS NOT NULL AND s.address = c.canonical_address)
      OR s.canonical_address = c.address
      OR (c.canonical_address IS NOT NULL AND s.canonical_address = c.canonical_address)
      OR (c.deployed_bytecode_hash IS NOT NULL AND s.deployed_bytecode_hash = c.deployed_bytecode_hash)
      OR (c.runtime_bytecode_hash IS NOT NULL AND s.runtime_bytecode_hash = c.runtime_bytecode_hash)
    )
);

-- Trigger: recompute is_documented for the whole sibling cluster of the row
-- being written. Fires AFTER INSERT and AFTER UPDATE of any column that can
-- change cluster membership or the "self-documented" predicate.
--
-- Recursion guard: the watch list excludes `is_documented`, so the UPDATE we
-- issue from within the trigger does NOT re-fire it.
CREATE OR REPLACE FUNCTION refresh_is_documented_cluster()
RETURNS TRIGGER AS $$
DECLARE
  v_any_documented BOOLEAN;
BEGIN
  -- Step 1: is any contract in NEW's cluster self-documented?
  SELECT EXISTS (
    SELECT 1
    FROM contracts c
    WHERE (
      c.address = NEW.address
      OR (NEW.canonical_address IS NOT NULL AND c.address = NEW.canonical_address)
      OR c.canonical_address = NEW.address
      OR (NEW.canonical_address IS NOT NULL AND c.canonical_address = NEW.canonical_address)
      OR (NEW.deployed_bytecode_hash IS NOT NULL AND c.deployed_bytecode_hash = NEW.deployed_bytecode_hash)
      OR (NEW.runtime_bytecode_hash IS NOT NULL AND c.runtime_bytecode_hash = NEW.runtime_bytecode_hash)
    )
    AND (
      (c.short_description IS NOT NULL AND c.short_description <> '')
      OR c.verification_method IS NOT NULL
    )
  ) INTO v_any_documented;

  -- Step 2: flip every row in that cluster to the new state, but only where
  -- the flag actually needs to change (skips no-op writes and keeps WAL small).
  UPDATE contracts c
  SET is_documented = v_any_documented
  WHERE (
    c.address = NEW.address
    OR (NEW.canonical_address IS NOT NULL AND c.address = NEW.canonical_address)
    OR c.canonical_address = NEW.address
    OR (NEW.canonical_address IS NOT NULL AND c.canonical_address = NEW.canonical_address)
    OR (NEW.deployed_bytecode_hash IS NOT NULL AND c.deployed_bytecode_hash = NEW.deployed_bytecode_hash)
    OR (NEW.runtime_bytecode_hash IS NOT NULL AND c.runtime_bytecode_hash = NEW.runtime_bytecode_hash)
  )
  AND c.is_documented IS DISTINCT FROM v_any_documented;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_refresh_is_documented ON contracts;
CREATE TRIGGER trg_refresh_is_documented
  AFTER INSERT OR UPDATE OF
    short_description,
    verification_method,
    canonical_address,
    deployed_bytecode_hash,
    runtime_bytecode_hash
  ON contracts
  FOR EACH ROW
  EXECUTE FUNCTION refresh_is_documented_cluster();
