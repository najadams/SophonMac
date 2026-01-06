const Database = require('better-sqlite3');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const dbPath = path.resolve(__dirname, '../data/db/database.sqlite');
console.log('Opening database at:', dbPath);
const db = new Database(dbPath);

const runBackfill = () => {
  console.log('Starting ReceiptPayment backfill...');

  try {
    const transaction = db.transaction(() => {
      // Find receipts that have NO payments in ReceiptPayment
      const receipts = db.prepare(`
        SELECT r.id, r.amountPaid, r.paymentMethod, r.createdAt 
        FROM Receipt r
        WHERE r.id NOT IN (SELECT receiptId FROM ReceiptPayment)
      `).all();

      console.log(`Found ${receipts.length} legacy receipts to backfill.`);

      const insertStmt = db.prepare(`
        INSERT INTO ReceiptPayment (id, receiptId, amount, paymentMethod, paidAt)
        VALUES (?, ?, ?, ?, ?)
      `);

      let count = 0;
      for (const r of receipts) {
        // Only backfill if amountPaid > 0? Or always?
        // Even if amountPaid is 0 (debt), we technically have a "payment" of 0?
        // Or maybe we don't insert 0 payments? 
        // Existing logic in receiptRoutes inserts based on input.
        // If it's a debt sale (amountPaid=0), do we have a ReceiptPayment row?
        // Let's assume yes, or no?
        // If amountPaid > 0, we definitely need it.
        // If amountPaid == 0, having a row with amount 0 might be useful or redundant.
        // Let's backfill everything to be safe and consistent, but checking amountPaid helps reduce noise?
        // But if we query "Total Sales" from ReceiptPayment, we might miss the 0 ones?
        // No, Total Sales comes from Receipt table.
        // Revenue comes from ReceiptPayment.
        // So 0 amount payments are fine to skip?
        // But let's insert them to be safe if they exist as "records".
        // Actually, if amountPaid is 0, let's skip. A payment of 0 is effectively "no payment yet".
        
        if (r.amountPaid > 0 || (r.paymentMethod && r.paymentMethod !== 'split')) {
             // For safety, insert with uuid
             insertStmt.run(uuidv4(), r.id, r.amountPaid, r.paymentMethod || 'cash', r.createdAt);
             count++;
        }
      }
      return count;
    });

    const inserted = transaction();
    console.log(`Successfully backfilled ${inserted} payment records.`);

  } catch (error) {
    console.error('Backfill failed:', error);
  } finally {
    db.close();
  }
};

runBackfill();
