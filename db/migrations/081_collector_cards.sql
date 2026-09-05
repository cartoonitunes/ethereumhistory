-- Migration 081: Collector Card, phase 1 schema.
--
-- Adds the four tables behind the collector card feature: wallets a user has
-- attached to their account, the token holdings we detect for those wallets,
-- a registry mapping wrapper tokens back to the historic contract they wrap,
-- and the generated shareable card itself.
--
-- ACCOUNT MODEL
-- -------------
-- The spec called the owning column `user_id`. There is no `users` table on
-- this codebase: `historians` IS the account table (67 rows, email/token,
-- GitHub and Google OAuth, SIWE). So the foreign key is `historian_id`, which
-- keeps it unambiguous next to the pre-existing `people_wallets` table. That
-- one is editorial data (wallets belonging to historical figures such as avsa
-- or Gavin Wood) and is unrelated to user accounts, despite the similar shape.
--
-- Note `historians.ethereum_address` and `historians.base_address` already
-- exist as single-wallet fields (3 rows populated). `user_wallets` supersedes
-- them for multi-wallet use. They are deliberately left in place for now so
-- this migration cannot break SIWE login, which reads them. Reconciling the
-- two is a follow-up, not part of phase 1.
--
-- Idempotent: safe to re-run.

-- ============================================================================
-- 1. user_wallets: addresses a user has attached to their account.
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_wallets (
  id             SERIAL PRIMARY KEY,
  historian_id   INTEGER NOT NULL REFERENCES historians(id) ON DELETE CASCADE,
  -- Always stored lowercase. EIP-55 checksumming is a display concern, applied
  -- in the UI layer; storing one canonical case keeps lookups on the index
  -- instead of forcing a sequential scan through LOWER(address).
  address        TEXT NOT NULL,
  label          TEXT,
  -- Set only once a personal_sign challenge has been recovered to this exact
  -- address. NULL means the user asserted the address but has not proven it.
  verified_at    TIMESTAMPTZ,
  -- Date of the wallet's first outbound transaction, used on the card to show
  -- "on chain since 2015". Populated by the scan, nullable until then.
  first_tx_date  TIMESTAMPTZ,
  added_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT user_wallets_address_lowercase CHECK (address = lower(address)),
  CONSTRAINT user_wallets_address_shape CHECK (address ~ '^0x[0-9a-f]{40}$')
);

-- One user cannot add the same address twice.
CREATE UNIQUE INDEX IF NOT EXISTS user_wallets_historian_address_unique
  ON user_wallets (historian_id, address);

-- An address can be VERIFIED by at most one account, globally. Without this,
-- two accounts could both display a verified badge for the same wallet and
-- both claim its holdings on a public card. Unverified rows are exempt: they
-- are unproven claims, and blocking them would let anyone squat an address
-- they do not control.
CREATE UNIQUE INDEX IF NOT EXISTS user_wallets_verified_address_unique
  ON user_wallets (address)
  WHERE verified_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS user_wallets_historian_idx
  ON user_wallets (historian_id);

-- ============================================================================
-- 2. wallet_holdings: detected balances, cross referenced against `contracts`.
-- ============================================================================

CREATE TABLE IF NOT EXISTS wallet_holdings (
  id               SERIAL PRIMARY KEY,
  wallet_id        INTEGER NOT NULL REFERENCES user_wallets(id) ON DELETE CASCADE,
  -- The EH contract this holding is for, lowercase. Not a foreign key to
  -- `contracts`: a scan can legitimately return a token that is in the Turso
  -- index but not yet promoted into Neon, and a hard FK would drop it.
  contract_address TEXT NOT NULL,
  token_symbol     TEXT,
  token_name       TEXT,
  -- Raw on chain integer, NOT a human readable amount. uint256 tops out around
  -- 1.16e77, so NUMERIC(78,0) holds any balance exactly. Storing a float here
  -- would silently round large balances; storing a "human" value would bake in
  -- a decimals guess. Render with token_decimals at display time.
  balance          NUMERIC(78, 0) NOT NULL DEFAULT 0,
  -- Captured per holding rather than read from `contracts` at render time,
  -- because decimals vary (MistCoin is 2, Unicorn Meat is 3, most are 18) and
  -- the value that was correct at scan time is what the balance was scaled by.
  token_decimals   INTEGER,
  token_type       TEXT NOT NULL DEFAULT 'erc20',
  -- Set when this row was credited via wrapper_registry rather than detected
  -- directly, so the card can label it "held as Wrapped Unicorn Meat".
  via_wrapper      TEXT,
  last_scanned_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT wallet_holdings_contract_lowercase CHECK (contract_address = lower(contract_address)),
  CONSTRAINT wallet_holdings_token_type CHECK (token_type IN ('erc20', 'erc721'))
);

-- A wallet holds a given contract once. Re-scans update in place.
CREATE UNIQUE INDEX IF NOT EXISTS wallet_holdings_wallet_contract_unique
  ON wallet_holdings (wallet_id, contract_address);

CREATE INDEX IF NOT EXISTS wallet_holdings_wallet_idx
  ON wallet_holdings (wallet_id);

CREATE INDEX IF NOT EXISTS wallet_holdings_contract_idx
  ON wallet_holdings (contract_address);

-- ============================================================================
-- 3. wrapper_registry: wrapper token -> the historic contract it represents.
--
-- This is the feature's differentiator. Someone holding Wrapped Unicorn Meat
-- holds 2016 Unicorn Meat as far as the card is concerned, and a naive balance
-- scan would miss that entirely.
-- ============================================================================

