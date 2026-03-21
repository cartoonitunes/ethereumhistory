-- Migration 050: Backfill runtime_bytecode_hash for any contracts
-- that have runtime_bytecode set but hash is still null.
-- This covers contracts seeded after migration 036 ran.

UPDATE contracts
  SET runtime_bytecode_hash = md5(runtime_bytecode)
  WHERE runtime_bytecode IS NOT NULL
    AND runtime_bytecode != ''
    AND runtime_bytecode != '0x'
    AND runtime_bytecode_hash IS NULL;
