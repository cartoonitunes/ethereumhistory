-- Migration: 024_fix_repeated_descriptions.sql
-- Fix duplicated paragraph blocks in contract description fields
-- Generated: 2026-03-07T00:47:19.989Z
-- Affects: 31 contracts

BEGIN;

-- 0x0bf43e7408959fe8030d3729760f179403a20147 (description): 2111 -> 563 chars
UPDATE contracts SET description = $desc$The token contract defines a buy and sell mechanism denominated in ether, with a buy price of 0.01 ETH and a sell price of 0.0098 ETH. Tokens used for upvoting are transferable and may be sold back through the token contract according to its pricing logic.

The Hash DB Token, also referred to as the Karma token, is an ERC-20 smart contract deployed on August 7, 2016. It is used by the a decentralized Reddit-like contract, at 0x5793DC5Af6F94F82717C61e959Ec1e8Be89438c2, to gate upvoting, with each upvote requiring the transfer of one token to the post author.$desc$ WHERE address = '0x0bf43e7408959fe8030d3729760f179403a20147';

-- 0xaf30d2a7e90d7dc361c8c4585e9bb7d2f6f15bc7 (description): 3116 -> 1196 chars
UPDATE contracts SET description = $desc$FirstBlood's 1ST token contract was deployed during the 2016 ICO wave on Ethereum and used as the core token for the project's decentralized esports product vision. Project materials describe 1ST as the token for platform participation, with smart-contract settlement and on-chain token distribution after the presale.

FirstBlood was a decentralized competitive gaming and esports platform that allowed players to challenge each other and earn rewards in cryptocurrency. The project launched its token crowdsale on September 25, 2016, deploying the FirstBloodToken contract with the symbol 1ST. The sale attracted overwhelming demand and completed in minutes, raising approximately 5,500 ETH.

The platform aimed to provide trustless match verification using oracles and witness nodes to validate game outcomes on-chain, removing the need for a centralized arbiter. Over its operational lifetime (2016–2025), FirstBlood hosted hundreds of thousands of tournament events for competitive gamers worldwide.

FirstBlood was later rebranded to Dawn Protocol. The platform announced discontinuation of services in March 2025, marking the end of one of the earliest blockchain-powered esports ventures.$desc$ WHERE address = '0xaf30d2a7e90d7dc361c8c4585e9bb7d2f6f15bc7';

-- 0x5793dc5af6f94f82717c61e959ec1e8be89438c2 (description): 3148 -> 772 chars
UPDATE contracts SET description = $desc$The contract implements a simple decentralized posting system in which content publication is permissionless, while voting requires ownership of a designated ERC-20 token called Hash DB Token (Karma) 0x0bF43e7408959fe8030d3729760f179403A20147. When a user upvotes a post, a token is transferred directly from the voter to the publisher, linking voting activity to an on-chain economic transfer.

This contract, nicknamed "Blockchain Reddit," is an Ethereum smart contract deployed on August 7, 2016 that allows any address to publish a post and associated body content on-chain. Upvoting is restricted to holders of a specific ERC-20 token called Hash DB Token (Karma) 0x0bF43e7408959fe8030d3729760f179403A20147, with each upvote transferring one token to the post author.$desc$ WHERE address = '0x5793dc5af6f94f82717c61e959ec1e8be89438c2';

-- 0xb83cab8babc0b9298df5d5283c30bf0d89d23b1e (description): 5279 -> 977 chars
UPDATE contracts SET description = $desc$Anyone can claim and send Hug tokens. When a user gives their first hug, they may include a name or message which is stored and indexed on-chain. Each address is allowed exactly one logged message; subsequent hugs still work, but the contract records only the hug itself.

The contract tracks total huggers and stores structured data about hugs, including the recipient address, an associated name string, and the timestamp of the hug. Hug tokens can be transferred between addresses, and the primary interaction pattern is the "giveHugTo" function, which combines token transfer with message recording.

The token has no fixed supply limit, reinforcing its purpose as a symbolic gesture rather than a scarce asset.

HugCoin was deployed on August 23, 2016 and implements an infinite-supply token designed to represent “hugs.” The contract exposes a human-friendly interface, including a name (HugCoin), a symbol (🤗), and functions for giving hugs directly to other addresses.$desc$ WHERE address = '0xb83cab8babc0b9298df5d5283c30bf0d89d23b1e';

-- 0x89205a3a3b2a69de6dbf7f01ed13b2108b2c43e7 (description): 2055 -> 543 chars
UPDATE contracts SET description = $desc$Created as a donation reward tied to the Ethereum Foundation Tip Jar (Feb 2016). The token became a memorable early-era artifact of Ethereum culture and an ingredient in later on-chain experiments around token transformation and DAO-style governance.

The Ethereum Foundation used the Tip Jar as a fundraising and community initiative, rewarding each 2.014 ETH donation with a Unicorn token. The Unicorns later became the input token used in Alex Van de Sande’s “Unicorn Meat” experiment, where holders could “grind” Unicorns into a new token.$desc$ WHERE address = '0x89205a3a3b2a69de6dbf7f01ed13b2108b2c43e7';

