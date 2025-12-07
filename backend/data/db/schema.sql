-- SQLite schema for Sophon database (Corrected Version)

-- Enable foreign keys
PRAGMA foreign_keys = ON;

-- Currency reference table (ISO 4217 codes)
CREATE TABLE IF NOT EXISTS Currency (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    symbol TEXT,
    decimals INTEGER DEFAULT 2
);

-- Seed common currencies
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
    isEmailVerified INTEGER DEFAULT 0 CHECK(isEmailVerified IN (0,1)),
    emailVerificationToken TEXT,
    emailVerificationExpires TEXT,
    passwordResetToken TEXT,
    passwordResetExpires TEXT,
    refreshToken TEXT,
    contact TEXT,
    location TEXT,
    taxRate REAL CHECK(taxRate >= 0 AND taxRate <= 100),
    currencyCode TEXT NOT NULL DEFAULT 'GHS' REFERENCES Currency(code),
    currentPlan TEXT,
    emailNotifications INTEGER DEFAULT 0 CHECK(emailNotifications IN (0,1)),
    momo TEXT,
    nextBillingDate TEXT,
    paymentMethod TEXT,
    paymentProvider TEXT,
    smsNotifications INTEGER DEFAULT 0 CHECK(smsNotifications IN (0,1)),
    storeAddress TEXT,
    taxId TEXT,
    tinNumber TEXT,
    taxMode TEXT DEFAULT 'independent' CHECK(taxMode IN ('independent', 'umbrella')),
    parentCompanyId TEXT REFERENCES Company(id) ON DELETE SET NULL,
    taxIdType TEXT DEFAULT 'TIN' CHECK(taxIdType IN ('TIN', 'GH-Card')),
    receiptTemplate TEXT DEFAULT 'template1',
    receiptHeader TEXT,
    receiptFooter TEXT,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
    sync_id TEXT,
    is_synced INTEGER DEFAULT 0 CHECK(is_synced IN (0,1)),
    last_synced_at TEXT,
    sync_version INTEGER DEFAULT 1,
    CHECK(taxMode = 'umbrella' OR parentCompanyId IS NULL)
);

-- Company Network (Parent/Child relationships)
CREATE TABLE CompanyNetwork (
    id TEXT PRIMARY KEY,
    sourceCompanyId TEXT NOT NULL,
    targetCompanyId TEXT NOT NULL,
    relationshipType TEXT NOT NULL CHECK(relationshipType IN ('subsidiary', 'partner', 'branch')),
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'suspended')),
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
    sync_id TEXT,
    is_synced INTEGER DEFAULT 0 CHECK(is_synced IN (0,1)),
    last_synced_at TEXT,
    sync_version INTEGER DEFAULT 1,
    FOREIGN KEY (sourceCompanyId) REFERENCES Company(id) ON DELETE CASCADE,
    FOREIGN KEY (targetCompanyId) REFERENCES Company(id) ON DELETE CASCADE,
    UNIQUE(sourceCompanyId, targetCompanyId),
    CHECK(sourceCompanyId != targetCompanyId)
);

-- Company allowed units (Many-to-Many relationship)
CREATE TABLE CompanyAllowedUnits (
    id TEXT PRIMARY KEY,
    companyId TEXT NOT NULL,
    unit TEXT NOT NULL,
    sync_id TEXT,
    is_synced INTEGER DEFAULT 0 CHECK(is_synced IN (0,1)),
    last_synced_at TEXT,
    sync_version INTEGER DEFAULT 1,
    FOREIGN KEY (companyId) REFERENCES Company(id) ON DELETE CASCADE,
    UNIQUE(companyId, unit)
);

-- Company allowed categories (Many-to-Many relationship)
CREATE TABLE CompanyAllowedCategories (
    id TEXT PRIMARY KEY,
    companyId TEXT NOT NULL,
    category TEXT NOT NULL,
    sync_id TEXT,
    is_synced INTEGER DEFAULT 0 CHECK(is_synced IN (0,1)),
    last_synced_at TEXT,
    sync_version INTEGER DEFAULT 1,
    FOREIGN KEY (companyId) REFERENCES Company(id) ON DELETE CASCADE,
    UNIQUE(companyId, category)
);

