-- Migration 067: Precompute `is_documented` on contracts.
--
-- "Documented" = this contract (or any bytecode/canonical sibling of it) has
-- a short_description or a verification_method. The previous query-time CTE
-- that recomputed this flag had to scan ~1.4M rows with four correlated
-- subqueries on every stats request, and was the main reason homepage + browse
-- felt slow. Materializing the flag, indexing it, and keeping it fresh with a
-- trigger turns stats into index-aware aggregates.
--
-- Idempotent. Safe to re-run (the first attempt may have died mid-backfill —
-- schema ops are guarded with IF NOT EXISTS, the backfill is rebuilt from
-- scratch via temp tables, and the trigger is DROP+CREATE).
--
-- Order matters:
--   1. Add the column and helper indexes we'll need.
--   2. Backfill via a precomputed staging table (see note below).
--   3. Install the trigger + watch-list that keeps it fresh going forward.
--
-- Backfill strategy: the earlier version of this migration used a single
-- UPDATE with a correlated EXISTS over 6 OR'd sibling paths per outer row.
-- At 1.4M rows × 6 probes, Postgres couldn't collapse that into clean index
-- scans, and the statement ran for tens of minutes. The rewrite below pivots
-- the lookup: we start from the small self-documented seed set (likely < 10k
-- rows), expand it outward along each sibling relationship via index-joined
-- INSERTs into a temp table, then do one targeted UPDATE against that set.
-- Orders of magnitude faster.

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

-- ============================================================================
-- Backfill
-- ============================================================================

-- The seed: every contract that is self-documented. Small (thousands).
DROP TABLE IF EXISTS _doc_seed;
CREATE TEMP TABLE _doc_seed AS
SELECT
  address,
  canonical_address,
  deployed_bytecode_hash,
  runtime_bytecode_hash
FROM contracts
WHERE (short_description IS NOT NULL AND short_description <> '')
   OR verification_method IS NOT NULL;

CREATE INDEX ON _doc_seed (address);
CREATE INDEX ON _doc_seed (canonical_address) WHERE canonical_address IS NOT NULL;
CREATE INDEX ON _doc_seed (deployed_bytecode_hash) WHERE deployed_bytecode_hash IS NOT NULL;
CREATE INDEX ON _doc_seed (runtime_bytecode_hash) WHERE runtime_bytecode_hash IS NOT NULL;
ANALYZE _doc_seed;

-- The full set of addresses that should have is_documented=TRUE. Populated by
-- expanding the seed along each of the 6 "sibling" paths from the trigger.
DROP TABLE IF EXISTS _doc_addresses;
CREATE TEMP TABLE _doc_addresses (address TEXT PRIMARY KEY);

-- P1: self-documented (seed itself)
INSERT INTO _doc_addresses (address)
SELECT address FROM _doc_seed
ON CONFLICT DO NOTHING;

-- P2: contracts whose canonical_address points to a self-documented contract
--     ( trigger path: s.address = c.canonical_address )
INSERT INTO _doc_addresses (address)
SELECT c.address
FROM contracts c
INNER JOIN _doc_seed s ON c.canonical_address = s.address
ON CONFLICT DO NOTHING;

-- P3: the canonical_address referenced BY a self-documented contract
--     ( trigger path: s.canonical_address = c.address )
INSERT INTO _doc_addresses (address)
SELECT s.canonical_address
FROM _doc_seed s
WHERE s.canonical_address IS NOT NULL
ON CONFLICT DO NOTHING;

-- P4: contracts that share a canonical_address with a self-documented contract
--     ( trigger path: s.canonical_address = c.canonical_address )
INSERT INTO _doc_addresses (address)
SELECT c.address
FROM contracts c
INNER JOIN _doc_seed s
  ON c.canonical_address = s.canonical_address
WHERE c.canonical_address IS NOT NULL
ON CONFLICT DO NOTHING;

-- P5: bytecode siblings by deployed_bytecode_hash
INSERT INTO _doc_addresses (address)
SELECT c.address
FROM contracts c
INNER JOIN _doc_seed s
  ON c.deployed_bytecode_hash = s.deployed_bytecode_hash
WHERE c.deployed_bytecode_hash IS NOT NULL
ON CONFLICT DO NOTHING;

-- P6: bytecode siblings by runtime_bytecode_hash
INSERT INTO _doc_addresses (address)
SELECT c.address
FROM contracts c
INNER JOIN _doc_seed s
  ON c.runtime_bytecode_hash = s.runtime_bytecode_hash
WHERE c.runtime_bytecode_hash IS NOT NULL
ON CONFLICT DO NOTHING;

ANALYZE _doc_addresses;

-- Apply the flag. Only touches rows that actually need to flip (keeps WAL
-- small, and makes re-runs cheap if a prior attempt partially succeeded).
UPDATE contracts
SET is_documented = TRUE
WHERE is_documented = FALSE
  AND address IN (SELECT address FROM _doc_addresses);

-- Safety sweep for re-runs: if a previous run marked rows TRUE that are no
-- longer in the computed set (e.g. a description was cleared), reset them.
-- Uses NOT EXISTS for an index-friendly anti-join instead of NOT IN.
UPDATE contracts c
SET is_documented = FALSE
WHERE c.is_documented = TRUE
  AND NOT EXISTS (SELECT 1 FROM _doc_addresses a WHERE a.address = c.address);

-- ============================================================================
-- Trigger: recompute is_documented for the whole sibling cluster of the row
-- being written. Fires AFTER INSERT and AFTER UPDATE of any column that can
-- change cluster membership or the "self-documented" predicate.
--
-- Recursion guard: the watch list excludes `is_documented`, so the UPDATE we
-- issue from within the trigger does NOT re-fire it.
-- ============================================================================

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
