const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./data/db/database.sqlite');

db.serialize(() => {
  const customerId = 2; // Kent Clark's ID
  
  console.log('=== DEBT CALCULATION DEBUG ===');
  console.log('Customer ID:', customerId);
  
  // Test the exact query from the backend
  const backendQuery = `
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
  `;
  
  db.get(backendQuery, [customerId], (err, result) => {
    if (err) {
      console.error('Error with backend query:', err);
      return;
    }
    console.log('\nBackend totalDebt calculation:', result.totalDebt);
    
    // Let's break down the calculation step by step
    console.log('\n=== STEP BY STEP BREAKDOWN ===');
    
    // Step 1: Get all pending debts for the customer
    db.all(`
      SELECT d.id, d.amount, d.status, r.flagged
      FROM Debt d
      LEFT JOIN Receipt r ON d.receiptId = r.id
      WHERE d.customerId = ? AND d.status = 'pending'
    `, [customerId], (err, debts) => {
      if (err) {
        console.error('Error getting debts:', err);
        return;
      }
      
      console.log('\nStep 1 - All pending debts:');
      debts.forEach(debt => {
        console.log(`  Debt ${debt.id}: Amount=${debt.amount}, Status=${debt.status}, Receipt Flagged=${debt.flagged}`);
      });
      
      // Step 2: Filter by receipt flagged status
      const validDebts = debts.filter(d => d.flagged === 0 || d.flagged === null);
      console.log('\nStep 2 - Valid debts (not flagged):');
      validDebts.forEach(debt => {
        console.log(`  Debt ${debt.id}: Amount=${debt.amount}`);
      });
      
      // Step 3: Get payments for these debts
      if (validDebts.length > 0) {
        const debtIds = validDebts.map(d => d.id).join(',');
        db.all(`
          SELECT dp.debtId, dp.amountPaid
          FROM DebtPayment dp
          WHERE dp.debtId IN (${debtIds})
        `, (err, payments) => {
          if (err) {
            console.error('Error getting payments:', err);
            return;
          }
          
          console.log('\nStep 3 - Payments for valid debts:');
          payments.forEach(payment => {
            console.log(`  Debt ${payment.debtId}: Payment=${payment.amountPaid}`);
          });
          
          // Step 4: Manual calculation
          const totalDebtAmount = validDebts.reduce((sum, debt) => sum + debt.amount, 0);
          const totalPayments = payments.reduce((sum, payment) => sum + payment.amountPaid, 0);
          const manualCalculation = totalDebtAmount - totalPayments;
          
          console.log('\nStep 4 - Manual calculation:');
          console.log(`  Total debt amount: ${totalDebtAmount}`);
          console.log(`  Total payments: ${totalPayments}`);
          console.log(`  Outstanding debt: ${manualCalculation}`);
          
          console.log('\n=== SUMMARY ===');
          console.log(`Backend query result: ${result.totalDebt}`);
          console.log(`Manual calculation: ${manualCalculation}`);
          console.log(`Match: ${result.totalDebt === manualCalculation ? 'YES' : 'NO'}`);
          
          db.close();
        });
      } else {
        console.log('No valid debts found');
        db.close();
      }
    });
  });
});