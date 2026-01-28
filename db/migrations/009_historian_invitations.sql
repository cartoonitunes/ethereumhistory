-- Historian invitations and trusted status
-- Safe to run multiple times.

-- Add trusted fields to historians table
ALTER TABLE historians 
  ADD COLUMN IF NOT EXISTS trusted BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS trusted_override BOOLEAN DEFAULT NULL;

CREATE INDEX IF NOT EXISTS historians_trusted_idx ON historians (trusted);

-- Create historian_invitations table
CREATE TABLE IF NOT EXISTS historian_invitations (
  id SERIAL PRIMARY KEY,
  inviter_id INTEGER NOT NULL REFERENCES historians(id) ON DELETE CASCADE,
  invitee_id INTEGER REFERENCES historians(id) ON DELETE SET NULL,
  invite_token TEXT NOT NULL UNIQUE,
  invited_email TEXT,
  invited_name TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  accepted_at TIMESTAMP,
  expires_at TIMESTAMP,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS historian_invitations_token_idx ON historian_invitations (invite_token);
CREATE INDEX IF NOT EXISTS historian_invitations_inviter_idx ON historian_invitations (inviter_id);
CREATE INDEX IF NOT EXISTS historian_invitations_invitee_idx ON historian_invitations (invitee_id);
CREATE INDEX IF NOT EXISTS historian_invitations_expires_idx ON historian_invitations (expires_at);
CREATE UNIQUE INDEX IF NOT EXISTS historian_invitations_token_unique ON historian_invitations (invite_token);

-- Make invited_email nullable (for generic invitations)
ALTER TABLE historian_invitations 
  ALTER COLUMN invited_email DROP NOT NULL;

COMMENT ON TABLE historian_invitations IS 'Tracks invitations sent by trusted historians to invite new historians.';
COMMENT ON COLUMN historian_invitations.invited_email IS 'Optional email - can be null for generic invitations that invitees fill in themselves.';
COMMENT ON COLUMN historians.trusted IS 'Whether this historian can create invitations. Auto-promoted after 30 edits unless manually overridden.';
COMMENT ON COLUMN historians.trusted_override IS 'Manual override for trusted status: NULL = auto-managed, TRUE = manually trusted, FALSE = manually untrusted (blocks auto-promotion)';
