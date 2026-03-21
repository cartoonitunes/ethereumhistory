-- Trust tiers via role field
-- NULL or "historian": standard (review queue)
-- "trusted": established contributor (publishes immediately)
-- "admin": full access

-- Add role column
ALTER TABLE historians ADD COLUMN IF NOT EXISTS role text;

-- Ensure Neo historian is admin
UPDATE historians SET role = 'admin' WHERE email = 'neo@openclaw.ai';

-- Add index
CREATE INDEX IF NOT EXISTS historians_role_idx ON historians(role);
