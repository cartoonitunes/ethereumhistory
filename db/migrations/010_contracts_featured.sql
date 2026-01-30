-- Migration: add featured flag to contracts and set current featured set to true
-- Safe to run multiple times.

ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS featured BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS contracts_featured_flag_idx ON contracts (featured) WHERE featured = TRUE;

-- Set current featured addresses (from FEATURED_ADDRESSES) to true
UPDATE contracts
SET featured = TRUE
WHERE address IN (
  '0xdbf03b407c01e7cd3cbea99509d93f8dddc8c6fb',
  '0xf4eced2f682ce333f96f2d8966c613ded8fc95dd',
  '0x8374f5cc22eda52e960d9558fb48dd4b7946609a',
  '0x89205a3a3b2a69de6dbf7f01ed13b2108b2c43e7',
  '0xed6ac8de7c7ca7e3a22952e09c2a2a1232ddef9a',
  '0xbb9bc244d798123fde783fcc1c72d3bb8c189413',
  '0x3eddc7ebc7db94f54b72d8ed1f42ce6a527305bb',
  '0xe468d26721b703d224d05563cb64746a7a40e1f4',
  '0xc7e9ddd5358e08417b1c88ed6f1a73149beeaa32',
  '0xfb6916095ca1df60bb79ce92ce3ea74c37c5d359'
);
