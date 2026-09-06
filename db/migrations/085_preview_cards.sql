-- Migration 085: persist preview cards, and rank them alongside account cards.
--
-- Until now a preview was deliberately ephemeral. /preview/[address] scanned on
-- every view, stored nothing, and carried robots noindex, and migration 081
-- gave saved cards a random slug specifically so the set of cards could not be
-- enumerated. This migration reverses that for previews: every scan is kept,
-- the URL becomes permanent, and the result is listed publicly on /collectors.
--
-- WHAT THAT CHANGES, STATED PLAINLY
-- ---------------------------------
-- The lookup accepts any address, not only the visitor's own. So a person can
-- type someone else's wallet, and that wallet is then persisted and ranked on a
-- public page under its ENS name, without its owner ever visiting the site. The
-- underlying holdings were already public on chain, but aggregating them into a
-- named, ranked list is a different act from the data merely being readable.
--
-- `listed` exists for that reason. It defaults to true, which is the behaviour
-- asked for, and it is the switch to flip if the policy should ever become opt
-- in or if a specific address asks to be removed. Doing it now costs one column
-- and avoids a migration under pressure later.
--
-- Idempotent: safe to re-run.

CREATE TABLE IF NOT EXISTS preview_cards (
  id                     SERIAL PRIMARY KEY,
  -- Lowercase, one row per address. The uniqueness is the whole point: a
  -- re-scan updates in place rather than accumulating a row per view.
  address                TEXT NOT NULL,
  -- Cached at scan time so the leaderboard can render a name without a resolver
  -- call per row. Null when the address has no primary name.
  ens_name               TEXT,
  -- The full CardData, exactly as the renderer consumes it.
  --
  -- Holdings live INSIDE this document rather than in a column of their own.
  -- They are already part of CardData, and a second copy would be a second
  -- thing to keep in step with the first. Everything the leaderboard needs to
  -- sort and filter is denormalised below instead, so ranking never has to open
  -- the JSON.
  card_data_json         JSONB NOT NULL,
  score                  INTEGER NOT NULL DEFAULT 0,
  tier_label             TEXT,
  contract_count         INTEGER NOT NULL DEFAULT 0,
  earliest_year          INTEGER,
  first_scanned_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_scanned_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- How many times this address has actually been SCANNED, which is not the
  -- same as how often it has been viewed. A stored preview is served without
  -- rescanning, so views after the first do not increment this. Reach and
  -- traffic come from the row count and from first_scanned_at instead.
  scan_count             INTEGER NOT NULL DEFAULT 1,
  -- Set when the address is later attached to an account. The row is kept
  -- rather than deleted, so the history of when it was first seen survives, but
  -- the leaderboard stops listing it anonymously and shows the account instead.
  claimed_by_historian_id INTEGER REFERENCES historians(id) ON DELETE SET NULL,
  claimed_at             TIMESTAMPTZ,
  listed                 BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT preview_cards_address_lowercase CHECK (address = lower(address)),
  CONSTRAINT preview_cards_address_shape CHECK (address ~ '^0x[0-9a-f]{40}$')
);

CREATE UNIQUE INDEX IF NOT EXISTS preview_cards_address_unique
  ON preview_cards (address);

-- Drives the leaderboard read: listed, unclaimed, has something to show,
-- ordered by score. Partial so the index stays small as scans accumulate.
CREATE INDEX IF NOT EXISTS preview_cards_ranking_idx
  ON preview_cards (score DESC, contract_count DESC)
  WHERE listed AND claimed_by_historian_id IS NULL AND contract_count > 0;

-- For the stats endpoint's per-day series.
CREATE INDEX IF NOT EXISTS preview_cards_first_scanned_idx
  ON preview_cards (first_scanned_at);

CREATE INDEX IF NOT EXISTS preview_cards_claimed_idx
  ON preview_cards (claimed_by_historian_id)
  WHERE claimed_by_historian_id IS NOT NULL;
