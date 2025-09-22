-- Migration to add sync metadata columns to all tables
-- This enables offline-first sync with Supabase

-- Add sync metadata to Company table
ALTER TABLE Company ADD COLUMN sync_id TEXT;
ALTER TABLE Company ADD COLUMN last_synced_at TEXT;
ALTER TABLE Company ADD COLUMN is_synced INTEGER DEFAULT 0;
ALTER TABLE Company ADD COLUMN sync_version INTEGER DEFAULT 1;

-- Add sync metadata to Settings table
ALTER TABLE Settings ADD COLUMN sync_id TEXT;
ALTER TABLE Settings ADD COLUMN last_synced_at TEXT;
ALTER TABLE Settings ADD COLUMN is_synced INTEGER DEFAULT 0;
ALTER TABLE Settings ADD COLUMN sync_version INTEGER DEFAULT 1;

-- Add sync metadata to Worker table
ALTER TABLE Worker ADD COLUMN sync_id TEXT;
ALTER TABLE Worker ADD COLUMN last_synced_at TEXT;
ALTER TABLE Worker ADD COLUMN is_synced INTEGER DEFAULT 0;
ALTER TABLE Worker ADD COLUMN sync_version INTEGER DEFAULT 1;

-- Add sync metadata to Inventory table
ALTER TABLE Inventory ADD COLUMN sync_id TEXT;
ALTER TABLE Inventory ADD COLUMN last_synced_at TEXT;
ALTER TABLE Inventory ADD COLUMN is_synced INTEGER DEFAULT 0;
ALTER TABLE Inventory ADD COLUMN sync_version INTEGER DEFAULT 1;

-- Add sync metadata to Customer table
ALTER TABLE Customer ADD COLUMN sync_id TEXT;
ALTER TABLE Customer ADD COLUMN last_synced_at TEXT;
ALTER TABLE Customer ADD COLUMN is_synced INTEGER DEFAULT 0;
ALTER TABLE Customer ADD COLUMN sync_version INTEGER DEFAULT 1;

-- Add sync metadata to Vendor table
ALTER TABLE Vendor ADD COLUMN sync_id TEXT;
ALTER TABLE Vendor ADD COLUMN last_synced_at TEXT;
ALTER TABLE Vendor ADD COLUMN is_synced INTEGER DEFAULT 0;
ALTER TABLE Vendor ADD COLUMN sync_version INTEGER DEFAULT 1;

-- Add sync metadata to Receipt table
ALTER TABLE Receipt ADD COLUMN sync_id TEXT;
ALTER TABLE Receipt ADD COLUMN last_synced_at TEXT;
ALTER TABLE Receipt ADD COLUMN is_synced INTEGER DEFAULT 0;
ALTER TABLE Receipt ADD COLUMN sync_version INTEGER DEFAULT 1;

-- Add sync metadata to ReceiptDetail table
ALTER TABLE ReceiptDetail ADD COLUMN sync_id TEXT;
ALTER TABLE ReceiptDetail ADD COLUMN last_synced_at TEXT;
ALTER TABLE ReceiptDetail ADD COLUMN is_synced INTEGER DEFAULT 0;
ALTER TABLE ReceiptDetail ADD COLUMN sync_version INTEGER DEFAULT 1;

-- Add sync metadata to Debt table
ALTER TABLE Debt ADD COLUMN sync_id TEXT;
ALTER TABLE Debt ADD COLUMN last_synced_at TEXT;
ALTER TABLE Debt ADD COLUMN is_synced INTEGER DEFAULT 0;
ALTER TABLE Debt ADD COLUMN sync_version INTEGER DEFAULT 1;

-- Add sync metadata to DebtPayment table
ALTER TABLE DebtPayment ADD COLUMN sync_id TEXT;
ALTER TABLE DebtPayment ADD COLUMN last_synced_at TEXT;
ALTER TABLE DebtPayment ADD COLUMN is_synced INTEGER DEFAULT 0;
ALTER TABLE DebtPayment ADD COLUMN sync_version INTEGER DEFAULT 1;

