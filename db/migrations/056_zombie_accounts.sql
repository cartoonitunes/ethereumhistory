-- Migration 056: Add six zombie accounts — earliest null deployments on Ethereum mainnet
--
-- These accounts predate the first successful contract deployment (block 48,643).
-- They were created via CREATE transactions with empty init code (input = 0x).
-- Transaction status = 0x1 (success), but no bytecode was returned, so
-- codeHash = KEC() — a non-contract account per Yellow Paper Section 4.1.
-- Yellow Paper Section 7.1 names this outcome a "zombie account".
--
-- Deploy order: 47205, 48162, 48172, 48173, 48591, 48613
-- First real contract (non-empty code): block 48643 (0x6516298e...)

INSERT INTO contracts (
  address,
  runtime_bytecode,
  code_size_bytes,
  deployment_block,
  deployment_timestamp,
  deployment_tx_hash,
  deployer_address,
  era_id,
  deploy_status,
  short_description,
  description,
  historical_significance,
  historical_context,
  created_at,
  updated_at
) VALUES

-- #1: block 47205 — the earliest zombie account on Ethereum mainnet
(
  '0xc669eaad75042be84daaf9b461b0e868b9ac1871',
  '0x', 0,
  47205,
  to_timestamp(1438935994),
  '0x31ded263506ea36e6ea777efc2c39a999e6fba4f4d338c7313af6aac6d9bf3e3',
  '0xfbe0afcd7658ba86be41922059dd879c192d4c73',
  'frontier',
  'success',
  'One of six zombie accounts — the earliest known null deployments on Ethereum mainnet, predating the first successful contract deployment at block 48,643.',
  E'A zombie account created during Ethereum''s Frontier era by sending a contract creation transaction with empty init code (input = 0x). The transaction succeeded (status 0x1) and the address was deterministically assigned, but since no bytecode was returned by the initialisation procedure, the account''s code field remains KEC() — the Keccak-256 hash of the empty string. Per the Ethereum Yellow Paper Section 7.1, this is called a zombie account: an address with no executable code whose balance, if any, is permanently locked.\n\nThis is distinct from a failed deployment (status 0x0, e.g. out-of-gas): the CREATE transaction completed successfully, but provided no init code. By the Yellow Paper''s definition (Section 4.1), an account with codeHash = KEC() is a non-contract account.\n\nThese six zombie accounts predate 0x6516298e1c94769432ef6d5f450579094e8c21fa (block 48,643) — the first account with non-empty code on Ethereum mainnet, the first true contract.',
  'The earliest of six zombie accounts on Ethereum mainnet, deployed at block 47,205 — over 1,400 blocks before the first successful contract. Demonstrates that the CREATE opcode was being tested in Frontier before developers reliably produced executable bytecode. Referenced in Ethereum Yellow Paper Section 7.1.',
  E'Deployed in Ethereum''s Frontier era, weeks after the genesis block. These null deployments appear to be early experiments with the CREATE transaction type, before the Solidity compiler and tooling were stable enough to reliably produce deployable bytecode.',
  NOW(), NOW()
),

-- #2: block 48162
(
  '0x589ea787b46da08ec8fc081678335c5d0081010e',
  '0x', 0,
  48162,
  NULL,
  '0x28dde8260ea71c354b9d3e0cf0c2fcd86369b34f6527b7806b519ff4d6bb6d95',
  '0x91dbb6aaad149585be47375c5d6de5ff09191518',
  'frontier',
  'success',
  'One of six zombie accounts — the earliest known null deployments on Ethereum mainnet, predating the first successful contract deployment at block 48,643.',
  E'A zombie account created during Ethereum''s Frontier era by sending a contract creation transaction with empty init code (input = 0x). The transaction succeeded (status 0x1) and the address was deterministically assigned, but since no bytecode was returned by the initialisation procedure, the account''s code field remains KEC() — the Keccak-256 hash of the empty string. Per the Ethereum Yellow Paper Section 7.1, this is called a zombie account: an address with no executable code whose balance, if any, is permanently locked.\n\nThis is distinct from a failed deployment (status 0x0, e.g. out-of-gas): the CREATE transaction completed successfully, but provided no init code. By the Yellow Paper''s definition (Section 4.1), an account with codeHash = KEC() is a non-contract account.\n\nThese six zombie accounts predate 0x6516298e1c94769432ef6d5f450579094e8c21fa (block 48,643) — the first account with non-empty code on Ethereum mainnet, the first true contract.',
  'One of six zombie accounts on Ethereum mainnet, deployed at block 48,162 — before the first successful contract. Referenced in Ethereum Yellow Paper Section 7.1.',
  E'Deployed in Ethereum''s Frontier era, weeks after the genesis block. These null deployments appear to be early experiments with the CREATE transaction type, before the Solidity compiler and tooling were stable enough to reliably produce deployable bytecode.',
  NOW(), NOW()
),

