-- SQLite schema for Sophon database

-- Enable foreign keys
PRAGMA foreign_keys = ON;

-- Company table
CREATE TABLE Company (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
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
    currency TEXT,
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

-- Company allowed units (Many-to-Many relationship)
CREATE TABLE CompanyAllowedUnits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    companyId INTEGER,
    unit TEXT,
    FOREIGN KEY (companyId) REFERENCES Company(id) ON DELETE CASCADE,
    UNIQUE(companyId, unit)
);

-- Company allowed categories (Many-to-Many relationship)
CREATE TABLE CompanyAllowedCategories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    companyId INTEGER,
    category TEXT,
    FOREIGN KEY (companyId) REFERENCES Company(id) ON DELETE CASCADE,
    UNIQUE(companyId, category)
);

-- Settings table
CREATE TABLE Settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    companyId INTEGER NOT NULL,
    emailNotifications INTEGER DEFAULT 1,
    smsNotifications INTEGER DEFAULT 0,
    currency TEXT,
    theme TEXT DEFAULT 'light',
    roundingSales INTEGER DEFAULT 0,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (companyId) REFERENCES Company(id) ON DELETE CASCADE
);

-- User access roles for settings
CREATE TABLE UserAccessRoles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    settingsId INTEGER NOT NULL,
    userId INTEGER NOT NULL,
    role TEXT DEFAULT 'sales',
    FOREIGN KEY (settingsId) REFERENCES Settings(id) ON DELETE CASCADE
);

-- Worker table
CREATE TABLE Worker (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    companyId INTEGER,
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
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    companyId INTEGER NOT NULL,
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
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    inventoryId INTEGER,
    unit TEXT,
    FOREIGN KEY (inventoryId) REFERENCES Inventory(id) ON DELETE CASCADE
);

-- Unit conversions
CREATE TABLE UnitConversion (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    inventoryId INTEGER,
    fromUnit TEXT NOT NULL,
    toUnit TEXT NOT NULL,
    conversionRate REAL NOT NULL,
    unitPrice REAL NOT NULL,
    FOREIGN KEY (inventoryId) REFERENCES Inventory(id) ON DELETE CASCADE
);

-- Price history
CREATE TABLE PriceChange (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    inventoryId INTEGER,
    date TEXT DEFAULT CURRENT_TIMESTAMP,
    costPrice REAL,
    salesPrice REAL,
    FOREIGN KEY (inventoryId) REFERENCES Inventory(id) ON DELETE CASCADE
);

-- Stock transactions
CREATE TABLE StockTransaction (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    inventoryId INTEGER,
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
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    productId INTEGER NOT NULL,
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
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    inventoryId INTEGER,
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
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    inventoryId INTEGER,
    vendorId INTEGER,
    FOREIGN KEY (inventoryId) REFERENCES Inventory(id) ON DELETE CASCADE,
    FOREIGN KEY (vendorId) REFERENCES Vendor(id) ON DELETE CASCADE,
    UNIQUE(inventoryId, vendorId)
);

-- Customer table
CREATE TABLE Customer (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    belongsTo INTEGER NOT NULL,
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
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customerId INTEGER,
    phone TEXT,
    FOREIGN KEY (customerId) REFERENCES Customer(id) ON DELETE CASCADE
);

-- Customer emails (One-to-Many)
CREATE TABLE CustomerEmail (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customerId INTEGER,
    email TEXT,
    FOREIGN KEY (customerId) REFERENCES Customer(id) ON DELETE CASCADE
);

-- Vendor table
CREATE TABLE Vendor (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    companyId INTEGER NOT NULL,
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
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    companyId INTEGER NOT NULL,
    workerId INTEGER,
    customerId INTEGER,
    debtId INTEGER,
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
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    receiptId INTEGER,
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
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    companyId INTEGER,
    workerId INTEGER,
    customerId INTEGER NOT NULL,
    receiptId INTEGER,
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
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    debtId INTEGER,
    date TEXT DEFAULT CURRENT_TIMESTAMP,
    amountPaid REAL NOT NULL,
    workerId INTEGER,
    paymentMethod TEXT DEFAULT 'cash',
    FOREIGN KEY (debtId) REFERENCES Debt(id) ON DELETE CASCADE,
    FOREIGN KEY (workerId) REFERENCES Worker(id) ON DELETE SET NULL
);

-- Notification table
CREATE TABLE Notification (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    companyId INTEGER NOT NULL,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'unread',
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (companyId) REFERENCES Company(id) ON DELETE CASCADE
);

-- Supplies table
CREATE TABLE Supplies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    companyId INTEGER,
    supplierId INTEGER,
    totalCost REAL,
    totalQuantity REAL,
    amountPaid REAL DEFAULT 0,
    discount REAL DEFAULT 0,
    balance REAL DEFAULT 0,
    status TEXT DEFAULT 'pending',
    restockDate TEXT DEFAULT CURRENT_TIMESTAMP,
    restockedBy INTEGER NOT NULL,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (companyId) REFERENCES Company(id) ON DELETE CASCADE,
    FOREIGN KEY (supplierId) REFERENCES Vendor(id) ON DELETE SET NULL,
    FOREIGN KEY (restockedBy) REFERENCES Worker(id) ON DELETE RESTRICT
);

