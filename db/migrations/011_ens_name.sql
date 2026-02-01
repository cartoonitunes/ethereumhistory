-- Migration: add ENS names for contract and deployer (reverse resolution)
-- Safe to run multiple times.

ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS ens_name TEXT,
  ADD COLUMN IF NOT EXISTS deployer_ens_name TEXT;
