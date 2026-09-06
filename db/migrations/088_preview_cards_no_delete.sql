-- Migration 088: make preview_cards rows permanent at the database level.
--
-- WHY THIS EXISTS
-- ---------------
-- Preview rows were destroyed by ad hoc psql during development. Twenty
-- unqualified `DELETE FROM preview_cards;` statements ran against production
-- across one session, each one typed by hand as test cleanup, and the table was
-- left empty. The rows that went are believed to have all been test scans, but
-- that is a reconstruction after the fact rather than something the database
-- guaranteed, and the difference between those two is the whole problem.
--
-- Nothing in the application deletes from this table. There is no DELETE FROM
-- preview_cards anywhere in the repository and no db.delete(previewCards) in
-- any code path, so no amount of code review would have prevented this. The
-- danger was a human at a psql prompt, which is precisely what a trigger stops
-- and a convention does not.
--
-- WHY DELETION IS NEVER THE RIGHT ANSWER HERE
-- -------------------------------------------
-- A row records that an address was scanned and when it was first seen. That
-- history cannot be recomputed: rescanning an address produces today's holdings
-- under today's scoring, not the card somebody was shown and shared in March.
-- A deleted row is unrecoverable in a way an updated row is not.
--
-- Removal requests were anticipated in migration 085 and are served by the
-- `listed` column, which takes the row off the public leaderboard while keeping
-- the record. That is the supported way to make a card disappear from the site.
--
-- THE DELIBERATE ESCAPE HATCH
-- ---------------------------
-- If a row must genuinely be removed, for a legal demand and no lesser reason,
-- the trigger has to be turned off by hand first:
--
--   ALTER TABLE preview_cards DISABLE TRIGGER preview_cards_block_delete;
--   -- remove exactly the row in question, with a WHERE clause
--   ALTER TABLE preview_cards ENABLE TRIGGER preview_cards_block_delete;
--
-- Two extra statements is the point. It makes removal a decision somebody made
-- rather than a keystroke that got away from them.
--
-- Idempotent: safe to re-run.

CREATE OR REPLACE FUNCTION preview_cards_refuse_removal() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION
    'preview_cards rows are permanent and cannot be deleted or truncated'
    USING
      ERRCODE = 'raise_exception',
      DETAIL  = 'A preview row records when an address was first scanned. That history cannot be rebuilt by rescanning.',
      HINT    = 'To take a card off the public leaderboard use: UPDATE preview_cards SET listed = false WHERE address = ''0x...''. Genuine removal requires disabling trigger preview_cards_block_delete first.';
END;
$$;

-- Statement level rather than row level, so an unqualified
-- `DELETE FROM preview_cards;` is refused even when it would match no rows.
-- The failure should be identical whether the table holds a million rows or
-- none, because "it did nothing that time" is how the habit survives.
DROP TRIGGER IF EXISTS preview_cards_block_delete ON preview_cards;
CREATE TRIGGER preview_cards_block_delete
  BEFORE DELETE ON preview_cards
  FOR EACH STATEMENT EXECUTE FUNCTION preview_cards_refuse_removal();

-- TRUNCATE does not fire DELETE triggers, so it needs its own. It is also the
-- more dangerous of the two, taking the whole table with no WHERE to forget.
DROP TRIGGER IF EXISTS preview_cards_block_truncate ON preview_cards;
CREATE TRIGGER preview_cards_block_truncate
  BEFORE TRUNCATE ON preview_cards
  FOR EACH STATEMENT EXECUTE FUNCTION preview_cards_refuse_removal();

COMMENT ON TABLE preview_cards IS
  'NEVER DELETE ROWS FROM THIS TABLE. User data is permanent. '
  'Every row records that an address was scanned and when it was first seen, '
  'which rescanning cannot reconstruct. DELETE and TRUNCATE are blocked by '
  'triggers preview_cards_block_delete and preview_cards_block_truncate. '
  'To hide a card from the public leaderboard set listed = false instead.';

COMMENT ON COLUMN preview_cards.listed IS
  'Public leaderboard visibility. This is the supported way to remove a card '
  'from the site: set it false rather than deleting the row.';

COMMENT ON COLUMN preview_cards.first_scanned_at IS
  'When this address was first ever scanned. The one value in the row that a '
  'rescan cannot reproduce, and the main reason deletion is blocked.';
