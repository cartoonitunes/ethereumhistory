-- Migration 080: Partial indexes backing the "Source Uncovered" coverage bucket.
--
-- WHY
-- ---
-- /api/coverage used to hardcode `0 as uncovered`, so the amber "Source
-- Uncovered" band on /coverage was permanently empty and the compiler-
-- archaeology work (verification_method) had no readout of its own — it was
-- silently folded into the green "Documented" band via `is_documented`.
--
-- The real predicate for that bucket is "source has been recovered, but no
-- historian writeup exists yet":
--
--     verification_method IS NOT NULL
--     AND (short_description IS NULL OR short_description = '')
--
-- Counting that live costs ~11s, because the planner has to heap-fetch
-- short_description / verification_method for every one of the ~950k
-- is_documented rows. These partial indexes cover only the ~21k rows that
-- satisfy the predicate, turning both aggregations into index-only scans.
--
-- Invariant relied on by /api/coverage: every source-only row is also
-- is_documented = TRUE (the migration 067 trigger sets is_documented for any
-- cluster containing a verification_method). Verified: 0 rows violate it.
-- That lets the route derive the disjoint documented count by subtraction
-- instead of running a second expensive filtered aggregate:
--
--     documented = count(is_documented) - uncovered
--
-- CONCURRENTLY so this cannot lock writes on the contracts table.

CREATE INDEX CONCURRENTLY IF NOT EXISTS contracts_source_only_era_idx
  ON contracts (era_id)
  WHERE verification_method IS NOT NULL
    AND (short_description IS NULL OR short_description = '');

CREATE INDEX CONCURRENTLY IF NOT EXISTS contracts_source_only_year_idx
  ON contracts ((EXTRACT(YEAR FROM deployment_timestamp)::int))
  WHERE verification_method IS NOT NULL
    AND (short_description IS NULL OR short_description = '');
