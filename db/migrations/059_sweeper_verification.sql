-- Migration 059: Token Sweeper source verification
-- Address: 0x0000ae487a4d02e28b8f3c6b91e2c3af6874d6eb (LOWERCASE)
-- Deployed: 2017-02-18 (block 3,203,395)
-- Compiler: solc 0.4.9+commit.364da425, no optimizer
-- Siblings: 14,449 identical bytecode contracts
-- Verification: exact_bytecode_match (738 bytes, bzzr metadata hash differs only)

UPDATE contracts SET
  verification_method = 'exact_bytecode_match',
  compiler_commit = 'v0.4.9+commit.364da425',
  compiler_language = 'Solidity',
  verification_proof_url = 'https://github.com/cartoonitunes/sweeper-verification',
  verification_notes = '738 bytes exact match (stripped bzzr metadata). 14,449 identical siblings. Compiler: solc 0.4.9. Token sweeper: owner-only sweep of any ERC-20 token balance.',
  source_code = 'pragma solidity ^0.4.0;

contract ERC20 {
    function transfer(address _to, uint256 _value) returns (bool success);
    function balanceOf(address _owner) returns (uint256 balance);
}

contract Sweeper {
    address owner;
    address defaultToken;
    
    function Sweeper(address _owner, address _token) {
        owner = _owner;
        defaultToken = _token;
    }
    
    function () {
        sweep(defaultToken);
    }
    
    function sweep(address _token) {
        address token = _token;
        if (!(msg.sender == owner && ERC20(token).transfer(owner, ERC20(token).balanceOf(this)))) throw;
    }
}',
  abi = '[{"constant":false,"inputs":[{"name":"_token","type":"address"}],"name":"sweep","outputs":[],"payable":false,"type":"function"},{"inputs":[{"name":"_owner","type":"address"},{"name":"_token","type":"address"}],"payable":false,"type":"constructor"},{"payable":false,"type":"fallback"}]',
  short_description = 'ERC-20 token sweeper for exchange deposit addresses. 14,449 identical contracts deployed across exchange infrastructure (likely Kraken or Poloniex). Solidity 0.4.9, exact bytecode match.',
  description = 'This contract is an ERC-20 token sweeper designed for exchange deposit addresses. When a customer sends tokens to an exchange deposit address, this contract can be triggered to sweep the tokens to the exchange''s main wallet. The owner calls sweep(token) to drain any ERC-20 balance; the fallback function auto-sweeps the pre-configured defaultToken set at construction time.

With 14,449 identical siblings on-chain, this is among the largest known clusters of identical bytecode in Ethereum history. The scale indicates major exchange infrastructure — each customer deposit address gets its own sweeper contract deployed with the specific token pre-configured. The earliest deployment is block 3,203,395 (February 18, 2017), placing this squarely in the DeFi pre-history era when exchanges were building out ERC-20 deposit infrastructure from scratch.

The exact bytecode match was achieved with Solidity 0.4.9+commit.364da425 without optimizer, verified against the on-chain runtime bytecode (738 bytes). Only the bzzr Swarm compilation metadata hash (last 32 bytes) differs between siblings, which is expected as it is derived from source file content including comments and whitespace.'
WHERE address = '0x0000ae487a4d02e28b8f3c6b91e2c3af6874d6eb';
