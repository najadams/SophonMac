-- Add networking tables for the comprehensive networking system

-- Network Configuration table
CREATE TABLE IF NOT EXISTS NetworkConfig (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    companyId INTEGER NOT NULL,
    config TEXT NOT NULL, -- JSON configuration
    isMaster INTEGER DEFAULT 0,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (companyId) REFERENCES Company(id) ON DELETE CASCADE,
    UNIQUE(companyId)
);

-- Sync Metadata table for tracking synchronization
CREATE TABLE IF NOT EXISTS SyncMetadata (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    companyId INTEGER NOT NULL,
    tableType TEXT NOT NULL, -- 'product', 'customer', 'receipt', etc.
    recordId INTEGER NOT NULL,
    lastSyncTimestamp INTEGER NOT NULL,
    syncVersion INTEGER DEFAULT 1,
    sourceInstanceId TEXT,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (companyId) REFERENCES Company(id) ON DELETE CASCADE,
    UNIQUE(companyId, tableType, recordId)
);

-- Network Peers table for tracking discovered peers
CREATE TABLE IF NOT EXISTS NetworkPeers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    companyId INTEGER NOT NULL,
    instanceId TEXT NOT NULL,
    peerName TEXT,
    host TEXT,
    port INTEGER,
    isMaster INTEGER DEFAULT 0,
    capabilities TEXT, -- JSON array of capabilities
    version TEXT,
    lastSeen INTEGER,
    status TEXT DEFAULT 'discovered', -- 'discovered', 'connected', 'disconnected'
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (companyId) REFERENCES Company(id) ON DELETE CASCADE,
    UNIQUE(companyId, instanceId)
);

-- Sync Queue table for queuing sync operations
CREATE TABLE IF NOT EXISTS SyncQueue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    companyId INTEGER NOT NULL,
    syncId TEXT UNIQUE NOT NULL,
    tableType TEXT NOT NULL,
    operation TEXT NOT NULL, -- 'create', 'update', 'delete'
    recordId INTEGER,
    recordData TEXT, -- JSON data
    timestamp INTEGER NOT NULL,
    sourceInstanceId TEXT,
    targetInstanceId TEXT, -- NULL for broadcast
    status TEXT DEFAULT 'pending', -- 'pending', 'sent', 'acknowledged', 'failed'
    retryCount INTEGER DEFAULT 0,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (companyId) REFERENCES Company(id) ON DELETE CASCADE
);

-- Sync Conflicts table for tracking and resolving conflicts
CREATE TABLE IF NOT EXISTS SyncConflicts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    companyId INTEGER NOT NULL,
    tableType TEXT NOT NULL,
    recordId INTEGER NOT NULL,
    localData TEXT, -- JSON of local record
    remoteData TEXT, -- JSON of remote record
    localTimestamp INTEGER,
    remoteTimestamp INTEGER,
    sourceInstanceId TEXT,
    resolution TEXT, -- 'local_wins', 'remote_wins', 'manual', 'pending'
    resolvedBy TEXT, -- user ID or 'system'
    resolvedAt TEXT,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (companyId) REFERENCES Company(id) ON DELETE CASCADE
);

-- Network Events table for logging network activities
CREATE TABLE IF NOT EXISTS NetworkEvents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    companyId INTEGER NOT NULL,
    eventType TEXT NOT NULL, -- 'peer_discovered', 'peer_connected', 'sync_completed', etc.
    eventData TEXT, -- JSON event details
    sourceInstanceId TEXT,
    targetInstanceId TEXT,
    severity TEXT DEFAULT 'info', -- 'info', 'warning', 'error'
    timestamp INTEGER NOT NULL,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (companyId) REFERENCES Company(id) ON DELETE CASCADE
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sync_metadata_company_table ON SyncMetadata(companyId, tableType);
CREATE INDEX IF NOT EXISTS idx_sync_metadata_timestamp ON SyncMetadata(lastSyncTimestamp);
CREATE INDEX IF NOT EXISTS idx_network_peers_company ON NetworkPeers(companyId);
CREATE INDEX IF NOT EXISTS idx_network_peers_instance ON NetworkPeers(instanceId);
CREATE INDEX IF NOT EXISTS idx_sync_queue_company_status ON SyncQueue(companyId, status);
CREATE INDEX IF NOT EXISTS idx_sync_queue_timestamp ON SyncQueue(timestamp);
CREATE INDEX IF NOT EXISTS idx_sync_conflicts_company ON SyncConflicts(companyId);
CREATE INDEX IF NOT EXISTS idx_network_events_company_type ON NetworkEvents(companyId, eventType);
CREATE INDEX IF NOT EXISTS idx_network_events_timestamp ON NetworkEvents(timestamp);

-- Add triggers to update timestamps
CREATE TRIGGER IF NOT EXISTS update_network_config_timestamp 
    AFTER UPDATE ON NetworkConfig
    BEGIN
        UPDATE NetworkConfig SET updatedAt = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS update_sync_metadata_timestamp 
    AFTER UPDATE ON SyncMetadata
    BEGIN
        UPDATE SyncMetadata SET updatedAt = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS update_network_peers_timestamp 
    AFTER UPDATE ON NetworkPeers
    BEGIN
        UPDATE NetworkPeers SET updatedAt = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS update_sync_queue_timestamp 
    AFTER UPDATE ON SyncQueue
    BEGIN
        UPDATE SyncQueue SET updatedAt = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

-- Add sync tracking triggers for main tables
CREATE TRIGGER IF NOT EXISTS track_product_sync 
    AFTER UPDATE ON Product
    BEGIN
        INSERT OR REPLACE INTO SyncMetadata 
        (companyId, tableType, recordId, lastSyncTimestamp, syncVersion, sourceInstanceId)
        VALUES 
        (NEW.companyId, 'product', NEW.id, strftime('%s', 'now') * 1000, 
         COALESCE((SELECT syncVersion + 1 FROM SyncMetadata WHERE companyId = NEW.companyId AND tableType = 'product' AND recordId = NEW.id), 1),
         NULL);
    END;

CREATE TRIGGER IF NOT EXISTS track_customer_sync 
    AFTER UPDATE ON Customer
    BEGIN
        INSERT OR REPLACE INTO SyncMetadata 
        (companyId, tableType, recordId, lastSyncTimestamp, syncVersion, sourceInstanceId)
        VALUES 
        (NEW.companyId, 'customer', NEW.id, strftime('%s', 'now') * 1000, 
         COALESCE((SELECT syncVersion + 1 FROM SyncMetadata WHERE companyId = NEW.companyId AND tableType = 'customer' AND recordId = NEW.id), 1),
         NULL);
    END;

CREATE TRIGGER IF NOT EXISTS track_receipt_sync 
    AFTER INSERT ON Receipt
    BEGIN
        INSERT OR REPLACE INTO SyncMetadata 
        (companyId, tableType, recordId, lastSyncTimestamp, syncVersion, sourceInstanceId)
        VALUES 
        (NEW.companyId, 'receipt', NEW.id, strftime('%s', 'now') * 1000, 1, NULL);
    END;

-- Insert default network configuration for existing companies
INSERT OR IGNORE INTO NetworkConfig (companyId, config, isMaster)
SELECT id, 
       '{"autoDiscovery": true, "autoSync": true, "masterElection": true, "conflictResolution": "last-write-wins"}',
       1
FROM Company;