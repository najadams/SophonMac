-- PostgreSQL schema for Sophon POS System

-- Company table
CREATE TABLE IF NOT EXISTS Company (
    id SERIAL PRIMARY KEY,
    companyName TEXT NOT NULL UNIQUE,
    email TEXT UNIQUE,
    password TEXT NOT NULL,
    isEmailVerified BOOLEAN DEFAULT FALSE,
    emailVerificationToken TEXT,
    emailVerificationExpires TIMESTAMP,
    passwordResetToken TEXT,
    passwordResetExpires TIMESTAMP,
    refreshToken TEXT,
    contact TEXT,
    location TEXT,
    taxRate DECIMAL(10,2),
    currency TEXT,
    currentPlan TEXT,
    emailNotifications BOOLEAN DEFAULT FALSE,
    momo TEXT,
    nextBillingDate TIMESTAMP,
    paymentMethod TEXT,
    paymentProvider TEXT,
    smsNotifications BOOLEAN DEFAULT FALSE,
    storeAddress TEXT,
    taxId TEXT,
    tinNumber TEXT,
    receiptTemplate TEXT DEFAULT 'template1',
    receiptHeader TEXT,
    receiptFooter TEXT,
    createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updatedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Customer table
CREATE TABLE IF NOT EXISTS Customer (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    email TEXT,
    companyId INTEGER,
    createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updatedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vendor table
CREATE TABLE IF NOT EXISTS Vendor (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    contact TEXT,
    email TEXT,
    address TEXT,
    companyId INTEGER,
    createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updatedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inventory table
CREATE TABLE IF NOT EXISTS Inventory (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    unit TEXT,
    quantity INTEGER DEFAULT 0,
    price DECIMAL(10,2),
    cost DECIMAL(10,2),
    barcode TEXT,
    companyId INTEGER,
    createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updatedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Receipt table
CREATE TABLE IF NOT EXISTS Receipt (
    id SERIAL PRIMARY KEY,
    date TIMESTAMP DEFAULT NOW(),
    total_amount DECIMAL(10,2) DEFAULT 0,
    discount DECIMAL(10,2) DEFAULT 0,
    tax DECIMAL(10,2) DEFAULT 0,
    payment_method TEXT,
    customer_name TEXT,
    customer_phone TEXT,
    companyId INTEGER,
    createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updatedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Receipt Items table
CREATE TABLE IF NOT EXISTS ReceiptItem (
    id SERIAL PRIMARY KEY,
    receiptId INTEGER,
    inventoryId INTEGER,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updatedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Purchase Order table
CREATE TABLE IF NOT EXISTS PurchaseOrder (
    id SERIAL PRIMARY KEY,
    orderDate TIMESTAMP DEFAULT NOW(),
    expectedDeliveryDate TIMESTAMP,
    status TEXT DEFAULT 'pending',
    totalAmount DECIMAL(10,2) DEFAULT 0,
    vendorId INTEGER,
    companyId INTEGER,
    createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updatedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_customer_company ON Customer(companyId);
CREATE INDEX IF NOT EXISTS idx_vendor_company ON Vendor(companyId);
CREATE INDEX IF NOT EXISTS idx_inventory_company ON Inventory(companyId);
CREATE INDEX IF NOT EXISTS idx_receipt_company ON Receipt(companyId);
CREATE INDEX IF NOT EXISTS idx_receipt_item_receipt ON ReceiptItem(receiptId);
CREATE INDEX IF NOT EXISTS idx_purchase_order_vendor ON PurchaseOrder(vendorId, companyId);