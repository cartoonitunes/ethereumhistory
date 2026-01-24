-- Add token logo support (RPC token metadata)

ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS token_logo TEXT;