-- 0xe468d26721b703d224d05563cb64746a7a40e1f4 (description): 4113 -> 1017 chars
UPDATE contracts SET description = $desc$Etheria introduced a model in which discrete pieces of digital land were represented as unique smart contract entries rather than interchangeable tokens. Ownership could be transferred between addresses, and the state of the world was derived entirely from on-chain data. At a time when most Ethereum contracts focused on fungible balances, Etheria demonstrated that uniqueness, scarcity, and spatial relationships could be encoded directly into smart contracts without reliance on off-chain metadata or standards.

Etheria is a blockchain-based virtual world deployed on Ethereum in late 2015 and early 2016, consisting of four smart contracts that together define a grid of ownable hexagonal tiles. The first of these contracts established permanent, transferable ownership of individual tiles directly on chain, making Etheria the earliest known example of non-fungible digital assets implemented on Ethereum. Each tile was uniquely identified, independently owned, and recorded entirely within the Ethereum state.$desc$ WHERE address = '0xe468d26721b703d224d05563cb64746a7a40e1f4';

-- 0x5564886ca2c518d1964e5fcea4f423b41db9f561 (description): 5466 -> 1230 chars
UPDATE contracts SET description = $desc$The contract implements the standardized registry interface defined in Ethereum’s official documentation prior to mainnet launch. It exposes functions to reserve names, transfer ownership, associate primary addresses, attach content identifiers, delegate to sub-registrars, and relinquish ownership.

Names are claimed on a first-come, first-served basis via a reserve function. Ownership and metadata are stored in mappings keyed by the name hash, while reverse lookup is supported through address-to-name mappings. Although the code contains extensive commented plans for auctions, renewals, and bidding mechanisms, the deployed logic focuses on the core functionality of name ownership and resolution.

The Linagee Name Registrar, deployed on August 8, 2015, is the first smart contract to implement an on-chain naming system on Ethereum. It allows users to reserve unique bytes32 names, assign ownership, associate addresses and content hashes, and perform forward and reverse name resolution directly on-chain.

The deployed contract implements a global registrar model in which names are scarce, transferable, and independently owned, establishing naming as a native blockchain primitive rather than an off-chain convention.$desc$ WHERE address = '0x5564886ca2c518d1964e5fcea4f423b41db9f561';

-- 0x55b9a11c2e8351b4ffc7b11561148bfac9977855 (description): 1532 -> 632 chars
UPDATE contracts SET description = $desc$Documented as the early DGX contract endpoint in Digix GitHub docs, later migration instructions, and contemporaneous community support discussions.

This contract address appears in Digix project materials as the DGX 1.0 token contract used in early wallet/tooling flows. The DigixGlobal gold-tokens-interface repository README includes initialization code with this exact address, and Digix migration guidance later instructed users to add this address as a custom token (symbol shown as DGX 1.0, 9 decimals). Community posts in 2016 also referenced this address as the token contract when discussing wallet support and transfers.$desc$ WHERE address = '0x55b9a11c2e8351b4ffc7b11561148bfac9977855';

-- 0x8374f5cc22eda52e960d9558fb48dd4b7946609a (description): 5074 -> 1738 chars
UPDATE contracts SET description = $desc$The FirstCoin contract introduced a basic but important pattern: a ledger of balances associated with addresses and the ability for those balances to be transferred between participants. The implementation closely resembles the early token interface examples published in Ethereum documentation at the time, suggesting it was derived from or directly inspired by the standard token APIs shared by the Ethereum Foundation. Although minimal and unbranded, the contract established the foundational mechanics that later became formalized in token standards.

FirstCoin is one of the earliest token contracts deployed on Ethereum mainnet, launched at block 49,853 on August 7, 2015 — just 8 days after the Ethereum genesis block. The contract was written by creator address 0x3d0768da, who deployed it alongside several other experimental contracts in Ethereum's opening days.

The source code is a near-exact copy of the "Coin contract" example from the official Ethereum Frontier Guide, the primary documentation for Ethereum at launch. The original example contract was named `token`; this deployment renames it to `FirstCoin` and hardcodes the supply at 1,000,000 rather than accepting it as a constructor parameter.

The contract implements a simple token: a mapping from addresses to balances, a `sendCoin` function for transfers, and a `CoinTransfer` event. It predates ERC-20 and has no `approve`, `allowance`, or `transferFrom` functions. There is no supply cap enforcement or overflow protection — both limitations typical of Solidity contracts written before best practices emerged.

A second deployment of the same contract by the same creator (0x3b4446acd9547d0183811f0e7c31b63706295f52) followed 11 blocks later at block 49,864.$desc$ WHERE address = '0x8374f5cc22eda52e960d9558fb48dd4b7946609a';

-- 0x9a049f5d18c239efaa258af9f3e7002949a977a0 (description): 3915 -> 1101 chars
UPDATE contracts SET description = $desc$This contract represents the genesis of Ethereum’s smart contract layer. While later contracts would introduce callable functions, tokens, and complex state, this deployment proved that Ethereum could host executable programs on-chain.

Its importance lies not in functionality, but in precedence: it was the first confirmed instance of a smart contract being created on Ethereum mainnet, establishing the foundation for all contract-based applications that followed.

