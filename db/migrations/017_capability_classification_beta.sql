-- Capability classification beta tables

CREATE TABLE IF NOT EXISTS contract_capabilities (
  contract_address TEXT NOT NULL REFERENCES contracts(address) ON DELETE CASCADE,
  capability_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'probable',
  confidence REAL NOT NULL DEFAULT 0.5,
  primary_evidence_type TEXT,
  detector_version TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (contract_address, capability_key)
);

CREATE INDEX IF NOT EXISTS contract_capabilities_key_idx ON contract_capabilities (capability_key);
CREATE INDEX IF NOT EXISTS contract_capabilities_status_idx ON contract_capabilities (status);
CREATE INDEX IF NOT EXISTS contract_capabilities_confidence_idx ON contract_capabilities (confidence);

CREATE TABLE IF NOT EXISTS capability_evidence (
  id SERIAL PRIMARY KEY,
  contract_address TEXT NOT NULL REFERENCES contracts(address) ON DELETE CASCADE,
  capability_key TEXT NOT NULL,
  evidence_type TEXT NOT NULL,
  evidence_key TEXT,
  evidence_value TEXT,
  snippet TEXT,
  confidence REAL NOT NULL DEFAULT 0.5,
  detector_version TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS capability_evidence_contract_idx ON capability_evidence (contract_address);
CREATE INDEX IF NOT EXISTS capability_evidence_key_idx ON capability_evidence (capability_key);
CREATE INDEX IF NOT EXISTS capability_evidence_type_idx ON capability_evidence (evidence_type);
