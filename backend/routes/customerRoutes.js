const express = require('express');
const router = express.Router();
const db = require('../data/db/db');
const { verifyToken } = require('../middleware/authMiddleware');

// Get all customers
router.get('/', verifyToken, (req, res) => {
  const userCompanyId = req.user.role === 'company' ? req.user.id : req.user.companyId;
  
  const query = `
    SELECT 
      c.*,
      GROUP_CONCAT(cp.phone) as phone,
      GROUP_CONCAT(ce.email) as email
    FROM Customer c
    LEFT JOIN CustomerPhone cp ON c.id = cp.customerId
    LEFT JOIN CustomerEmail ce ON c.id = ce.customerId
    WHERE c.belongsTo = ?
    GROUP BY c.id
  `;
  
  db.all(query, [userCompanyId], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    // Transform the concatenated strings back to arrays
    const customers = rows.map(customer => ({
      ...customer,
      phone: customer.phone ? customer.phone.split(',') : [],
      email: customer.email ? customer.email.split(',') : []
    }));
    
    res.json(customers);
  });
});

// Create a new customer
router.post('/', (req, res) => {
  const { name, email, phone, address, belongsTo, company, city, notes } = req.body;
  
  if (!name || !belongsTo) {
    return res.status(400).json({ message: 'Customer name and company Id are required' });
  }
  
  // Start a transaction to ensure data consistency
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    
    // Insert the customer first
    db.run(
      'INSERT INTO Customer (name, address, city, belongsTo, company, notes) VALUES (?, ?, ?, ?, ?, ?)',
      [name, address || null, city || null, belongsTo, company || 'nocompany', notes || null],
      function(err) {
        if (err) {
          db.run('ROLLBACK');
          
          // Check if it's a unique constraint violation for customer already exists
          if (err.code === 'SQLITE_CONSTRAINT' && err.message.includes('UNIQUE constraint failed: Customer.belongsTo, Customer.name, Customer.company')) {
            return res.status(409).json({ message: 'Customer already exists' });
          }
          
          return res.status(500).json({ error: err.message });
        }
        
        const customerId = this.lastID;
        let completedOperations = 0;
        let totalOperations = 0;
        
        // Count how many additional operations we need to perform
        if (email) totalOperations++;
        if (phone) totalOperations++;
        
        // If no additional operations, commit and return
        if (totalOperations === 0) {
          db.run('COMMIT', (commitErr) => {
            if (commitErr) {
              return res.status(500).json({ error: commitErr.message });
            }
            res.status(201).json({ id: customerId, message: 'Customer created successfully' });
          });
          return;
        }
        
        // Function to check if all operations are complete
        const checkCompletion = () => {
          completedOperations++;
          if (completedOperations === totalOperations) {
            db.run('COMMIT', (commitErr) => {
              if (commitErr) {
                return res.status(500).json({ error: commitErr.message });
              }
              res.status(201).json({ id: customerId, message: 'Customer created successfully' });
            });
          }
        };
        
        // Insert email addresses if provided (handle array)
        if (email) {
          const emailArray = Array.isArray(email) ? email : [email];
          const validEmails = [...new Set(emailArray.filter(e => e && e.trim() !== '').map(e => e.trim()))];
          
          if (validEmails.length > 0) {
            let emailInsertCount = 0;
            validEmails.forEach((emailAddress) => {
              db.run(
                'INSERT OR IGNORE INTO CustomerEmail (customerId, email) VALUES (?, ?)',
                [customerId, emailAddress],
                function(emailErr) {
                  if (emailErr) {
                    db.run('ROLLBACK');
                    return res.status(500).json({ error: emailErr.message });
                  }
                  emailInsertCount++;
                  if (emailInsertCount === validEmails.length) {
                    checkCompletion();
                  }
                }
              );
            });
          } else {
            checkCompletion();
          }
        }
        
        // Insert phone numbers if provided (handle array)
        if (phone) {
          const phoneArray = Array.isArray(phone) ? phone : [phone];
          const validPhones = [...new Set(phoneArray.filter(p => p && p.trim() !== '').map(p => p.trim()))];
          
          if (validPhones.length > 0) {
            let phoneInsertCount = 0;
            validPhones.forEach((phoneNumber) => {
              db.run(
                'INSERT OR IGNORE INTO CustomerPhone (customerId, phone) VALUES (?, ?)',
                [customerId, phoneNumber],
                function(phoneErr) {
                  if (phoneErr) {
                    db.run('ROLLBACK');
                    return res.status(500).json({ error: phoneErr.message });
                  }
                  phoneInsertCount++;
                  if (phoneInsertCount === validPhones.length) {
                    checkCompletion();
                  }
                }
              );
            });
          } else {
            checkCompletion();
          }
        }
      }
    );
  });
});

