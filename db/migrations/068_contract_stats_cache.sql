-- Migration 068: Precomputed stats cache for homepage + /api/stats/progress.
--
-- Why: even with the is_documented column and matching indexes from 067,
-- aggregating across 1.4M rows on Neon's separated storage runs ~15–60s
-- when the planner falls back to a sequential scan (e.g. the EXTRACT(YEAR…)
-- expression index doesn't always get picked). That's far too slow for a
-- homepage widget.
--
-- Solution: a tiny denormalized cache keyed by scope string. ~20 rows
-- total, refreshed via `refresh_contract_stats_cache()`. Reads become
-- O(20 rows) instead of O(1.4M rows), and the refresh itself is fine to
-- run on a schedule (daily cron) or after meaningful mutation waves.
--
-- Idempotent: safe to re-run. Table is created if missing, function is
-- CREATE OR REPLACE, populate runs an UPSERT so the cache is never left
-- empty during refresh.

CREATE TABLE IF NOT EXISTS contract_stats_cache (
  scope TEXT PRIMARY KEY,           -- 'overall' | 'era:<id>' | 'year:<yyyy>'
  total INT NOT NULL,
  documented INT NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION refresh_contract_stats_cache()
RETURNS VOID AS $$
BEGIN
  -- Overall
  INSERT INTO contract_stats_cache (scope, total, documented, updated_at)
  SELECT 'overall',
         COUNT(*)::int,
         COUNT(*) FILTER (WHERE is_documented)::int,
         now()
  FROM contracts
  ON CONFLICT (scope) DO UPDATE
    SET total      = EXCLUDED.total,
        documented = EXCLUDED.documented,
        updated_at = EXCLUDED.updated_at;

  -- Per-era. The is_documented composite index makes this cheap.
  INSERT INTO contract_stats_cache (scope, total, documented, updated_at)
  SELECT 'era:' || era_id,
         COUNT(*)::int,
         COUNT(*) FILTER (WHERE is_documented)::int,
         now()
  FROM contracts
  WHERE era_id IS NOT NULL
  GROUP BY era_id
  ON CONFLICT (scope) DO UPDATE
    SET total      = EXCLUDED.total,
        documented = EXCLUDED.documented,
        updated_at = EXCLUDED.updated_at;

  -- Per-year. The EXTRACT expression index isn't always picked; we eat
  -- the seq scan here once per refresh rather than once per page load.
  INSERT INTO contract_stats_cache (scope, total, documented, updated_at)
  SELECT 'year:' || (EXTRACT(YEAR FROM deployment_timestamp)::int)::text,
         COUNT(*)::int,
         COUNT(*) FILTER (WHERE is_documented)::int,
         now()
  FROM contracts
  WHERE deployment_timestamp IS NOT NULL
  GROUP BY EXTRACT(YEAR FROM deployment_timestamp)::int
  ON CONFLICT (scope) DO UPDATE
    SET total      = EXCLUDED.total,
        documented = EXCLUDED.documented,
        updated_at = EXCLUDED.updated_at;
END;
$$ LANGUAGE plpgsql;

-- Initial populate.
SELECT refresh_contract_stats_cache();
