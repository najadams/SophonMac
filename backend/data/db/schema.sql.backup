-- SQLite schema for Sophon database

-- Enable foreign keys
PRAGMA foreign_keys = ON;

-- Currency reference table (ISO 4217 codes)
CREATE TABLE IF NOT EXISTS Currency (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    symbol TEXT,
    decimals INTEGER DEFAULT 2
);

-- Seed a few common currencies
INSERT OR IGNORE INTO Currency (code, name, symbol, decimals) VALUES
    ('USD', 'US Dollar', '$', 2),
    ('EUR', 'Euro', '€', 2),
    ('GBP', 'British Pound', '£', 2),
    ('GHS', 'Ghanaian Cedi', '₵', 2),
    ('TZS', 'Tanzanian Shilling', 'Sh', 2);

-- Company table
CREATE TABLE Company (
    id TEXT PRIMARY KEY,
    companyName TEXT NOT NULL UNIQUE,
    email TEXT UNIQUE,
    password TEXT NOT NULL,
    isEmailVerified INTEGER DEFAULT 0, -- Boolean as INTEGER 0/1
    emailVerificationToken TEXT,
    emailVerificationExpires TEXT, -- SQLite doesn't have a native DATE type
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
    taxMode TEXT DEFAULT 'independent', -- 'independent' or 'umbrella'
    parentCompanyId TEXT REFERENCES Company(id) ON DELETE SET NULL,
    taxIdType TEXT DEFAULT 'TIN', -- 'TIN' or 'GH-Card'
    receiptTemplate TEXT DEFAULT 'template1',
    receiptHeader TEXT,
    receiptFooter TEXT,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Company Network (Parent/Child relationships)
CREATE TABLE CompanyNetwork (
    id TEXT PRIMARY KEY,
    sourceCompanyId TEXT NOT NULL,
    targetCompanyId TEXT NOT NULL,
    relationshipType TEXT NOT NULL, -- 'subsidiary', 'partner', etc.
    status TEXT DEFAULT 'active',
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sourceCompanyId) REFERENCES Company(id) ON DELETE CASCADE,
    FOREIGN KEY (targetCompanyId) REFERENCES Company(id) ON DELETE CASCADE,
    UNIQUE(sourceCompanyId, targetCompanyId)
);

-- Company allowed units (Many-to-Many relationship)
CREATE TABLE CompanyAllowedUnits (
    id TEXT PRIMARY KEY,
    companyId TEXT,
    unit TEXT,
    FOREIGN KEY (companyId) REFERENCES Company(id) ON DELETE CASCADE,
    UNIQUE(companyId, unit)
);

-- Company allowed categories (Many-to-Many relationship)
CREATE TABLE CompanyAllowedCategories (
    id TEXT PRIMARY KEY,
    companyId TEXT,
    category TEXT,
    FOREIGN KEY (companyId) REFERENCES Company(id) ON DELETE CASCADE,
    UNIQUE(companyId, category)
);

-- Settings table
CREATE TABLE Settings (
    id TEXT PRIMARY KEY,
    companyId TEXT NOT NULL,
    emailNotifications INTEGER DEFAULT 1,
    smsNotifications INTEGER DEFAULT 0,
    currencyCode TEXT REFERENCES Currency(code) DEFAULT 'GHS',
    theme TEXT DEFAULT 'light',
    roundingSales INTEGER DEFAULT 0,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (companyId) REFERENCES Company(id) ON DELETE CASCADE
);

-- User access roles for settings
CREATE TABLE UserAccessRoles (
    id TEXT PRIMARY KEY,
    settingsId TEXT NOT NULL,
    userId TEXT NOT NULL,
    role TEXT DEFAULT 'sales',
    FOREIGN KEY (settingsId) REFERENCES Settings(id) ON DELETE CASCADE
);

-- Worker table
CREATE TABLE Worker (
    id TEXT PRIMARY KEY,
    companyId TEXT,
    adminstatus INTEGER DEFAULT 0,
    name TEXT NOT NULL,
    username TEXT,
    contact TEXT,
    email TEXT,
    password TEXT NOT NULL,
    role TEXT,
    deleted INTEGER DEFAULT 0,
    isEmailVerified INTEGER DEFAULT 0,
    emailVerificationToken TEXT,
    emailVerificationExpires TEXT,
    passwordResetToken TEXT,
    passwordResetExpires TEXT,
    refreshToken TEXT,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (companyId) REFERENCES Company(id) ON DELETE CASCADE,
    UNIQUE(companyId, name)
);