// Update a customer
router.put('/:id', (req, res) => {
  const { name, email, phone, address, company_id } = req.body;
  
  if (!name || !company_id) {
    return res.status(400).json({ error: 'Customer name and company_id are required' });
  }
  
  db.run(
    'UPDATE Customer SET name = ?, email = ?, phone = ?, address = ?, company_id = ? WHERE id = ?',
    [name, email, phone, address, company_id, req.params.id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Customer not found' });
      }
      res.json({ changes: this.changes });
    }
  );
});

// PATCH endpoint for updating customer (handles arrays for phone and email)
router.patch('/:id', (req, res) => {
  const { name, email, phone, address, company } = req.body;
  const customerId = req.params.id;
  
  if (!name) {
    return res.status(400).json({ error: 'Customer name is required' });
  }
  
  // Start a transaction to ensure data consistency
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    
    // Update the main customer record
    db.run(
      'UPDATE Customer SET name = ?, address = ?, company = ? WHERE id = ?',
      [name, address || null, company || 'nocompany', customerId],
      function(err) {
        if (err) {
          db.run('ROLLBACK');
          return res.status(500).json({ error: err.message });
        }
        
        if (this.changes === 0) {
          db.run('ROLLBACK');
          return res.status(404).json({ error: 'Customer not found' });
        }
        
        let completedOperations = 0;
        let totalOperations = 0;
        
        // Count operations needed
        if (email !== undefined) totalOperations++;
        if (phone !== undefined) totalOperations++;
        
        // If no additional operations, commit and return
        if (totalOperations === 0) {
          db.run('COMMIT', (commitErr) => {
            if (commitErr) {
              return res.status(500).json({ error: commitErr.message });
            }
            res.status(200).json({ message: 'Customer updated successfully' });
          });
          return;
        }
        
        // Function to check if all operations are complete
        const checkCompletion = () => {
          completedOperations++;
          if (completedOperations === totalOperations) {
            db.run('COMMIT', (commitErr) => {
              if (commitErr) {
                return res.status(500).json({ error: commitErr.message });
              }
              res.status(200).json({ message: 'Customer updated successfully' });
            });
          }
        };
        
        // Update email addresses
        if (email !== undefined) {
          // First delete existing emails
          db.run('DELETE FROM CustomerEmail WHERE customerId = ?', [customerId], (deleteErr) => {
            if (deleteErr) {
              db.run('ROLLBACK');
              return res.status(500).json({ error: deleteErr.message });
            }
            
            // Insert new emails if provided
            const emailArray = Array.isArray(email) ? email : [email];
            const validEmails = [...new Set(emailArray.filter(e => e && e.trim() !== '').map(e => e.trim()))];
            
            if (validEmails.length > 0) {
              let emailInsertCount = 0;
              validEmails.forEach((emailAddress) => {
                db.run(
                  'INSERT OR IGNORE INTO CustomerEmail (customerId, email) VALUES (?, ?)',
                  [customerId, emailAddress],
                  function(emailErr) {
                    if (emailErr) {
                      db.run('ROLLBACK');
                      return res.status(500).json({ error: emailErr.message });
                    }
                    emailInsertCount++;
                    if (emailInsertCount === validEmails.length) {
                      checkCompletion();
                    }
                  }
                );
              });
            } else {
              checkCompletion();
            }
          });
        }
        
        // Update phone numbers
        if (phone !== undefined) {
          // First delete existing phones
          db.run('DELETE FROM CustomerPhone WHERE customerId = ?', [customerId], (deleteErr) => {
            if (deleteErr) {
              db.run('ROLLBACK');
              return res.status(500).json({ error: deleteErr.message });
            }
            
            // Insert new phones if provided
            const phoneArray = Array.isArray(phone) ? phone : [phone];
            const validPhones = [...new Set(phoneArray.filter(p => p && p.trim() !== '').map(p => p.trim()))];
            
            if (validPhones.length > 0) {
              let phoneInsertCount = 0;
              validPhones.forEach((phoneNumber) => {
                db.run(
                  'INSERT OR IGNORE INTO CustomerPhone (customerId, phone) VALUES (?, ?)',
                  [customerId, phoneNumber],
                  function(phoneErr) {
                    if (phoneErr) {
                      db.run('ROLLBACK');
                      return res.status(500).json({ error: phoneErr.message });
                    }
                    phoneInsertCount++;
                    if (phoneInsertCount === validPhones.length) {
                      checkCompletion();
                    }
                  }
                );
              });
            } else {
              checkCompletion();
            }
          });
        }
      }
    );
  });
});

