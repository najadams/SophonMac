const db = require('./data/db/db');

const sql = `
-- Sync State for Umbrella Event Replay
CREATE TABLE IF NOT EXISTS SyncState (
    key TEXT PRIMARY KEY, -- e.g., 'umbrella_events'
    lastSyncedId INTEGER DEFAULT 0,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
);
`;

try {
  db.exec(sql);
  console.log('SyncState migration applied successfully.');
} catch (err) {
  console.error('SyncState migration failed:', err);
}