-- Settings table
CREATE TABLE Settings (
    id TEXT PRIMARY KEY,
    companyId TEXT NOT NULL,
    emailNotifications INTEGER DEFAULT 1 CHECK(emailNotifications IN (0,1)),
    smsNotifications INTEGER DEFAULT 0 CHECK(smsNotifications IN (0,1)),
    currencyCode TEXT NOT NULL DEFAULT 'GHS' REFERENCES Currency(code),
    theme TEXT DEFAULT 'light' CHECK(theme IN ('light', 'dark')),
    roundingSales INTEGER DEFAULT 0 CHECK(roundingSales IN (0,1)),
    lockReceiptsOlderThanDay INTEGER DEFAULT 0 CHECK(lockReceiptsOlderThanDay IN (0,1)),
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
    sync_id TEXT,
    is_synced INTEGER DEFAULT 0 CHECK(is_synced IN (0,1)),
    last_synced_at TEXT,
    sync_version INTEGER DEFAULT 1,
    FOREIGN KEY (companyId) REFERENCES Company(id) ON DELETE CASCADE
);

-- User access roles for settings
CREATE TABLE UserAccessRoles (
    id TEXT PRIMARY KEY,
    settingsId TEXT NOT NULL,
    userId TEXT NOT NULL,
    role TEXT DEFAULT 'sales' CHECK(role IN ('admin', 'manager', 'sales', 'inventory', 'viewer')),
    sync_id TEXT,
    is_synced INTEGER DEFAULT 0 CHECK(is_synced IN (0,1)),
    last_synced_at TEXT,
    sync_version INTEGER DEFAULT 1,
    FOREIGN KEY (settingsId) REFERENCES Settings(id) ON DELETE CASCADE,
    UNIQUE(settingsId, userId)
);

-- Worker table
CREATE TABLE Worker (
    id TEXT PRIMARY KEY,
    companyId TEXT NOT NULL,
    adminstatus INTEGER DEFAULT 0 CHECK(adminstatus IN (0,1)),
    name TEXT NOT NULL,
    username TEXT,
    contact TEXT,
    email TEXT,
    password TEXT NOT NULL,
    role TEXT CHECK(role IN ('admin', 'manager', 'sales', 'inventory', 'cashier')),
    deleted INTEGER DEFAULT 0 CHECK(deleted IN (0,1)),
    isEmailVerified INTEGER DEFAULT 0 CHECK(isEmailVerified IN (0,1)),
    emailVerificationToken TEXT,
    emailVerificationExpires TEXT,
    passwordResetToken TEXT,
    passwordResetExpires TEXT,
    refreshToken TEXT,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
    sync_id TEXT,
    is_synced INTEGER DEFAULT 0 CHECK(is_synced IN (0,1)),
    last_synced_at TEXT,
    sync_version INTEGER DEFAULT 1,
    FOREIGN KEY (companyId) REFERENCES Company(id) ON DELETE CASCADE,
    UNIQUE(companyId, username)
);

-- Inventory table
CREATE TABLE Inventory (
    id TEXT PRIMARY KEY,
    companyId TEXT NOT NULL,
    name TEXT NOT NULL,
    category TEXT DEFAULT 'none',
    baseUnit TEXT DEFAULT 'none',
    costPrice REAL DEFAULT 0 CHECK(costPrice >= 0),
    salesPrice REAL NOT NULL CHECK(salesPrice >= 0),
    onhand REAL DEFAULT 0 CHECK(onhand >= 0),
    deleted INTEGER DEFAULT 0 CHECK(deleted IN (0,1)),
    reorderPoint REAL DEFAULT 0 CHECK(reorderPoint >= 0),
    minimumStock REAL DEFAULT 0 CHECK(minimumStock >= 0),
    description TEXT,
    sku TEXT,
    barcode TEXT,
    allowsUnitBreakdown INTEGER DEFAULT 0 CHECK(allowsUnitBreakdown IN (0,1)),
    atomicUnit TEXT,
    atomicUnitQuantity REAL CHECK(atomicUnitQuantity IS NULL OR atomicUnitQuantity > 0),
    lossFactor REAL DEFAULT 0 CHECK(lossFactor >= 0 AND lossFactor <= 100),
    lastBreakdownDate TEXT,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
    sync_id TEXT,
    is_synced INTEGER DEFAULT 0 CHECK(is_synced IN (0,1)),
    last_synced_at TEXT,
    sync_version INTEGER DEFAULT 1,
    FOREIGN KEY (companyId) REFERENCES Company(id) ON DELETE CASCADE,
    UNIQUE(companyId, name),
    UNIQUE(companyId, sku),
    UNIQUE(companyId, barcode)
);

