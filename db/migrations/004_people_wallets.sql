-- Support multiple wallets per person
-- Safe to run multiple times.

CREATE TABLE IF NOT EXISTS people_wallets (
  address TEXT PRIMARY KEY,
  person_address TEXT NOT NULL REFERENCES people(address) ON DELETE CASCADE,
  label TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS people_wallets_person_idx ON people_wallets (person_address);

-- Ensure every person has their primary wallet represented
INSERT INTO people_wallets (address, person_address, label)
SELECT address, address, 'Primary'
FROM people
ON CONFLICT (address) DO NOTHING;