CREATE TABLE IF NOT EXISTS wrapper_registry (
  id                 SERIAL PRIMARY KEY,
  wrapper_address    TEXT NOT NULL,
  -- NULL when the underlying asset is not an Ethereum contract: WETH wraps
  -- native ETH, WBTC represents off chain BTC. Those rows exist so a scan can
  -- recognise and classify the token without inventing a contract for it.
  underlying_address TEXT,
  wrapper_name       TEXT,
  underlying_name    TEXT,
  type               TEXT NOT NULL DEFAULT 'wrapped',
  -- How the mapping was established, so a future editor can re-check it rather
  -- than trusting a name that merely looks like a wrapper.
  evidence           TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT wrapper_registry_wrapper_lowercase CHECK (wrapper_address = lower(wrapper_address)),
  CONSTRAINT wrapper_registry_underlying_lowercase
    CHECK (underlying_address IS NULL OR underlying_address = lower(underlying_address)),
  CONSTRAINT wrapper_registry_type CHECK (type IN ('wrapped', 'native', 'external'))
);

CREATE UNIQUE INDEX IF NOT EXISTS wrapper_registry_wrapper_unique
  ON wrapper_registry (wrapper_address);

CREATE INDEX IF NOT EXISTS wrapper_registry_underlying_idx
  ON wrapper_registry (underlying_address);

-- ============================================================================
-- 4. collector_cards: the generated, shareable card.
-- ============================================================================

CREATE TABLE IF NOT EXISTS collector_cards (
  id             SERIAL PRIMARY KEY,
  historian_id   INTEGER NOT NULL REFERENCES historians(id) ON DELETE CASCADE,
  -- Public URL segment (/card/<slug>). Random rather than sequential so the
  -- full set of cards is not enumerable from one shared link.
  share_slug     TEXT NOT NULL,
  card_data_json JSONB NOT NULL,
  og_image_url   TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS collector_cards_slug_unique
  ON collector_cards (share_slug);

-- One card per account. Regenerating updates the existing row rather than
-- minting a new slug, so a link already posted to X keeps resolving.
CREATE UNIQUE INDEX IF NOT EXISTS collector_cards_historian_unique
  ON collector_cards (historian_id);

-- ============================================================================
-- 5. Seed wrapper_registry.
--
-- Every mapping below was verified against this database before being written
-- here, not inferred from the token name:
--   * Unicorn Meat, MistCoin, CryptoPokemons, ayeAyeCoin and BlockSwap GNT
--     wrappers each reference the underlying address in their verified source.
--   * GNTW has no verified source, so its runtime bytecode was checked for the
--     Golem address as a PUSH20 constant. It is present.
--   * WETH and WBTC are recorded with a NULL underlying, since neither wraps an
--     Ethereum contract.
--
-- Deliberately NOT seeded, having failed that check:
--   * 0x326edb1cde4dc98d2b2640c67cacfa0874432eb7 (BSGNT): named like a Golem
--     wrapper but references the Golem address in neither source nor bytecode.
--   * 0x69420bb3b07cd7cda30d589e0f6563ced3669420 (WrappedMeme) and
--     0x59d25c853c4e8a1838d82bacb5853042e6c14fab (woori): no resolvable
--     underlying.
--   * wGAV: the GavCoin wrapper is not deployed yet. Add it once the address
--     exists. Guessing an address here would silently mis-credit holdings.
-- ============================================================================

INSERT INTO wrapper_registry
  (wrapper_address, underlying_address, wrapper_name, underlying_name, type, evidence)
VALUES
  ('0xdfa208bb0b811cfbb5fa3ea98ec37aa86180e668',
   '0xed6ac8de7c7ca7e3a22952e09c2a2a1232ddef9a',
   'Wrapped Unicorn Meat', 'Unicorn Meat', 'wrapped',
   'underlying address appears in verified source'),

  ('0x7fd4d7737597e7b4ee22acbf8d94362343ae0a79',
   '0xf4eced2f682ce333f96f2d8966c613ded8fc95dd',
   'WrappedMistCoin', 'MistCoin', 'wrapped',
   'underlying address appears in verified source'),

  ('0x30982ef551ea4583857578f3b28018aefecf7f9c',
   '0x0063f8d3537ec9cd23b08357494d3e0ee63a8f4a',
   'WrappedCryptoPokemons', 'CryptoPokemons', 'wrapped',
   'underlying address appears in verified source'),

  ('0x30ae41d5f9988d359c733232c6c693c0e645c77e',
   '0x3eddc7ebc7db94f54b72d8ed1f42ce6a527305bb',
   'WrappedAyeAyeCoin', 'ayeAyeCoin', 'wrapped',
   'underlying address appears in verified source; the other address in that source is an EOA owner'),

  ('0x936f78b9852d12f5cb93177c1f84fb8513d06263',
   '0xa74476443119a942de498590fe1f2454d7d4ac0d',
   'GNTW', 'Golem Network Token', 'wrapped',
   'no verified source; Golem address confirmed as a PUSH20 constant in runtime bytecode'),

  ('0x5656913c2a5917866a167d7cb792bfe250966aa1',
   '0xa74476443119a942de498590fe1f2454d7d4ac0d',
   'BlockSwapWrapperGolemNetworkToken', 'Golem Network Token', 'wrapped',
   'underlying address appears in verified source'),

  ('0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
   NULL, 'Wrapped Ether', 'Ether', 'native',
   'canonical WETH; wraps native ETH, which has no contract address'),

  ('0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
   NULL, 'Wrapped BTC', 'Bitcoin', 'external',
   'canonical WBTC; represents off chain BTC, not an Ethereum contract')
ON CONFLICT (wrapper_address) DO NOTHING;