-- Inventory table
CREATE TABLE Inventory (
    id TEXT PRIMARY KEY,
    companyId TEXT NOT NULL,
    name TEXT NOT NULL,
    category TEXT DEFAULT 'none',
    baseUnit TEXT DEFAULT 'none',
    costPrice REAL DEFAULT 0,
    salesPrice REAL NOT NULL,
    onhand REAL DEFAULT 0,
    deleted INTEGER DEFAULT 0,
    reorderPoint REAL DEFAULT 0,
    minimumStock REAL DEFAULT 0,
    description TEXT,
    sku TEXT,
    barcode TEXT,
    allowsUnitBreakdown INTEGER DEFAULT 0,
    atomicUnit TEXT,
    atomicUnitQuantity REAL,
    lossFactor REAL DEFAULT 0,
    lastBreakdownDate TEXT,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (companyId) REFERENCES Company(id) ON DELETE CASCADE,
    UNIQUE(companyId, name)
);

-- Inventory units (Many-to-Many relationship)
CREATE TABLE InventoryUnits (
    id TEXT PRIMARY KEY,
    inventoryId TEXT,
    unit TEXT,
    FOREIGN KEY (inventoryId) REFERENCES Inventory(id) ON DELETE CASCADE
);

-- Unit conversions
CREATE TABLE UnitConversion (
    id TEXT PRIMARY KEY,
    inventoryId TEXT,
    fromUnit TEXT NOT NULL,
    toUnit TEXT NOT NULL,
    conversionRate REAL NOT NULL,
    unitPrice REAL NOT NULL,
    FOREIGN KEY (inventoryId) REFERENCES Inventory(id) ON DELETE CASCADE
);

-- Price history
CREATE TABLE PriceChange (
    id TEXT PRIMARY KEY,
    inventoryId TEXT,
    date TEXT DEFAULT CURRENT_TIMESTAMP,
    costPrice REAL,
    salesPrice REAL,
    FOREIGN KEY (inventoryId) REFERENCES Inventory(id) ON DELETE CASCADE
);

-- Stock transactions
CREATE TABLE StockTransaction (
    id TEXT PRIMARY KEY,
    inventoryId TEXT,
    type TEXT NOT NULL, -- 'inbound' or 'outbound'
    quantity REAL NOT NULL,
    costPrice REAL NOT NULL,
    salesPrice REAL,
    expirationDate TEXT,
    transactionDate TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (inventoryId) REFERENCES Inventory(id) ON DELETE CASCADE
);

-- Inventory Calculations
CREATE TABLE InventoryCalculations (
    id TEXT PRIMARY KEY,
    productId TEXT NOT NULL,
    avgDailyDemands REAL NOT NULL,
    eoq REAL NOT NULL,
    reorderPoint REAL NOT NULL,
    safetyStock REAL NOT NULL,
    averageDailySales REAL NOT NULL,
    leadTimeDays REAL DEFAULT 7 NOT NULL,
    demandStdDev REAL NOT NULL,
    leadTimeStdDev REAL NOT NULL,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (productId) REFERENCES Inventory(id) ON DELETE CASCADE
);

-- Breakdown history
CREATE TABLE BreakdownHistory (
    id TEXT PRIMARY KEY,
    inventoryId TEXT,
    date TEXT DEFAULT CURRENT_TIMESTAMP,
    fromUnit TEXT,
    toUnit TEXT,
    quantity REAL,
    loss REAL,
    notes TEXT,
    FOREIGN KEY (inventoryId) REFERENCES Inventory(id) ON DELETE CASCADE
);

-- Inventory-Vendor relationship (Many-to-Many)
CREATE TABLE InventoryVendor (
    id TEXT PRIMARY KEY,
    inventoryId TEXT,
    vendorId TEXT,
    FOREIGN KEY (inventoryId) REFERENCES Inventory(id) ON DELETE CASCADE,
    FOREIGN KEY (vendorId) REFERENCES Vendor(id) ON DELETE CASCADE,
    UNIQUE(inventoryId, vendorId)
);

-- Customer table
CREATE TABLE Customer (
    id TEXT PRIMARY KEY,
    belongsTo TEXT NOT NULL,
    company TEXT DEFAULT 'nocompany',
    name TEXT NOT NULL,
    address TEXT,
    city TEXT,
    loyaltyPoints REAL DEFAULT 0,
    totalSpent REAL DEFAULT 0,
    lastPurchaseDate TEXT,
    notes TEXT,
    deleted INTEGER DEFAULT 0,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (belongsTo) REFERENCES Company(id) ON DELETE CASCADE,
    UNIQUE(belongsTo, name, company)
);

