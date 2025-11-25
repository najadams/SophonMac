-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Currency Table
CREATE TABLE IF NOT EXISTS "Currency" (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    symbol TEXT,
    decimals INTEGER DEFAULT 2
);

INSERT INTO "Currency" (code, name, symbol, decimals) VALUES
    ('USD', 'US Dollar', '$', 2),
    ('EUR', 'Euro', '€', 2),
    ('GBP', 'British Pound', '£', 2),
    ('GHS', 'Ghanaian Cedi', '₵', 2),
    ('TZS', 'Tanzanian Shilling', 'Sh', 2)
    ON CONFLICT (code) DO NOTHING;

-- Company Table
CREATE TABLE IF NOT EXISTS "Company" (
    id SERIAL PRIMARY KEY,
    "companyName" TEXT NOT NULL UNIQUE,
    email TEXT UNIQUE,
    password TEXT NOT NULL,
    "isEmailVerified" BOOLEAN DEFAULT FALSE,
    "emailVerificationToken" TEXT,
    "emailVerificationExpires" TIMESTAMP WITH TIME ZONE,
    "passwordResetToken" TEXT,
    "passwordResetExpires" TIMESTAMP WITH TIME ZONE,
    "refreshToken" TEXT,
    contact TEXT,
    location TEXT,
    "taxRate" DECIMAL(10,2),
    "currencyCode" TEXT REFERENCES "Currency"(code) DEFAULT 'GHS',
    "currentPlan" TEXT,
    "emailNotifications" BOOLEAN DEFAULT FALSE,
    momo TEXT,
    "nextBillingDate" TIMESTAMP WITH TIME ZONE,
    "paymentMethod" TEXT,
    "paymentProvider" TEXT,
    "smsNotifications" BOOLEAN DEFAULT FALSE,
    "storeAddress" TEXT,
    "taxId" TEXT,
    "tinNumber" TEXT,
    "taxMode" TEXT DEFAULT 'independent',
    "parentCompanyId" INTEGER REFERENCES "Company"(id) ON DELETE SET NULL,
    "taxIdType" TEXT DEFAULT 'TIN',
    "receiptTemplate" TEXT DEFAULT 'template1',
    "receiptHeader" TEXT,
    "receiptFooter" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sync_id TEXT UNIQUE DEFAULT gen_random_uuid()::TEXT,
    last_synced_at TIMESTAMP WITH TIME ZONE,
    is_synced BOOLEAN DEFAULT FALSE,
    sync_version INTEGER DEFAULT 1
);

-- Settings Table
CREATE TABLE IF NOT EXISTS "Settings" (
    id SERIAL PRIMARY KEY,
    "companyId" INTEGER NOT NULL REFERENCES "Company"(id) ON DELETE CASCADE,
    "emailNotifications" BOOLEAN DEFAULT TRUE,
    "smsNotifications" BOOLEAN DEFAULT FALSE,
    "currencyCode" TEXT REFERENCES "Currency"(code) DEFAULT 'GHS',
    theme TEXT DEFAULT 'light',
    "roundingSales" BOOLEAN DEFAULT FALSE,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sync_id TEXT UNIQUE DEFAULT gen_random_uuid()::TEXT,
    last_synced_at TIMESTAMP WITH TIME ZONE,
    is_synced BOOLEAN DEFAULT FALSE,
    sync_version INTEGER DEFAULT 1
);

