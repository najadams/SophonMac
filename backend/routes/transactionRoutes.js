const express = require('express');
const router = express.Router();
const db = require('../data/db/supabase-db');
const { verifyToken } = require('../middleware/authMiddleware');

// Get all transactions for a company
router.get('/:companyId', verifyToken, (req, res) => {
  const requestedCompanyId = parseInt(req.params.companyId);
  const userCompanyId = req.user.role === 'company' ? req.user.id : req.user.companyId;
  
  // Security check: Users can only access transactions from their own company
  if (requestedCompanyId !== userCompanyId) {
    return res.status(403).json({ error: 'Access denied. You can only view transactions from your own company.' });
  }
  
  const { search, type, startDate, endDate } = req.query;

  // Build the WHERE clause for filtering
  let whereConditions = ['t.companyId = ?'];
  let params = [requestedCompanyId];

  if (search) {
    whereConditions.push('(t.reference LIKE ? OR t.customerName LIKE ? OR t.vendorName LIKE ?)');
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }

  if (type && type !== 'all') {
    whereConditions.push('t.type = ?');
    params.push(type);
  }

  if (startDate) {
    whereConditions.push('DATE(t.date) >= DATE(?)');
    params.push(startDate);
  }

  if (endDate) {
    whereConditions.push('DATE(t.date) <= DATE(?)');
    params.push(endDate);
  }

  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

  const query = `
    SELECT * FROM (
      -- Sales transactions from receipts (showing payments made)
      SELECT 
        r.id,
        r.createdAt as date,
        'Sale' as type,
        'RCP-' || r.id as reference,
        COALESCE(c.name, 'Walk-in Customer') as customerName,
        NULL as vendorName,
        r.amountPaid as amount, -- Show amount paid instead of total
        r.amountPaid,
        r.balance,
        r.paymentMethod,
        CASE 
          WHEN r.balance <= 0 THEN 'Completed'
          WHEN r.amountPaid > 0 THEN 'Partial'
          ELSE 'Pending'
        END as status,
        w.name as processedBy,
        r.companyId
      FROM Receipt r
      LEFT JOIN Customer c ON r.customerId = c.id
      LEFT JOIN Worker w ON r.workerId = w.id
      WHERE r.companyId = ? AND (r.flagged = 0 OR r.flagged IS NULL)
      
      UNION ALL
      
      -- Debt payments (actual payments made towards debts)
      SELECT 
        dp.id,
        dp.date,
        'Debt Payment' as type,
        'DP-' || dp.id as reference,
        c.name as customerName,
        NULL as vendorName,
        dp.amountPaid as amount,
        dp.amountPaid,
        d.amount as balance,
        dp.paymentMethod,
        'Completed' as status,
        w.name as processedBy,
        d.companyId
      FROM DebtPayment dp
      JOIN Debt d ON dp.debtId = d.id
      JOIN Customer c ON d.customerId = c.id
      LEFT JOIN Worker w ON dp.workerId = w.id
      WHERE d.companyId = ?
      
      UNION ALL
      
      -- Vendor payments
      SELECT 
        vp.id,
        vp.paymentDate as date,
        'Vendor Payment' as type,
        COALESCE(vp.reference, 'VP-' || vp.id) as reference,
        NULL as customerName,
        v.name as vendorName,
        vp.amount,
        vp.amount as amountPaid,
        0 as balance,
        vp.paymentMethod,
        'Completed' as status,
        w.name as processedBy,
        vp.companyId
      FROM VendorPayment vp
      JOIN Vendor v ON vp.vendorId = v.id
      LEFT JOIN Worker w ON vp.processedBy = w.id
      WHERE vp.companyId = ?
      
      UNION ALL
      
      -- Supply/Restock transactions
      SELECT 
        s.id,
        s.restockDate as date,
        'Restock' as type,
        'SUP-' || s.id as reference,
        NULL as customerName,
        v.name as vendorName,
        s.totalCost as amount,
        COALESCE(s.amountPaid, 0) as amountPaid,
        COALESCE(s.balance, s.totalCost) as balance,
        'Cash' as paymentMethod, -- Default, could be enhanced
        CASE 
          WHEN COALESCE(s.balance, s.totalCost) <= 0 THEN 'Completed'
          WHEN COALESCE(s.amountPaid, 0) > 0 THEN 'Partial'
          ELSE 'Pending'
        END as status,
        w.name as processedBy,
        s.companyId
      FROM Supplies s
      LEFT JOIN Vendor v ON s.supplierId = v.id
      LEFT JOIN Worker w ON s.restockedBy = w.id
      WHERE s.companyId = ?
    ) t
    ${whereClause}
    ORDER BY t.date DESC
  `;

  // Add companyId for each subquery
  const queryParams = [companyId, companyId, companyId, companyId, ...params];

  db.all(query, queryParams, (err, rows) => {
    if (err) {
      console.error('Error fetching transactions:', err);
      return res.status(500).json({ error: err.message });
    }

    // Format the response
    const formattedTransactions = rows.map(row => ({
      id: row.id,
      date: row.date,
      type: row.type,
      reference: row.reference,
      customerName: row.customerName,
      vendorName: row.vendorName,
      amount: parseFloat(row.amount || 0),
      amountPaid: parseFloat(row.amountPaid || 0),
      balance: parseFloat(row.balance || 0),
      paymentMethod: row.paymentMethod || 'Cash',
      status: row.status,
      processedBy: row.processedBy || 'Unknown'
    }));

    res.json(formattedTransactions);
  });
});

