-- ============================================================================
-- Migration: Analytics Events + Edit Suggestions
-- ============================================================================

-- =============================================================================
-- analytics_events (self-hosted engagement tracking)
-- =============================================================================
CREATE TABLE IF NOT EXISTS analytics_events (
  id SERIAL PRIMARY KEY,
  event_type TEXT NOT NULL,
  page_path TEXT,
  contract_address TEXT,
  event_data JSONB,
  session_id TEXT,
  referrer TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS analytics_event_type_idx ON analytics_events (event_type);
CREATE INDEX IF NOT EXISTS analytics_created_at_idx ON analytics_events (created_at);
CREATE INDEX IF NOT EXISTS analytics_contract_idx ON analytics_events (contract_address);
CREATE INDEX IF NOT EXISTS analytics_session_idx ON analytics_events (session_id);

-- =============================================================================
-- edit_suggestions (anonymous community suggestions)
-- =============================================================================
CREATE TABLE IF NOT EXISTS edit_suggestions (
  id SERIAL PRIMARY KEY,
  contract_address TEXT NOT NULL REFERENCES contracts(address) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  suggested_value TEXT NOT NULL,
  reason TEXT,
  submitter_github TEXT,
  submitter_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by INTEGER REFERENCES historians(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS edit_suggestions_contract_idx ON edit_suggestions (contract_address);
CREATE INDEX IF NOT EXISTS edit_suggestions_status_idx ON edit_suggestions (status);
CREATE INDEX IF NOT EXISTS edit_suggestions_created_at_idx ON edit_suggestions (created_at);
