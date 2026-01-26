-- Track contract edits by historians
-- Safe to run multiple times.

CREATE TABLE IF NOT EXISTS contract_edits (
  id SERIAL PRIMARY KEY,
  contract_address TEXT NOT NULL REFERENCES contracts(address) ON DELETE CASCADE,
  historian_id INTEGER NOT NULL REFERENCES historians(id) ON DELETE CASCADE,
  edited_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fields_changed TEXT[] -- Array of field names that were changed in this edit
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS contract_edits_historian_idx ON contract_edits (historian_id, edited_at DESC);
CREATE INDEX IF NOT EXISTS contract_edits_contract_idx ON contract_edits (contract_address, historian_id);
CREATE INDEX IF NOT EXISTS contract_edits_edited_at_idx ON contract_edits (edited_at DESC);

-- Composite index for "first edit" checks (is this historian's first edit of this contract?)
-- This allows fast lookups: WHERE contract_address = X AND historian_id = Y ORDER BY edited_at LIMIT 1
CREATE INDEX IF NOT EXISTS contract_edits_first_edit_idx ON contract_edits (contract_address, historian_id, edited_at);

COMMENT ON TABLE contract_edits IS 'Tracks all contract field edits by historians. One row per edit session.';
COMMENT ON COLUMN contract_edits.fields_changed IS 'Array of field names that were modified (e.g., ["description", "tokenLogo", "shortDescription"])';