-- Inventory units (Many-to-Many relationship)
CREATE TABLE InventoryUnits (
    id TEXT PRIMARY KEY,
    inventoryId TEXT NOT NULL,
    unit TEXT NOT NULL,
    sync_id TEXT,
    is_synced INTEGER DEFAULT 0 CHECK(is_synced IN (0,1)),
    last_synced_at TEXT,
    sync_version INTEGER DEFAULT 1,
    FOREIGN KEY (inventoryId) REFERENCES Inventory(id) ON DELETE CASCADE,
    UNIQUE(inventoryId, unit)
);

-- Unit conversions
CREATE TABLE UnitConversion (
    id TEXT PRIMARY KEY,
    inventoryId TEXT NOT NULL,
    fromUnit TEXT NOT NULL,
    toUnit TEXT NOT NULL,
    conversionRate REAL NOT NULL CHECK(conversionRate > 0),
    unitPrice REAL NOT NULL CHECK(unitPrice >= 0),
    sync_id TEXT,
    is_synced INTEGER DEFAULT 0 CHECK(is_synced IN (0,1)),
    last_synced_at TEXT,
    sync_version INTEGER DEFAULT 1,
    FOREIGN KEY (inventoryId) REFERENCES Inventory(id) ON DELETE CASCADE,
    UNIQUE(inventoryId, fromUnit, toUnit)
);

-- Price history
CREATE TABLE PriceChange (
    id TEXT PRIMARY KEY,
    inventoryId TEXT NOT NULL,
    date TEXT DEFAULT CURRENT_TIMESTAMP,
    costPrice REAL CHECK(costPrice >= 0),
    salesPrice REAL CHECK(salesPrice >= 0),
    sync_id TEXT,
    is_synced INTEGER DEFAULT 0 CHECK(is_synced IN (0,1)),
    last_synced_at TEXT,
    sync_version INTEGER DEFAULT 1,
    FOREIGN KEY (inventoryId) REFERENCES Inventory(id) ON DELETE CASCADE
);

-- Stock transactions
CREATE TABLE StockTransaction (
    id TEXT PRIMARY KEY,
    inventoryId TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('inbound', 'outbound', 'adjustment', 'breakdown')),
    quantity REAL NOT NULL,
    costPrice REAL NOT NULL CHECK(costPrice >= 0),
    salesPrice REAL CHECK(salesPrice >= 0),
    expirationDate TEXT,
    transactionDate TEXT DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    sync_id TEXT,
    is_synced INTEGER DEFAULT 0 CHECK(is_synced IN (0,1)),
    last_synced_at TEXT,
    sync_version INTEGER DEFAULT 1,
    FOREIGN KEY (inventoryId) REFERENCES Inventory(id) ON DELETE CASCADE
);

-- Inventory Calculations
CREATE TABLE InventoryCalculations (
    id TEXT PRIMARY KEY,
    productId TEXT NOT NULL,
    avgDailyDemands REAL NOT NULL CHECK(avgDailyDemands >= 0),
    eoq REAL NOT NULL CHECK(eoq >= 0),
    reorderPoint REAL NOT NULL CHECK(reorderPoint >= 0),
    safetyStock REAL NOT NULL CHECK(safetyStock >= 0),
    averageDailySales REAL NOT NULL CHECK(averageDailySales >= 0),
    leadTimeDays REAL DEFAULT 7 NOT NULL CHECK(leadTimeDays >= 0),
    demandStdDev REAL NOT NULL CHECK(demandStdDev >= 0),
    leadTimeStdDev REAL NOT NULL CHECK(leadTimeStdDev >= 0),
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
    sync_id TEXT,
    is_synced INTEGER DEFAULT 0 CHECK(is_synced IN (0,1)),
    last_synced_at TEXT,
    sync_version INTEGER DEFAULT 1,
    FOREIGN KEY (productId) REFERENCES Inventory(id) ON DELETE CASCADE,
    UNIQUE(productId)
);

