-- Migration 090: value_wei is stored in TWO formats upstream — fix the column
-- type to accept both, and add a normalized companion.
--
-- WHAT WAS FOUND
-- --------------
-- Migration 089 declared `value_wei NUMERIC` on the reasoning that the values
-- are decimal wei strings too large for int64. That is true of 12,023,293 rows.
-- It is NOT true of 23,729 rows, which store the value as a HEX string
-- ("0x4a817c800") instead. A NUMERIC column rejects those outright, so the bulk
-- load would abort partway.
--
-- The mixed format is upstream, in the enrichment pipeline's own index, and it
-- is equally present in Turso today. `ResolvedContract.valueWei` is typed
-- `string` and passed through untouched, so nothing in the app has ever cared —
-- it is populated by the resolver and then read by nothing at all.
--
-- WHAT THIS DOES
-- --------------
-- 1. `value_wei` becomes TEXT, so the source is stored VERBATIM — byte-for-byte
--    what Turso returns, both formats intact. Rewriting 23,729 values into a
--    different representation is a data transformation, and a migration whose
--    whole premise is "nothing changes" is the wrong place to make one.
--    postgres.js returns TEXT as a string, exactly as it returned NUMERIC, so
--    no application code changes.
--
-- 2. `value_wei_decimal NUMERIC` is added alongside, holding the SAME value
--    normalized to a decimal number (both formats parse cleanly through BigInt
--    at load time). Nothing reads it today. It exists so that the mixed format
--    cannot become a trap later: anyone who eventually wants `SUM(value_wei)`
--    for a "total ETH deployed" figure would otherwise silently get an error or,
--    worse, a wrong answer from the decimal-only subset.
--
-- Safe on an empty table (089 created it, this runs before the load) and safe to
-- re-run. The USING clause makes it correct even if rows already exist.

ALTER TABLE neon_contract_index
  ALTER COLUMN value_wei TYPE TEXT USING value_wei::text;

ALTER TABLE neon_contract_index
  ADD COLUMN IF NOT EXISTS value_wei_decimal NUMERIC;

COMMENT ON COLUMN neon_contract_index.value_wei IS
  'Deployment value, VERBATIM from the source index. Mixed format: mostly decimal wei, ~23.7k rows are hex ("0x..."). Do not do arithmetic on this — use value_wei_decimal.';

COMMENT ON COLUMN neon_contract_index.value_wei_decimal IS
  'value_wei normalized to decimal wei. Populated at load time; NULL where value_wei is NULL.';
