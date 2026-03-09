-- Migration 030: donation_claims table for supporter page
CREATE TABLE IF NOT EXISTS donation_claims (
  id SERIAL PRIMARY KEY,
  tx_hash TEXT NOT NULL UNIQUE,
  address TEXT NOT NULL,
  display_name TEXT NOT NULL,
  note TEXT,
  signature TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