On August 7, 2015, at block 46,402, Anthony Eufemio (known on Reddit as aedigix, Chief Technology Officer at Digix) submitted a contract creation transaction intended to deploy a minimal Solidity contract that stored an owner address. The deployment was publicly described at the time as an effort to create the first smart contract on Ethereum.

Due to extremely low gas limits at Ethereum’s launch, the transaction ran out of gas during contract creation, and no runtime bytecode was ultimately deployed. As a result, the address contains no contract code and the deployment did not result in a persistent smart contract on-chain.$desc$ WHERE address = '0x9a049f5d18c239efaa258af9f3e7002949a977a0';

-- 0x3eddc7ebc7db94f54b72d8ed1f42ce6a527305bb (description): 4515 -> 1077 chars
UPDATE contracts SET description = $desc$The AyeAyeCoin contract combined several ideas that were uncommon at the time. It implemented a named fungible token before formal token standards existed, attached a recognizable theme to that token, and distributed it using a public faucet rather than preallocation or manual transfers. Each faucet interaction returned a short message embedded in the contract, reinforcing the coin’s identity and human-readable character. Because the contract predates ERC-20, it does not conform to later interface expectations and requires a wrapper to interact with modern tooling.

AyeAyeCoin was deployed on August 20, 2015, only weeks after Ethereum mainnet launched, by an early developer known as Linagee. The token was explicitly named and themed after the aye-aye, a species of lemur native to Madagascar, making it the first known Ethereum token to adopt a non-abstract, animal-based identity. The contract distributed a fixed supply of six million whole coins through a trustless on-chain faucet, allowing anyone to claim one coin per transaction until the supply was exhausted.$desc$ WHERE address = '0x3eddc7ebc7db94f54b72d8ed1f42ce6a527305bb';

-- 0xa3483b08c8a0f33eb07aff3a66fbcaf5c9018cdc (description): 4410 -> 1530 chars
UPDATE contracts SET description = $desc$Linagee’s contract is effectively Ethereum’s first public “Hello World” that users could call and observe behavior from. Its purpose was pedagogical rather than financial, showing that contracts were not just stored code but executable programs that anyone could interact with.

The accompanying Reddit post served as an early tutorial, walking users through ABI usage, contract addresses, and the mechanics of calling contracts long before web-based tooling or wallets existed.

On August 7, 2015, a developer known as Linagee published a simple Ethereum contract that exposed a callable function returning a string: “Hello Ethereum”. While not the earliest contract deployed on Ethereum, it was the first publicly shared example of a contract that users could meaningfully *call* and receive a response from.

Earlier that same day, another developer, *aedigix*, deployed what is widely considered the first Ethereum contract by transaction order. That contract stored an owner address but intentionally did nothing else, a design choice driven by extremely low gas limits at the time. As aedigix later explained, it was “the cheapest contract that could fit with a low gasLimit.”

Linagee’s contract followed shortly after gas limits increased enough to support basic function calls, marking the transition from inert on-chain code to interactive smart contracts.

The contract was deployed at address `0xa3483b08c8a0f33eb07aff3a66fbcaf5c9018cdc` in block 49,428 and could be invoked directly via the geth console using an ABI.$desc$ WHERE address = '0xa3483b08c8a0f33eb07aff3a66fbcaf5c9018cdc';

-- 0xde0b295669a9fd93d5f28d9ec85e40f4cb697bae (description): 6051 -> 3063 chars
UPDATE contracts SET description = $desc$This contract is the first Ethereum Foundation treasury wallet and one of the earliest examples of institutional fund management implemented directly on Ethereum. Its design reflects early best practices around shared control and spending limits, preceding later standardization of multi-signature wallets.

The address became a long-standing reference point for the community, shaping early conversations about governance, accountability, and the role of foundations in decentralized ecosystems.

Deployed at block 54,092 on August 8, 2015, this is the Ethereum Foundation's first on-chain treasury. The contract was created by address 0x5abfec25f74cd88437631a7731906932776356f9 and configured as a 4-of-7 multisig with a 1,000 ETH daily spending limit.

## Source Code and Authorship

