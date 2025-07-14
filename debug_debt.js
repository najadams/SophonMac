const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'backend', 'database.db');
const db = new sqlite3.Database(dbPath);

// Find Kent Clark's customer ID
db.get("SELECT id, name, company FROM Customer WHERE name LIKE '%Kent%' OR company LIKE '%Kent%' LIMIT 1", (err, customer) => {
  if (err) {
    console.error('Error finding customer:', err);
    return;
  }
  
  if (!customer) {
    console.log('Customer not found');
    return;
  }
  
  console.log('Customer found:', customer);
  const customerId = customer.id;
  
  // Check individual debts
  db.all(`
    SELECT d.id, d.amount, d.status, r.flagged
    FROM Debt d
    LEFT JOIN Receipt r ON d.receiptId = r.id
    WHERE d.customerId = ? AND d.status = 'pending'
  `, [customerId], (err, debts) => {
    if (err) {
      console.error('Error fetching debts:', err);
      return;
    }
    
    console.log('\nPending debts:');
    debts.forEach(debt => {
      console.log(`Debt ID: ${debt.id}, Amount: ${debt.amount}, Status: ${debt.status}, Receipt Flagged: ${debt.flagged}`);
    });
    
    // Check debt payments
    db.all(`
      SELECT dp.debtId, dp.amountPaid
      FROM DebtPayment dp
      JOIN Debt d ON dp.debtId = d.id
      WHERE d.customerId = ?
    `, [customerId], (err, payments) => {
      if (err) {
        console.error('Error fetching payments:', err);
        return;
      }
      
      console.log('\nDebt payments:');
      payments.forEach(payment => {
        console.log(`Debt ID: ${payment.debtId}, Amount Paid: ${payment.amountPaid}`);
      });
      
      // Calculate total debt using the same logic as backend
      db.get(`
        SELECT 
          COALESCE(
            (
              SELECT SUM(d.amount) - COALESCE(SUM(dp.amountPaid), 0)
              FROM Debt d
              LEFT JOIN Receipt r_inner ON d.receiptId = r_inner.id
              LEFT JOIN DebtPayment dp ON d.id = dp.debtId
              WHERE d.customerId = ? 
                AND d.status = 'pending' 
                AND (r_inner.flagged = 0 OR r_inner.flagged IS NULL)
            ), 0
          ) as totalDebt
      `, [customerId], (err, result) => {
        if (err) {
          console.error('Error calculating total debt:', err);
          return;
        }
        
        console.log('\nCalculated total debt:', result.totalDebt);
        
        // Also check what the individual debts endpoint returns
        db.all(`
          SELECT d.*, 
                 r.total as receiptTotal,
                 r.createdAt as receiptDate,
                 w.name as workerName,
                 dp.id as paymentId,
                 dp.date as paymentDate,
                 dp.amountPaid as paymentAmount,
                 dp.paymentMethod,
                 pw.name as paymentWorkerName
          FROM Debt d
          LEFT JOIN Receipt r ON d.receiptId = r.id
          LEFT JOIN Worker w ON d.workerId = w.id
          LEFT JOIN DebtPayment dp ON d.id = dp.debtId
          LEFT JOIN Worker pw ON dp.workerId = pw.id
          WHERE d.customerId = ? AND (r.flagged = 0 OR r.flagged IS NULL)
          ORDER BY d.createdAt DESC, dp.date DESC
        `, [customerId], (err, rows) => {
          if (err) {
            console.error('Error fetching detailed debt info:', err);
            return;
          }
          
          console.log('\nDetailed debt information:');
          rows.forEach(row => {
            console.log(`Debt ID: ${row.id}, Amount: ${row.amount}, Status: ${row.status}, Payment: ${row.paymentAmount || 'None'}`);
          });
          
          db.close();
        });
      });
    });
  });
});