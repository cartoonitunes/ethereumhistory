-- Migration 070: Split refresh_contract_stats_cache() into per-scope functions
-- so the cron endpoint can budget them individually.
--
-- Why: the bulk refresh_contract_stats_cache() from migration 068 runs three
-- COUNT(*) FILTER (WHERE is_documented) aggregates over the full ~1.4M-row
-- contracts table in a single transaction. Since the sibling-verification
-- cascade brought ~400k Poloniex forwarders under is_documented=TRUE, the
-- per-year branch in particular has been running past 60s. Vercel Hobby
-- kills the cron at 60s, Pro at 300s, and the whole bulk function is
-- one transaction — a mid-run kill leaves the cache stale AND rolls back
-- any per-scope rows that HAD finished.
--
-- Fix: expose one function per scope so the cron endpoint can commit each
-- one in its own transaction, in a defined order, and skip the ones it
-- doesn't have time for. Missed scopes just get picked up on the next
-- hourly cron tick. The old refresh_contract_stats_cache() is kept as a
-- thin wrapper so any manual caller / migration 068's initial populate
-- still works.
--
-- Idempotent. All CREATE OR REPLACE.

-- ============================================================================
-- Overall: 1 row. Cheap — single COUNT over the whole table.
-- ============================================================================

CREATE OR REPLACE FUNCTION refresh_contract_stats_overall()
RETURNS VOID AS $$
BEGIN
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
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Per-era: 6 rows. The (era_id, is_documented) composite index from
-- migration 067 makes each group cheap.
-- ============================================================================

CREATE OR REPLACE FUNCTION refresh_contract_stats_era()
RETURNS VOID AS $$
BEGIN
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
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Per-year: one function per year. The composite EXTRACT expression index
-- from migration 067 is more consistently picked when the year is an
-- equality predicate than when it's the GROUP BY key, so processing years
-- one at a time is markedly faster than a single GROUP BY EXTRACT(...).
-- ============================================================================

CREATE OR REPLACE FUNCTION refresh_contract_stats_year_single(p_year INT)
RETURNS VOID AS $$
BEGIN
  INSERT INTO contract_stats_cache (scope, total, documented, updated_at)
  SELECT 'year:' || p_year::text,
         COUNT(*)::int,
         COUNT(*) FILTER (WHERE is_documented)::int,
         now()
  FROM contracts
  WHERE deployment_timestamp IS NOT NULL
    AND EXTRACT(YEAR FROM deployment_timestamp)::int = p_year
  ON CONFLICT (scope) DO UPDATE
    SET total      = EXCLUDED.total,
        documented = EXCLUDED.documented,
        updated_at = EXCLUDED.updated_at;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Wrapper: keep refresh_contract_stats_cache() working for manual callers
-- and for the initial populate at the end of migration 068. Order matches
-- the batched cron: cheap scopes first, so a mid-run kill still leaves
-- overall/era fresh.
-- ============================================================================

CREATE OR REPLACE FUNCTION refresh_contract_stats_cache()
RETURNS VOID AS $$
DECLARE
  y INT;
BEGIN
  PERFORM refresh_contract_stats_overall();
  PERFORM refresh_contract_stats_era();
  FOR y IN
    SELECT DISTINCT EXTRACT(YEAR FROM deployment_timestamp)::int
    FROM contracts
    WHERE deployment_timestamp IS NOT NULL
    ORDER BY 1
  LOOP
    PERFORM refresh_contract_stats_year_single(y);
  END LOOP;
END;
$$ LANGUAGE plpgsql;