The source code was written by Gavin Wood and first committed to the [ethereum/dapp-bin](https://github.com/ethereum/dapp-bin/blob/master/wallet/wallet.sol) repository on January 23, 2015, six months before Ethereum launched. The contract is composed of four inherited contracts: `multiowned` (multi-signature owner management), `daylimit` (daily spending caps), `multisig` (interface), and `Wallet` (the main contract combining all three).

The contract was never verified on Etherscan and carries no on-chain name. Its bytecode exposes 19 function selectors including `execute`, `confirm`, `addOwner`, `removeOwner`, `changeOwner`, `changeRequirement`, `setDailyLimit`, and notably, `kill` - a `selfdestruct` function protected by the multi-signature requirement.

## The Parity Connection

This contract is the direct ancestor of the Parity multisig wallet. Gavin Wood's wallet.sol from dapp-bin evolved into the Parity wallet contracts that suffered two catastrophic incidents in 2017: the July hack ($30M stolen) and the November freeze ($150M locked permanently when the library contract was selfdestructed). The EF's original deployment survived both events because it was deployed as a standalone contract, not as a proxy pointing to a shared library.

## 60 Selfdestruct Attempts

Over its 10+ year history, the `kill(address)` function has been called 60 times by various addresses attempting to destroy the contract and claim its ETH. Every attempt failed because `kill` requires the `onlymanyowners` modifier - 4 of 7 authorized signers must approve the operation. These failed attempts are visible on-chain as transactions to the contract with method ID `0xcbf0b0c0`.

## Treasury Operations

The wallet has processed 3,171 transactions from 1,640 unique senders. It has been continuously active from 2015 through 2026, with the most recent transaction on March 2, 2026. Large outflows follow a pattern of 1,000 ETH daily transfers (matching the daily limit), primarily to two EOA addresses. A single 160,000 ETH transfer occurred on October 21, 2025.

The contract currently holds approximately 10,774 ETH. Owner rotation has occurred over the years - of the 7 addresses that transacted in the first week after deployment, only one remains an active owner today.$desc$ WHERE address = '0xde0b295669a9fd93d5f28d9ec85e40f4cb697bae';

-- 0xf4eced2f682ce333f96f2d8966c613ded8fc95dd (description): 3969 -> 981 chars
UPDATE contracts SET description = $desc$Shortly after Ethereum’s 2015 launch, the Mist team deployed MistCoin as a prototype token to validate a common interface and behavior for transferable tokens. The contract was deployed Nov 3, 2015, and within weeks the ERC‑20 standard was proposed (Nov 19, 2015), turning the prototype into a historical reference point for token standardization on Ethereum. A wrapper contract was later deployed in July 2022 to enable modern ERC‑20 trading behavior while preserving the original 2015 contract.

Deployed on Nov 3, 2015 by Ethereum developers Fabian Vogelsteller and Alex Van de Sande, MistCoin was created to test standardized token creation in the early days of Ethereum. It has a fixed supply of 1,000,000 and is closely associated with the work that led to the ERC‑20 proposal 16 days later. In 2022, a [wrapper contract](https://www.ethereumhistory.com/contract/0x7fd4d7737597e7b4ee22acbf8d94362343ae0a79) (WMC) was introduced to add modern ERC‑20 functionality for trading.$desc$ WHERE address = '0xf4eced2f682ce333f96f2d8966c613ded8fc95dd';

-- 0x1130547436810db920fa73681c946fea15e9b758 (description): 10008 -> 1428 chars
UPDATE contracts SET description = $desc$On November 3, 2015, Fabian Vogelsteller and Alex van de Sande released the Ethereum Wallet with built-in contract deployment and token support. This was a significant innovation, as it marked the beginning of what would later become the ERC-20 token standard. At the time, the Ethereum Wallet team was actively working on defining a standardized token framework for Ethereum. With the Beta 3 release of the Ethereum Wallet, the first practical framework was made available and opened up for real-world testing.

This release sparked a wave of tokens created by early Ethereum enthusiasts. One of the earliest examples was a token named “bitcoin”, a simple token designed to replicate Bitcoin’s original fixed supply of 21 000 000 units. It was created by a user known as spiderwars after a comment appeared in the Ethereum Wallet release thread on Reddit asking: “So who is going to start the token ‘bitcoin’ with 21M available?”

Following its creation, spiderwars distributed the “bitcoin” tokens freely to other Reddit users, including Fabian Vogelsteller and various members of the early Ethereum community.

One user reportedly offered 10 Ether in exchange for 1 million “bitcoin” tokens, making this one of the earliest documented over-the-counter token trades on Ethereum.

spiderwars initially made an error by creating a token with a total supply of 0.21 bitcoin before correcting it to the intended 21 000 000 supply.$desc$ WHERE address = '0x1130547436810db920fa73681c946fea15e9b758';

-- 0x58641cded077270a319f509e0266e96837cc79f4 (description): 1490 -> 362 chars
UPDATE contracts SET description = $desc$The contract serves as a simple registry, using Ethereum’s state to persistently record marital relationships. It demonstrates the use of smart contracts for non-financial recordkeeping.

The Ethereum Marriage registry is an Ethereum smart contract deployed on January 2, 2016 by Hudson Jameson that allows marriages to be recorded on-chain as immutable entries.$desc$ WHERE address = '0x58641cded077270a319f509e0266e96837cc79f4';

-- 0x6516298e1c94769432ef6d5f450579094e8c21fa (description): 4265 -> 929 chars
UPDATE contracts SET description = $desc$The deployed bytecode includes function dispatch logic, conditional branching, memory operations, and a callable method that returns a static string value. The contract responds to a specific function selector and returns the ASCII string `"eth"`, encoded and assembled manually at the bytecode level.

This deployment demonstrates an early understanding of the Ethereum Virtual Machine’s call semantics, ABI-style function selection, and memory layout, at a time when high-level tooling and standardized interfaces were not yet available or widely used.

This contract was deployed on August 7, 2015 at block 48,643 and is the first known Ethereum contract whose deployed runtime bytecode contains executable logic beyond minimal storage or initialization patterns. Unlike earlier deployments that either contained no runtime code or only trivial state initialization, this contract includes callable functions and control flow.$desc$ WHERE address = '0x6516298e1c94769432ef6d5f450579094e8c21fa';

-- 0xfea8c4afb88575cd89a2d7149ab366e7328b08eb (description): 5344 -> 1000 chars
UPDATE contracts SET description = $desc$The deployed runtime code includes function dispatch logic, memory allocation, and return data construction sufficient to return the UTF-8 string `"Hello World!"` to callers. The string is embedded directly in the contract’s bytecode and assembled in memory at call time.

The contract also includes owner-gated control flow that allows the deployer to trigger contract self-destruction under specific conditions. Aside from this lifecycle control, the contract’s primary observable behavior is responding to calls with a fixed string value.

This deployment reuses the same executable bytecode seen in nearby blocks, indicating deliberate redeployment of a known-working runtime artifact rather than a one-off experiment.

This contract was deployed shortly after the first executable runtime contract by the same deployer in August 2015. It contains callable logic that responds to function selectors and returns a static UTF-8 string, demonstrating a more expressive example of on-chain execution.$desc$ WHERE address = '0xfea8c4afb88575cd89a2d7149ab366e7328b08eb';

-- 0xdbf03b407c01e7cd3cbea99509d93f8dddc8c6fb (description): 4183 -> 883 chars
UPDATE contracts SET description = $desc$The DAO implemented a rules-based governance system where proposals required a minimum voting period, quorum, and majority to be executed. It launched with a fixed set of voting members drawn from the Ethereum and Dogecoin communities, including core developers and community coordinators. Funds were pooled to support development milestones, and proposals, votes, and executions were recorded on-chain. The DAO successfully executed test proposals and later distributed a 372 ETH bounty in February 2018 for work toward a Dogecoin–Ethereum bridge.

The Doge–Ethereum Bounty DAO is an Ethereum smart contract deployed on December 28, 2015 by Alex Van de Sande to collectively manage funds and governance for development work related to a Dogecoin–Ethereum bridge. The contract was designed to accept ether and tokens, manage membership, and execute proposals through on-chain voting.$desc$ WHERE address = '0xdbf03b407c01e7cd3cbea99509d93f8dddc8c6fb';

-- 0x6e38a457c722c6011b2dfa06d49240e797844d66 (description): 4931 -> 1943 chars
UPDATE contracts SET description = $desc$Terra Nullius is the first inscription contract on Ethereum.

It establishes a direct model for blockchain-based permanence, where authored messages are written irreversibly and retained as part of Ethereum’s history. The contract has no supply cap, no permissions, and no economic mechanism beyond gas costs.

Despite being deployed in Ethereum’s earliest days, Terra Nullius has remained active across multiple eras, with renewed usage during later periods of interest in on-chain art and NFTs.

TerraNullius is a claims-based smart contract deployed on August 7, 2015 — just 15 days after Ethereum mainnet launched on July 30. The name references the legal concept of "terra nullius" (nobody's land), framing the early Ethereum blockchain as unclaimed territory.

The contract provides a simple but elegant interface: anyone can call the `claim()` function with a string message. The contract records the caller's address, their message, and the block number at which the claim was made. Claims are stored in an append-only array and can be read by anyone via `claims(index)` and `number_of_claims()`.

The creator, Reddit user Semiel, announced it on r/ethereum with the title "Introducing Terra Nullius, the first* interactive Ethereum contract" (the asterisk acknowledging uncertainty about the claim). The post explained that the gas limit had "finally hit a point where meaningful contracts can be created" — a reference to the Frontier-era gas limit increases in the first week of Ethereum. Semiel provided a Pastebin script that could be loaded into the Geth console for interaction.

Written in Solidity 0.1.1 — one of the earliest compiler versions — the contract is only 15 lines of source code. Its entire purpose is recording immutable human messages on Ethereum, functioning as one of the first on-chain message boards. Over 805 transactions have been recorded on the contract, with claims still being made as recently as 2026.$desc$ WHERE address = '0x6e38a457c722c6011b2dfa06d49240e797844d66';

-- 0xfb6916095ca1df60bb79ce92ce3ea74c37c5d359 (description): 2785 -> 703 chars
UPDATE contracts SET description = $desc$The Tip Jar functioned as a simple but deliberate demonstration of Ethereum’s capabilities. It replaced traditional donation mechanisms with on-chain logic, making contributions publicly auditable and programmatically handled. The associated Unicorn token was intended as a symbolic acknowledgment of participation rather than a financial asset.

The Foundation Tip Jar was a smart contract deployed in 2015 by Alex Van de Sande while working at the Ethereum Foundation. It allowed anyone to send Ether directly to the Foundation through a transparent, permissionless contract. In return, contributors received a small experimental token known as the Unicorn token, issued automatically by the contract.$desc$ WHERE address = '0xfb6916095ca1df60bb79ce92ce3ea74c37c5d359';

-- 0xbb9bc244d798123fde783fcc1c72d3bb8c189413 (description): 5305 -> 2071 chars
UPDATE contracts SET description = $desc$The DAO enabled anyone to become a stakeholder by contributing Ether during its creation phase. Token holders could submit funding proposals, vote on them, and, if approved, release Ether from the contract to proposal recipients. The system also included a mechanism allowing participants to exit the DAO by splitting into a new instance and reclaiming a proportional share of funds. At the time, it represented the most ambitious attempt to encode organizational governance and capital allocation directly into Ethereum smart contracts.

The DAO was conceived and coded principally by Christoph Jentzsch of Slock.it, a German startup building decentralized smart locks. The contract implemented a decentralized venture capital fund: token holders voted on project proposals, and approved proposals received ETH funding directly from the contract. It launched April 30, 2016 with a 28-day token sale that attracted over 11,000 participants, raising approximately 11.5 million ETH (over $150 million at the time). At its peak, The DAO held nearly 14% of all Ether tokens in circulation.

On June 17, 2016, an attacker exploited a recursive call vulnerability (reentrancy bug) in the splitDAO function, draining approximately 3.6 million ETH (~$50 million) into a child DAO. The Ethereum Foundation published an emergency advisory the same day. Because the child DAO had a 27-day creation period, the attacker could not immediately withdraw the funds, giving the community time to respond.

After weeks of heated debate, the Ethereum community executed a hard fork at block 1,920,000 on July 20, 2016, creating an irregular state change that transferred the drained funds into a recovery contract. This fork successfully returned ETH to DAO token holders but was controversial — those who opposed it continued operating the original chain, which became Ethereum Classic (ETC).

In July 2017, the U.S. SEC issued an investigative report concluding that DAO tokens were securities under federal law, marking the first major regulatory action related to Ethereum-based tokens.$desc$ WHERE address = '0xbb9bc244d798123fde783fcc1c72d3bb8c189413';

-- 0xe5544a2a5fa9b175da60d8eec67add5582bb31b0 (description): 7060 -> 1738 chars
UPDATE contracts SET description = $desc$HashToken embeds an increasing-difficulty hash puzzle directly into the token contract itself. Unlike later “mineable” tokens that rely on off-chain work or oracle-style verification, HashToken enforces both difficulty and supply constraints entirely on-chain.

At launch, minting was trivial and could be done interactively through the Mist wallet by submitting random values. As difficulty increased, participants began using scripts and eventually GPUs to search for valid hashes, turning the contract into a genuine on-chain mining target.

**Quotes from the Deployer** (Reddit, 2016)
> “I created a new type of Hash currency based on EIP2…  
> New tokens get created when someone is able to solve a puzzle. The puzzle difficulty increases after every puzzle is solved…  
> Since difficulty increases after every token is minted, this creates a limited supply (kind of like gold).”

HashToken (symbol: HTK) is an experimental mineable token deployed in Ethereum’s early years that introduces a proof-of-work–style minting system directly inside a smart contract. New tokens are created only when a caller solves a cryptographic puzzle enforced on-chain.

Minting requires finding a value such that: `sha3(value, prev_hash) < max_value`

Each successful mint:
- Rewards the caller with `10^16` HTK
- Updates the stored hash used for the next puzzle
- Increases difficulty by reducing `max_value` by 1 percent

As minting continues, the probability of finding a valid solution decreases, producing a diminishing issuance curve analogous to physical mining.

The contract is derived from the early ConsenSys `StandardToken` implementation and follows pre-ERC-20 conventions, with balances, allowances, and transfers implemented manually.$desc$ WHERE address = '0xe5544a2a5fa9b175da60d8eec67add5582bb31b0';

-- 0xc7e9ddd5358e08417b1c88ed6f1a73149beeaa32 (description): 3947 -> 989 chars
UPDATE contracts SET description = $desc$The Unicorn Meat Grinder Association DAO was an early decentralized autonomous organization designed and deployed in 2016 by Alex Van de Sande, then a leading figure at the Ethereum Foundation. The DAO governed a set of smart contracts that allowed holders of the original Unicorn token, an experimental token distributed by the Ethereum Foundation, to swap (“grind”) those tokens for a new asset known as Unicorn Meat. The contract was announced by Ethereum as an April Fool's joke in 2016.

The Unicorn Meat Grinder Association DAO was a decentralized autonomous organization deployed on the Ethereum blockchain in March 2016. It governed a set of smart contracts that allowed holders of the original Unicorn token — a small gratitude token created by the Ethereum Foundation — to exchange (“grind”) those unicorns for a new token called Unicorn Meat. Governance decisions within the DAO were made on-chain using a voting mechanism where token holders could submit and vote on proposals.$desc$ WHERE address = '0xc7e9ddd5358e08417b1c88ed6f1a73149beeaa32';

-- 0xb4abc1bfc403a7b82c777420c81269858a4b8aa4 (description): 3871 -> 1321 chars
UPDATE contracts SET description = $desc$The contract follows the structure of the original coin.sol reference implementation, which predates ERC-20 standardization and does not include name() or symbol() functions. At deployment, constructor input data encoded the ASCII string “GavCoin,” embedding the name directly into the bytecode. The mine() function remains publicly callable, allowing new units to be created based on elapsed time since the previous mining call, with rewards split between the caller and the current Ethereum block producer.

GavCoin is an Ethereum smart contract deployed on April 26, 2016 whose logic closely matches the coin.sol prototype published by Gavin Wood in February 2015. The contract implements a custom balances mapping, pre-ERC-20 transfer and minting functions, and a publicly callable, payable mine() function.

The contract follows the structure of the original coin.sol reference implementation, which predates ERC-20 standardization and does not include name() or symbol() functions. At deployment, constructor input data encoded the ASCII string "GavCoin," embedding the name directly into the bytecode. The mine() function remains publicly callable, allowing new units to be created based on elapsed time since the previous mining call, with rewards split between the caller and the current Ethereum block producer.$desc$ WHERE address = '0xb4abc1bfc403a7b82c777420c81269858a4b8aa4';

-- 0xed6ac8de7c7ca7e3a22952e09c2a2a1232ddef9a (description): 3605 -> 887 chars
UPDATE contracts SET description = $desc$Launched in March 2016 as a playful experiment combining a token, a “grinder” mechanism (convert one token into another), and a proposal/voting system. The experiment famously demonstrated governance risk when control of the Unicorn Meat Grinder Association was taken via proposal shortly after launch; in 2025, control of the Unicorn Meat token was taken, supply was fixed at 100M, and the contract was renounced and wrapped for modern compatibility.

Unicorn Meat was introduced as an on-chain April Fool’s–style experiment: Unicorn holders could use the Unicorn Meat Grinder Association contract to “grind” Unicorns into Unicorn Meat, and governance/proposals could change how the system worked. Years later, the contract was claimed via the same governance path; 100M tokens were minted and the contract renounced, and wrapping was introduced to make it tradable on modern platforms.$desc$ WHERE address = '0xed6ac8de7c7ca7e3a22952e09c2a2a1232ddef9a';

-- 0x6ba6f2207e343923ba692e5cae646fb0f566db8d (description): 8506 -> 1468 chars
UPDATE contracts SET description = $desc$The V1 contract allowed users to claim CryptoPunks and track ownership on-chain using a custom token implementation that predated modern NFT standards. After all 10,000 Punks were claimed, a flaw was discovered in the contract’s marketplace logic that made safe trading difficult. Rather than modifying the deployed contract, Larva Labs chose to deploy a second contract and airdrop replacement CryptoPunks to the original V1 holders. This later deployment became known as CryptoPunks V2.

For several years, the original V1 contract remained largely inactive. In 2021, wrapper contracts were introduced that allow V1 CryptoPunks to be wrapped into ERC-721–compatible tokens, enabling safe trading on modern NFT marketplaces while preserving a reversible link to the original contract.

The term “CryptoPunks V1” is a retrospective label used to distinguish the original June 2017 deployment from the later replacement contract deployed in June 2017. The original image data embedded in both contracts is identical and includes a transparent background. Community efforts to clearly distinguish V1 tokens have included the use of a lavender background in modern displays.

CryptoPunks V1 is the first Ethereum smart contract deployment of the CryptoPunks project, created by Matt Hall and John Watkinson of Larva Labs and deployed on June 8, 2017. The contract enabled the claiming and ownership of 10,000 unique digital characters recorded on the Ethereum blockchain.$desc$ WHERE address = '0x6ba6f2207e343923ba692e5cae646fb0f566db8d';

-- 0x60cd862c9c687a9de49aecdc3a99b74a4fc54ab6 (description): 5759 -> 1157 chars
UPDATE contracts SET description = $desc$The contract defines a finite space of MoonCats identified by unique five-byte hexadecimal identifiers. Each identifier deterministically encodes a MoonCat’s visual traits, including pose, facial expression, fur pattern, and color. These identifiers are permanently stored in the contract at the time of rescue and cannot be modified.

MoonCats may be named once by their owner, with the name immutably recorded on-chain. The contract also includes a built-in adoption marketplace, allowing owners to create adoption offers and prospective adopters to submit adoption requests, either publicly or for a specific address.

While the original design allowed for 25,600 MoonCats, some genesis MoonCats were never released. The final collection size is 25,440 MoonCats.

MoonCatRescue is an Ethereum smart contract deployed on August 9, 2017. It introduced a system for discovering and rescuing uniquely identified MoonCats onto the Ethereum blockchain, with ownership, identifiers, names, and marketplace activity recorded entirely on-chain. The contract predates the ERC-721 standard and implements custom ownership and transfer logic for non-fungible assets.$desc$ WHERE address = '0x60cd862c9c687a9de49aecdc3a99b74a4fc54ab6';

-- 0xdd94de9cfe063577051a5eb7465d08317d8808b6 (description): 4381 -> 2077 chars
UPDATE contracts SET description = $desc$The contract functioned as a limited-supply token exclusively distributed to Devcon2 conference participants, with transfer behavior and balances constrained to reflect individual attendee tokens. Although deployed before the formal idea of POAPs, its pattern of issuing a token to signify attendance at an event was referenced in later discussions of proof-of-attendance protocols.

The Devcon2 Token (MainnetIndividualityTokenRoot) is an Ethereum smart contract deployed by Piper Merriam on November 16, 2016, to issue an ERC-20-compliant identity token to attendees of Ethereum's second developer conference (Devcon2), held in Shanghai in September 2016.

Each Ethereum address could hold at most one token, and each token was associated with an immutable string identity value. The contract included a hard minting cutoff at 8:00 AM Shanghai time on September 22, 2016 — after which no new tokens could ever be created, permanently fixing the total supply. Tokens were compiled with Solidity 0.3.6 and linked against a separate TokenLib library contract.

The contract was ERC-20 compliant but added constraints reflecting its non-fungible, one-per-person nature: transfer, transferFrom, and approve functions omitted the value parameter (always 1). Additional functions like ownerOf, tokenId, and isTokenOwner allowed querying token ownership. An upgrade mechanism enabled holders to migrate tokens to new addresses.

Piper Merriam published the full source code and a companion Token Explorer web app at devcon2-token.com, along with example code showing how to build survey and voting contracts on top of the token data. A community member later wrapped it with an ERC-721 interface, making it visible on OpenSea as a collectible.

The Devcon2 Token is one of the earliest on-chain implementations of the concept that became known as Proof of Attendance Protocol (POAP). While POAP did not formally launch until ETHDenver 2019, Merriam's 2016 experiment established the core pattern: issuing a non-transferable identity token to prove physical participation in an event.$desc$ WHERE address = '0xdd94de9cfe063577051a5eb7465d08317d8808b6';

-- 0x0b8d56c26d8cf16fe1bddf4967753503d974de06 (description): 4651 -> 1489 chars
UPDATE contracts SET description = $desc$The contract defines a token with subdivisible units and a dynamic issuance model based on tranches. Tokens are sold in fixed-size tranches at increasing prices, with each tranche raising the token price by a fixed increment. Purchases generate on-chain receipts that become refundable after a defined activation period, allowing holders to return tokens for ether at their purchase price. Transfers, approvals, and allowances follow an ERC-20–style interface, while issuance and refunds are handled directly by the contract.

GavCoin was deployed by Gavin Wood (gavofyork on GitHub) as part of the early Parity ecosystem. The contract implements a basic token with a continuous sale mechanism — users could send ETH to the contract and receive GavCoin tokens at a price that increases with total supply. The contract includes standard token functions (transfer, approve, transferFrom) plus a built-in buy mechanism.

The token was created after Wood left the Ethereum Foundation in January 2016 and co-founded Ethcore (later Parity Technologies) with Jutta Steiner. GavCoin was used as a reference dapp in the Parity wallet interface, demonstrating how Parity could display and interact with token contracts. The source code was published on GitHub under the gavofyork/gavcoin repository.

GavCoin is notable as a personal experiment from one of Ethereum's most influential architects — the person who designed the EVM, proposed the Solidity language, and wrote the Ethereum Yellow Paper.$desc$ WHERE address = '0x0b8d56c26d8cf16fe1bddf4967753503d974de06';

-- 0x06012c8cf97bead5deae237070f9587f8e7a266d (description): 5284 -> 1582 chars
UPDATE contracts SET description = $desc$CryptoKitties combines NFTs, auctions, and on-chain game logic into a single consumer-facing application. The core contract implements ERC-721-style ownership, per-token state, breeding permissions, cooldown timers, and externalized gene logic, with separate sale and siring auction contracts.

The move from the first core contract to the second was not a redesign but a hardening step. The later contract improves ERC-721 compatibility, tightens auction approval flows, enforces breeding and cooldown rules more defensively, refines pause and upgrade controls, and reduces operational risk ahead of mass adoption.

CryptoKitties is a blockchain-based game built on Ethereum where each cat is a unique, non-fungible token with encoded genetic traits. Players can buy, sell, transfer, and breed cats, with all ownership and lifecycle rules enforced entirely by smart contracts. Breeding combines genetic data from two parent cats to produce new kitties with inherited and mutated traits, creating scarcity, lineage, and emergent gameplay.

The contract at `0x5296e8579adf7d11a7663996cd95d9dc14f4290d` represents an early core deployment in the CryptoKitties lineage. Three days later, the same deployer released this contract `0x06012c8cf97BEaD5deAe237070F9587f8E7A266d`, which became the primary and canonical CryptoKitties core contract. The second deployment reflects a short but important iteration phase as the project transitioned from experimental launch to long-lived production system.

CryptoKitties was originally developed at Axiom Zen and later operated by Dapper Labs.$desc$ WHERE address = '0x06012c8cf97bead5deae237070f9587f8e7a266d';

COMMIT;

-- Verification proof: earliest executable contract (0x6516...)
-- Compiled with soljson v0.1.1+commit.6ff4cd6 (earliest available Solidity release)
UPDATE contracts SET
  compiler_language = 'solidity',
  verification_method = 'exact_bytecode_match',
  verification_notes = 'Compiled from a single-function contract: contract Test { function go() returns (string) { return "eth"; } }. Matched using soljson v0.1.1+commit.6ff4cd6, the earliest available Solidity compiler release. Optimizer off. Byte-for-byte match of all 285 bytes.',
  short_description = 'The earliest known Ethereum contract with executable runtime code. A single function go() that returns the string "eth", compiled with the first publicly available Solidity compiler (v0.1.1).'
WHERE address = '0x6516298e1c94769432ef6d5f450579094e8c21fa';