-- Customer phone numbers (One-to-Many)
CREATE TABLE CustomerPhone (
    id TEXT PRIMARY KEY,
    customerId TEXT,
    phone TEXT,
    FOREIGN KEY (customerId) REFERENCES Customer(id) ON DELETE CASCADE
);

-- Customer emails (One-to-Many)
CREATE TABLE CustomerEmail (
    id TEXT PRIMARY KEY,
    customerId TEXT,
    email TEXT,
    FOREIGN KEY (customerId) REFERENCES Customer(id) ON DELETE CASCADE
);

-- Vendor table
CREATE TABLE Vendor (
    id TEXT PRIMARY KEY,
    companyId TEXT NOT NULL,
    name TEXT NOT NULL,
    contact_person TEXT NOT NULL,
    email TEXT,
    address TEXT,
    phone TEXT,
    taxId TEXT,
    paymentTerms TEXT,
    balance REAL DEFAULT 0,
    status TEXT DEFAULT 'active',
    notes TEXT,
    lastPurchaseDate TEXT,
    totalPurchases REAL DEFAULT 0,
    totalAmount REAL DEFAULT 0,
    deleted INTEGER DEFAULT 0,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (companyId) REFERENCES Company(id) ON DELETE CASCADE,
    UNIQUE(companyId, name)
);

-- Receipt table
CREATE TABLE Receipt (
    id TEXT PRIMARY KEY,
    companyId TEXT NOT NULL,
    workerId TEXT,
    customerId TEXT,
    debtId TEXT,
    total REAL NOT NULL,
    amountPaid REAL NOT NULL,
    discount REAL DEFAULT 0,
    balance REAL DEFAULT 0,
    profit REAL NOT NULL,
    paymentMethod TEXT DEFAULT 'cash',
    flagged INTEGER DEFAULT 0,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (companyId) REFERENCES Company(id) ON DELETE CASCADE,
    FOREIGN KEY (workerId) REFERENCES Worker(id) ON DELETE SET NULL,
    FOREIGN KEY (customerId) REFERENCES Customer(id) ON DELETE SET NULL,
    FOREIGN KEY (debtId) REFERENCES Debt(id) ON DELETE SET NULL
);

-- Receipt details (One-to-Many)
CREATE TABLE ReceiptDetail (
    id TEXT PRIMARY KEY,
    receiptId TEXT,
    name TEXT NOT NULL,
    quantity REAL NOT NULL,
    costPrice REAL NOT NULL,
    salesPrice REAL NOT NULL,
    -- New fields for unit tracking
    salesUnit TEXT,
    originalQuantity REAL,
    baseUnitQuantity REAL,
    conversionRate REAL DEFAULT 1,
    atomicQuantity REAL,
    totalPrice REAL,
    FOREIGN KEY (receiptId) REFERENCES Receipt(id) ON DELETE CASCADE
);

-- Debt table
CREATE TABLE Debt (
    id TEXT PRIMARY KEY,
    companyId TEXT,
    workerId TEXT,
    customerId TEXT NOT NULL,
    receiptId TEXT,
    amount REAL NOT NULL,
    status TEXT DEFAULT 'pending',
    dueDate TEXT,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (companyId) REFERENCES Company(id) ON DELETE CASCADE,
    FOREIGN KEY (workerId) REFERENCES Worker(id) ON DELETE SET NULL,
    FOREIGN KEY (customerId) REFERENCES Customer(id) ON DELETE CASCADE,
    FOREIGN KEY (receiptId) REFERENCES Receipt(id) ON DELETE SET NULL,
    UNIQUE(receiptId) -- Prevent duplicate debts for the same receipt
);

-- Debt payments (One-to-Many)
CREATE TABLE DebtPayment (
    id TEXT PRIMARY KEY,
    debtId TEXT,
    date TEXT DEFAULT CURRENT_TIMESTAMP,
    amountPaid REAL NOT NULL,
    workerId TEXT,
    paymentMethod TEXT DEFAULT 'cash',
    FOREIGN KEY (debtId) REFERENCES Debt(id) ON DELETE CASCADE,
    FOREIGN KEY (workerId) REFERENCES Worker(id) ON DELETE SET NULL
);

-- Notification table
CREATE TABLE Notification (
    id TEXT PRIMARY KEY,
    companyId TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'unread',
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (companyId) REFERENCES Company(id) ON DELETE CASCADE
);

