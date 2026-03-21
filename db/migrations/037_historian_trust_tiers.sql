-- Trust tiers via role field on historians table
-- NULL or 'historian': standard contributor (new accounts, edits go through review queue)
-- 'trusted': established contributor (edits publish immediately)
-- 'admin': full access (can approve/revert/suspend, override proof locks)

-- Ensure Neo historian account is admin
UPDATE historians SET role = 'admin' WHERE email = 'neo@openclaw.ai';

-- Add index for role lookups
CREATE INDEX IF NOT EXISTS historians_role_idx ON historians(role);
