-- Migration 045: Consolidate all mortal+greeter contracts to share the same runtime_bytecode_hash.
-- These contracts have identical 692-byte runtime code but different constructor args (greeting strings),
-- so they have different creation tx inputs and thus different runtime_bytecode_hash values.
-- The runtime_bytecode field stores the full creation tx input (0x + hex).
-- We identify them by the 692-byte runtime code starting at position 23 (0-indexed hex char 22, 1-indexed char 23).
-- Canonical HelloWorld hash: 143a4c9b8e904f318dd0351c58dd21dd

UPDATE contracts
SET runtime_bytecode_hash = '143a4c9b8e904f318dd0351c58dd21dd'
WHERE verification_method IN ('exact_bytecode_match', 'author_published_source', 'partial_match')
  AND (etherscan_contract_name ILIKE '%greet%' OR etherscan_contract_name ILIKE '%helloworld%')
  AND runtime_bytecode IS NOT NULL
  AND substring(runtime_bytecode FROM 23 FOR 1384) = substring(
    (SELECT runtime_bytecode FROM contracts WHERE address = '0xfea8c4afb88575cd89a2d7149ab366e7328b08eb' LIMIT 1)
    FROM 23 FOR 1384
  );
