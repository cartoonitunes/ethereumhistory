-- Migration 075: Gavin Wood
--
-- Adds the Gavin Wood person record, his Primary wallet row, and a collection
-- gathering the four contracts deployed from his genesis address.
--
-- 0xb7576e9d314df41ec5506494293afb1bd5d3f65d was allocated 20 ETH in the genesis
-- block and deployed exactly four contracts in August 2015, in the first weeks of
-- the live network: two name registries and two ExpRegistrars. The second
-- ExpRegistrar reserves the name gavofyork in its constructor.
--
-- No other address is attributed to him here. The name gavofyork inside
-- 0x047cdba9 is assigned to 0x00fc9b9fd6ae40fd47941399915b9ce4fd5e1f28, which is
-- a separate address and is deliberately left unattributed.
--
-- Idempotent: safe to re-run. contract_addresses is refreshed on conflict.

INSERT INTO people (
  address,
  name,
  slug,
  role,
  short_bio,
  bio,
  highlights,
  website_url
) VALUES (
  '0xb7576e9d314df41ec5506494293afb1bd5d3f65d',
  'Gavin Wood',
  'gavin-wood',
  'Ethereum co-founder, Solidity and the Yellow Paper',
  'Ethereum co-founder and its first CTO. Wrote the Yellow Paper, the formal specification of the Ethereum Virtual Machine, and proposed Solidity. Known onchain as gavofyork.',
  'Gavin Wood co-founded Ethereum and served as its first chief technology officer. He wrote the Yellow Paper, the formal specification that defines the Ethereum Virtual Machine, and proposed Solidity, the language most Ethereum contracts are still written in. He led the C++ client that ran alongside Geth on the early network, and afterwards founded Parity Technologies, the Web3 Foundation and Polkadot. The term Web3 is his, coined in 2014.

This address was allocated 20 ETH in the genesis block. In August 2015, in the first weeks of the live network, it deployed Ethereum''s first name registries, ending with an ExpRegistrar whose constructor reserves the name gavofyork.',
  '[
    "Co-founded Ethereum and served as its first CTO",
    "Wrote the Yellow Paper, the formal specification of the Ethereum Virtual Machine",
    "Proposed Solidity, the language most Ethereum contracts are written in",
    "Led the C++ Ethereum client and the early AlethZero and Mix developer tools",
    "Founded Parity Technologies, the Web3 Foundation and Polkadot",
    "Coined the term Web3 in 2014",
    "Known onchain and on GitHub as gavofyork"
  ]'::jsonb,
  'https://gavwood.com'
)
ON CONFLICT (address) DO NOTHING;

INSERT INTO people_wallets (address, person_address, label)
VALUES ('0xb7576e9d314df41ec5506494293afb1bd5d3f65d', '0xb7576e9d314df41ec5506494293afb1bd5d3f65d', 'Primary')
ON CONFLICT (address) DO NOTHING;

INSERT INTO collections (slug, title, subtitle, description, deployer_address, contract_addresses)
VALUES (
  'gavin-wood',
  'The Gavin Wood Collection',
  'Every contract deployed by Gavin Wood',
  'Gavin Wood co-founded Ethereum, wrote the Yellow Paper and proposed Solidity. This collection gathers the four contracts he deployed from his genesis address in August 2015, in the first weeks of the live network. Two are name registries, the earliest attempts to put human readable names on Ethereum addresses. The other two are ExpRegistrars, a registrar with paid reservations, and the second of them reserves the name gavofyork in its constructor. All four were unverified for a decade and their sources have since been recovered.',
  '0xb7576e9d314df41ec5506494293afb1bd5d3f65d',
  ARRAY(
    SELECT address FROM contracts
    WHERE deployer_address = '0xb7576e9d314df41ec5506494293afb1bd5d3f65d'
    ORDER BY deployment_timestamp NULLS LAST, deployment_rank NULLS LAST
  )
)
ON CONFLICT (slug) DO UPDATE
  SET contract_addresses = EXCLUDED.contract_addresses,
      updated_at = now();
