-- Create Tax Configuration Table
CREATE TABLE IF NOT EXISTS TaxConfig (
    id TEXT PRIMARY KEY,
    vatScheme TEXT DEFAULT 'standard_15' CHECK(vatScheme IN ('standard_15', 'flat_4', 'exempt')),
    turnoverThreshold REAL DEFAULT 200000,
    filingFrequency TEXT DEFAULT 'monthly' CHECK(filingFrequency IN ('monthly', 'quarterly')),
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Add Input VAT tracking to Purchases
-- Check if column exists first to avoid error in SQLite (requires dynamic SQL or just try/catch in code, but here we assume migration runner handles simple statements)
-- Use separate statements for safety

ALTER TABLE Purchases ADD COLUMN vatAmount REAL DEFAULT 0 CHECK(vatAmount >= 0);
