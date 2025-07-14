const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath);

// Create VendorPayment table
const createVendorPaymentTable = `
CREATE TABLE IF NOT EXISTS VendorPayment (
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
`;

// Create index for VendorPayment
const createIndex = `
CREATE INDEX IF NOT EXISTS idx_vendor_payment_vendor ON VendorPayment(vendorId, companyId);
`;

db.serialize(() => {
    db.run(createVendorPaymentTable, (err) => {
        if (err) {
            console.error('Error creating VendorPayment table:', err);
        } else {
            console.log('VendorPayment table created successfully!');
        }
    });
    
    db.run(createIndex, (err) => {
        if (err) {
            console.error('Error creating index:', err);
        } else {
            console.log('Index created successfully!');
        }
    });
    
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err);
        } else {
            console.log('Database connection closed.');
        }
    });
});