const express = require('express');
const router = express.Router();
const db = require('../data/db/db');

// Get all customers
router.get('/', (req, res) => {
  const query = `
    SELECT 
      c.*,
      GROUP_CONCAT(cp.phone) as phone,
      GROUP_CONCAT(ce.email) as email
    FROM Customer c
    LEFT JOIN CustomerPhone cp ON c.id = cp.customerId
    LEFT JOIN CustomerEmail ce ON c.id = ce.customerId
    GROUP BY c.id
  `;
  
  db.all(query, [], (err, rows) => {
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
router.patch("/:id", (req, res) => {
  const { name, email, phone, address, company } = req.body;
  const customerId = req.params.id;

  if (!name) {
    return res.status(400).json({ error: "Customer name is required" });
  }

  try {
    // Use better-sqlite3's built-in transaction wrapper
    const updateTransaction = db.transaction(() => {
      // 1️⃣ Update main customer record
      const updateCustomer = db.prepare(`
        UPDATE Customer
        SET name = ?, address = ?, company = ?
        WHERE id = ?
      `);

      const result = updateCustomer.run(
        name,
        address || null,
        company || "nocompany",
        customerId
      );

      if (result.changes === 0) {
        throw new Error("NOT_FOUND");
      }

      // 2️⃣ Update emails (if field was sent)
      if (email !== undefined) {
        const deleteEmails = db.prepare(
          "DELETE FROM CustomerEmail WHERE customerId = ?"
        );
        deleteEmails.run(customerId);

        const emailArray = Array.isArray(email) ? email : [email];
        const validEmails = [
          ...new Set(
            emailArray.filter((e) => e && e.trim() !== "").map((e) => e.trim())
          ),
        ];

        if (validEmails.length > 0) {
          const insertEmail = db.prepare(`
            INSERT OR IGNORE INTO CustomerEmail (customerId, email)
            VALUES (?, ?)
          `);

          for (const e of validEmails) {
            insertEmail.run(customerId, e);
          }
        }
      }

      // 3️⃣ Update phones (if field was sent)
      if (phone !== undefined) {
        const deletePhones = db.prepare(
          "DELETE FROM CustomerPhone WHERE customerId = ?"
        );
        deletePhones.run(customerId);

        const phoneArray = Array.isArray(phone) ? phone : [phone];
        const validPhones = [
          ...new Set(
            phoneArray.filter((p) => p && p.trim() !== "").map((p) => p.trim())
          ),
        ];

        if (validPhones.length > 0) {
          const insertPhone = db.prepare(`
            INSERT OR IGNORE INTO CustomerPhone (customerId, phone)
            VALUES (?, ?)
          `);

          for (const p of validPhones) {
            insertPhone.run(customerId, p);
          }
        }
      }
    });

    // Execute transaction
    updateTransaction();

    res.status(200).json({ message: "Customer updated successfully" });
  } catch (err) {
    if (err.message === "NOT_FOUND") {
      return res.status(404).json({ error: "Customer not found" });
    }

    if (
      err.code === "SQLITE_CONSTRAINT" &&
      err.message.includes("UNIQUE constraint failed")
    ) {
      return res
        .status(409)
        .json({ error: "Duplicate customer or unique constraint violation" });
    }

    console.error("Update transaction failed:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST /customers — create new customer
router.post("/", (req, res) => {
  const {
    belongsTo,
    name,
    company = "nocompany",
    address = "",
    city = "",
    loyaltyPoints = 0,
    totalSpent = 0,
    lastPurchaseDate = null,
    notes = "",
    phones = [],
    emails = [],
  } = req.body;

  if (!belongsTo || !name) {
    return res.status(400).json({ error: "belongsTo and name are required." });
  }

  // check for existing customer
  const existingCustomer = db.connection
    .prepare(`SELECT id FROM Customer WHERE belongsTo = ? AND name = ? AND company = ?`)
    .get(belongsTo, name, company);
  if (existingCustomer) {
    return res.status(409).json({ error: "Customer already exists." });
  }
  
  const insertCustomerSQL = `
    INSERT INTO Customer (
      belongsTo, company, name, address, city, loyaltyPoints, totalSpent, lastPurchaseDate, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  try {
    const customerInsert = db.connection
      .prepare(insertCustomerSQL)
      .run(
        belongsTo,
        company,
        name,
        address,
        city,
        loyaltyPoints,
        totalSpent,
        lastPurchaseDate,
        notes
      );

    const customerId = customerInsert.lastInsertRowid;
    console.log(customerId)

    // Insert phone numbers
    const insertPhoneSQL = `INSERT INTO CustomerPhone (customerId, phone) VALUES (?, ?)`;
    const insertPhoneStmt = db.connection.prepare(insertPhoneSQL);
    for (const phone of phones) {
      if (phone && phone.trim()) insertPhoneStmt.run(customerId, phone.trim());
    }

    // Insert emails
    const insertEmailSQL = `INSERT INTO CustomerEmail (customerId, email) VALUES (?, ?)`;
    const insertEmailStmt = db.connection.prepare(insertEmailSQL);
    for (const email of emails) {
      if (email && email.trim()) insertEmailStmt.run(customerId, email.trim());
    }

    // Fetch the new record
    const customer = db.connection
      .prepare(`SELECT * FROM Customer WHERE id = ?`)
      .get(customerId);

    const customerPhones = db.connection
      .prepare(`SELECT phone FROM CustomerPhone WHERE customerId = ?`)
      .all(customerId)
      .map((p) => p.phone);

    const customerEmails = db.connection
      .prepare(`SELECT email FROM CustomerEmail WHERE customerId = ?`)
      .all(customerId)
      .map((e) => e.email);

    res.status(201).json({
      message: "Customer created successfully",
      customer: {
        ...customer,
        phones: customerPhones,
        emails: customerEmails,
      },
    });
  } catch (err) {
    console.error("Error creating customer:", err);

    // Handle UNIQUE constraint error for (belongsTo, name, company)
    if (err.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return res.status(409).json({
        error:
          "A customer with this name and company already exists for this business.",
      });
    }

    res.status(500).json({ error: "Database error" });
  }
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
      res.json({ customers: customers || [] });
    }
  });
});
router.get('/company/:companyId', (req, res) => {
  db.all('SELECT * FROM Customer WHERE belongsTo = ?', [req.params.companyId], (err, rows) => {
    if (err) {
      return res.status(500).json({ message: err.message });
    }
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
    
    res.json({ customer });
  });
});

module.exports = router;