-- Supplies table
CREATE TABLE Supplies (
    id TEXT PRIMARY KEY,
    companyId TEXT,
    supplierId TEXT,
    totalCost REAL,
    totalQuantity REAL,
    amountPaid REAL DEFAULT 0,
    discount REAL DEFAULT 0,
    balance REAL DEFAULT 0,
    status TEXT DEFAULT 'pending',
    restockDate TEXT DEFAULT CURRENT_TIMESTAMP,
    restockedBy TEXT NOT NULL,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (companyId) REFERENCES Company(id) ON DELETE CASCADE,
    FOREIGN KEY (supplierId) REFERENCES Vendor(id) ON DELETE SET NULL,
    FOREIGN KEY (restockedBy) REFERENCES Worker(id) ON DELETE RESTRICT
);

-- Supplies details (One-to-Many)
CREATE TABLE SuppliesDetail (
    id TEXT PRIMARY KEY,
    suppliesId TEXT,
    name TEXT NOT NULL,
    quantity REAL NOT NULL,
    costPrice REAL NOT NULL,
    salesPrice REAL NOT NULL,
    totalPrice REAL NOT NULL,
    FOREIGN KEY (suppliesId) REFERENCES Supplies(id) ON DELETE CASCADE
);

-- Purchases table
CREATE TABLE Purchases (
    id TEXT PRIMARY KEY,
    vendorId TEXT NOT NULL,    -- ✅ Added comma
    companyId TEXT NOT NULL,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (vendorId) REFERENCES Vendor(id) ON DELETE CASCADE,  -- ✅ Added comma and fixed reference
    FOREIGN KEY (companyId) REFERENCES Company(id) ON DELETE CASCADE  -- ✅ Removed duplicate
);

-- Purchases details (One-to-Many)
CREATE TABLE PurchasesDetail (
    id TEXT PRIMARY KEY,
    purchasesId TEXT,
    name TEXT NOT NULL,
    quantity REAL NOT NULL,
    costPrice REAL NOT NULL,
    salesPrice REAL NOT NULL,
    FOREIGN KEY (purchasesId) REFERENCES Purchases(id) ON DELETE CASCADE
);

-- Purchase Order table
CREATE TABLE PurchaseOrder (
    id TEXT PRIMARY KEY,
    companyId TEXT NOT NULL,
    vendorId TEXT NOT NULL,
    orderNumber TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    totalAmount REAL NOT NULL,
    paymentStatus TEXT DEFAULT 'unpaid',
    amountPaid REAL DEFAULT 0,
    dueDate TEXT,
    notes TEXT,
    orderedBy TEXT NOT NULL,
    receivedBy TEXT,
    receivedAt TEXT,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (companyId) REFERENCES Company(id) ON DELETE CASCADE,
    FOREIGN KEY (vendorId) REFERENCES Vendor(id) ON DELETE CASCADE,
    FOREIGN KEY (orderedBy) REFERENCES Worker(id) ON DELETE RESTRICT,
    FOREIGN KEY (receivedBy) REFERENCES Worker(id) ON DELETE SET NULL,
    UNIQUE(companyId, orderNumber)
);

-- Purchase Order items (One-to-Many)
CREATE TABLE PurchaseOrderItem (
    id TEXT PRIMARY KEY,
    purchaseOrderId TEXT,
    productId TEXT NOT NULL,
    quantity REAL NOT NULL,
    unit TEXT NOT NULL,
    costPrice REAL NOT NULL,
    totalCost REAL NOT NULL,
    FOREIGN KEY (purchaseOrderId) REFERENCES PurchaseOrder(id) ON DELETE CASCADE,
    FOREIGN KEY (productId) REFERENCES Inventory(id) ON DELETE RESTRICT
);

-- Vendor Payment table
CREATE TABLE VendorPayment (
    id TEXT PRIMARY KEY,
    companyId TEXT NOT NULL,
    vendorId TEXT NOT NULL,
    purchaseOrderId TEXT,
    amount REAL NOT NULL,
    paymentDate TEXT NOT NULL,
    paymentMethod TEXT NOT NULL,
    reference TEXT,
    notes TEXT,
    processedBy TEXT NOT NULL,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (companyId) REFERENCES Company(id) ON DELETE CASCADE,
    FOREIGN KEY (vendorId) REFERENCES Vendor(id) ON DELETE CASCADE,
    FOREIGN KEY (purchaseOrderId) REFERENCES PurchaseOrder(id) ON DELETE SET NULL,
    FOREIGN KEY (processedBy) REFERENCES Worker(id) ON DELETE RESTRICT
);

