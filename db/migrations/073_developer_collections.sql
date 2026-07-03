-- Migration 073: Developer collections — five new curated deployer galleries
--
-- Adds collections for Cyrus Adkisson, Fabian Vogelsteller, Hudson Jameson,
-- Martin Becze, and Anthony Eufemio. Each materializes contract_addresses from
-- the deployer address(es) in the same shape as migration 069 (avsa/vitalik).
--
-- Idempotent: safe to re-run. contract_addresses is refreshed on conflict.

-- Cyrus Adkisson — most prolific individual deployer in the archive
INSERT INTO collections (slug, title, subtitle, description, deployer_address, contract_addresses)
VALUES (
  'cyrus-adkisson',
  'The Cyrus Adkisson Collection',
  'Every contract deployed by Cyrus Adkisson',
  'Cyrus Adkisson is the most prolific individual deployer in the archive, with 351 contracts published between August 2015 and February 2016. Starting in Ethereum''s first months, he deployed an unusually broad range of experimental contracts including test cases, data structure demos, simple games, and token prototypes. Together they form a detailed record of one developer probing what the young Ethereum Virtual Machine could do.',
  '0xcf684dfb8304729355b58315e8019b1aa2ad1bac',
  ARRAY(
    SELECT address FROM contracts
    WHERE deployer_address = '0xcf684dfb8304729355b58315e8019b1aa2ad1bac'
    ORDER BY deployment_timestamp NULLS LAST, deployment_rank NULLS LAST
  )
)
ON CONFLICT (slug) DO UPDATE
  SET contract_addresses = EXCLUDED.contract_addresses,
      updated_at = now();

-- Fabian Vogelsteller — author of ERC-20, Mist developer
INSERT INTO collections (slug, title, subtitle, description, deployer_address, contract_addresses)
VALUES (
  'fabian-vogelsteller',
  'The Fabian Vogelsteller Collection',
  'Every contract deployed by Fabian Vogelsteller',
  'Fabian Vogelsteller is the author of ERC-20, the token standard that underpins most Ethereum tokens, and a lead developer of the Mist browser. This collection gathers 33 contracts from his early deployer address, including MistCoin, the token prototype he deployed in November 2015 shortly before proposing ERC-20. The contracts trace the practical experiments that shaped how tokens work on Ethereum.',
  '0x9b22a80d5c7b3374a05b446081f97d0a34079e7f',
  ARRAY(
    SELECT address FROM contracts
    WHERE deployer_address = '0x9b22a80d5c7b3374a05b446081f97d0a34079e7f'
    ORDER BY deployment_timestamp NULLS LAST, deployment_rank NULLS LAST
  )
)
ON CONFLICT (slug) DO UPDATE
  SET contract_addresses = EXCLUDED.contract_addresses,
      updated_at = now();

-- Hudson Jameson — Ethereum Foundation community lead, Marriage Registry
INSERT INTO collections (slug, title, subtitle, description, deployer_address, contract_addresses)
VALUES (
  'hudson-jameson',
  'The Hudson Jameson Collection',
  'Every contract deployed by Hudson Jameson',
  'Hudson Jameson was an Ethereum Foundation community manager and organizer of the core developer calls that coordinated Ethereum''s protocol upgrades for years. This collection gathers four contracts from his deployer address, among them the Marriage Registry, an on-chain contract recording a personal marriage that became one of Ethereum''s better known early human-interest deployments.',
  '0x80d63799b1e08a80f73fb7a83264b5c31600bf3a',
  ARRAY(
    SELECT address FROM contracts
    WHERE deployer_address = '0x80d63799b1e08a80f73fb7a83264b5c31600bf3a'
    ORDER BY deployment_timestamp NULLS LAST, deployment_rank NULLS LAST
  )
)
ON CONFLICT (slug) DO UPDATE
  SET contract_addresses = EXCLUDED.contract_addresses,
      updated_at = now();

-- Martin Becze — early Ethereum Foundation developer, day-one deployer
INSERT INTO collections (slug, title, subtitle, description, deployer_address, contract_addresses)
VALUES (
  'martin-becze',
  'The Martin Becze Collection',
  'Every contract deployed by Martin Becze',
  'Martin Becze was an early Ethereum Foundation developer who contributed to the Ethereum Virtual Machine and related tooling. This collection gathers four contracts from his deployer address, with the earliest deployed on August 7, 2015, within the first 48 hours of Ethereum''s mainnet launch. They are among the oldest contracts in the archive.',
  '0xcd063b3081ea55535e5b60a21eff7f14e785a877',
  ARRAY(
    SELECT address FROM contracts
    WHERE deployer_address = '0xcd063b3081ea55535e5b60a21eff7f14e785a877'
    ORDER BY deployment_timestamp NULLS LAST, deployment_rank NULLS LAST
  )
)
ON CONFLICT (slug) DO UPDATE
  SET contract_addresses = EXCLUDED.contract_addresses,
      updated_at = now();

-- Anthony Eufemio — prolific early deployer across two addresses
INSERT INTO collections (slug, title, subtitle, description, deployer_address, contract_addresses)
VALUES (
  'anthony-eufemio',
  'The Anthony Eufemio Collection',
  'Every contract deployed by Anthony Eufemio',
  'Anthony Eufemio deployed 45 contracts across two addresses during Ethereum''s earliest period in 2015 and 2016. Most are unnamed experimental contracts from the first months of the live network. This collection aggregates both of his deployer addresses into a single view of his early on-chain activity.',
  '0x4f53269e422711d4725f7381444c7f66f7d05788',
  ARRAY(
    SELECT address FROM contracts
    WHERE deployer_address IN (
      '0xa1e4380a3b1f749673e270229993ee55f35663b4',
      '0x4f53269e422711d4725f7381444c7f66f7d05788'
    )
    ORDER BY deployment_timestamp NULLS LAST, deployment_rank NULLS LAST
  )
)
ON CONFLICT (slug) DO UPDATE
  SET contract_addresses = EXCLUDED.contract_addresses,
      updated_at = now();
