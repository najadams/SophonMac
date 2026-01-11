const db = require('./data/db/db');

const sql = `
-- Sync Outbox for offline changes
CREATE TABLE IF NOT EXISTS SyncOutbox (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    table_name TEXT NOT NULL,
    record_id INTEGER NOT NULL,
    operation TEXT NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
    data TEXT, -- JSON payload
    sync_id TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'pending', -- 'pending', 'synced', 'failed'
    retry_count INTEGER DEFAULT 0,
    last_error TEXT
);

-- Sync Log for history
CREATE TABLE IF NOT EXISTS SyncLog (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    table_name TEXT NOT NULL,
    operation TEXT NOT NULL, -- 'supabase_sync', 'peer_sync'
    status TEXT NOT NULL, -- 'completed', 'failed'
    records_processed INTEGER DEFAULT 0,
    duration_ms INTEGER,
    error_message TEXT,
    completed_at TEXT DEFAULT CURRENT_TIMESTAMP
);
`;

db.exec(sql, (err) => {
  if (err) {
    console.error('Error creating sync tables:', err);
  } else {
    console.log('Sync tables created successfully.');
  }
});
