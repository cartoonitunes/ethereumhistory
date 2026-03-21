-- Migration 051: Trim shortDescription to 160 chars for all contracts
-- The UI displays max 160 chars (SHORT_DESCRIPTION_MAX_CHARS).
-- Any longer values get silently clipped with CSS line-clamp.

UPDATE contracts
SET short_description = LEFT(short_description, 160)
WHERE short_description IS NOT NULL
  AND LENGTH(short_description) > 160;
