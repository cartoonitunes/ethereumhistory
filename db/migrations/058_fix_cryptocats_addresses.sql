-- Migration 058: Fix duplicate CryptoCats rows (case mismatch)
-- The page loads lowercase addresses but migrations inserted mixed-case

-- T1: Copy data from mixed-case to lowercase, then delete mixed-case
UPDATE contracts SET
  etherscan_contract_name = COALESCE(
    (SELECT etherscan_contract_name FROM contracts WHERE address = '0xD23AdE68C693264Aa9e8f8303F912A3E54718456'),
    etherscan_contract_name
  ),
  verification_method = (SELECT verification_method FROM contracts WHERE address = '0xD23AdE68C693264Aa9e8f8303F912A3E54718456'),
  verification_proof_url = (SELECT verification_proof_url FROM contracts WHERE address = '0xD23AdE68C693264Aa9e8f8303F912A3E54718456'),
  verification_notes = (SELECT verification_notes FROM contracts WHERE address = '0xD23AdE68C693264Aa9e8f8303F912A3E54718456'),
  compiler_commit = (SELECT compiler_commit FROM contracts WHERE address = '0xD23AdE68C693264Aa9e8f8303F912A3E54718456'),
  compiler_language = (SELECT compiler_language FROM contracts WHERE address = '0xD23AdE68C693264Aa9e8f8303F912A3E54718456'),
  source_code = (SELECT source_code FROM contracts WHERE address = '0xD23AdE68C693264Aa9e8f8303F912A3E54718456'),
  abi = (SELECT abi FROM contracts WHERE address = '0xD23AdE68C693264Aa9e8f8303F912A3E54718456'),
  description = (SELECT description FROM contracts WHERE address = '0xD23AdE68C693264Aa9e8f8303F912A3E54718456'),
  historical_context = (SELECT historical_context FROM contracts WHERE address = '0xD23AdE68C693264Aa9e8f8303F912A3E54718456'),
  short_description = COALESCE(
    (SELECT short_description FROM contracts WHERE address = '0xD23AdE68C693264Aa9e8f8303F912A3E54718456'),
    short_description
  )
WHERE address = '0xd23ade68c693264aa9e8f8303f912a3e54718456';

DELETE FROM contracts WHERE address = '0xD23AdE68C693264Aa9e8f8303F912A3E54718456';

-- T2: Same fix
UPDATE contracts SET
  etherscan_contract_name = COALESCE(
    (SELECT etherscan_contract_name FROM contracts WHERE address = '0x78eea094e1d30141ccade64f8d29a7bfcc921f9e' AND verification_method IS NOT NULL),
    etherscan_contract_name
  ),
  verification_method = COALESCE(
    (SELECT verification_method FROM contracts c2 WHERE c2.address = contracts.address AND c2.verification_method IS NOT NULL LIMIT 1),
    verification_method
  )
WHERE address = '0x78eea094e1d30141ccade64f8d29a7bfcc921f9e' AND verification_method IS NULL;

-- T2 might only have one row (lowercase already). Check and update:
UPDATE contracts SET
  verification_method = 'near_exact_match',
  verification_proof_url = 'https://github.com/cartoonitunes/cryptocats-t2-verification',
  verification_notes = '8137/8451 bytes (96.3%). Solidity 0.4.18 without optimizer. 314-byte gap = dead constructor code.',
  compiler_commit = 'v0.4.18+commit.9cf6e910',
  compiler_language = 'Solidity'
WHERE address = '0x78eea094e1d30141ccade64f8d29a7bfcc921f9e' AND verification_method IS NULL;
