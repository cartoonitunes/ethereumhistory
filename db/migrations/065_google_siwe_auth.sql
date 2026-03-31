-- Add Google OAuth and SIWE auth support to historians table
-- google_id: Google OAuth subject identifier
-- auth_provider: tracks how the historian registered ('token', 'google', 'ethereum', 'github')

ALTER TABLE historians ADD COLUMN IF NOT EXISTS google_id TEXT;
ALTER TABLE historians ADD COLUMN IF NOT EXISTS auth_provider TEXT;

-- Unique index on google_id (only for non-null values)
CREATE UNIQUE INDEX IF NOT EXISTS historians_google_id_unique ON historians (google_id) WHERE google_id IS NOT NULL;

-- Set auth_provider for existing rows based on what auth method they used
UPDATE historians SET auth_provider = 'github' WHERE github_id IS NOT NULL AND auth_provider IS NULL;
UPDATE historians SET auth_provider = 'token' WHERE token_hash IS NOT NULL AND auth_provider IS NULL;