// Get transaction summary/statistics
router.get('/:companyId/summary', verifyToken, (req, res) => {
  const requestedCompanyId = parseInt(req.params.companyId);
  const userCompanyId = req.user.role === 'company' ? req.user.id : req.user.companyId;
  
  // Security check: Users can only access transaction summaries from their own company
  if (requestedCompanyId !== userCompanyId) {
    return res.status(403).json({ error: 'Access denied. You can only view transaction summaries from your own company.' });
  }
  
  const { period = 'today' } = req.query;

  let salesDateFilter = '';
  let debtDateFilter = '';
  let vendorDateFilter = '';
  let restockDateFilter = '';
  
  if (period === 'today') {
    salesDateFilter = "AND DATE(createdAt) = DATE('now')";
    debtDateFilter = "AND DATE(dp.date) = DATE('now')";
    vendorDateFilter = "AND DATE(paymentDate) = DATE('now')";
    restockDateFilter = "AND DATE(restockDate) = DATE('now')";
  } else if (period === 'week') {
    salesDateFilter = "AND DATE(createdAt) >= DATE('now', '-7 days')";
    debtDateFilter = "AND DATE(dp.date) >= DATE('now', '-7 days')";
    vendorDateFilter = "AND DATE(paymentDate) >= DATE('now', '-7 days')";
    restockDateFilter = "AND DATE(restockDate) >= DATE('now', '-7 days')";
  } else if (period === 'month') {
    salesDateFilter = "AND DATE(createdAt) >= DATE('now', 'start of month')";
    debtDateFilter = "AND DATE(dp.date) >= DATE('now', 'start of month')";
    vendorDateFilter = "AND DATE(paymentDate) >= DATE('now', 'start of month')";
    restockDateFilter = "AND DATE(restockDate) >= DATE('now', 'start of month')";
  }

  const summaryQuery = `
    SELECT 
      -- Sales summary
      (SELECT COALESCE(SUM(total), 0) FROM Receipt WHERE companyId = ? AND (flagged = 0 OR flagged IS NULL) ${salesDateFilter}) as totalSales,
      (SELECT COALESCE(SUM(amountPaid), 0) FROM Receipt WHERE companyId = ? AND (flagged = 0 OR flagged IS NULL) ${salesDateFilter}) as totalSalesReceived,
      (SELECT COUNT(*) FROM Receipt WHERE companyId = ? AND (flagged = 0 OR flagged IS NULL) ${salesDateFilter}) as salesCount,
      
      -- Debt payments summary
        (SELECT COALESCE(SUM(dp.amountPaid), 0) FROM DebtPayment dp JOIN Debt d ON dp.debtId = d.id WHERE d.companyId = ? ${debtDateFilter}) as totalDebtPayments,
        (SELECT COUNT(*) FROM DebtPayment dp JOIN Debt d ON dp.debtId = d.id WHERE d.companyId = ? ${debtDateFilter}) as debtPaymentCount,
      
      -- Vendor payments summary
      (SELECT COALESCE(SUM(amount), 0) FROM VendorPayment WHERE companyId = ? ${vendorDateFilter}) as totalVendorPayments,
      (SELECT COUNT(*) FROM VendorPayment WHERE companyId = ? ${vendorDateFilter}) as vendorPaymentCount,
      
      -- Restock summary
      (SELECT COALESCE(SUM(totalCost), 0) FROM Supplies WHERE companyId = ? ${restockDateFilter}) as totalRestockCost,
      (SELECT COUNT(*) FROM Supplies WHERE companyId = ? ${restockDateFilter}) as restockCount
  `;

  db.get(summaryQuery, [requestedCompanyId, requestedCompanyId, requestedCompanyId, requestedCompanyId, requestedCompanyId, requestedCompanyId, requestedCompanyId, requestedCompanyId, requestedCompanyId], (err, row) => {
    if (err) {
      console.error('Error fetching transaction summary:', err);
      return res.status(500).json({ error: err.message });
    }

    const summary = {
      totalSales: parseFloat(row.totalSales || 0),
      totalSalesReceived: parseFloat(row.totalSalesReceived || 0),
      salesCount: parseInt(row.salesCount || 0),
      totalDebtPayments: parseFloat(row.totalDebtPayments || 0),
      debtPaymentCount: parseInt(row.debtPaymentCount || 0),
      totalVendorPayments: parseFloat(row.totalVendorPayments || 0),
      vendorPaymentCount: parseInt(row.vendorPaymentCount || 0),
      totalRestockCost: parseFloat(row.totalRestockCost || 0),
      restockCount: parseInt(row.restockCount || 0),
      netCashFlow: parseFloat(row.totalSalesReceived || 0) + parseFloat(row.totalDebtPayments || 0) - parseFloat(row.totalVendorPayments || 0) - parseFloat(row.totalRestockCost || 0)
    };

    res.json(summary);
  });
});

module.exports = router;