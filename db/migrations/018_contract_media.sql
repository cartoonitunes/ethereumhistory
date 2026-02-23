CREATE TABLE IF NOT EXISTS contract_media (
  id SERIAL PRIMARY KEY,
  contract_address TEXT NOT NULL REFERENCES contracts(address) ON DELETE CASCADE,
  media_type TEXT NOT NULL DEFAULT 'other' CHECK (media_type IN ('screenshot', 'photo', 'diagram', 'artwork', 'other')),
  url TEXT NOT NULL,
  caption TEXT,
  source_url TEXT,
  source_label TEXT,
  uploaded_by INTEGER REFERENCES historians(id),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS contract_media_address_idx ON contract_media (contract_address);
CREATE INDEX IF NOT EXISTS contract_media_uploaded_by_idx ON contract_media (uploaded_by);
