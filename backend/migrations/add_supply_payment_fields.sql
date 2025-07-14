-- Add payment tracking fields to Supplies table
ALTER TABLE Supplies ADD COLUMN amountPaid REAL DEFAULT 0;
ALTER TABLE Supplies ADD COLUMN discount REAL DEFAULT 0;
ALTER TABLE Supplies ADD COLUMN balance REAL DEFAULT 0;
ALTER TABLE Supplies ADD COLUMN status TEXT DEFAULT 'pending';

-- Update existing records to set proper status based on payment
UPDATE Supplies SET status = 'completed' WHERE id IN (
    SELECT s.id FROM Supplies s
    LEFT JOIN VendorPayment vp ON vp.vendorId = s.supplierId
    WHERE vp.amount >= s.totalCost
);