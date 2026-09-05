-- Migration 083: Cache resolved ENS identity per wallet.
--
-- The collector card wants an ENS name and avatar for the person it belongs to.
-- Resolving both means two RPC round trips per wallet, and a card can be built
-- or rebuilt often, so the result is cached here rather than re-resolved every
-- time.
--
-- `ens_checked_at` records when we last asked, NOT whether we found anything.
-- Without it, a wallet with no ENS name would be indistinguishable from one we
-- have never looked at, and every card build would retry every unnamed wallet
-- forever.
--
-- Idempotent: safe to re-run.

ALTER TABLE user_wallets
  ADD COLUMN IF NOT EXISTS ens_name       TEXT,
  ADD COLUMN IF NOT EXISTS ens_avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS ens_checked_at TIMESTAMPTZ;