-- Breakdown history
CREATE TABLE BreakdownHistory (
    id TEXT PRIMARY KEY,
    inventoryId TEXT NOT NULL,
    date TEXT DEFAULT CURRENT_TIMESTAMP,
    fromUnit TEXT NOT NULL,
    toUnit TEXT NOT NULL,
    quantity REAL NOT NULL CHECK(quantity > 0),
    loss REAL DEFAULT 0 CHECK(loss >= 0),
    notes TEXT,
    sync_id TEXT,
    is_synced INTEGER DEFAULT 0 CHECK(is_synced IN (0,1)),
    last_synced_at TEXT,
    sync_version INTEGER DEFAULT 1,
    FOREIGN KEY (inventoryId) REFERENCES Inventory(id) ON DELETE CASCADE
);

-- Vendor table
CREATE TABLE Vendor (
    id TEXT PRIMARY KEY,
    companyId TEXT NOT NULL,
    name TEXT NOT NULL,
    contactPerson TEXT NOT NULL,
    email TEXT,
    address TEXT,
    phone TEXT,
    taxId TEXT,
    paymentTerms TEXT,
    balance REAL DEFAULT 0,
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'suspended')),
    notes TEXT,
    lastPurchaseDate TEXT,
    totalPurchases REAL DEFAULT 0 CHECK(totalPurchases >= 0),
    totalAmount REAL DEFAULT 0,
    deleted INTEGER DEFAULT 0 CHECK(deleted IN (0,1)),
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
    sync_id TEXT,
    is_synced INTEGER DEFAULT 0 CHECK(is_synced IN (0,1)),
    last_synced_at TEXT,
    sync_version INTEGER DEFAULT 1,
    FOREIGN KEY (companyId) REFERENCES Company(id) ON DELETE CASCADE,
    UNIQUE(companyId, name)
);

-- Inventory-Vendor relationship (Many-to-Many)
CREATE TABLE InventoryVendor (
    id TEXT PRIMARY KEY,
    inventoryId TEXT NOT NULL,
    vendorId TEXT NOT NULL,
    sync_id TEXT,
    is_synced INTEGER DEFAULT 0 CHECK(is_synced IN (0,1)),
    last_synced_at TEXT,
    sync_version INTEGER DEFAULT 1,
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
    loyaltyPoints REAL DEFAULT 0 CHECK(loyaltyPoints >= 0),
    totalSpent REAL DEFAULT 0 CHECK(totalSpent >= 0),
    lastPurchaseDate TEXT,
    notes TEXT,
    deleted INTEGER DEFAULT 0 CHECK(deleted IN (0,1)),
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
    sync_id TEXT,
    is_synced INTEGER DEFAULT 0 CHECK(is_synced IN (0,1)),
    last_synced_at TEXT,
    sync_version INTEGER DEFAULT 1,
    FOREIGN KEY (belongsTo) REFERENCES Company(id) ON DELETE CASCADE,
    UNIQUE(belongsTo, name, company)
);

-- Customer phone numbers (One-to-Many)
CREATE TABLE CustomerPhone (
    id TEXT PRIMARY KEY,
    customerId TEXT NOT NULL,
    phone TEXT NOT NULL,
    sync_id TEXT,
    is_synced INTEGER DEFAULT 0 CHECK(is_synced IN (0,1)),
    last_synced_at TEXT,
    sync_version INTEGER DEFAULT 1,
    FOREIGN KEY (customerId) REFERENCES Customer(id) ON DELETE CASCADE,
    UNIQUE(customerId, phone)
);

-- Customer emails (One-to-Many)
CREATE TABLE CustomerEmail (
    id TEXT PRIMARY KEY,
    customerId TEXT NOT NULL,
    email TEXT NOT NULL,
    sync_id TEXT,
    is_synced INTEGER DEFAULT 0 CHECK(is_synced IN (0,1)),
    last_synced_at TEXT,
    sync_version INTEGER DEFAULT 1,
    FOREIGN KEY (customerId) REFERENCES Customer(id) ON DELETE CASCADE,
    UNIQUE(customerId, email)
);

-- Debt table (no FK to Receipt - relationship managed via Receipt.debtId)
CREATE TABLE Debt (
    id TEXT PRIMARY KEY,
    companyId TEXT NOT NULL,
    workerId TEXT,
    customerId TEXT NOT NULL,
    amount REAL NOT NULL CHECK(amount >= 0),
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'partial', 'paid', 'overdue', 'written_off')),
    dueDate TEXT,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
    sync_id TEXT,
    is_synced INTEGER DEFAULT 0 CHECK(is_synced IN (0,1)),
    last_synced_at TEXT,
    sync_version INTEGER DEFAULT 1,
    FOREIGN KEY (companyId) REFERENCES Company(id) ON DELETE CASCADE,
    FOREIGN KEY (workerId) REFERENCES Worker(id) ON DELETE SET NULL,
    FOREIGN KEY (customerId) REFERENCES Customer(id) ON DELETE CASCADE
);

