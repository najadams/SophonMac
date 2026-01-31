const db = require('./data/db/db');

const sql = `
CREATE TABLE IF NOT EXISTS Expenses (
    id TEXT PRIMARY KEY,
    companyId TEXT NOT NULL,
    title TEXT NOT NULL,
    amount REAL NOT NULL,
    category TEXT,
    date TEXT DEFAULT CURRENT_TIMESTAMP,
    description TEXT,
    paymentMethod TEXT,
    receiptImage TEXT,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (companyId) REFERENCES Company(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_expenses_company ON Expenses(companyId);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON Expenses(date);
`;

try {
  db.exec(sql);
  console.log('Expense table migration applied successfully.');
} catch (err) {
  console.error('Migration failed:', err);
}