-- Add sync metadata to Supplies table
ALTER TABLE Supplies ADD COLUMN sync_id TEXT;
ALTER TABLE Supplies ADD COLUMN last_synced_at TEXT;
ALTER TABLE Supplies ADD COLUMN is_synced INTEGER DEFAULT 0;
ALTER TABLE Supplies ADD COLUMN sync_version INTEGER DEFAULT 1;

-- Add sync metadata to SuppliesDetail table
ALTER TABLE SuppliesDetail ADD COLUMN sync_id TEXT;
ALTER TABLE SuppliesDetail ADD COLUMN last_synced_at TEXT;
ALTER TABLE SuppliesDetail ADD COLUMN is_synced INTEGER DEFAULT 0;
ALTER TABLE SuppliesDetail ADD COLUMN sync_version INTEGER DEFAULT 1;

-- Add sync metadata to PurchaseOrder table
ALTER TABLE PurchaseOrder ADD COLUMN sync_id TEXT;
ALTER TABLE PurchaseOrder ADD COLUMN last_synced_at TEXT;
ALTER TABLE PurchaseOrder ADD COLUMN is_synced INTEGER DEFAULT 0;
ALTER TABLE PurchaseOrder ADD COLUMN sync_version INTEGER DEFAULT 1;

-- Add sync metadata to PurchaseOrderItem table
ALTER TABLE PurchaseOrderItem ADD COLUMN sync_id TEXT;
ALTER TABLE PurchaseOrderItem ADD COLUMN last_synced_at TEXT;
ALTER TABLE PurchaseOrderItem ADD COLUMN is_synced INTEGER DEFAULT 0;
ALTER TABLE PurchaseOrderItem ADD COLUMN sync_version INTEGER DEFAULT 1;

-- Add sync metadata to VendorPayment table
ALTER TABLE VendorPayment ADD COLUMN sync_id TEXT;
ALTER TABLE VendorPayment ADD COLUMN last_synced_at TEXT;
ALTER TABLE VendorPayment ADD COLUMN is_synced INTEGER DEFAULT 0;
ALTER TABLE VendorPayment ADD COLUMN sync_version INTEGER DEFAULT 1;

-- Add sync metadata to Notification table
ALTER TABLE Notification ADD COLUMN sync_id TEXT;
ALTER TABLE Notification ADD COLUMN last_synced_at TEXT;
ALTER TABLE Notification ADD COLUMN is_synced INTEGER DEFAULT 0;
ALTER TABLE Notification ADD COLUMN sync_version INTEGER DEFAULT 1;

-- Create sync outbox table for queuing operations when offline
CREATE TABLE SyncOutbox (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    table_name TEXT NOT NULL,
    record_id INTEGER NOT NULL,
    operation TEXT NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
    data TEXT, -- JSON data for the operation
    sync_id TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    retry_count INTEGER DEFAULT 0,
    last_retry_at TEXT,
    error_message TEXT,
    status TEXT DEFAULT 'pending' -- 'pending', 'synced', 'failed'
);

-- Create sync log table for tracking sync operations
CREATE TABLE SyncLog (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    table_name TEXT NOT NULL,
    operation TEXT NOT NULL,
    records_processed INTEGER DEFAULT 0,
    records_failed INTEGER DEFAULT 0,
    started_at TEXT DEFAULT CURRENT_TIMESTAMP,
    completed_at TEXT,
    status TEXT DEFAULT 'running', -- 'running', 'completed', 'failed'
    error_message TEXT
);

-- Create indexes for better sync performance
CREATE INDEX idx_sync_outbox_status ON SyncOutbox(status, created_at);
CREATE INDEX idx_sync_outbox_table ON SyncOutbox(table_name, record_id);
CREATE INDEX idx_company_sync ON Company(sync_id, is_synced);
CREATE INDEX idx_worker_sync ON Worker(sync_id, is_synced);
CREATE INDEX idx_inventory_sync ON Inventory(sync_id, is_synced);
CREATE INDEX idx_customer_sync ON Customer(sync_id, is_synced);
CREATE INDEX idx_vendor_sync ON Vendor(sync_id, is_synced);
CREATE INDEX idx_receipt_sync ON Receipt(sync_id, is_synced);
CREATE INDEX idx_debt_sync ON Debt(sync_id, is_synced);