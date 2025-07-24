const express = require('express');
const router = express.Router();
const db = require('../data/db/db');

// Get summary report
router.get('/summary', (req, res) => {
  const { companyId, startDate, endDate } = req.query;

  if (!companyId) {
    return res.status(400).json({ error: 'Company ID is required' });
  }

  // Default to today if no dates provided
  const today = new Date().toISOString().split('T')[0];
  const start = startDate || today;
  const end = endDate || today;

  const summaryQuery = `
    SELECT 
      -- Sales data
      (SELECT COALESCE(SUM(CASE WHEN paymentMethod = 'cash' THEN total ELSE 0 END), 0) FROM Receipt WHERE companyId = ? AND (flagged = 0 OR flagged IS NULL) AND DATE(createdAt) BETWEEN ? AND ?) as salesCash,
      (SELECT COALESCE(SUM(CASE WHEN paymentMethod = 'mobile_money' THEN total ELSE 0 END), 0) FROM Receipt WHERE companyId = ? AND (flagged = 0 OR flagged IS NULL) AND DATE(createdAt) BETWEEN ? AND ?) as salesMomo,
      (SELECT COALESCE(SUM(CASE WHEN paymentMethod = 'card' THEN total ELSE 0 END), 0) FROM Receipt WHERE companyId = ? AND (flagged = 0 OR flagged IS NULL) AND DATE(createdAt) BETWEEN ? AND ?) as salesCard,
      (SELECT COALESCE(SUM(CASE WHEN paymentMethod = 'bank_transfer' THEN total ELSE 0 END), 0) FROM Receipt WHERE companyId = ? AND (flagged = 0 OR flagged IS NULL) AND DATE(createdAt) BETWEEN ? AND ?) as salesBankTransfer,
      (SELECT COALESCE(SUM(total), 0) FROM Receipt WHERE companyId = ? AND (flagged = 0 OR flagged IS NULL) AND DATE(createdAt) BETWEEN ? AND ?) as totalSales,
      (SELECT COALESCE(SUM(discount), 0) FROM Receipt WHERE companyId = ? AND (flagged = 0 OR flagged IS NULL) AND DATE(createdAt) BETWEEN ? AND ?) as totalDiscounts,
      
      -- Amount paid data
      (SELECT COALESCE(SUM(CASE WHEN paymentMethod = 'cash' THEN amountPaid ELSE 0 END), 0) FROM Receipt WHERE companyId = ? AND (flagged = 0 OR flagged IS NULL) AND DATE(createdAt) BETWEEN ? AND ?) as amountPaidCash,
      (SELECT COALESCE(SUM(CASE WHEN paymentMethod = 'mobile_money' THEN amountPaid ELSE 0 END), 0) FROM Receipt WHERE companyId = ? AND (flagged = 0 OR flagged IS NULL) AND DATE(createdAt) BETWEEN ? AND ?) as amountPaidMomo,
      (SELECT COALESCE(SUM(CASE WHEN paymentMethod = 'card' THEN amountPaid ELSE 0 END), 0) FROM Receipt WHERE companyId = ? AND (flagged = 0 OR flagged IS NULL) AND DATE(createdAt) BETWEEN ? AND ?) as amountPaidCard,
      (SELECT COALESCE(SUM(CASE WHEN paymentMethod = 'bank_transfer' THEN amountPaid ELSE 0 END), 0) FROM Receipt WHERE companyId = ? AND (flagged = 0 OR flagged IS NULL) AND DATE(createdAt) BETWEEN ? AND ?) as amountPaidBankTransfer,
      (SELECT COALESCE(SUM(amountPaid), 0) FROM Receipt WHERE companyId = ? AND (flagged = 0 OR flagged IS NULL) AND DATE(createdAt) BETWEEN ? AND ?) as totalAmountPaid,
      
      -- Debt payments data
      (SELECT COALESCE(SUM(CASE WHEN dp.paymentMethod = 'cash' THEN dp.amountPaid ELSE 0 END), 0) FROM DebtPayment dp JOIN Debt d ON dp.debtId = d.id WHERE d.companyId = ? AND DATE(dp.date) BETWEEN ? AND ?) as debtPaymentsCash,
      (SELECT COALESCE(SUM(CASE WHEN dp.paymentMethod = 'momo' THEN dp.amountPaid ELSE 0 END), 0) FROM DebtPayment dp JOIN Debt d ON dp.debtId = d.id WHERE d.companyId = ? AND DATE(dp.date) BETWEEN ? AND ?) as debtPaymentsMomo,
      (SELECT COALESCE(SUM(CASE WHEN dp.paymentMethod = 'card' THEN dp.amountPaid ELSE 0 END), 0) FROM DebtPayment dp JOIN Debt d ON dp.debtId = d.id WHERE d.companyId = ? AND DATE(dp.date) BETWEEN ? AND ?) as debtPaymentsCard,
      (SELECT COALESCE(SUM(CASE WHEN dp.paymentMethod = 'bank_transfer' THEN dp.amountPaid ELSE 0 END), 0) FROM DebtPayment dp JOIN Debt d ON dp.debtId = d.id WHERE d.companyId = ? AND DATE(dp.date) BETWEEN ? AND ?) as debtPaymentsBankTransfer,
      (SELECT COALESCE(SUM(dp.amountPaid), 0) FROM DebtPayment dp JOIN Debt d ON dp.debtId = d.id WHERE d.companyId = ? AND DATE(dp.date) BETWEEN ? AND ?) as totalDebtPayments,
      
      -- Vendor payments data
      (SELECT COALESCE(SUM(CASE WHEN paymentMethod = 'cash' THEN amount ELSE 0 END), 0) FROM VendorPayment WHERE companyId = ? AND DATE(paymentDate) BETWEEN ? AND ?) as vendorPaymentsCash,
      (SELECT COALESCE(SUM(CASE WHEN paymentMethod = 'mobile_money' THEN amount ELSE 0 END), 0) FROM VendorPayment WHERE companyId = ? AND DATE(paymentDate) BETWEEN ? AND ?) as vendorPaymentsMomo,
      (SELECT COALESCE(SUM(CASE WHEN paymentMethod = 'card' THEN amount ELSE 0 END), 0) FROM VendorPayment WHERE companyId = ? AND DATE(paymentDate) BETWEEN ? AND ?) as vendorPaymentsCard,
      (SELECT COALESCE(SUM(CASE WHEN paymentMethod = 'bank_transfer' THEN amount ELSE 0 END), 0) FROM VendorPayment WHERE companyId = ? AND DATE(paymentDate) BETWEEN ? AND ?) as vendorPaymentsBankTransfer,
      (SELECT COALESCE(SUM(amount), 0) FROM VendorPayment WHERE companyId = ? AND DATE(paymentDate) BETWEEN ? AND ?) as totalVendorPayments,
      
      -- New debts acquired
      (SELECT COALESCE(SUM(amount), 0) FROM Debt WHERE companyId = ? AND DATE(createdAt) BETWEEN ? AND ?) as totalDebtsAcquired,
      
      -- Net cash received (amountPaid + debt payments - vendor payments)
      (SELECT COALESCE(SUM(CASE WHEN paymentMethod = 'cash' THEN amountPaid ELSE 0 END), 0) FROM Receipt WHERE companyId = ? AND (flagged = 0 OR flagged IS NULL) AND DATE(createdAt) BETWEEN ? AND ?) +
      (SELECT COALESCE(SUM(CASE WHEN dp.paymentMethod = 'cash' THEN dp.amountPaid ELSE 0 END), 0) FROM DebtPayment dp JOIN Debt d ON dp.debtId = d.id WHERE d.companyId = ? AND DATE(dp.date) BETWEEN ? AND ?) -
      (SELECT COALESCE(SUM(CASE WHEN paymentMethod = 'cash' THEN amount ELSE 0 END), 0) FROM VendorPayment WHERE companyId = ? AND DATE(paymentDate) BETWEEN ? AND ?) as netCashReceived,
      
      -- Net amount received (amountPaid + debt payments - vendor payments)
      (SELECT COALESCE(SUM(amountPaid), 0) FROM Receipt WHERE companyId = ? AND (flagged = 0 OR flagged IS NULL) AND DATE(createdAt) BETWEEN ? AND ?) + (SELECT COALESCE(SUM(dp.amountPaid), 0) FROM DebtPayment dp JOIN Debt d ON dp.debtId = d.id WHERE d.companyId = ? AND DATE(dp.date) BETWEEN ? AND ?) - (SELECT COALESCE(SUM(amount), 0) FROM VendorPayment WHERE companyId = ? AND DATE(paymentDate) BETWEEN ? AND ?) as netAmountReceived
      
    FROM 
      (SELECT 1) as dummy
  `;

  // Create parameter array for all subqueries
  const params = [];
  // Sales data (6 subqueries * 3 params each = 18)
  for (let i = 0; i < 6; i++) {
    params.push(companyId, start, end);
  }
  // Amount paid data (5 subqueries * 3 params each = 15)
  for (let i = 0; i < 5; i++) {
    params.push(companyId, start, end);
  }
  // Debt payments data (5 subqueries * 3 params each = 15)
  for (let i = 0; i < 5; i++) {
    params.push(companyId, start, end);
  }
  // Vendor payments data (5 subqueries * 3 params each = 15)
  for (let i = 0; i < 5; i++) {
    params.push(companyId, start, end);
  }
  // New debts acquired (1 subquery * 3 params = 3)
  params.push(companyId, start, end);
  // Net cash received (3 subqueries * 3 params each = 9)
  for (let i = 0; i < 3; i++) {
    params.push(companyId, start, end);
  }
  // Net amount received (3 subqueries * 3 params each = 9)
  for (let i = 0; i < 3; i++) {
    params.push(companyId, start, end);
  }

  db.get(summaryQuery, params, (err, row) => {
    if (err) {
      console.error('Error fetching summary report:', err);
      return res.status(500).json({ error: 'Failed to fetch summary report' });
    }

    const summary = {
      totalCashReceived: row.netCashReceived || 0,
      totalCashReceivedAmount: row.netAmountReceived || 0,
      summary: {
        sales: {
          cash: row.salesCash || 0,
          momo: row.salesMomo || 0,
          card: row.salesCard || 0,
          bankTransfer: row.salesBankTransfer || 0,
          totalSales: row.totalSales || 0,
          discounts: row.totalDiscounts || 0
        },
        amountPaid: {
          cash: row.amountPaidCash || 0,
          momo: row.amountPaidMomo || 0,
          card: row.amountPaidCard || 0,
          bankTransfer: row.amountPaidBankTransfer || 0,
          totalAmountPaid: row.totalAmountPaid || 0
        },
        debtPayments: {
          cash: row.debtPaymentsCash || 0,
          momo: row.debtPaymentsMomo || 0,
          card: row.debtPaymentsCard || 0,
          bankTransfer: row.debtPaymentsBankTransfer || 0,
          totalPaid: row.totalDebtPayments || 0
        },
        vendorPayments: {
          cash: row.vendorPaymentsCash || 0,
          momo: row.vendorPaymentsMomo || 0,
          card: row.vendorPaymentsCard || 0,
          bankTransfer: row.vendorPaymentsBankTransfer || 0,
          totalPaid: row.totalVendorPayments || 0
        },
        debtsAcquired: {
          totalDebts: row.totalDebtsAcquired || 0
        }
      },
      period: {
        startDate: start,
        endDate: end
      }
    };

    res.json(summary);
  });
});

