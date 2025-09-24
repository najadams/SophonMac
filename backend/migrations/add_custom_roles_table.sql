-- Migration to add CustomRoles table for custom role management
-- This enables admins to create custom roles with specific permissions

CREATE TABLE IF NOT EXISTS CustomRoles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    displayName TEXT NOT NULL,
    permissions TEXT NOT NULL, -- JSON string of permissions array
    companyId INTEGER NOT NULL,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
    sync_id TEXT,
    last_synced_at TEXT,
    is_synced INTEGER DEFAULT 0,
    sync_version INTEGER DEFAULT 1,
    FOREIGN KEY (companyId) REFERENCES Company(id) ON DELETE CASCADE,
    UNIQUE(name, companyId) -- Ensure role names are unique within a company
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_custom_roles_company ON CustomRoles(companyId);
CREATE INDEX IF NOT EXISTS idx_custom_roles_name ON CustomRoles(name, companyId);
CREATE INDEX IF NOT EXISTS idx_custom_roles_sync ON CustomRoles(sync_id, is_synced);