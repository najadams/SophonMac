
-- Create NetworkConfig table for network management
CREATE TABLE IF NOT EXISTS NetworkConfig (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  companyId TEXT NOT NULL,
  config TEXT,
  isMaster INTEGER DEFAULT 0,
  updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (companyId) REFERENCES Company(id) ON DELETE CASCADE
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_networkconfig_company ON NetworkConfig(companyId);
