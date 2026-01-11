const db = require('./data/db/db');

const sql = `
-- Device table for POS management
CREATE TABLE IF NOT EXISTS Device (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    companyId INTEGER NOT NULL,
    deviceId TEXT NOT NULL, -- UUID
    name TEXT,
    status TEXT DEFAULT 'offline', -- 'online', 'offline'
    lastHeartbeat TEXT,
    softwareVersion TEXT,
    lastSyncedEventId INTEGER DEFAULT 0,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (companyId) REFERENCES Company(id) ON DELETE CASCADE,
    UNIQUE(companyId, deviceId)
);

-- Event Log for Sync
CREATE TABLE IF NOT EXISTS EventLog (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    companyId INTEGER NOT NULL,
    eventType TEXT NOT NULL, -- 'COMPANY_UPDATE', 'INVENTORY_CHANGE', etc.
    payload TEXT NOT NULL, -- JSON string
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (companyId) REFERENCES Company(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_eventlog_company ON EventLog(companyId);
CREATE INDEX IF NOT EXISTS idx_eventlog_created ON EventLog(createdAt);
`;

try {
  db.exec(sql);
  console.log('Migration applied successfully.');
} catch (err) {
  console.error('Migration failed:', err);
}
