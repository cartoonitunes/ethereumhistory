-- Migration: merge historical_summary into description (summary first, then description).
-- After this, description is the single canonical narrative field; historical_summary
-- is deprecated (column kept for now; no longer written by the app).
-- Run once. Not idempotent if re-run (would prepend summary again); run only when merging.

UPDATE contracts
SET description = TRIM(historical_summary) || E'\n\n' || COALESCE(TRIM(description), '')
WHERE historical_summary IS NOT NULL
  AND TRIM(historical_summary) != '';