// Delete a customer
router.delete('/:id', (req, res) => {
  db.run('DELETE FROM Customer WHERE id = ?', [req.params.id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    res.json({ deleted: true });
  });
});

// Get customers by company ID
router.get('/:id', (req, res) => {
  const query = `
    SELECT 
      c.*,
      GROUP_CONCAT(cp.phone) as phone,
      GROUP_CONCAT(ce.email) as email
    FROM Customer c
    LEFT JOIN CustomerPhone cp ON c.id = cp.customerId
    LEFT JOIN CustomerEmail ce ON c.id = ce.customerId
    WHERE c.belongsTo = ? AND c.deleted = 0
    GROUP BY c.id
  `;
  
  db.all(query, [req.params.id], (err, rows) => {
    if (err) {
      // Check if the error is due to missing 'deleted' column
      if (err.code === 'SQLITE_ERROR' && err.message.includes('no such column: deleted')) {
        // Query without the deleted condition
        const fallbackQuery = `
          SELECT 
            c.*,
            GROUP_CONCAT(cp.phone) as phone,
            GROUP_CONCAT(ce.email) as email
          FROM Customer c
          LEFT JOIN CustomerPhone cp ON c.id = cp.customerId
          LEFT JOIN CustomerEmail ce ON c.id = ce.customerId
          WHERE c.belongsTo = ?
          GROUP BY c.id
        `;
        db.all(fallbackQuery, [req.params.id], (fallbackErr, fallbackRows) => {
          if (fallbackErr) {
            return res.status(500).json({ message: fallbackErr.message });
          }
          // Transform the concatenated strings back to arrays
          const customers = fallbackRows.map(customer => ({
            ...customer,
            phone: customer.phone ? customer.phone.split(',') : [],
            email: customer.email ? customer.email.split(',') : []
          }));
          res.json({ customers: customers || [] });
        });
      } else {
        return res.status(500).json({ message: err.message });
      }
    } else {
      // Transform the concatenated strings back to arrays
      const customers = rows.map(customer => ({
        ...customer,
        phone: customer.phone ? customer.phone.split(',') : [],
        email: customer.email ? customer.email.split(',') : []
      }));
      console.log(customers)
      res.json({ customers: customers || [] });
    }
  });
});
router.get('/company/:companyId', verifyToken, (req, res) => {
  const requestedCompanyId = parseInt(req.params.companyId);
  const userCompanyId = req.user.role === 'company' ? req.user.id : req.user.companyId;
  
  // Security check: Users can only access customers from their own company
  if (requestedCompanyId !== userCompanyId) {
    return res.status(403).json({ error: 'Access denied. You can only view customers from your own company.' });
  }
  
  console.log(req.params.companyId)
  db.all('SELECT * FROM Customer WHERE belongsTo = ?', [requestedCompanyId], (err, rows) => {
    if (err) {
      return res.status(500).json({ message: err.message });
    }
    console.log(rows)
    res.json(rows);
  });
});

// Get customer receipts
router.get('/:customerId/receipts', (req, res) => {
  const { customerId } = req.params;
  const query = `
    SELECT r.*, 
           w.name as workerName,
           rd.name as itemName,
           rd.quantity,
           rd.salesPrice,
           rd.costPrice
    FROM Receipt r
    LEFT JOIN Worker w ON r.workerId = w.id
    LEFT JOIN ReceiptDetail rd ON r.id = rd.receiptId
    WHERE r.customerId = ?
    ORDER BY r.createdAt DESC
  `;
  
  db.all(query, [customerId], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    // Group receipt details by receipt ID
    const receiptsMap = new Map();
    rows.forEach(row => {
      if (!receiptsMap.has(row.id)) {
        receiptsMap.set(row.id, {
          id: row.id,
          companyId: row.companyId,
          workerId: row.workerId,
          workerName: row.workerName,
          customerId: row.customerId,
          debtId: row.debtId,
          total: row.total,
          amountPaid: row.amountPaid,
          discount: row.discount,
          balance: row.balance,
          profit: row.profit,
          flagged: row.flagged,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          items: []
        });
      }
      
      if (row.itemName) {
        receiptsMap.get(row.id).items.push({
          name: row.itemName,
          quantity: row.quantity,
          salesPrice: row.salesPrice,
          costPrice: row.costPrice
        });
      }
    });
    
    const receipts = Array.from(receiptsMap.values());
    res.json({ receipts });
  });
});