// Get sales report
router.get('/sales', (req, res) => {
  const { companyId, startDate, endDate } = req.query;

  if (!companyId) {
    return res.status(400).json({ error: 'Company ID is required' });
  }

  const today = new Date().toISOString().split('T')[0];
  const start = startDate || today;
  const end = endDate || today;

  const salesQuery = `
    SELECT 
      r.id,
      r.total,
      r.discount,
      r.paymentMethod,
      r.createdAt,
      c.name as customerName,
      w.name as workerName
    FROM Receipt r
    LEFT JOIN Customer c ON r.customerId = c.id
    LEFT JOIN Worker w ON r.workerId = w.id
    WHERE r.companyId = ? 
      AND DATE(r.createdAt) BETWEEN ? AND ?
      AND (r.flagged = 0 OR r.flagged IS NULL)
    ORDER BY r.createdAt DESC
  `;

  db.all(salesQuery, [companyId, start, end], (err, rows) => {
    if (err) {
      console.error('Error fetching sales report:', err);
      return res.status(500).json({ error: 'Failed to fetch sales report' });
    }

    // Calculate summary statistics
    const totalSales = rows.reduce((sum, row) => sum + (row.total || 0), 0);
    const totalDiscounts = rows.reduce((sum, row) => sum + (row.discount || 0), 0);
    const totalAmountPaid = totalSales - totalDiscounts;
    const totalBalance = 0; // Assuming no outstanding balance for completed sales

    const salesData = {
      totalSales,
      totalAmountPaid,
      totalBalance,
      totalDiscounts
    };

    res.json({
      sales: salesData,
      salesTransactions: rows,
      period: {
        startDate: start,
        endDate: end
      }
    });
  });
});