-- #3: block 48172
(
  '0x9a6bfff95d8ae43425d3960585c230c89e9060e4',
  '0x', 0,
  48172,
  NULL,
  '0x7a54025726704a0498ba47946296c199d11917ba47dbf7804d7a1c7e6029bfbf',
  '0xb6047cdf932db3e4045f4976122341537ed5961e',
  'frontier',
  'success',
  'One of six zombie accounts — the earliest known null deployments on Ethereum mainnet, predating the first successful contract deployment at block 48,643.',
  E'A zombie account created during Ethereum''s Frontier era by sending a contract creation transaction with empty init code (input = 0x). The transaction succeeded (status 0x1) and the address was deterministically assigned, but since no bytecode was returned by the initialisation procedure, the account''s code field remains KEC() — the Keccak-256 hash of the empty string. Per the Ethereum Yellow Paper Section 7.1, this is called a zombie account: an address with no executable code whose balance, if any, is permanently locked.\n\nThis is distinct from a failed deployment (status 0x0, e.g. out-of-gas): the CREATE transaction completed successfully, but provided no init code. By the Yellow Paper''s definition (Section 4.1), an account with codeHash = KEC() is a non-contract account.\n\nThese six zombie accounts predate 0x6516298e1c94769432ef6d5f450579094e8c21fa (block 48,643) — the first account with non-empty code on Ethereum mainnet, the first true contract.',
  'One of six zombie accounts on Ethereum mainnet, deployed at block 48,172 — before the first successful contract. Referenced in Ethereum Yellow Paper Section 7.1.',
  E'Deployed in Ethereum''s Frontier era, weeks after the genesis block. These null deployments appear to be early experiments with the CREATE transaction type, before the Solidity compiler and tooling were stable enough to reliably produce deployable bytecode.',
  NOW(), NOW()
),

-- #4: block 48173
(
  '0xf0b0420788efa4e6241ed3ff5e88c092d7ee4fa3',
  '0x', 0,
  48173,
  NULL,
  '0x4f2e6103c5b6224fe4cb478b957215a71b0e8c0523c0ce41a80b7697dbea3cb1',
  '0x91dbb6aaad149585be47375c5d6de5ff09191518',
  'frontier',
  'success',
  'One of six zombie accounts — the earliest known null deployments on Ethereum mainnet, predating the first successful contract deployment at block 48,643.',
  E'A zombie account created during Ethereum''s Frontier era by sending a contract creation transaction with empty init code (input = 0x). The transaction succeeded (status 0x1) and the address was deterministically assigned, but since no bytecode was returned by the initialisation procedure, the account''s code field remains KEC() — the Keccak-256 hash of the empty string. Per the Ethereum Yellow Paper Section 7.1, this is called a zombie account: an address with no executable code whose balance, if any, is permanently locked.\n\nThis is distinct from a failed deployment (status 0x0, e.g. out-of-gas): the CREATE transaction completed successfully, but provided no init code. By the Yellow Paper''s definition (Section 4.1), an account with codeHash = KEC() is a non-contract account.\n\nThese six zombie accounts predate 0x6516298e1c94769432ef6d5f450579094e8c21fa (block 48,643) — the first account with non-empty code on Ethereum mainnet, the first true contract.',
  'One of six zombie accounts on Ethereum mainnet, deployed at block 48,173 — before the first successful contract. Referenced in Ethereum Yellow Paper Section 7.1.',
  E'Deployed in Ethereum''s Frontier era, weeks after the genesis block. These null deployments appear to be early experiments with the CREATE transaction type, before the Solidity compiler and tooling were stable enough to reliably produce deployable bytecode.',
  NOW(), NOW()
),

