-- Trust tiers via role field on historians table
-- NULL or 'historian': standard contributor (new accounts, edits go through review queue)
-- 'trusted': established contributor (edits publish immediately)
-- 'admin': full access (can approve/revert/suspend, override proof locks)

-- The role column must exist before it can be updated or indexed. Without this the
-- whole migration run aborts here on a fresh database (see 074_historian_role_column.sql).
ALTER TABLE historians ADD COLUMN IF NOT EXISTS role TEXT;

-- Ensure Neo historian account is admin
UPDATE historians SET role = 'admin' WHERE email = 'neo@openclaw.ai';

-- Add index for role lookups
CREATE INDEX IF NOT EXISTS historians_role_idx ON historians(role);

-- Set historian ID 1 (Julian) as admin
UPDATE historians SET role = 'admin', trusted = true WHERE id = 1;