// Get inventory report
router.get('/inventory', (req, res) => {
  const { companyId, startDate, endDate } = req.query;

  if (!companyId) {
    return res.status(400).json({ error: 'Company ID is required' });
  }

  const today = new Date().toISOString().split('T')[0];
  const start = startDate || today;
  const end = endDate || today;

  const inventoryQuery = `
    SELECT 
      i.id,
      i.name,
      i.category,
      i.onhand as quantity,
      i.costPrice as unitPrice,
      i.salesPrice as sellingPrice,
      i.baseUnit,
      (i.onhand * i.costPrice) as totalCostValue,
      (i.onhand * i.salesPrice) as totalSellingValue,
      COALESCE(sales_data.totalQuantity, 0) as totalQuantity,
      COALESCE(sales_data.totalSalesPrice, 0) as totalSalesPrice,
      CASE 
        WHEN i.onhand <= 5 THEN 'Low Stock'
        WHEN i.onhand <= 10 THEN 'Medium Stock'
        ELSE 'Good Stock'
      END as stockStatus
    FROM Inventory i
    LEFT JOIN (
      SELECT 
        rd.name,
        SUM(rd.quantity) as totalQuantity,
        SUM(rd.salesPrice * rd.quantity) as totalSalesPrice
      FROM ReceiptDetail rd
      JOIN Receipt r ON rd.receiptId = r.id
      WHERE r.companyId = ? 
        AND DATE(r.createdAt) BETWEEN ? AND ?
        AND (r.flagged = 0 OR r.flagged IS NULL)
      GROUP BY rd.name
    ) sales_data ON i.name = sales_data.name
    WHERE i.companyId = ?
    ORDER BY i.onhand ASC, i.name ASC
  `;

  db.all(inventoryQuery, [companyId, start, end, companyId], (err, rows) => {
    if (err) {
      console.error('Error fetching inventory report:', err);
      return res.status(500).json({ error: 'Failed to fetch inventory report' });
    }

    const summary = {
      totalProducts: rows.length,
      totalCostValue: rows.reduce((sum, item) => sum + (item.totalCostValue || 0), 0),
      totalSellingValue: rows.reduce((sum, item) => sum + (item.totalSellingValue || 0), 0),
      lowStockItems: rows.filter(item => item.stockStatus === 'Low Stock').length
    };

    res.json({
      inventory: rows,
      aggregatedData: rows,
      summary
    });
  });
});

