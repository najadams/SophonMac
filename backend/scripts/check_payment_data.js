const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, '../data/db/database.sqlite');
const db = new Database(dbPath);

console.log('Checking database state...');

try {
  // 1. Total Receipts
  const totalReceipts = db.prepare('SELECT COUNT(*) as count FROM Receipt').get().count;
  console.log('Total Receipts:', totalReceipts);

  // 2. Receipts with amountPaid > 0
  const receiptsWithPayment = db.prepare('SELECT COUNT(*) as count FROM Receipt WHERE amountPaid > 0').get().count;
  console.log('Receipts with amountPaid > 0:', receiptsWithPayment);

  // 3. ReceiptPayment count
  const totalPayments = db.prepare('SELECT COUNT(*) as count FROM ReceiptPayment').get().count;
  console.log('Total ReceiptPayment records:', totalPayments);

  // 4. Mismatch: Receipts with amountPaid > 0 but NO ReceiptPayment
  const missingPayments = db.prepare(`
    SELECT COUNT(*) as count 
    FROM Receipt r
    WHERE r.amountPaid > 0
    AND r.id NOT IN (SELECT receiptId FROM ReceiptPayment)
  `).get().count;

  console.log('Receipts with amountPaid > 0 but NO ReceiptPayment record:', missingPayments);

  if (missingPayments > 0) {
    console.log('CONCLUSION: Backfill IS REQUIRED.');
  } else {
    console.log('CONCLUSION: Data seems consistent. Backfill might NOT be the (only) issue.');
  }

} catch (err) {
  console.error('Error:', err);
} finally {
  db.close();
}
