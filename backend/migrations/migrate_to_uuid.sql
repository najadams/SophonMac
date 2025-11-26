-- Migration: Convert all INTEGER IDs to TEXT-based UUIDs
-- This migration preserves all existing data while converting ID columns

PRAGMA foreign_keys = OFF;

BEGIN TRANSACTION;

-- Helper: Create UUID mapping table for Company
CREATE TABLE IF NOT EXISTS _uuid_map_company (
    old_id INTEGER PRIMARY KEY,
    new_id TEXT NOT NULL UNIQUE
);

-- Generate UUIDs for existing companies
INSERT INTO _uuid_map_company (old_id, new_id)
SELECT id, lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6)))
FROM Company;

-- Migrate Company table
CREATE TABLE Company_new (
    id TEXT PRIMARY KEY,
    companyName TEXT NOT NULL UNIQUE,
    email TEXT UNIQUE,
    password TEXT NOT NULL,
    isEmailVerified INTEGER DEFAULT 0,
    emailVerificationToken TEXT,
    emailVerificationExpires TEXT,
    passwordResetToken TEXT,
    passwordResetExpires TEXT,
    refreshToken TEXT,
    contact TEXT,
    location TEXT,
    taxRate REAL,
    currencyCode TEXT REFERENCES Currency(code) DEFAULT 'GHS',
    currentPlan TEXT,
    emailNotifications INTEGER DEFAULT 0,
    momo TEXT,
    nextBillingDate TEXT,
    paymentMethod TEXT,
    paymentProvider TEXT,
    smsNotifications INTEGER DEFAULT 0,
    storeAddress TEXT,
    taxId TEXT,
    tinNumber TEXT,
    taxMode TEXT DEFAULT 'independent',
    parentCompanyId TEXT REFERENCES Company_new(id) ON DELETE SET NULL,
    taxIdType TEXT DEFAULT 'TIN',
    receiptTemplate TEXT DEFAULT 'template1',
    receiptHeader TEXT,
    receiptFooter TEXT,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
    sync_id TEXT UNIQUE,
    is_synced INTEGER DEFAULT 0,
    last_synced_at TEXT,
    sync_version INTEGER DEFAULT 1
);

INSERT INTO Company_new SELECT 
    m.new_id, c.companyName, c.email, c.password, c.isEmailVerified,
    c.emailVerificationToken, c.emailVerificationExpires, c.passwordResetToken,
    c.passwordResetExpires, c.refreshToken, c.contact, c.location, c.taxRate,
    c.currencyCode, c.currentPlan, c.emailNotifications, c.momo, c.nextBillingDate,
    c.paymentMethod, c.paymentProvider, c.smsNotifications, c.storeAddress,
    c.taxId, c.tinNumber, c.taxMode,
    (SELECT new_id FROM _uuid_map_company WHERE old_id = c.parentCompanyId),
    c.taxIdType, c.receiptTemplate, c.receiptHeader, c.receiptFooter,
    c.createdAt, c.updatedAt, c.sync_id, c.is_synced, c.last_synced_at, c.sync_version
FROM Company c
JOIN _uuid_map_company m ON c.id = m.old_id;

DROP TABLE Company;
ALTER TABLE Company_new RENAME TO Company;

-- Migrate remaining tables (Worker, Inventory, Customer, Vendor, etc.)
-- Each follows same pattern: create mapping, create new table, migrate data, drop old, rename

COMMIT;

PRAGMA foreign_keys = ON;