-- Worker Table
CREATE TABLE IF NOT EXISTS "Worker" (
    id SERIAL PRIMARY KEY,
    "companyId" INTEGER REFERENCES "Company"(id) ON DELETE CASCADE,
    adminstatus BOOLEAN DEFAULT FALSE,
    name TEXT NOT NULL,
    username TEXT,
    contact TEXT,
    email TEXT,
    password TEXT NOT NULL,
    role TEXT,
    deleted BOOLEAN DEFAULT FALSE,
    "isEmailVerified" BOOLEAN DEFAULT FALSE,
    "emailVerificationToken" TEXT,
    "emailVerificationExpires" TIMESTAMP WITH TIME ZONE,
    "passwordResetToken" TEXT,
    "passwordResetExpires" TIMESTAMP WITH TIME ZONE,
    "refreshToken" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sync_id TEXT UNIQUE DEFAULT gen_random_uuid()::TEXT,
    last_synced_at TIMESTAMP WITH TIME ZONE,
    is_synced BOOLEAN DEFAULT FALSE,
    sync_version INTEGER DEFAULT 1,
    UNIQUE("companyId", name)
);

-- Inventory Table
CREATE TABLE IF NOT EXISTS "Inventory" (
    id SERIAL PRIMARY KEY,
    "companyId" INTEGER NOT NULL REFERENCES "Company"(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT DEFAULT 'none',
    "baseUnit" TEXT DEFAULT 'none',
    "costPrice" DECIMAL(10,2) DEFAULT 0,
    "salesPrice" DECIMAL(10,2) NOT NULL,
    onhand DECIMAL(10,2) DEFAULT 0,
    deleted BOOLEAN DEFAULT FALSE,
    "reorderPoint" DECIMAL(10,2) DEFAULT 0,
    "minimumStock" DECIMAL(10,2) DEFAULT 0,
    description TEXT,
    sku TEXT,
    barcode TEXT,
    "allowsUnitBreakdown" BOOLEAN DEFAULT FALSE,
    "atomicUnit" TEXT,
    "atomicUnitQuantity" DECIMAL(10,2),
    "lossFactor" DECIMAL(10,2) DEFAULT 0,
    "lastBreakdownDate" TIMESTAMP WITH TIME ZONE,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sync_id TEXT UNIQUE DEFAULT gen_random_uuid()::TEXT,
    last_synced_at TIMESTAMP WITH TIME ZONE,
    is_synced BOOLEAN DEFAULT FALSE,
    sync_version INTEGER DEFAULT 1,
    UNIQUE("companyId", name)
);

-- Customer Table
CREATE TABLE IF NOT EXISTS "Customer" (
    id SERIAL PRIMARY KEY,
    "belongsTo" INTEGER NOT NULL REFERENCES "Company"(id) ON DELETE CASCADE,
    company TEXT DEFAULT 'nocompany',
    name TEXT NOT NULL,
    address TEXT,
    city TEXT,
    "loyaltyPoints" DECIMAL(10,2) DEFAULT 0,
    "totalSpent" DECIMAL(10,2) DEFAULT 0,
    "lastPurchaseDate" TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    deleted BOOLEAN DEFAULT FALSE,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sync_id TEXT UNIQUE DEFAULT gen_random_uuid()::TEXT,
    last_synced_at TIMESTAMP WITH TIME ZONE,
    is_synced BOOLEAN DEFAULT FALSE,
    sync_version INTEGER DEFAULT 1,
    UNIQUE("belongsTo", name, company)
);

-- Vendor Table
CREATE TABLE IF NOT EXISTS "Vendor" (
    id SERIAL PRIMARY KEY,
    "companyId" INTEGER NOT NULL REFERENCES "Company"(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    "contact_person" TEXT NOT NULL,
    email TEXT,
    address TEXT,
    phone TEXT,
    "taxId" TEXT,
    "paymentTerms" TEXT,
    balance DECIMAL(10,2) DEFAULT 0,
    status TEXT DEFAULT 'active',
    notes TEXT,
    "lastPurchaseDate" TIMESTAMP WITH TIME ZONE,
    "totalPurchases" DECIMAL(10,2) DEFAULT 0,
    "totalAmount" DECIMAL(10,2) DEFAULT 0,
    deleted BOOLEAN DEFAULT FALSE,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sync_id TEXT UNIQUE DEFAULT gen_random_uuid()::TEXT,
    last_synced_at TIMESTAMP WITH TIME ZONE,
    is_synced BOOLEAN DEFAULT FALSE,
    sync_version INTEGER DEFAULT 1,
    UNIQUE("companyId", name)
);

-- Receipt Table
CREATE TABLE IF NOT EXISTS "Receipt" (
    id SERIAL PRIMARY KEY,
    "companyId" INTEGER NOT NULL REFERENCES "Company"(id) ON DELETE CASCADE,
    "workerId" INTEGER REFERENCES "Worker"(id) ON DELETE SET NULL,
    "customerId" INTEGER REFERENCES "Customer"(id) ON DELETE SET NULL,
    "debtId" INTEGER,
    total DECIMAL(10,2) NOT NULL,
    "amountPaid" DECIMAL(10,2) NOT NULL,
    discount DECIMAL(10,2) DEFAULT 0,
    balance DECIMAL(10,2) DEFAULT 0,
    profit DECIMAL(10,2) NOT NULL,
    "paymentMethod" TEXT DEFAULT 'cash',
    flagged BOOLEAN DEFAULT FALSE,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sync_id TEXT UNIQUE DEFAULT gen_random_uuid()::TEXT,
    last_synced_at TIMESTAMP WITH TIME ZONE,
    is_synced BOOLEAN DEFAULT FALSE,
    sync_version INTEGER DEFAULT 1
);

-- ReceiptDetail Table
CREATE TABLE IF NOT EXISTS "ReceiptDetail" (
    id SERIAL PRIMARY KEY,
    "receiptId" INTEGER REFERENCES "Receipt"(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    quantity DECIMAL(10,2) NOT NULL,
    "costPrice" DECIMAL(10,2) NOT NULL,
    "salesPrice" DECIMAL(10,2) NOT NULL,
    "salesUnit" TEXT,
    "originalQuantity" DECIMAL(10,2),
    "baseUnitQuantity" DECIMAL(10,2),
    "conversionRate" DECIMAL(10,2) DEFAULT 1,
    "atomicQuantity" DECIMAL(10,2),
    "totalPrice" DECIMAL(10,2),
    sync_id TEXT UNIQUE DEFAULT gen_random_uuid()::TEXT,
    last_synced_at TIMESTAMP WITH TIME ZONE,
    is_synced BOOLEAN DEFAULT FALSE,
    sync_version INTEGER DEFAULT 1
);

-- Debt Table
CREATE TABLE IF NOT EXISTS "Debt" (
    id SERIAL PRIMARY KEY,
    "companyId" INTEGER REFERENCES "Company"(id) ON DELETE CASCADE,
    "workerId" INTEGER REFERENCES "Worker"(id) ON DELETE SET NULL,
    "customerId" INTEGER NOT NULL REFERENCES "Customer"(id) ON DELETE CASCADE,
    "receiptId" INTEGER REFERENCES "Receipt"(id) ON DELETE SET NULL,
    amount DECIMAL(10,2) NOT NULL,
    status TEXT DEFAULT 'pending',
    "dueDate" TIMESTAMP WITH TIME ZONE,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sync_id TEXT UNIQUE DEFAULT gen_random_uuid()::TEXT,
    last_synced_at TIMESTAMP WITH TIME ZONE,
    is_synced BOOLEAN DEFAULT FALSE,
    sync_version INTEGER DEFAULT 1,
    UNIQUE("receiptId")
);

-- Add Foreign Key from Receipt to Debt
ALTER TABLE "Receipt" DROP CONSTRAINT IF EXISTS fk_receipt_debt;
ALTER TABLE "Receipt" ADD CONSTRAINT fk_receipt_debt FOREIGN KEY ("debtId") REFERENCES "Debt"(id) ON DELETE SET NULL;
 
-- DebtPayment Table
CREATE TABLE IF NOT EXISTS "DebtPayment" (
    id SERIAL PRIMARY KEY,
    "debtId" INTEGER REFERENCES "Debt"(id) ON DELETE CASCADE,
    date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "amountPaid" DECIMAL(10,2) NOT NULL,
    "workerId" INTEGER REFERENCES "Worker"(id) ON DELETE SET NULL,
    "paymentMethod" TEXT DEFAULT 'cash',
    sync_id TEXT UNIQUE DEFAULT gen_random_uuid()::TEXT,
    last_synced_at TIMESTAMP WITH TIME ZONE,
    is_synced BOOLEAN DEFAULT FALSE,
    sync_version INTEGER DEFAULT 1
);

-- VendorPayment Table
CREATE TABLE IF NOT EXISTS "VendorPayment" (
    id SERIAL PRIMARY KEY,
    "companyId" INTEGER NOT NULL REFERENCES "Company"(id) ON DELETE CASCADE,
    "vendorId" INTEGER NOT NULL REFERENCES "Vendor"(id) ON DELETE CASCADE,
    "purchaseOrderId" INTEGER,
    amount DECIMAL(10,2) NOT NULL,
    "paymentDate" TIMESTAMP WITH TIME ZONE NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    reference TEXT,
    notes TEXT,
    "processedBy" INTEGER REFERENCES "Worker"(id) ON DELETE RESTRICT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sync_id TEXT UNIQUE DEFAULT gen_random_uuid()::TEXT,
    last_synced_at TIMESTAMP WITH TIME ZONE,
    is_synced BOOLEAN DEFAULT FALSE,
    sync_version INTEGER DEFAULT 1
);

-- Notification Table
CREATE TABLE IF NOT EXISTS "Notification" (
    id SERIAL PRIMARY KEY,
    "companyId" INTEGER NOT NULL REFERENCES "Company"(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'unread',
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sync_id TEXT UNIQUE DEFAULT gen_random_uuid()::TEXT,
    last_synced_at TIMESTAMP WITH TIME ZONE,
    is_synced BOOLEAN DEFAULT FALSE,
    sync_version INTEGER DEFAULT 1
);

-- Device Table
CREATE TABLE IF NOT EXISTS "Device" (
    id SERIAL PRIMARY KEY,
    "companyId" INTEGER NOT NULL REFERENCES "Company"(id) ON DELETE CASCADE,
    "deviceId" TEXT NOT NULL,
    name TEXT,
    status TEXT DEFAULT 'offline',
    "lastHeartbeat" TIMESTAMP WITH TIME ZONE,
    "softwareVersion" TEXT,
    "lastSyncedEventId" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sync_id TEXT UNIQUE DEFAULT gen_random_uuid()::TEXT,
    last_synced_at TIMESTAMP WITH TIME ZONE,
    is_synced BOOLEAN DEFAULT FALSE,
    sync_version INTEGER DEFAULT 1,
    UNIQUE("companyId", "deviceId")
);

-- EventLog Table
CREATE TABLE IF NOT EXISTS "EventLog" (
    id SERIAL PRIMARY KEY,
    "companyId" INTEGER NOT NULL REFERENCES "Company"(id) ON DELETE CASCADE,
    "eventType" TEXT NOT NULL,
    payload TEXT NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- SyncState Table
CREATE TABLE IF NOT EXISTS "SyncState" (
    key TEXT PRIMARY KEY,
    "lastSyncedId" INTEGER DEFAULT 0,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Schema Updates (Views & Constraints)
CREATE INDEX IF NOT EXISTS idx_company_parent_id ON "Company"("parentCompanyId");

CREATE OR REPLACE VIEW view_umbrella_tax_liability AS
SELECT 
  p.id AS parent_company_id,
  p."companyName" AS parent_company_name,
  COUNT(c.id) AS child_company_count,
  COALESCE(SUM(vp.amount), 0) AS total_vat_payable,
  MAX(vp."updatedAt") AS last_transaction_at
FROM "Company" p
JOIN "Company" c ON c."parentCompanyId" = p.id
LEFT JOIN "VendorPayment" vp ON vp."companyId" = c.id 
WHERE p."taxMode" = 'umbrella_parent'
GROUP BY p.id, p."companyName";



-- Supplies Table
CREATE TABLE IF NOT EXISTS "Supplies" (
    id SERIAL PRIMARY KEY,
    "companyId" INTEGER NOT NULL REFERENCES "Company"(id) ON DELETE CASCADE,
    "supplierId" INTEGER REFERENCES "Vendor"(id) ON DELETE SET NULL,
    "totalCost" DECIMAL(10,2) DEFAULT 0,
    "totalQuantity" DECIMAL(10,2) DEFAULT 0,
    "amountPaid" DECIMAL(10,2) DEFAULT 0,
    discount DECIMAL(10,2) DEFAULT 0,
    balance DECIMAL(10,2) DEFAULT 0,
    status TEXT DEFAULT 'pending',
    "restockDate" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "restockedBy" INTEGER NOT NULL REFERENCES "Worker"(id) ON DELETE RESTRICT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sync_id TEXT UNIQUE DEFAULT gen_random_uuid()::TEXT,
    last_synced_at TIMESTAMP WITH TIME ZONE,
    is_synced BOOLEAN DEFAULT FALSE,
    sync_version INTEGER DEFAULT 1
);

-- SuppliesDetail Table
CREATE TABLE IF NOT EXISTS "SuppliesDetail" (
    id SERIAL PRIMARY KEY,
    "suppliesId" INTEGER REFERENCES "Supplies"(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    quantity DECIMAL(10,2) NOT NULL,
    "costPrice" DECIMAL(10,2) NOT NULL,
    "salesPrice" DECIMAL(10,2) NOT NULL,
    "totalPrice" DECIMAL(10,2) NOT NULL,
    sync_id TEXT UNIQUE DEFAULT gen_random_uuid()::TEXT,
    last_synced_at TIMESTAMP WITH TIME ZONE,
    is_synced BOOLEAN DEFAULT FALSE,
    sync_version INTEGER DEFAULT 1
);

-- PurchaseOrder Table
CREATE TABLE IF NOT EXISTS "PurchaseOrder" (
    id SERIAL PRIMARY KEY,
    "companyId" INTEGER NOT NULL REFERENCES "Company"(id) ON DELETE CASCADE,
    "vendorId" INTEGER NOT NULL REFERENCES "Vendor"(id) ON DELETE CASCADE,
    "orderNumber" TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "paymentStatus" TEXT DEFAULT 'unpaid',
    "amountPaid" DECIMAL(10,2) DEFAULT 0,
    "dueDate" TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    "orderedBy" INTEGER NOT NULL REFERENCES "Worker"(id) ON DELETE RESTRICT,
    "receivedBy" INTEGER REFERENCES "Worker"(id) ON DELETE SET NULL,
    "receivedAt" TIMESTAMP WITH TIME ZONE,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sync_id TEXT UNIQUE DEFAULT gen_random_uuid()::TEXT,
    last_synced_at TIMESTAMP WITH TIME ZONE,
    is_synced BOOLEAN DEFAULT FALSE,
    sync_version INTEGER DEFAULT 1
);

-- PurchaseOrderItem Table
CREATE TABLE IF NOT EXISTS "PurchaseOrderItem" (
    id SERIAL PRIMARY KEY,
    "purchaseOrderId" INTEGER REFERENCES "PurchaseOrder"(id) ON DELETE CASCADE,
    "productId" INTEGER NOT NULL,
    quantity DECIMAL(10,2) NOT NULL,
    unit TEXT NOT NULL,
    "costPrice" DECIMAL(10,2) NOT NULL,
    "totalCost" DECIMAL(10,2) NOT NULL,
    sync_id TEXT UNIQUE DEFAULT gen_random_uuid()::TEXT,
    last_synced_at TIMESTAMP WITH TIME ZONE,
    is_synced BOOLEAN DEFAULT FALSE,
    sync_version INTEGER DEFAULT 1
);
