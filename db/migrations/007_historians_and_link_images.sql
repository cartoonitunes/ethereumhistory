-- Historians + richer historical links
-- Safe to run multiple times.

CREATE TABLE IF NOT EXISTS historians (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  token_hash TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS historians_email_unique ON historians (email);
CREATE INDEX IF NOT EXISTS historians_active_idx ON historians (active);

-- Extend historical_links to include attribution + timestamps
ALTER TABLE historical_links
  ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES historians(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS historical_links_created_by_idx ON historical_links (created_by);

