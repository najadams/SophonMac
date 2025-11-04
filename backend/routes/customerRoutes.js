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


// PATCH endpoint for updating customer (handles arrays for phone and email)
router.patch("/:compnayId/:id", (req, res) => {
  const customerId = parseInt(req.params.id, 10);
  const belongsTo = parseInt(req.params.compnayId, 10);
  const {
    name,
    company = "nocompany",
    address,
    city,
    notes,
    phone = [],
    email = [],
  } = req.body;
  console.log(req.body)

  if (!customerId || !name || !belongsTo) {
    return res
      .status(400)
      .json({ error: "Customer ID, belongsTo, and name are required." });
  }

  try {
    // 1️⃣ Verify customer exists
    const existing = db.connection
      .prepare(`SELECT * FROM Customer WHERE id = ? AND belongsTo = ? AND deleted = 0`)
      .get(customerId, belongsTo);

    if (!existing) {
      return res.status(404).json({ error: "Customer not found." });
    }

    // 2️⃣ Check for another customer with same name/company/belongsTo
    const duplicateCustomer = db.connection
      .prepare(
        `SELECT id FROM Customer
         WHERE belongsTo = ? AND name = ? AND company = ? AND deleted = 0 AND id != ?`
      )
      .get(belongsTo, name, company, customerId);

    if (duplicateCustomer) {
      return res.status(409).json({
        error:
          "Another customer with the same name and company already exists.",
      });
    }

    // 3️⃣ Check for duplicate phone numbers
    if (phone.length > 0) {
      const placeholders = phone.map(() => "?").join(",");
      const phoneConflict = db.connection
        .prepare(
          `SELECT CustomerPhone.phone, Customer.name
           FROM CustomerPhone
           JOIN Customer ON Customer.id = CustomerPhone.customerId
           WHERE phone IN (${placeholders})
           AND Customer.deleted = 0
           AND Customer.id != ?`
        )
        .get(...phone, customerId);

      if (phoneConflict) {
        return res.status(409).json({
          error: `Phone number "${phoneConflict.phone}" is already linked to another customer ("${phoneConflict.name}").`,
        });
      }
    }

    // 4️⃣ Check for duplicate emails
    if (email.length > 0) {
      const placeholders = email.map(() => "?").join(",");
      const emailConflict = db.connection
        .prepare(
          `SELECT CustomerEmail.email, Customer.name
           FROM CustomerEmail
           JOIN Customer ON Customer.id = CustomerEmail.customerId
           WHERE email IN (${placeholders})
           AND Customer.deleted = 0
           AND Customer.id != ?`
        )
        .get(...email, customerId);

      if (emailConflict) {
        return res.status(409).json({
          error: `Email "${emailConflict.email}" is already linked to another customer ("${emailConflict.name}").`,
        });
      }
    }

    // 5️⃣ Perform atomic update inside a transaction
    const transaction = db.connection.transaction(() => {
      // Update main customer table
      db.connection
        .prepare(
          `UPDATE Customer
           SET name = ?, company = ?, address = ?, city = ?, notes = ?, updatedAt = CURRENT_TIMESTAMP
           WHERE id = ?`
        )
        .run(
          name,
          company,
          address || null,
          city || null,
          notes || null,
          customerId
        );

      // Update phones
      db.connection
        .prepare(`DELETE FROM CustomerPhone WHERE customerId = ?`)
        .run(customerId);

      const insertPhone = db.connection.prepare(
        `INSERT INTO CustomerPhone (customerId, phone) VALUES (?, ?)`
      );
      const validPhones = [
        ...new Set(
          (Array.isArray(phone) ? phone : [phone])
            .filter((p) => p && p.trim() !== "")
            .map((p) => p.trim())
        ),
      ];
      for (const phone of validPhones) {
        insertPhone.run(customerId, phone);
      }

      // Update emails
      db.connection
        .prepare(`DELETE FROM CustomerEmail WHERE customerId = ?`)
        .run(customerId);

      const insertEmail = db.connection.prepare(
        `INSERT INTO CustomerEmail (customerId, email) VALUES (?, ?)`
      );
      const validEmails = [
        ...new Set(
          (Array.isArray(email) ? email : [email])
            .filter((e) => e && e.trim() !== "")
            .map((e) => e.trim())
        ),
      ];
      for (const email of validEmails) {
        insertEmail.run(customerId, email);
      }
    });

    // Execute transaction
    transaction();

    // 6️⃣ Fetch updated customer record with phones/emails
    const customer = db.connection
      .prepare(`SELECT * FROM Customer WHERE id = ?`)
      .get(customerId);

    const updatedPhones = db.connection
      .prepare(`SELECT phone FROM CustomerPhone WHERE customerId = ?`)
      .all(customerId)
      .map((p) => p.phone);

    const updatedEmails = db.connection
      .prepare(`SELECT email FROM CustomerEmail WHERE customerId = ?`)
      .all(customerId)
      .map((e) => e.email);

    res.status(200).json({
      message: "Customer updated successfully.",
      customer: { ...customer, phones: updatedPhones, emails: updatedEmails },
    });
  } catch (err) {
    console.error("Error updating customer:", err);
    res.status(500).json({
      error: "An error occurred while updating the customer.",
      details: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
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
    phone = [],
    email = [],
  } = req.body;

  if (!belongsTo || !name) {
    return res.status(400).json({ error: "belongsTo and name are required." });
  }

  try {
    // 1️⃣ Check if a customer with same name & company already exists
    const existingCustomer = db.connection
      .prepare(
        `SELECT id FROM Customer
         WHERE belongsTo = ? AND name = ? AND company = ? AND deleted = 0`
      )
      .get(belongsTo, name, company);

    if (existingCustomer) {
      return res
        .status(409)
        .json({ error: "Customer already exists under this company." });
    }

    // 2️⃣ Check for duplicate phone numbers
    let duplicatePhones = [];
    if (phone.length > 0) {
      const placeholders = phone.map(() => "?").join(",");
      const phoneResults = db.connection
        .prepare(
          `SELECT phone, Customer.name AS ownerName, Customer.company AS ownerCompany
           FROM CustomerPhone
           JOIN Customer ON Customer.id = CustomerPhone.customerId
           WHERE phone IN (${placeholders}) AND Customer.deleted = 0`
        )
        .all(...phone);

      if (phoneResults.length > 0) {
        duplicatePhones = phoneResults.map(
          (r) => `${r.phone} (belongs to ${r.ownerName} @ ${r.ownerCompany})`
        );
      }
    }

    // 3️⃣ Check for duplicate emails
    let duplicateEmails = [];
    if (email.length > 0) {
      const placeholders = email.map(() => "?").join(",");
      const emailResults = db.connection
        .prepare(
          `SELECT email, Customer.name AS ownerName, Customer.company AS ownerCompany
           FROM CustomerEmail
           JOIN Customer ON Customer.id = CustomerEmail.customerId
           WHERE email IN (${placeholders}) AND Customer.deleted = 0`
        )
        .all(...email);

      if (emailResults.length > 0) {
        duplicateEmails = emailResults.map(
          (r) => `${r.email} (belongs to ${r.ownerName} @ ${r.ownerCompany})`
        );
      }
    }

    // 4️⃣ If any duplicates exist, stop here and notify user
    if (duplicatePhones.length > 0 || duplicateEmails.length > 0) {
      return res.status(409).json({
        error: "Duplicate phone or email found.",
        duplicatePhones,
        duplicateEmails,
      });
    }

    // 5️⃣ Proceed to insert new customer
    const insertCustomerSQL = `
      INSERT INTO Customer (
        belongsTo, company, name, address, city,
        loyaltyPoints, totalSpent, lastPurchaseDate, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

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

    // 6️⃣ Insert phones and emails (only after passing duplicate check)
    const insertPhoneStmt = db.connection.prepare(
      `INSERT INTO CustomerPhone (customerId, phone) VALUES (?, ?)`
    );
    for (const sphone of phone) {
      if (sphone && sphone.trim()) insertPhoneStmt.run(customerId, sphone.trim());
    }

    const insertEmailStmt = db.connection.prepare(
      `INSERT INTO CustomerEmail (customerId, email) VALUES (?, ?)`
    );
    for (const semail of email) {
      if (semail && semail.trim()) insertEmailStmt.run(customerId, semail.trim());
    }

    // 7️⃣ Retrieve and return the created customer
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

    if (
      err.code === "SQLITE_CONSTRAINT_UNIQUE" ||
      err.message.includes("UNIQUE constraint failed")
    ) {
      return res.status(409).json({
        error:
          "A customer with this name and company already exists for this business.",
      });
    }

    res.status(500).json({ error: "Database error occurred." });
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