// Get debts report
router.get('/debts', (req, res) => {
  const { companyId, startDate, endDate } = req.query;

  if (!companyId) {
    return res.status(400).json({ error: 'Company ID is required' });
  }

  const today = new Date().toISOString().split('T')[0];
  const start = startDate || today;
  const end = endDate || today;

  const debtsQuery = `
    SELECT 
      d.id,
      d.amount,
      d.status,
      d.createdAt,
      c.name as customerName,
      cp.phone as customerPhone,
      w.name as workerName
    FROM Debt d
    LEFT JOIN Customer c ON d.customerId = c.id
    LEFT JOIN CustomerPhone cp ON c.id = cp.customerId
    LEFT JOIN Worker w ON d.workerId = w.id
    WHERE d.companyId = ? 
      AND DATE(d.createdAt) BETWEEN ? AND ?
    ORDER BY d.createdAt DESC
  `;

  db.all(debtsQuery, [companyId, start, end], (err, rows) => {
    if (err) {
      console.error('Error fetching debts report:', err);
      return res.status(500).json({ error: 'Failed to fetch debts report' });
    }

    const summary = {
      totalDebts: rows.reduce((sum, debt) => sum + debt.amount, 0),
      pendingDebts: rows.filter(debt => debt.status === 'pending').length,
      totalDebtsCount: rows.length
    };

    res.json({
      debts: rows,
      summary,
      period: {
        startDate: start,
        endDate: end
      }
    });
  });
});

// Get purchases report
router.get('/purchases', (req, res) => {
  const { companyId, startDate, endDate } = req.query;

  if (!companyId) {
    return res.status(400).json({ error: 'Company ID is required' });
  }

  const today = new Date().toISOString().split('T')[0];
  const start = startDate || today;
  const end = endDate || today;

  const purchasesQuery = `
    SELECT 
      s.id,
      s.totalCost,
      s.amountPaid,
      s.balance,
      s.status,
      s.createdAt,
      v.name as vendorName,
      v.phone as vendorPhone,
      w.name as workerName
    FROM Supplies s
    LEFT JOIN Vendor v ON s.supplierId = v.id
    LEFT JOIN Worker w ON s.restockedBy = w.id
    WHERE s.companyId = ? 
      AND DATE(s.createdAt) BETWEEN ? AND ?
    ORDER BY s.createdAt DESC
  `;

  db.all(purchasesQuery, [companyId, start, end], (err, rows) => {
    if (err) {
      console.error('Error fetching purchases report:', err);
      return res.status(500).json({ error: 'Failed to fetch purchases report' });
    }

    const summary = {
      totalPurchases: rows.reduce((sum, purchase) => sum + purchase.totalCost, 0),
      totalPaid: rows.reduce((sum, purchase) => sum + purchase.amountPaid, 0),
      totalOutstanding: rows.reduce((sum, purchase) => sum + purchase.balance, 0),
      pendingPurchases: rows.filter(purchase => purchase.status === 'pending').length,
      completedPurchases: rows.filter(purchase => purchase.status === 'completed').length
    };

    res.json({
      purchases: rows,
      summary,
      period: {
        startDate: start,
        endDate: end
      }
    });
  });
});

module.exports = router;