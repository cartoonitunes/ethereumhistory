-- Migration 074: Add the missing historians.role column
--
-- Migration 037 (historian_trust_tiers) UPDATEs and indexes historians.role, but no
-- migration ever created the column. On a fresh database 037 aborts with
-- 'column "role" does not exist', leaving every later migration unapplied.
-- 037 now creates the column itself; this migration is the idempotent backstop for
-- databases that got past 037 by hand.
--
-- The column matters more than it used to: the super admin UI
-- (/admin/historians -> setHistorianTrustLevelFromDb) writes role, and the
-- admin-only routes (suspend, revert, proof-lock override, cron auth) all read it.

ALTER TABLE historians ADD COLUMN IF NOT EXISTS role TEXT;

COMMENT ON COLUMN historians.role IS
  'Trust tier: NULL or ''historian'' = standard contributor, ''trusted'' = established, ''admin'' = full access (approve/revert/suspend, override proof locks)';

CREATE INDEX IF NOT EXISTS historians_role_idx ON historians (role);

-- Re-apply migration 037's seeding (no-ops if already correct).
UPDATE historians SET role = 'admin' WHERE email = 'neo@openclaw.ai' AND role IS DISTINCT FROM 'admin';
UPDATE historians SET role = 'admin' WHERE id = 1 AND role IS DISTINCT FROM 'admin';

-- The review dashboard and every reviewer gate check `trusted`, not `role`.
-- An admin with trusted = false would be locked out of reviewing, so keep them in sync.
UPDATE historians SET trusted = TRUE WHERE role = 'admin' AND trusted = FALSE;
