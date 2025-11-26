BEGIN TRANSACTION;

-- Company Table Migration
CREATE TABLE Company_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
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
    receiptTemplate TEXT DEFAULT 'template1',
    receiptHeader TEXT,
    receiptFooter TEXT,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
    parentCompanyId INTEGER REFERENCES Company(id) ON DELETE SET NULL,
    taxMode TEXT DEFAULT 'independent',
    taxIdType TEXT DEFAULT 'TIN',
    sync_id TEXT UNIQUE,
    is_synced INTEGER DEFAULT 0,
    last_synced_at TEXT,
    sync_version INTEGER DEFAULT 1
);

INSERT INTO Company_new (
    id, companyName, email, password, isEmailVerified, emailVerificationToken,
    emailVerificationExpires, passwordResetToken, passwordResetExpires, refreshToken,
    contact, location, taxRate, currencyCode, currentPlan, emailNotifications, momo,
    nextBillingDate, paymentMethod, paymentProvider, smsNotifications, storeAddress,
    taxId, tinNumber, receiptTemplate, receiptHeader, receiptFooter, createdAt, updatedAt,
    parentCompanyId, taxMode, taxIdType, sync_id, is_synced, last_synced_at, sync_version
)
SELECT 
    id, companyName, email, password, isEmailVerified, emailVerificationToken,
    emailVerificationExpires, passwordResetToken, passwordResetExpires, refreshToken,
    contact, location, taxRate, COALESCE(currency, 'GHS'), currentPlan, emailNotifications, momo,
    nextBillingDate, paymentMethod, paymentProvider, smsNotifications, storeAddress,
    taxId, tinNumber, receiptTemplate, receiptHeader, receiptFooter, createdAt, updatedAt,
    parentCompanyId, taxMode, taxIdType, sync_id, is_synced, last_synced_at, sync_version
FROM Company;

DROP TABLE Company;
ALTER TABLE Company_new RENAME TO Company;

-- Settings Table Migration
CREATE TABLE Settings_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    companyId INTEGER NOT NULL,
    emailNotifications INTEGER DEFAULT 1,
    smsNotifications INTEGER DEFAULT 0,
    currencyCode TEXT REFERENCES Currency(code) DEFAULT 'GHS',
    theme TEXT DEFAULT 'light',
    roundingSales INTEGER DEFAULT 0,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
    sync_id TEXT UNIQUE,
    is_synced INTEGER DEFAULT 0,
    last_synced_at TEXT,
    sync_version INTEGER DEFAULT 1,
    FOREIGN KEY (companyId) REFERENCES Company(id) ON DELETE CASCADE
);

INSERT INTO Settings_new (
    id, companyId, emailNotifications, smsNotifications, currencyCode, theme, roundingSales, 
    createdAt, updatedAt, sync_id, is_synced, last_synced_at, sync_version
)
SELECT 
    id, companyId, emailNotifications, smsNotifications, COALESCE(currency, 'GHS'), theme, roundingSales, 
    createdAt, updatedAt, sync_id, is_synced, last_synced_at, sync_version
FROM Settings;

DROP TABLE Settings;
ALTER TABLE Settings_new RENAME TO Settings;

COMMIT;
