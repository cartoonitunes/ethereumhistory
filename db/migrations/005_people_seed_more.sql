-- Seed additional People entries
-- Safe to run multiple times.

-- Fabian Vogelsteller
INSERT INTO people (
  address,
  name,
  slug,
  role,
  short_bio,
  bio,
  highlights,
  website_url
)
VALUES (
  '0x9b22a80d5c7b3374a05b446081f97d0a34079e7f',
  'Fabian Vogelsteller',
  'fabian-vogelsteller',
  'ERC-20, Mist and web3.js',
  'Co-Founder of LUKSO; author of ERC-20 and ERC-725; former Mist/web3.js lead dApp developer.',
  'Fabian Vogelsteller contributed core standards and tooling in Ethereum’s early years, including work on token and identity standards as well as developer-facing libraries and the Mist project.',
  '[
    "Co-Founder of LUKSO",
    "Authored ERC-20 (token standard) and ERC-725 (identity standard)",
    "Contributed to Mist and web3.js",
    "Lead dApp developer at Ethereum (early era)"
  ]'::jsonb,
  'https://www.earlydaysofeth.org/people/fabian-vogelsteller/'
)
ON CONFLICT (address) DO NOTHING;

INSERT INTO people_wallets (address, person_address, label)
VALUES ('0x9b22a80d5c7b3374a05b446081f97d0a34079e7f', '0x9b22a80d5c7b3374a05b446081f97d0a34079e7f', 'Primary')
ON CONFLICT (address) DO NOTHING;

-- Linagee
INSERT INTO people (
  address,
  name,
  slug,
  role,
  short_bio,
  bio,
  highlights,
  website_url
)
VALUES (
  '0xcd063b3081ea55535e5b60a21eff7f14e785a877',
  'Linagee',
  'linagee',
  'Early Ethereum enthusiast',
  'An early anonymous Ethereum enthusiast who deployed some of the earliest contracts, including the Linagee Name Registrar.',
  'Linagee is an early anonymous Ethereum enthusiast who deployed some of the earliest contracts, including the first ownable token, the first token with a faucet, and the first domain registrar known as the Linagee Name Registrar.',
  '[
    "Deployed some of the earliest Ethereum contracts",
    "Deployed the first ownable token",
    "Deployed the first token with a faucet",
    "Deployed the first domain registrar (Linagee Name Registrar)"
  ]'::jsonb,
  'https://github.com/linagee'
)
ON CONFLICT (address) DO NOTHING;

INSERT INTO people_wallets (address, person_address, label)
VALUES ('0xcd063b3081ea55535e5b60a21eff7f14e785a877', '0xcd063b3081ea55535e5b60a21eff7f14e785a877', 'Primary')
ON CONFLICT (address) DO NOTHING;

