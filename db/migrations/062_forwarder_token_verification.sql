-- Migration 062: Token Forwarder source verification
-- Address: 0x0001baa5df07a6ccbf56f65d00b58fbcabc8eb5a (LOWERCASE)
-- Deployed: October 2016 (earliest block ~2,914,655)
-- Compiler: Solidity 0.4.2+commit.af6afb04, optimizer ON
-- Siblings: 14,789 identical bytecode contracts
-- Verification: near_exact_match (242/242 bytes — optimizer block ordering differs at byte 34)

UPDATE contracts SET
  verification_method = 'near_exact_match',
  compiler_commit = 'v0.4.2+commit.af6afb04',
  compiler_language = 'Solidity',
  verification_proof_url = 'https://github.com/cartoonitunes/forwarder-token-verification',
  verification_notes = '242/242 bytes same size. Optimizer block ordering differs at byte 34 (return JUMPDEST placement). Single function: transferToken(address,address,uint256). Pre-0.4.7 = no bzzr metadata.',
  source_code = 'pragma solidity ^0.4.0;

contract ERC20 {
    function transfer(address to, uint256 value) returns (bool);
}

contract Forwarder {
    address owner;

    event TokenTransfer(address indexed token, address indexed to, uint256 amount);

    function Forwarder(address _owner) {
        owner = _owner;
    }

    function transferToken(address token, address to, uint256 amount) {
        if (msg.sender != owner) throw;
        ERC20(token).transfer(to, amount);
        TokenTransfer(token, to, amount);
    }
}',
  abi = '[{"constant":false,"inputs":[{"name":"token","type":"address"},{"name":"to","type":"address"},{"name":"amount","type":"uint256"}],"name":"transferToken","outputs":[],"payable":false,"type":"function"},{"inputs":[{"name":"_owner","type":"address"}],"type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"name":"token","type":"address"},{"indexed":true,"name":"to","type":"address"},{"indexed":false,"name":"amount","type":"uint256"}],"name":"TokenTransfer","type":"event"}]',
  short_description = 'ERC-20 token forwarder for exchange deposit addresses. Single function: owner-only transferToken with typed ERC20 call and TokenTransfer event.',
  description = 'The Token Forwarder is an ERC-20 token sweeping contract deployed as part of large-scale exchange deposit address infrastructure in October 2016. With 14,789 identical siblings on-chain, this represents one of the largest bytecode clusters in early Ethereum history.

Each customer deposit address at the exchange received its own dedicated Forwarder contract, deployed with the exchange hot wallet address set as owner at construction time. When a customer deposits ERC-20 tokens to their assigned address, the exchange calls transferToken(token, to, amount) to move the tokens to the main wallet.

The contract uses a typed ERC20 interface call — ERC20(token).transfer(to, amount) — rather than the raw .call() encoding seen in later sweeper patterns. This reflects the cleaner contract-to-contract calling style available in Solidity 0.4.x. The TokenTransfer event (topic0: 0xd0ed88a3...) with indexed token and to parameters enables efficient off-chain event log filtering.

The contract has no fallback function and is non-payable, making it purpose-built exclusively for ERC-20 forwarding with no ETH handling capability.

Source verification achieved with Solidity 0.4.2+commit.af6afb04 (optimizer ON). The compiled runtime is 242 bytes — same size as on-chain — with a near-exact match. The optimizer produces a minor block ordering difference at byte 34 (return JUMPDEST placement), a known variant in early Solidity optimizer behavior. Pre-0.4.7 compiler means no bzzr Swarm metadata is appended to the bytecode.'
WHERE address = '0x0001baa5df07a6ccbf56f65d00b58fbcabc8eb5a';