-- Debt payments (One-to-Many)
CREATE TABLE DebtPayment (
    id TEXT PRIMARY KEY,
    debtId TEXT NOT NULL,
    date TEXT DEFAULT CURRENT_TIMESTAMP,
    amountPaid REAL NOT NULL CHECK(amountPaid > 0),
    workerId TEXT,
    paymentMethod TEXT DEFAULT 'cash' CHECK(paymentMethod IN ('cash', 'card', 'mobile_money', 'bank_transfer', 'cheque')),
    sync_id TEXT,
    is_synced INTEGER DEFAULT 0 CHECK(is_synced IN (0,1)),
    last_synced_at TEXT,
    sync_version INTEGER DEFAULT 1,
    FOREIGN KEY (debtId) REFERENCES Debt(id) ON DELETE CASCADE,
    FOREIGN KEY (workerId) REFERENCES Worker(id) ON DELETE SET NULL
);

-- Receipt table
CREATE TABLE Receipt (
    id TEXT PRIMARY KEY,
    companyId TEXT NOT NULL,
    workerId TEXT,
    customerId TEXT,
    debtId TEXT,
    total REAL NOT NULL CHECK(total >= 0),
    amountPaid REAL NOT NULL CHECK(amountPaid >= 0),
    discount REAL DEFAULT 0 CHECK(discount >= 0),
    balance REAL DEFAULT 0,
    profit REAL NOT NULL,
    paymentMethod TEXT DEFAULT 'cash' CHECK(paymentMethod IN ('cash', 'card', 'mobile_money', 'bank_transfer', 'cheque', 'split')),
    flagged INTEGER DEFAULT 0 CHECK(flagged IN (0,1)),
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
    sync_id TEXT,
    is_synced INTEGER DEFAULT 0 CHECK(is_synced IN (0,1)),
    last_synced_at TEXT,
    sync_version INTEGER DEFAULT 1,
    FOREIGN KEY (companyId) REFERENCES Company(id) ON DELETE CASCADE,
    FOREIGN KEY (workerId) REFERENCES Worker(id) ON DELETE SET NULL,
    FOREIGN KEY (customerId) REFERENCES Customer(id) ON DELETE SET NULL,
    FOREIGN KEY (debtId) REFERENCES Debt(id) ON DELETE SET NULL,
    CHECK(amountPaid <= total + discount),
    UNIQUE(debtId)
);

-- Receipt details (One-to-Many)
CREATE TABLE ReceiptDetail (
    id TEXT PRIMARY KEY,
    receiptId TEXT NOT NULL,
    inventoryId TEXT,
    name TEXT NOT NULL,
    quantity REAL NOT NULL CHECK(quantity > 0),
    costPrice REAL NOT NULL CHECK(costPrice >= 0),
    salesPrice REAL NOT NULL CHECK(salesPrice >= 0),
    salesUnit TEXT,
    originalQuantity REAL,
    baseUnitQuantity REAL,
    conversionRate REAL DEFAULT 1 CHECK(conversionRate > 0),
    atomicQuantity REAL,
    totalPrice REAL NOT NULL CHECK(totalPrice >= 0),
    sync_id TEXT,
    is_synced INTEGER DEFAULT 0 CHECK(is_synced IN (0,1)),
    last_synced_at TEXT,
    sync_version INTEGER DEFAULT 1,
    FOREIGN KEY (receiptId) REFERENCES Receipt(id) ON DELETE CASCADE,
    FOREIGN KEY (inventoryId) REFERENCES Inventory(id) ON DELETE SET NULL
);

-- Notification table
CREATE TABLE Notification (
    id TEXT PRIMARY KEY,
    companyId TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT CHECK(type IN ('info', 'warning', 'error', 'success')),
    status TEXT DEFAULT 'unread' CHECK(status IN ('unread', 'read', 'archived')),
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
    sync_id TEXT,
    is_synced INTEGER DEFAULT 0 CHECK(is_synced IN (0,1)),
    last_synced_at TEXT,
    sync_version INTEGER DEFAULT 1,
    FOREIGN KEY (companyId) REFERENCES Company(id) ON DELETE CASCADE
);

