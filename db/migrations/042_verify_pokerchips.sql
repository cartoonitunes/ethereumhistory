-- Verify Poker Chips (POKER) contract
UPDATE contracts SET
  verification_method = 'exact_bytecode_match',
  verification_proof_url = 'https://github.com/cartoonitunes/pokerchips-verification',
  verification_notes = 'Runtime + creation bytecode match. Native C++ solc v0.2.1 (webthree-umbrella v1.1.2), optimizer ON. Token: Poker Chips (POKER), 0 decimals, 10000 supply. Bug: transferFrom emits Transfer(msg.sender) instead of Transfer(_from).',
  compiler_commit = 'v0.2.1 (native C++, webthree-umbrella v1.1.2)',
  compiler_language = 'solidity',
  compiler_repo = 'https://github.com/ethereum/webthree-umbrella',
  contract_type = 'token'
WHERE address = '0x002a13b63cf696c58c95eacba48a62c812164639';
