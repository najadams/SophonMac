const db = require('../data/db/db');
const path = require('path');

const runMigration = async () => {
  console.log('Starting migration: Add ReceiptPayment table...');
  const dbPath = path.resolve(__dirname, '../data/db/database.sqlite');
  console.log('Database path:', dbPath);

  try {
    // Enable foreign keys
    await new Promise((resolve, reject) => {
        db.run('PRAGMA foreign_keys = ON', (err) => {
            if (err) reject(err);
            else resolve();
        });
    });

    // Create ReceiptPayment Table
    await new Promise((resolve, reject) => {
      db.run(`
        CREATE TABLE IF NOT EXISTS ReceiptPayment (
            id TEXT PRIMARY KEY,
            receiptId TEXT NOT NULL,
            amount REAL NOT NULL CHECK(amount >= 0),
            paymentMethod TEXT NOT NULL,
            reference TEXT,
            paidAt TEXT DEFAULT CURRENT_TIMESTAMP,
            sync_id TEXT,
            is_synced INTEGER DEFAULT 0 CHECK(is_synced IN (0,1)),
            last_synced_at TEXT,
            sync_version INTEGER DEFAULT 1,
            FOREIGN KEY (receiptId) REFERENCES Receipt(id) ON DELETE CASCADE
        )
      `, (err) => {
        if (err) reject(err);
        else {
            console.log('Created ReceiptPayment table.');
            resolve();
        }
      });
    });

    // Create Indices
    await new Promise((resolve, reject) => {
        db.run(`CREATE INDEX IF NOT EXISTS idx_receipt_payment_receipt ON ReceiptPayment(receiptId)`, (err) => {
            if(err) reject(err); else resolve();
        });
    });

    console.log('Migration completed successfully.');
    // process.exit(0); // Are we running this via node directly? Yes.
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

runMigration().then(() => {
    // Wait for async db operations to potentially flush? 
    // db.close() isn't strictly exposed here but process exit handles it.
    setTimeout(() => process.exit(0), 1000);
});