-- Supplies table
CREATE TABLE Supplies (
    id TEXT PRIMARY KEY,
    companyId TEXT NOT NULL,
    supplierId TEXT,
    totalCost REAL CHECK(totalCost >= 0),
    totalQuantity REAL CHECK(totalQuantity >= 0),
    amountPaid REAL DEFAULT 0 CHECK(amountPaid >= 0),
    discount REAL DEFAULT 0 CHECK(discount >= 0),
    balance REAL DEFAULT 0,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'partial', 'completed', 'cancelled')),
    restockDate TEXT DEFAULT CURRENT_TIMESTAMP,
    restockedBy TEXT NOT NULL,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
    sync_id TEXT,
    is_synced INTEGER DEFAULT 0 CHECK(is_synced IN (0,1)),
    last_synced_at TEXT,
    sync_version INTEGER DEFAULT 1,
    FOREIGN KEY (companyId) REFERENCES Company(id) ON DELETE CASCADE,
    FOREIGN KEY (supplierId) REFERENCES Vendor(id) ON DELETE SET NULL,
    FOREIGN KEY (restockedBy) REFERENCES Worker(id) ON DELETE RESTRICT
);

-- Supplies details (One-to-Many)
CREATE TABLE SuppliesDetail (
    id TEXT PRIMARY KEY,
    suppliesId TEXT NOT NULL,
    name TEXT NOT NULL,
    quantity REAL NOT NULL CHECK(quantity > 0),
    costPrice REAL NOT NULL CHECK(costPrice >= 0),
    salesPrice REAL NOT NULL CHECK(salesPrice >= 0),
    totalPrice REAL NOT NULL CHECK(totalPrice >= 0),
    sync_id TEXT,
    is_synced INTEGER DEFAULT 0 CHECK(is_synced IN (0,1)),
    last_synced_at TEXT,
    sync_version INTEGER DEFAULT 1,
    FOREIGN KEY (suppliesId) REFERENCES Supplies(id) ON DELETE CASCADE
);

-- Purchases table
CREATE TABLE Purchases (
    id TEXT PRIMARY KEY,
    vendorId TEXT NOT NULL,
    companyId TEXT NOT NULL,
    totalAmount REAL CHECK(totalAmount >= 0),
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
    sync_id TEXT,
    is_synced INTEGER DEFAULT 0 CHECK(is_synced IN (0,1)),
    last_synced_at TEXT,
    sync_version INTEGER DEFAULT 1,
    FOREIGN KEY (vendorId) REFERENCES Vendor(id) ON DELETE CASCADE,
    FOREIGN KEY (companyId) REFERENCES Company(id) ON DELETE CASCADE
);

-- Purchases details (One-to-Many)
CREATE TABLE PurchasesDetail (
    id TEXT PRIMARY KEY,
    purchasesId TEXT NOT NULL,
    name TEXT NOT NULL,
    quantity REAL NOT NULL CHECK(quantity > 0),
    costPrice REAL NOT NULL CHECK(costPrice >= 0),
    salesPrice REAL NOT NULL CHECK(salesPrice >= 0),
    sync_id TEXT,
    is_synced INTEGER DEFAULT 0 CHECK(is_synced IN (0,1)),
    last_synced_at TEXT,
    sync_version INTEGER DEFAULT 1,
    FOREIGN KEY (purchasesId) REFERENCES Purchases(id) ON DELETE CASCADE
);

-- Purchase Order table
CREATE TABLE PurchaseOrder (
    id TEXT PRIMARY KEY,
    companyId TEXT NOT NULL,
    vendorId TEXT NOT NULL,
    orderNumber TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'ordered', 'received', 'cancelled')),
    totalAmount REAL NOT NULL CHECK(totalAmount >= 0),
    paymentStatus TEXT DEFAULT 'unpaid' CHECK(paymentStatus IN ('unpaid', 'partial', 'paid')),
    amountPaid REAL DEFAULT 0 CHECK(amountPaid >= 0),
    dueDate TEXT,
    notes TEXT,
    orderedBy TEXT NOT NULL,
    receivedBy TEXT,
    receivedAt TEXT,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
    sync_id TEXT,
    is_synced INTEGER DEFAULT 0 CHECK(is_synced IN (0,1)),
    last_synced_at TEXT,
    sync_version INTEGER DEFAULT 1,
    FOREIGN KEY (companyId) REFERENCES Company(id) ON DELETE CASCADE,
    FOREIGN KEY (vendorId) REFERENCES Vendor(id) ON DELETE CASCADE,
    FOREIGN KEY (orderedBy) REFERENCES Worker(id) ON DELETE RESTRICT,
    FOREIGN KEY (receivedBy) REFERENCES Worker(id) ON DELETE SET NULL,
    UNIQUE(companyId, orderNumber),
    CHECK(amountPaid <= totalAmount)
);

