-- Migration 032: Remove wallet 0xd2ec98c4 erroneously added by migration 029
-- This address is an EOA (code_size_bytes = 0 / 0x bytecode), not a contract.
-- Migration 029 had the wrong address - the real MessageStore is 0xd2eccde805e888ae37646544d60185b842ff3d6b.
-- This migration is idempotent (safe to run multiple times).

DELETE FROM contract_edits WHERE contract_address = '0xd2ec98c4459edab3df7fa28c67b40f15c42b7614';
DELETE FROM historical_links WHERE contract_address = '0xd2ec98c4459edab3df7fa28c67b40f15c42b7614';
DELETE FROM contract_metadata WHERE contract_address = '0xd2ec98c4459edab3df7fa28c67b40f15c42b7614';
DELETE FROM contracts WHERE address = '0xd2ec98c4459edab3df7fa28c67b40f15c42b7614';
