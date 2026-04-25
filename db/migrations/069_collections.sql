-- Migration 069: Collections — curated galleries of historically significant contracts
--
-- A "collection" is a named, curator-defined set of contracts with a slug, title,
-- subtitle, deployer address for attribution, and a materialized contract_addresses
-- array. Two seed collections are inserted: avsa and vitalik.
--
-- Idempotent: safe to re-run.

CREATE TABLE IF NOT EXISTS collections (
  id                 SERIAL PRIMARY KEY,
  slug               TEXT NOT NULL,
  title              TEXT NOT NULL,
  subtitle           TEXT,
  description        TEXT,
  deployer_address   TEXT,
  cover_image_url    TEXT,
  contract_addresses TEXT[] NOT NULL DEFAULT '{}',
  created_at         TIMESTAMP DEFAULT now(),
  updated_at         TIMESTAMP DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS collections_slug_unique
  ON collections (slug);

CREATE INDEX IF NOT EXISTS collections_deployer_idx
  ON collections (deployer_address);

-- Seed: avsa — Alex Van de Sande / Ethereum Foundation
INSERT INTO collections (slug, title, subtitle, description, deployer_address, contract_addresses)
VALUES (
  'avsa',
  'The Avsa Collection',
  'Every contract deployed by Alex Van de Sande, Ethereum Foundation',
  'Alex Van de Sande (avsa) was a prominent Ethereum Foundation designer and developer who deployed numerous early smart contracts. This collection gathers every contract in the archive attributed to his deployer address.',
  '0xd1220a0cf47c7b9be7a2e6ba89f429762e7b9adb',
  ARRAY(
    SELECT address FROM contracts
    WHERE deployer_address = '0xd1220a0cf47c7b9be7a2e6ba89f429762e7b9adb'
    ORDER BY deployment_timestamp NULLS LAST, deployment_rank NULLS LAST
  )
)
ON CONFLICT (slug) DO UPDATE
  SET contract_addresses = EXCLUDED.contract_addresses,
      updated_at = now();

-- Seed: vitalik — Vitalik Buterin
INSERT INTO collections (slug, title, subtitle, description, deployer_address, contract_addresses)
VALUES (
  'vitalik',
  'Vitalik''s Early Contracts',
  'Contracts deployed by Vitalik Buterin in Ethereum''s earliest days',
  'Vitalik Buterin deployed some of the very first smart contracts on Ethereum, many of them before the network was widely known. This collection documents those contracts from his primary early deployer address.',
  '0x1db3439a222c519ab44bb1144fc28167b4fa6ee6',
  ARRAY(
    SELECT address FROM contracts
    WHERE deployer_address = '0x1db3439a222c519ab44bb1144fc28167b4fa6ee6'
    ORDER BY deployment_timestamp NULLS LAST, deployment_rank NULLS LAST
  )
)
ON CONFLICT (slug) DO UPDATE
  SET contract_addresses = EXCLUDED.contract_addresses,
      updated_at = now();
