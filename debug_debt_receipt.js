const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, 'backend/data/db/database.sqlite');
const db = new Database(dbPath, { readonly: true });
console.log('Connected to the database.');

const query = `
  SELECT 
    d.id as debtId, 
    d.amount, 
    r.id as receiptId, 
    r.debtId as receiptDebtId,
    r.total
  FROM Debt d
  LEFT JOIN Receipt r ON d.id = r.debtId
  WHERE d.amount > 0
  LIMIT 5
`;

try {
  const rows = db.prepare(query).all();
  console.log('Query Result (Limit 5 Debts):');
  console.table(rows);
  
  // Also check if there are ANY receipts with debtId set
  const receiptCount = db.prepare(`SELECT COUNT(*) as count FROM Receipt WHERE debtId IS NOT NULL`).get();
  console.log('Total Receipts with debtId:', receiptCount.count);
      
  // Check count of debts
  const debtCount = db.prepare(`SELECT COUNT(*) as count FROM Debt`).get();
  console.log('Total Debts:', debtCount.count);
  
} catch (err) {
  console.error(err);
} finally {
  db.close();
}