-- Purchase Order items (One-to-Many)
CREATE TABLE PurchaseOrderItem (
    id TEXT PRIMARY KEY,
    purchaseOrderId TEXT NOT NULL,
    productId TEXT NOT NULL,
    quantity REAL NOT NULL CHECK(quantity > 0),
    unit TEXT NOT NULL,
    costPrice REAL NOT NULL CHECK(costPrice >= 0),
    totalCost REAL NOT NULL CHECK(totalCost >= 0),
    sync_id TEXT,
    is_synced INTEGER DEFAULT 0 CHECK(is_synced IN (0,1)),
    last_synced_at TEXT,
    sync_version INTEGER DEFAULT 1,
    FOREIGN KEY (purchaseOrderId) REFERENCES PurchaseOrder(id) ON DELETE CASCADE,
    FOREIGN KEY (productId) REFERENCES Inventory(id) ON DELETE RESTRICT
);

-- Vendor Payment table
CREATE TABLE VendorPayment (
    id TEXT PRIMARY KEY,
    companyId TEXT NOT NULL,
    vendorId TEXT NOT NULL,
    purchaseOrderId TEXT,
    amount REAL NOT NULL CHECK(amount > 0),
    paymentDate TEXT NOT NULL,
    paymentMethod TEXT NOT NULL CHECK(paymentMethod IN ('cash', 'card', 'mobile_money', 'bank_transfer', 'cheque')),
    reference TEXT,
    notes TEXT,
    processedBy TEXT NOT NULL,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
    sync_id TEXT,
    is_synced INTEGER DEFAULT 0 CHECK(is_synced IN (0,1)),
    last_synced_at TEXT,
    sync_version INTEGER DEFAULT 1,
    FOREIGN KEY (companyId) REFERENCES Company(id) ON DELETE CASCADE,
    FOREIGN KEY (vendorId) REFERENCES Vendor(id) ON DELETE CASCADE,
    FOREIGN KEY (purchaseOrderId) REFERENCES PurchaseOrder(id) ON DELETE SET NULL,
    FOREIGN KEY (processedBy) REFERENCES Worker(id) ON DELETE RESTRICT
);

-- Device table for POS management
CREATE TABLE Device (
    id TEXT PRIMARY KEY,
    companyId TEXT NOT NULL,
    deviceId TEXT NOT NULL,
    name TEXT,
    status TEXT DEFAULT 'offline' CHECK(status IN ('online', 'offline', 'maintenance')),
    lastHeartbeat TEXT,
    softwareVersion TEXT,
    lastSyncedEventId INTEGER DEFAULT 0,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
    sync_id TEXT,
    is_synced INTEGER DEFAULT 0 CHECK(is_synced IN (0,1)),
    last_synced_at TEXT,
    sync_version INTEGER DEFAULT 1,
    FOREIGN KEY (companyId) REFERENCES Company(id) ON DELETE CASCADE,
    UNIQUE(companyId, deviceId)
);

-- Event Log for Sync
CREATE TABLE EventLog (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    companyId TEXT NOT NULL,
    eventType TEXT NOT NULL,
    payload TEXT NOT NULL,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (companyId) REFERENCES Company(id) ON DELETE CASCADE
);

-- Network Configuration
CREATE TABLE NetworkConfig (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    companyId TEXT NOT NULL,
    config TEXT,
    isMaster INTEGER DEFAULT 0 CHECK(isMaster IN (0,1)),
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    sync_id TEXT,
    is_synced INTEGER DEFAULT 0 CHECK(is_synced IN (0,1)),
    last_synced_at TEXT,
    sync_version INTEGER DEFAULT 1,
    FOREIGN KEY (companyId) REFERENCES Company(id) ON DELETE CASCADE
);