// Get customer debts
router.get('/:customerId/debts', (req, res) => {
  const { customerId } = req.params;
  const query = `
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
  `;
  
  db.all(query, [customerId], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    // Group payments by debt ID
    const debtsMap = new Map();
    rows.forEach(row => {
      if (!debtsMap.has(row.id)) {
        debtsMap.set(row.id, {
          id: row.id,
          companyId: row.companyId,
          workerId: row.workerId,
          workerName: row.workerName,
          customerId: row.customerId,
          receiptId: row.receiptId,
          receiptTotal: row.receiptTotal,
          receiptDate: row.receiptDate,
          amount: row.amount,
          status: row.status,
          dueDate: row.dueDate,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          payments: []
        });
      }
      
      if (row.paymentId) {
        debtsMap.get(row.id).payments.push({
          id: row.paymentId,
          date: row.paymentDate,
          amountPaid: row.paymentAmount,
          paymentMethod: row.paymentMethod,
          workerName: row.paymentWorkerName
        });
      }
    });
    
    const debts = Array.from(debtsMap.values());
    res.json({ debts });
  });
});

// Get customer payments
router.get('/:customerId/payments', (req, res) => {
  const { customerId } = req.params;
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
    WHERE d.customerId = ? AND (r.flagged = 0 OR r.flagged IS NULL)
    ORDER BY dp.date DESC
  `;
  
  db.all(query, [customerId], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ payments: rows });
  });
});

// Get customer discounts
router.get('/:customerId/discounts', (req, res) => {
  const { customerId } = req.params;
  const query = `
    SELECT r.id as receiptId,
           r.discount,
           r.total,
           r.createdAt,
           w.name as workerName
    FROM Receipt r
    LEFT JOIN Worker w ON r.workerId = w.id
    WHERE r.customerId = ? 
      AND r.discount > 0 
      AND (r.flagged = 0 OR r.flagged IS NULL)
    ORDER BY r.createdAt DESC
  `;
  
  db.all(query, [customerId], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    const totalDiscounts = rows.reduce((sum, row) => sum + (row.discount || 0), 0);
    
    res.json({ 
      discounts: rows,
      totalDiscounts: totalDiscounts,
      discountCount: rows.length
    });
  });
});

// Get customer summary
router.get('/:customerId/summary', (req, res) => {
  const { customerId } = req.params;
  
  // Get customer basic info with calculated totals
  const summaryQuery = `
    SELECT 
      c.*,
      GROUP_CONCAT(cp.phone) as phone,
      GROUP_CONCAT(ce.email) as email,
      COALESCE(SUM(CASE WHEN (r.flagged = 0 OR r.flagged IS NULL) THEN r.total ELSE 0 END), 0) as totalPurchases,
      COALESCE(SUM(CASE WHEN (r.flagged = 0 OR r.flagged IS NULL) THEN r.amountPaid ELSE 0 END), 0) + 
      COALESCE(
        (
          SELECT SUM(dp.amountPaid)
          FROM DebtPayment dp
          JOIN Debt d ON dp.debtId = d.id
          LEFT JOIN Receipt r_payment ON d.receiptId = r_payment.id
          WHERE d.customerId = c.id
            AND (r_payment.flagged = 0 OR r_payment.flagged IS NULL)
        ), 0
      ) as totalPaid,
      COUNT(DISTINCT CASE WHEN (r.flagged = 0 OR r.flagged IS NULL) THEN r.id END) as totalReceipts,
      COALESCE(
        (
          SELECT SUM(d.amount)
          FROM Debt d
          LEFT JOIN Receipt r_inner ON d.receiptId = r_inner.id
          WHERE d.customerId = c.id 
            AND d.status = 'pending' 
            AND (r_inner.flagged = 0 OR r_inner.flagged IS NULL)
        ), 0
      ) as totalDebt,
      COUNT(DISTINCT CASE WHEN d.status = 'pending' AND (r2.flagged = 0 OR r2.flagged IS NULL) THEN d.id END) as pendingDebts,
      MAX(CASE WHEN (r.flagged = 0 OR r.flagged IS NULL) THEN r.createdAt END) as lastPurchaseDate
    FROM Customer c
    LEFT JOIN CustomerPhone cp ON c.id = cp.customerId
    LEFT JOIN CustomerEmail ce ON c.id = ce.customerId
    LEFT JOIN Receipt r ON c.id = r.customerId
    LEFT JOIN Debt d ON c.id = d.customerId
    LEFT JOIN Receipt r2 ON d.receiptId = r2.id
    WHERE c.id = ?
    GROUP BY c.id
  `;
  
  db.get(summaryQuery, [customerId], (err, customer) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    // Transform phone and email to arrays
    customer.phone = customer.phone ? customer.phone.split(',') : [];
    customer.email = customer.email ? customer.email.split(',') : [];
    console.log(customer)
    
    res.json({ customer });
  });
});

module.exports = router;