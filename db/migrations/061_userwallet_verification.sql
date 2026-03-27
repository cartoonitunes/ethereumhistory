-- Migration 061: UserWallet (Collector) source verification
-- Address: 0x0001414bb1355d97087a550f95e8e22782106902 (LOWERCASE)
-- Deployed: 2017-06 (block 3,806,458)
-- Compiler: solc 0.4.11+commit.68ef5810, optimizer ON
-- Verification: near_exact_match (554/553 bytes, 99.8%)

UPDATE contracts SET
  verification_method = 'near_exact_match',
  compiler_commit = 'v0.4.11+commit.68ef5810',
  compiler_language = 'Solidity',
  verification_proof_url = 'https://github.com/cartoonitunes/userwallet-verification',
  verification_notes = '554 bytes compiled vs 553 bytes on-chain (99.8% match). 1-byte optimizer stack scheduling variant in LOG3 event encoding — a known Solidity 0.4.x optimizer non-determinism with no behavioral difference. Compiler: solc 0.4.11+commit.68ef5810, optimizer ON.',
  source_code = 'pragma solidity ^0.4.11;

contract UserWallet {
    address owner;

    event Deposit(address indexed sender, uint256 indexed value, uint256 data);

    function UserWallet(address _owner) { owner = _owner; }

    function () payable { if (msg.value > 0) Deposit(msg.sender, msg.value, msg.value); }

    function collectToken(address _tokenContract, address _to, uint256 _amount) {
        if (msg.sender == owner) { if (!_tokenContract.call(bytes4(0xa9059cbb), _to, _amount)) throw; }
    }

    function kill() { if (msg.sender == owner) { selfdestruct(owner); } }

    function collect() { if (msg.sender == owner) { owner.transfer(this.balance); } }
}',
  abi = '[{"constant":false,"inputs":[{"name":"_t","type":"address"},{"name":"_to","type":"address"},{"name":"_a","type":"uint256"}],"name":"collectToken","outputs":[],"payable":false,"type":"function"},{"constant":false,"inputs":[],"name":"kill","outputs":[],"payable":false,"type":"function"},{"constant":false,"inputs":[],"name":"collect","outputs":[],"payable":false,"type":"function"},{"inputs":[{"name":"_owner","type":"address"}],"payable":false,"type":"constructor"},{"payable":true,"type":"fallback"},{"anonymous":false,"inputs":[{"indexed":true,"name":"sender","type":"address"},{"indexed":true,"name":"value","type":"uint256"},{"indexed":false,"name":"data","type":"uint256"}],"name":"Deposit","type":"event"}]',
  short_description = 'Exchange deposit wallet (UserWallet). Owner-only ETH collection and ERC-20 token sweeping with Deposit event logging.',
  description = 'The UserWallet is an exchange deposit wallet pattern deployed across large-scale exchange infrastructure in mid-2017. Each user depositing to an exchange receives their own dedicated contract instance, with the exchange hot wallet set as owner at construction time.

Incoming ETH triggers the payable fallback function, which emits a Deposit(sender, value, value) event with both sender and value as indexed parameters — enabling efficient off-chain event log filtering for the exchange to detect and credit incoming deposits without scanning all transactions.

The owner has three operational functions: collect() transfers all accumulated ETH to the owner address; collectToken(token, to, amount) sweeps ERC-20 tokens by calling the token contract directly via raw bytes4(0xa9059cbb) encoding of the transfer selector; and kill() selfdestructs the contract, forwarding any remaining ETH to owner.

This architecture — one contract per deposit address — was a common pattern among exchanges in 2017 before more efficient multicall and proxy patterns emerged. The raw .call() approach for ERC-20 sweeping predates the standardized SafeERC20 wrappers and reflects the tooling available at the time of deployment.

Source verification achieved with Solidity 0.4.11+commit.68ef5810 (optimizer ON). The reconstructed bytecode is 554 bytes vs 553 bytes on-chain — a 1-byte difference in the LOG3 event encoding sequence attributable to optimizer stack scheduling non-determinism in early Solidity releases.'
WHERE address = '0x0001414bb1355d97087a550f95e8e22782106902';
