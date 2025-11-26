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