-- #5: block 48591
(
  '0x7043be25da95cb39cdaadc80f68cf4066a5146d4',
  '0x', 0,
  48591,
  NULL,
  '0x1aff7a5d0a2e0808a1d693991f0ee708f8280420b91fa787d4c643626b49fecd',
  '0x8b454d830fef179e66206840f8f3d1d83bc32b17',
  'frontier',
  'success',
  'One of six zombie accounts — the earliest known null deployments on Ethereum mainnet, predating the first successful contract deployment at block 48,643.',
  E'A zombie account created during Ethereum''s Frontier era by sending a contract creation transaction with empty init code (input = 0x). The transaction succeeded (status 0x1) and the address was deterministically assigned, but since no bytecode was returned by the initialisation procedure, the account''s code field remains KEC() — the Keccak-256 hash of the empty string. Per the Ethereum Yellow Paper Section 7.1, this is called a zombie account: an address with no executable code whose balance, if any, is permanently locked.\n\nThis is distinct from a failed deployment (status 0x0, e.g. out-of-gas): the CREATE transaction completed successfully, but provided no init code. By the Yellow Paper''s definition (Section 4.1), an account with codeHash = KEC() is a non-contract account.\n\nThese six zombie accounts predate 0x6516298e1c94769432ef6d5f450579094e8c21fa (block 48,643) — the first account with non-empty code on Ethereum mainnet, the first true contract.',
  'One of six zombie accounts on Ethereum mainnet, deployed at block 48,591 — 52 blocks before the first successful contract. Referenced in Ethereum Yellow Paper Section 7.1.',
  E'Deployed in Ethereum''s Frontier era, weeks after the genesis block. These null deployments appear to be early experiments with the CREATE transaction type, before the Solidity compiler and tooling were stable enough to reliably produce deployable bytecode.',
  NOW(), NOW()
),

-- #6: block 48613 — closest zombie to the first real contract (30 blocks before 48,643)
(
  '0x1a332271eac30c5e967ce9e606bb0e9b4ddf436e',
  '0x', 0,
  48613,
  NULL,
  '0x290044d69e0c91da06f02e55acc7d9d16a8e62fda29071bb0b9550da7bf69e20',
  '0x8b454d830fef179e66206840f8f3d1d83bc32b17',
  'frontier',
  'success',
  'One of six zombie accounts — the earliest known null deployments on Ethereum mainnet, predating the first successful contract deployment at block 48,643.',
  E'A zombie account created during Ethereum''s Frontier era by sending a contract creation transaction with empty init code (input = 0x). The transaction succeeded (status 0x1) and the address was deterministically assigned, but since no bytecode was returned by the initialisation procedure, the account''s code field remains KEC() — the Keccak-256 hash of the empty string. Per the Ethereum Yellow Paper Section 7.1, this is called a zombie account: an address with no executable code whose balance, if any, is permanently locked.\n\nThis is distinct from a failed deployment (status 0x0, e.g. out-of-gas): the CREATE transaction completed successfully, but provided no init code. By the Yellow Paper''s definition (Section 4.1), an account with codeHash = KEC() is a non-contract account.\n\nThese six zombie accounts predate 0x6516298e1c94769432ef6d5f450579094e8c21fa (block 48,643) — the first account with non-empty code on Ethereum mainnet, the first true contract.',
  'The last of six zombie accounts before the first successful contract. Deployed at block 48,613 — just 30 blocks before 0x6516298e (block 48,643), the first true Ethereum contract. Referenced in Ethereum Yellow Paper Section 7.1.',
  E'Deployed in Ethereum''s Frontier era, weeks after the genesis block. These null deployments appear to be early experiments with the CREATE transaction type, before the Solidity compiler and tooling were stable enough to reliably produce deployable bytecode.',
  NOW(), NOW()
)

ON CONFLICT (address) DO NOTHING;

-- Add Yellow Paper source links for each
INSERT INTO historical_links (contract_address, title, url, source, created_at, updated_at)
SELECT addr, 'Ethereum Yellow Paper — Section 7.1 (zombie account definition)', 'https://ethereum.github.io/yellowpaper/paper.pdf', 'yellowpaper', NOW(), NOW()
FROM (VALUES
  ('0xc669eaad75042be84daaf9b461b0e868b9ac1871'),
  ('0x589ea787b46da08ec8fc081678335c5d0081010e'),
  ('0x9a6bfff95d8ae43425d3960585c230c89e9060e4'),
  ('0xf0b0420788efa4e6241ed3ff5e88c092d7ee4fa3'),
  ('0x7043be25da95cb39cdaadc80f68cf4066a5146d4'),
  ('0x1a332271eac30c5e967ce9e606bb0e9b4ddf436e')
) AS t(addr)
ON CONFLICT DO NOTHING;
