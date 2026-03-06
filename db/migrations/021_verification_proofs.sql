-- Migration 021: Add verification proof columns to contracts table
-- These columns track compiler archaeology and bytecode verification data

ALTER TABLE contracts ADD COLUMN IF NOT EXISTS compiler_language TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS compiler_commit TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS compiler_repo TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS verification_method TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS verification_proof_url TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS verification_notes TEXT;
