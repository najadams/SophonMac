-- Migration to add unit tracking fields to ReceiptDetail table
-- Run this script to update existing database schema

PRAGMA foreign_keys = OFF;

-- Create new table with updated schema
CREATE TABLE ReceiptDetail_new (
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

-- Copy existing data to new table
INSERT INTO ReceiptDetail_new (
    id, receiptId, name, quantity, costPrice, salesPrice,
    salesUnit, originalQuantity, baseUnitQuantity, conversionRate, atomicQuantity, totalPrice
)
SELECT 
    id, receiptId, name, quantity, costPrice, salesPrice,
    NULL as salesUnit, -- Will be populated by application logic
    quantity as originalQuantity, -- Assume original quantity equals current quantity
    quantity as baseUnitQuantity, -- Assume base unit quantity equals current quantity
    1 as conversionRate, -- Default conversion rate
    quantity as atomicQuantity, -- Assume atomic quantity equals current quantity
    quantity * salesPrice as totalPrice -- Calculate total price
FROM ReceiptDetail;

-- Drop old table
DROP TABLE ReceiptDetail;

-- Rename new table
ALTER TABLE ReceiptDetail_new RENAME TO ReceiptDetail;

PRAGMA foreign_keys = ON;

-- Update existing records to set salesUnit to 'none' where NULL
UPDATE ReceiptDetail SET salesUnit = 'none' WHERE salesUnit IS NULL;