-- Supplies details (One-to-Many)
CREATE TABLE SuppliesDetail (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    suppliesId INTEGER,
    name TEXT NOT NULL,
    quantity REAL NOT NULL,
    costPrice REAL NOT NULL,
    salesPrice REAL NOT NULL,
    totalPrice REAL NOT NULL,
    FOREIGN KEY (suppliesId) REFERENCES Supplies(id) ON DELETE CASCADE
);

-- Purchases table
CREATE TABLE Purchases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vendorId INTEGER NOT NULL,    -- ✅ Added comma
    companyId INTEGER NOT NULL,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (vendorId) REFERENCES Vendor(id) ON DELETE CASCADE,  -- ✅ Added comma and fixed reference
    FOREIGN KEY (companyId) REFERENCES Company(id) ON DELETE CASCADE  -- ✅ Removed duplicate
);

-- Purchases details (One-to-Many)
CREATE TABLE PurchasesDetail (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    purchasesId INTEGER,
    name TEXT NOT NULL,
    quantity REAL NOT NULL,
    costPrice REAL NOT NULL,
    salesPrice REAL NOT NULL,
    FOREIGN KEY (purchasesId) REFERENCES Purchases(id) ON DELETE CASCADE
);

-- Purchase Order table
CREATE TABLE PurchaseOrder (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    companyId INTEGER NOT NULL,
    vendorId INTEGER NOT NULL,
    orderNumber TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    totalAmount REAL NOT NULL,
    paymentStatus TEXT DEFAULT 'unpaid',
    amountPaid REAL DEFAULT 0,
    dueDate TEXT,
    notes TEXT,
    orderedBy INTEGER NOT NULL,
    receivedBy INTEGER,
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
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    purchaseOrderId INTEGER,
    productId INTEGER NOT NULL,
    quantity REAL NOT NULL,
    unit TEXT NOT NULL,
    costPrice REAL NOT NULL,
    totalCost REAL NOT NULL,
    FOREIGN KEY (purchaseOrderId) REFERENCES PurchaseOrder(id) ON DELETE CASCADE,
    FOREIGN KEY (productId) REFERENCES Inventory(id) ON DELETE RESTRICT
);

-- Vendor Payment table
CREATE TABLE VendorPayment (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    companyId INTEGER NOT NULL,
    vendorId INTEGER NOT NULL,
    purchaseOrderId INTEGER,
    amount REAL NOT NULL,
    paymentDate TEXT NOT NULL,
    paymentMethod TEXT NOT NULL,
    reference TEXT,
    notes TEXT,
    processedBy INTEGER NOT NULL,
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

-- Company table with authentication fields
CREATE TABLE IF NOT EXISTS Company (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  email TEXT UNIQUE NOT NULL,
  tax_id TEXT,
  password TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Worker table with authentication and role fields
CREATE TABLE IF NOT EXISTS Worker (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  position TEXT,
  phone TEXT,
  email TEXT,
  password TEXT NOT NULL,
  role TEXT DEFAULT 'worker', -- 'super_admin', 'admin', 'worker', etc.
  company_id INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES Company (id)
);

-- Rest of your schema tables
CREATE TABLE IF NOT EXISTS Inventory (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  quantity INTEGER DEFAULT 0,
  unit_price REAL DEFAULT 0,
  category TEXT,
  company_id INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES Company (id)
);

CREATE TABLE IF NOT EXISTS Customer (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  email TEXT,
  company_id INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES Company (id)
);


CREATE TABLE IF NOT EXISTS Receipt (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT,
  total_amount REAL DEFAULT 0,
  payment_method TEXT,
  customer_id INTEGER,
  company_id INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES Customer (id),
  FOREIGN KEY (company_id) REFERENCES Company (id)
);

CREATE TABLE IF NOT EXISTS Debt (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  amount REAL NOT NULL,
  due_date TEXT,
  description TEXT,
  status TEXT DEFAULT 'pending',
  customer_id INTEGER NOT NULL,
  company_id INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES Customer (id),
  FOREIGN KEY (company_id) REFERENCES Company (id)
);

CREATE TABLE IF NOT EXISTS PurchaseOrder (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_date TEXT,
  delivery_date TEXT,
  status TEXT DEFAULT 'pending',
  total_amount REAL DEFAULT 0,
  vendor_id INTEGER NOT NULL,
  company_id INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (vendor_id) REFERENCES Vendor (id),
  FOREIGN KEY (company_id) REFERENCES Company (id)
);

-- Add to Inventory table (for future migration)
ALTER TABLE Inventory ADD COLUMN onhandPrecision INTEGER DEFAULT 1000000; -- Store as integer * 1,000,000
ALTER TABLE Inventory ADD COLUMN displayUnit TEXT; -- Preferred display unit