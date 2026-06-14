-- EH Explorer game cloud saves (Neon, replaces the old Turso store).
-- Keyed on the Google account's stable `sub`. Email is never stored.
CREATE TABLE IF NOT EXISTS game_saves (
  sub        TEXT PRIMARY KEY,
  state      JSONB NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
