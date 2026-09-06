-- Migration 086: let wallet_holdings record ERC-1155 and unidentified tokens.
--
-- The scan asks Alchemy for a wallet's NFT contracts and then kept only the
-- ones it labelled ERC721, discarding everything else. Measured across the nine
-- wallets currently attached to accounts, that filter was throwing away 159 of
-- 348 contracts, which is 46 per cent of what the provider returned:
--
--   ERC721   189  kept
--   ERC1155  156  dropped
--   UNKNOWN    3  dropped
--
-- The two categories it dropped are exactly the ones this archive cares about.
-- UNKNOWN is what Alchemy reports for contracts that predate or ignore the
-- standards, which is most of the early collectibles: CryptoKitties comes back
-- UNKNOWN and was invisible to two wallets that hold it. ERC1155 includes the
-- Curio Cards and Peperium wrappers documented in migration 085's era, one of
-- which a historian holds 42 of and neither of which has ever been credited.
--
-- The column could not record them anyway, because its CHECK allowed only
-- erc20 and erc721. This widens it rather than mislabelling an ERC-1155 as an
-- ERC-721, which would be a strange thing for a contract archive to do to its
-- own data.
--
-- 'unknown' is a real value here rather than a null: the provider genuinely
-- does not know, and recording that is more useful than guessing erc721 and
-- being wrong about a pre-standard contract.
--
-- Idempotent: safe to re-run.

ALTER TABLE wallet_holdings
  DROP CONSTRAINT IF EXISTS wallet_holdings_token_type;

ALTER TABLE wallet_holdings
  ADD CONSTRAINT wallet_holdings_token_type
  CHECK (token_type IN ('erc20', 'erc721', 'erc1155', 'unknown'));
