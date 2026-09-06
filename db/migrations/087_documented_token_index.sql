-- Migration 087: index the documented token set the wallet scanner reads.
--
-- The scanner asks for the balance of every documented token rather than
-- enumerating what a wallet holds, because the enumeration endpoint is
-- paginated and the old code read only its first page. That inversion is
-- correct but it needs the list of documented tokens on every cold scan, and
-- the predicate had no index:
--
--   Seq Scan on contracts (actual time=48.253..23761.804 rows=2191)
--     Rows Removed by Filter: 1365825
--
-- 23.8 seconds to find 2,191 rows in 1.37 million, which was most of a 28
-- second page load. The predicate is narrow, so a partial index covers it in a
-- few thousand entries rather than indexing the whole table.
--
-- Index on address so the planner can answer from the index alone.
--
-- Idempotent: safe to re-run.

CREATE INDEX IF NOT EXISTS contracts_documented_token_idx
  ON contracts (address)
  WHERE is_documented
    AND (token_name IS NOT NULL OR token_symbol IS NOT NULL OR wrapper_of IS NOT NULL);
