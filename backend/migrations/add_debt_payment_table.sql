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
