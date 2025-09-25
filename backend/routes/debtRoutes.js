const express = require('express');
const router = express.Router();
const db = require('../data/db/supabase-db');
const { verifyToken } = require('../middleware/authMiddleware');

// Get all debts
router.get('/', verifyToken, (req, res) => {
  const userCompanyId = req.user.role === 'company' ? req.user.id : req.user.companyId;
  
  db.all('SELECT * FROM Debt WHERE companyId = ?', [userCompanyId], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Get debts by company ID with optional date filtering
router.get('/:companyId', verifyToken, (req, res) => {
  const requestedCompanyId = parseInt(req.params.companyId);
  const userCompanyId = req.user.role === 'company' ? req.user.id : req.user.companyId;
  
  // Security check: Users can only access debts from their own company
  if (requestedCompanyId !== userCompanyId) {
    return res.status(403).json({ error: 'Access denied. You can only view debts from your own company.' });
  }
  
  const { date } = req.query;
  
  let query = `
    SELECT d.*, 
           c.name as customerName,
           c.company as customerCompany,
           cp.phone as contact,
           r.createdAt as date
    FROM Debt d
    LEFT JOIN Customer c ON d.customerId = c.id
    LEFT JOIN CustomerPhone cp ON c.id = cp.customerId
    LEFT JOIN Receipt r ON d.receiptId = r.id
    WHERE d.companyId = ? AND (r.flagged = 0 OR r.flagged IS NULL) AND d.amount > 0
  `;
  
  const params = [requestedCompanyId];
  
  if (date) {
    query += ` AND DATE(r.createdAt) >= DATE(?)`;
    params.push(date);
  }
  
  query += ` ORDER BY r.createdAt DESC`;
  
  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Get all debts for a company (no date filtering)
router.get('/:companyId/all', verifyToken, (req, res) => {
  const requestedCompanyId = parseInt(req.params.companyId);
  const userCompanyId = req.user.role === 'company' ? req.user.id : req.user.companyId;
  
  // Security check: Users can only access debts from their own company
  if (requestedCompanyId !== userCompanyId) {
    return res.status(403).json({ error: 'Access denied. You can only view debts from your own company.' });
  }
  
  const query = `
    SELECT d.*, 
           c.name as customerName,
           c.company as customerCompany,
           cp.phone as contact,
           r.createdAt as date
    FROM Debt d
    LEFT JOIN Customer c ON d.customerId = c.id
    LEFT JOIN CustomerPhone cp ON c.id = cp.customerId
    LEFT JOIN Receipt r ON d.receiptId = r.id
    WHERE d.companyId = ? AND (r.flagged = 0 OR r.flagged IS NULL) AND d.amount > 0
    ORDER BY r.createdAt DESC
  `;
  
  db.all(query, [requestedCompanyId], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Process debt payment
router.post('/:debtId/pay', (req, res) => {
  const { debtId } = req.params;
  const { amount, workerId, paymentMethod = 'cash' } = req.body;
  
  if (!amount || !workerId) {
    return res.status(400).json({ error: 'Amount and worker ID are required' });
  }
  
  const paymentAmount = parseFloat(amount);
  if (paymentAmount <= 0) {
    return res.status(400).json({ error: 'Payment amount must be greater than 0' });
  }
  
  // Start a transaction
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    
    // Get current debt amount and status
    db.get('SELECT amount, status FROM Debt WHERE id = ?', [debtId], (err, debt) => {
      if (err) {
        db.run('ROLLBACK');
        return res.status(500).json({ error: err.message });
      }
      
      if (!debt) {
        db.run('ROLLBACK');
        return res.status(404).json({ error: 'Debt not found' });
      }
      
      if (debt.status === 'paid') {
        db.run('ROLLBACK');
        return res.status(400).json({ error: 'Debt is already fully paid' });
      }
      
      if (paymentAmount > debt.amount) {
        db.run('ROLLBACK');
        return res.status(400).json({ error: 'Payment amount cannot exceed debt amount' });
      }
      
      const newAmount = debt.amount - paymentAmount;
      const newStatus = newAmount <= 0 ? 'paid' : 'pending';
      
      // Update debt amount and status
      db.run(
        'UPDATE Debt SET amount = ?, status = ?, updatedAt = datetime("now") WHERE id = ?',
        [newAmount, newStatus, debtId],
        function(err) {
          if (err) {
            db.run('ROLLBACK');
            return res.status(500).json({ error: err.message });
          }
          
          // Insert payment record
          db.run(
            'INSERT INTO DebtPayment (debtId, amountPaid, workerId, paymentMethod, date) VALUES (?, ?, ?, ?, datetime("now"))',
            [debtId, paymentAmount, workerId, paymentMethod],
            function(err) {
              if (err) {
                db.run('ROLLBACK');
                return res.status(500).json({ error: err.message });
              }
              
              db.run('COMMIT');
              res.json({ 
                success: true, 
                newAmount: newAmount,
                newStatus: newStatus,
                paymentId: this.lastID,
                message: newStatus === 'paid' ? 'Debt fully paid!' : 'Payment recorded successfully'
              });
            }
          );
        }
      );
    });
  });
});

// Get a single debt by ID
router.get('/debt/:id', (req, res) => {
  db.get('SELECT * FROM Debt WHERE id = ?', [req.params.id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: 'Debt not found' });
    }
    res.json(row);
  });
});

// Get payments for a specific debt
router.get('/debt/:id/payments', (req, res) => {
  const { id } = req.params;
  
  const query = `
    SELECT dp.*, 
           d.amount as debtAmount,
           d.status as debtStatus,
           w.name as workerName,
           r.total as receiptTotal,
           r.createdAt as receiptDate
    FROM DebtPayment dp
    JOIN Debt d ON dp.debtId = d.id
    LEFT JOIN Worker w ON dp.workerId = w.id
    LEFT JOIN Receipt r ON d.receiptId = r.id
    WHERE dp.debtId = ? AND (r.flagged = 0 OR r.flagged IS NULL)
    ORDER BY dp.date DESC
  `;
  
  db.all(query, [id], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ payments: rows });
  });
});

// Create a new debt
router.post('/', (req, res) => {
  const { amount, due_date, description, status, customer_id, company_id } = req.body;
  
  if (!amount || !customer_id || !company_id) {
    return res.status(400).json({ error: 'Amount, customer ID, and company ID are required' });
  }
  
  db.run(
    'INSERT INTO Debt (amount, due_date, description, status, customer_id, company_id) VALUES (?, ?, ?, ?, ?, ?)',
    [amount, due_date, description, status || 'pending', customer_id, company_id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.status(201).json({ id: this.lastID });
    }
  );
});

// Update a debt
router.put('/debt/:id', (req, res) => {
  const { amount, due_date, description, status, customer_id, company_id } = req.body;
  
  if (!amount || !customer_id || !company_id) {
    return res.status(400).json({ error: 'Amount, customer ID, and company ID are required' });
  }
  
  db.run(
    'UPDATE Debt SET amount = ?, due_date = ?, description = ?, status = ?, customer_id = ?, company_id = ? WHERE id = ?',
    [amount, due_date, description, status, customer_id, company_id, req.params.id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Debt not found' });
      }
      res.json({ changes: this.changes });
    }
  );
});

// Delete a debt
router.delete('/debt/:id', (req, res) => {
  db.run('DELETE FROM Debt WHERE id = ?', [req.params.id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Debt not found' });
    }
    res.json({ deleted: true });
  });
});

module.exports = router;