-- Create indexes for better performance
CREATE INDEX idx_worker_company ON Worker(companyId);
CREATE INDEX idx_inventory_company ON Inventory(companyId);
CREATE INDEX idx_customer_company ON Customer(belongsTo);
CREATE INDEX idx_vendor_company ON Vendor(companyId);
CREATE INDEX idx_receipt_company ON Receipt(companyId);
CREATE INDEX idx_debt_customer ON Debt(customerId);
CREATE INDEX idx_debt_company ON Debt(companyId);
CREATE INDEX idx_purchase_order_company ON PurchaseOrder(companyId);
CREATE INDEX idx_purchase_order_vendor ON PurchaseOrder(vendorId, companyId);
CREATE INDEX idx_vendor_payment_vendor ON VendorPayment(vendorId, companyId);

-- Device table for POS management
CREATE TABLE Device (
    id TEXT PRIMARY KEY,
    companyId TEXT NOT NULL,
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
CREATE TABLE EventLog (
    id TEXT PRIMARY KEY,
    companyId TEXT NOT NULL,
    eventType TEXT NOT NULL, -- 'COMPANY_UPDATE', 'INVENTORY_CHANGE', etc.
    payload TEXT NOT NULL, -- JSON string
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (companyId) REFERENCES Company(id) ON DELETE CASCADE
);

CREATE INDEX idx_eventlog_company ON EventLog(companyId);
CREATE INDEX idx_eventlog_created ON EventLog(createdAt);

-- Sync State for Umbrella Event Replay
CREATE TABLE SyncState (
    key TEXT PRIMARY KEY, -- e.g., 'umbrella_events'
    lastSyncedId INTEGER DEFAULT 0,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
);

-- MIGRATION ONLY BEGIN Currency Normalization
BEGIN TRANSACTION;

-- Ensure Currency table exists and is seeded
CREATE TABLE IF NOT EXISTS Currency (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    symbol TEXT,
    decimals INTEGER DEFAULT 2
);

INSERT OR IGNORE INTO Currency (code, name, symbol, decimals) VALUES
    ('USD', 'US Dollar', '$', 2),
    ('EUR', 'Euro', '€', 2),
    ('GBP', 'British Pound', '£', 2),
    ('GHS', 'Ghanaian Cedi', '₵', 2),
    ('TZS', 'Tanzanian Shilling', 'Sh', 2);

-- Recreate Company with currencyCode FK
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
    receiptTemplate TEXT DEFAULT 'template1',
    receiptHeader TEXT,
    receiptFooter TEXT,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO Company_new (
  id, companyName, email, password, isEmailVerified, emailVerificationToken,
  emailVerificationExpires, passwordResetToken, passwordResetExpires, refreshToken,
  contact, location, taxRate, currencyCode, currentPlan, emailNotifications, momo,
  nextBillingDate, paymentMethod, paymentProvider, smsNotifications, storeAddress,
  taxId, tinNumber, receiptTemplate, receiptHeader, receiptFooter, createdAt, updatedAt
)
SELECT 
  id, companyName, email, password, isEmailVerified, emailVerificationToken,
  emailVerificationExpires, passwordResetToken, passwordResetExpires, refreshToken,
  contact, location, taxRate, COALESCE(currency, 'GHS'), currentPlan, emailNotifications, momo,
  nextBillingDate, paymentMethod, paymentProvider, smsNotifications, storeAddress,
  taxId, tinNumber, receiptTemplate, receiptHeader, receiptFooter, createdAt, updatedAt
FROM Company;

DROP TABLE Company;
ALTER TABLE Company_new RENAME TO Company;

-- Recreate Settings with currencyCode FK
CREATE TABLE Settings_new (
    id TEXT PRIMARY KEY,
    companyId TEXT NOT NULL,
    emailNotifications INTEGER DEFAULT 1,
    smsNotifications INTEGER DEFAULT 0,
    currencyCode TEXT REFERENCES Currency(code) DEFAULT 'GHS',
    theme TEXT DEFAULT 'light',
    roundingSales INTEGER DEFAULT 0,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (companyId) REFERENCES Company(id) ON DELETE CASCADE
);

INSERT INTO Settings_new (
  id, companyId, emailNotifications, smsNotifications, currencyCode, theme, roundingSales, createdAt, updatedAt
)
SELECT 
  id, companyId, emailNotifications, smsNotifications, COALESCE(currency, 'GHS'), theme, roundingSales, createdAt, updatedAt
FROM Settings;

DROP TABLE Settings;
ALTER TABLE Settings_new RENAME TO Settings;

COMMIT;
-- MIGRATION ONLY END Currency Normalization
