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
--
-- `processed` is flipped to TRUE as each address is applied by the batched
-- UPDATE below. Flagging (rather than deleting) keeps the full set available
-- to the safety-sweep step, which needs to know every "should be TRUE"
-- address to correctly reset rows that shouldn't be TRUE anymore.
DROP TABLE IF EXISTS _doc_addresses;
CREATE TEMP TABLE _doc_addresses (
  address TEXT PRIMARY KEY,
  processed BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX ON _doc_addresses (processed) WHERE processed = FALSE;

-- P1: self-documented (seed itself)
INSERT INTO _doc_addresses (address)
SELECT address FROM _doc_seed
ON CONFLICT DO NOTHING;

-- P2: contracts whose canonical_address points to a self-documented contract
--     ( trigger path: s.address = c.canonical_address )
-- Uses EXISTS (semi-join) rather than INNER JOIN to avoid a row explosion
-- when the same hash/address appears in _doc_seed multiple times. JOIN would
-- produce N×M duplicate rows that all funnel through ON CONFLICT; the
-- semi-join dedupes upfront so we only INSERT each contract row once.
INSERT INTO _doc_addresses (address)
SELECT c.address
FROM contracts c
WHERE c.canonical_address IS NOT NULL
  AND EXISTS (SELECT 1 FROM _doc_seed s WHERE s.address = c.canonical_address)
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
WHERE c.canonical_address IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM _doc_seed s
    WHERE s.canonical_address = c.canonical_address
  )
ON CONFLICT DO NOTHING;

-- P5: bytecode siblings by deployed_bytecode_hash
INSERT INTO _doc_addresses (address)
SELECT c.address
FROM contracts c
WHERE c.deployed_bytecode_hash IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM _doc_seed s
    WHERE s.deployed_bytecode_hash = c.deployed_bytecode_hash
  )
ON CONFLICT DO NOTHING;

-- P6: bytecode siblings by runtime_bytecode_hash
INSERT INTO _doc_addresses (address)
SELECT c.address
FROM contracts c
WHERE c.runtime_bytecode_hash IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM _doc_seed s
    WHERE s.runtime_bytecode_hash = c.runtime_bytecode_hash
  )
ON CONFLICT DO NOTHING;

ANALYZE _doc_addresses;

-- Apply the flag in batches with per-batch COMMITs. On Neon (separated
-- storage), a single UPDATE touching hundreds of thousands of rows with 4
-- indexes apiece takes far too long as one statement — the WAL, locks, and
-- page-server I/O all accumulate. Batching keeps each UPDATE small so
-- progress is visible (the stats widget will climb during the run) and the
-- site stays responsive.
--
-- Each iteration flags 50k not-yet-processed addresses in _doc_addresses and
-- UPDATEs the matching contracts rows. Using a `processed` flag rather than
-- draining the table keeps the full source available for the safety-sweep
-- step below. The partial index `WHERE processed = FALSE` makes each batch's
-- LIMIT pick up fresh rows in O(batch_size).
DO $$
DECLARE
  batch_size INT := 50000;
  rows_flipped INT;
  total_flipped INT := 0;
  batch_num INT := 0;
BEGIN
  LOOP
    batch_num := batch_num + 1;
    WITH batch AS (
      UPDATE _doc_addresses
      SET processed = TRUE
      WHERE ctid IN (
        SELECT ctid FROM _doc_addresses WHERE processed = FALSE LIMIT batch_size
      )
      RETURNING address
    )
    UPDATE contracts
    SET is_documented = TRUE
    FROM batch
    WHERE contracts.address = batch.address
      AND contracts.is_documented = FALSE;
    GET DIAGNOSTICS rows_flipped = ROW_COUNT;
    total_flipped := total_flipped + rows_flipped;
    RAISE NOTICE 'Batch %: flipped %, running total %', batch_num, rows_flipped, total_flipped;
    COMMIT;
    EXIT WHEN rows_flipped = 0;
  END LOOP;
  RAISE NOTICE 'Done — % rows flipped to TRUE across % batches', total_flipped, batch_num;
END $$;

-- Safety sweep for re-runs: if a previous run marked rows TRUE that are no
-- longer in the computed set (e.g. a description was cleared), reset them.
-- Batched same as above. Expect zero work on a clean first run.
DO $$
DECLARE
  batch_size INT := 50000;
  rows_flipped INT;
  total_flipped INT := 0;
  batch_num INT := 0;
BEGIN
  LOOP
    batch_num := batch_num + 1;
    UPDATE contracts
    SET is_documented = FALSE
    WHERE ctid IN (
      SELECT c.ctid
      FROM contracts c
      WHERE c.is_documented = TRUE
        AND NOT EXISTS (SELECT 1 FROM _doc_addresses a WHERE a.address = c.address)
      LIMIT batch_size
    );
    GET DIAGNOSTICS rows_flipped = ROW_COUNT;
    total_flipped := total_flipped + rows_flipped;
    COMMIT;
    EXIT WHEN rows_flipped = 0;
    RAISE NOTICE 'Sweep batch %: cleared %, total %', batch_num, rows_flipped, total_flipped;
  END LOOP;
END $$;

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
