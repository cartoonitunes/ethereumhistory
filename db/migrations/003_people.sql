-- People model (known deployers / historical figures)
-- Safe to run multiple times.

CREATE TABLE IF NOT EXISTS people (
  address TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  role TEXT,
  short_bio TEXT,
  bio TEXT,
  highlights JSONB,
  website_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS people_slug_idx ON people (slug);

-- Seed: Alex Van de Sande (avsa)
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
  '0xd1220a0cf47c7b9be7a2e6ba89f429762e7b9adb',
  'Alex Van de Sande',
  'alex-van-de-sande',
  'Designer, Mist',
  'Ethereum Foundation contributor and Mist (Ethereum Wallet/Web3 Browser) builder.',
  'Alex Van de Sande ("avsa") helped launch Ethereum and built major early UX and smart contract primitives through the Mist project and related efforts.',
  '[
    "Helped launch Ethereum",
    "Launched the first Ethereum Wallet and Web3 Browser (Mist)",
    "Coded one of the first ERC-20 tokens, DAOs, token sales and NFT (ENS) contracts; many were used as templates",
    "Promoted ENS as a primary means of login for ~2 years",
    "Helped save a DAO before",
    "Launched one of the earliest DAOs for public good (Tip Jar, Dogethereum)",
    "Helped fundraise millions for public good (Akita-Gitcoin LBP)",
    "Created the first ENS registrar, which held millions of dollars for years and was never hacked"
  ]'::jsonb,
  'https://www.earlydaysofeth.org/people/alex-van-de-sande/'
)
ON CONFLICT (address) DO NOTHING;

