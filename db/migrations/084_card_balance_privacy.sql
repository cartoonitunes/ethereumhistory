-- Migration 084: Owner-controlled balance privacy on a shared collection.
--
-- The collection page is shareable, which means the balances on it are public
-- to anyone with the link. Some people want the collection visible and the
-- amounts not.
--
-- This is the OWNER's setting, stored on their card, and it governs what
-- visitors are served. That is deliberately different from the viewer side
-- localStorage toggle, which only ever changed what one reader saw on their own
-- screen and did nothing for the owner's privacy.
--
-- When set, the public page omits balances server side rather than hiding them
-- with CSS. A value that never reaches the HTML cannot be read out of it.
--
-- Idempotent: safe to re-run.

ALTER TABLE collector_cards
  ADD COLUMN IF NOT EXISTS balances_hidden BOOLEAN NOT NULL DEFAULT FALSE;
