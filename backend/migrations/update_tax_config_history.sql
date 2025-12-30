-- Rename existing table to copy data
ALTER TABLE TaxConfig RENAME TO TaxConfig_Old;

-- Recreate table with audit fields
CREATE TABLE TaxConfig (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vatScheme TEXT DEFAULT 'standard_15' CHECK(vatScheme IN ('standard_15', 'flat_4', 'exempt')),
    turnoverThreshold REAL DEFAULT 200000,
    filingFrequency TEXT DEFAULT 'monthly' CHECK(filingFrequency IN ('monthly', 'quarterly')),
    effectiveFrom TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    effectiveTo TEXT, -- Null means currently active
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Copy data, setting effectiveFrom to now (or createdAt if available, but old table used 'id' as 'global_config')
-- We assume the single existing row is the currently active one.
INSERT INTO TaxConfig (vatScheme, turnoverThreshold, filingFrequency, effectiveFrom, createdAt)
SELECT vatScheme, turnoverThreshold, filingFrequency, updatedAt, updatedAt
FROM TaxConfig_Old;

-- Drop old table
DROP TABLE TaxConfig_Old;
