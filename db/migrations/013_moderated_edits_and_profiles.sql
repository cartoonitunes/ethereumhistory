-- Migration 013: Moderated edits + profile personalization
--
-- 1. Link edit_suggestions to historian accounts (for untrusted edits)
-- 2. Add batch_id to group multi-field edits
-- 3. Add profile personalization fields to historians

-- Moderated edits: link suggestions to historian accounts
ALTER TABLE edit_suggestions ADD COLUMN IF NOT EXISTS submitter_historian_id INTEGER REFERENCES historians(id) ON DELETE SET NULL;
ALTER TABLE edit_suggestions ADD COLUMN IF NOT EXISTS batch_id TEXT;
CREATE INDEX IF NOT EXISTS edit_suggestions_historian_idx ON edit_suggestions (submitter_historian_id);
CREATE INDEX IF NOT EXISTS edit_suggestions_batch_idx ON edit_suggestions (batch_id);

-- Profile personalization
ALTER TABLE historians ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE historians ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE historians ADD COLUMN IF NOT EXISTS website_url TEXT;
