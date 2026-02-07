-- ============================================================================
-- Migration: GitHub OAuth columns on historians
-- ============================================================================

ALTER TABLE historians ADD COLUMN IF NOT EXISTS github_id TEXT;
ALTER TABLE historians ADD COLUMN IF NOT EXISTS github_username TEXT;

-- Unique index on github_id (partial — only non-null values)
CREATE UNIQUE INDEX IF NOT EXISTS historians_github_id_unique
  ON historians (github_id) WHERE github_id IS NOT NULL;
