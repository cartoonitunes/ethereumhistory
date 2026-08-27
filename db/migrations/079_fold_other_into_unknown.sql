-- Fold the last non-canonical contract_type value onto the canonical vocabulary.
--
-- Migration 077 unified the taxonomy but scoped its contract_type rewrite to the
-- editorially documented rows, leaving the heuristic type on the undocumented ones alone
-- and noting that 'other' was "a separate backfill decision". This is that decision.
--
-- 'other' was written by scripts/import-contracts-2018.ts as its placeholder for
-- "the importer did not classify this", which is what the canonical vocabulary calls
-- 'unknown'. They never meant different things, and canonicalizeContractCategory already
-- maps one onto the other, so the stored value was simply the odd one out: with 077 in
-- place it is now the only value in the column that is not itself a canonical key.
--
-- Batched on purpose. This touches about 1.18M rows, and doing that as one statement on
-- a serverless Postgres holds a single long transaction that starves every other
-- connection, including the page-render enrichment queries. Committing every 20k rows
-- keeps the table usable throughout and makes the migration resumable: if it is
-- interrupted, re-running continues from wherever it stopped.
--
-- contract_type is not in the watch list of trg_refresh_is_documented, so none of this
-- recomputes the documentation clusters.
--
-- Idempotent: re-running matches no rows.

DO $$
DECLARE
  moved INTEGER;
BEGIN
  LOOP
    UPDATE contracts
    SET contract_type = 'unknown'
    WHERE address IN (
      SELECT address FROM contracts WHERE contract_type = 'other' LIMIT 20000
    );
    GET DIAGNOSTICS moved = ROW_COUNT;
    COMMIT;
    EXIT WHEN moved = 0;
  END LOOP;
END $$;