CREATE INDEX idx_networkconfig_company ON NetworkConfig(companyId);

-- Sync State for Umbrella Event Replay
CREATE TABLE SyncState (
    key TEXT PRIMARY KEY,
    lastSyncedId INTEGER DEFAULT 0,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- INDEXES for better performance
-- ============================================================================

-- Company and Worker
CREATE INDEX idx_worker_company ON Worker(companyId) WHERE deleted = 0;
CREATE INDEX idx_worker_company_all ON Worker(companyId);
CREATE INDEX idx_worker_email ON Worker(email) WHERE email IS NOT NULL;
CREATE INDEX idx_company_parent ON Company(parentCompanyId) WHERE parentCompanyId IS NOT NULL;

-- Inventory
CREATE INDEX idx_inventory_company ON Inventory(companyId) WHERE deleted = 0;
CREATE INDEX idx_inventory_company_all ON Inventory(companyId);
CREATE INDEX idx_inventory_sku ON Inventory(companyId, sku) WHERE sku IS NOT NULL;
CREATE INDEX idx_inventory_barcode ON Inventory(barcode) WHERE barcode IS NOT NULL;
CREATE INDEX idx_inventory_category ON Inventory(companyId, category);
CREATE INDEX idx_inventory_reorder ON Inventory(companyId, onhand, reorderPoint) WHERE deleted = 0;

-- Customer and Vendor
CREATE INDEX idx_customer_company ON Customer(belongsTo) WHERE deleted = 0;
CREATE INDEX idx_customer_company_all ON Customer(belongsTo);
CREATE INDEX idx_vendor_company ON Vendor(companyId) WHERE deleted = 0;
CREATE INDEX idx_vendor_company_all ON Vendor(companyId);

-- Sales and Receipts
CREATE INDEX idx_receipt_company ON Receipt(companyId);
CREATE INDEX idx_receipt_company_date ON Receipt(companyId, createdAt);
CREATE INDEX idx_receipt_worker ON Receipt(workerId);
CREATE INDEX idx_receipt_customer ON Receipt(customerId);
CREATE INDEX idx_receipt_flagged ON Receipt(companyId, flagged) WHERE flagged = 1;
CREATE INDEX idx_receiptdetail_receipt ON ReceiptDetail(receiptId);
CREATE INDEX idx_receiptdetail_inventory ON ReceiptDetail(inventoryId);

-- Debt
CREATE INDEX idx_debt_customer ON Debt(customerId);
CREATE INDEX idx_debt_company ON Debt(companyId);
CREATE INDEX idx_debt_status ON Debt(companyId, status);




-- ============================================================================
-- SyncLog
-- ChangeLog
-- Device
-- DeviceState
-- SyncQueue

-- ============================================================================

CREATE TABLE IF NOT EXISTS Device (
    id TEXT PRIMARY KEY,
    companyId TEXT NOT NULL,
    name TEXT,
    platform TEXT,
    lastSyncedAt TEXT DEFAULT NULL,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(companyId) REFERENCES Company(id) ON DELETE CASCADE
);


CREATE TABLE IF NOT EXISTS SyncLog (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    table_name TEXT NOT NULL,
    operation TEXT NOT NULL, -- 'supabase_sync', 'local_sync'
    records_processed INTEGER DEFAULT 0,
    status TEXT DEFAULT 'completed', -- 'completed', 'failed'
    error_message TEXT,
    completed_at TEXT DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE IF NOT EXISTS ChangeLog (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tableName TEXT NOT NULL,
    rowId TEXT NOT NULL,
    operation TEXT CHECK(operation IN ('insert','update','delete')) NOT NULL,
    timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
    data TEXT, -- JSON payload
    sent INTEGER DEFAULT 0
);


CREATE TABLE IF NOT EXISTS SyncQueue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tableName TEXT NOT NULL,
    rowId TEXT NOT NULL,
    operation TEXT CHECK(operation IN ('insert','update','delete')) NOT NULL,
    data TEXT, -- JSON payload
    timestamp TEXT DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE IF NOT EXISTS DeviceState (
    id TEXT PRIMARY KEY,
    deviceId TEXT NOT NULL,
    lastPulledAt TEXT,
    lastPushedAt TEXT,
    FOREIGN KEY(deviceId) REFERENCES Device(id) ON DELETE CASCADE
);
