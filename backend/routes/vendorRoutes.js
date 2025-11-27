const express = require('express');
const router = express.Router();
const db = require('../data/db/db');
const dbUtils = require('../utils/dbUtils');

// Get all vendors
router.get('/:companyId', (req, res) => {
  db.all('SELECT * FROM Vendor WHERE companyId = ?', [req.params.companyId], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Get a single vendor
router.get('/:companyId/:id', (req, res) => {
  db.get('SELECT * FROM Vendor WHERE id = ?', [req.params.id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: 'Vendor not found' });
    }
    res.json(row);
  });
});

// Create a new vendor
router.post('/:companyId', (req, res) => {
 try {
   const { companyId, companyName, supplierName, contact } = req.body;

   if (!companyName || !companyId) {
     return res
       .status(400)
       .json({ error: "Vendor name and company ID are required" });
   }

    const vendorId = dbUtils.generateUUID();
    db.run(
      "INSERT INTO Vendor (id, name, phone, contact_person, companyId) VALUES (?, ?, ?, ?, ?)",
      [vendorId, companyName, contact, supplierName, companyId],
      function (err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        res.status(201).json({ id: vendorId });
      }
    );
 } catch (error) {
    console.log(error)
    res.status(500).json({ message: "failed to add new supplier" })
 }
});

// Update a vendor
router.put('/:id', (req, res) => {
  const { name, address, phone, email, contact_person, companyId } = req.body;
  
  if (!name || !companyId) {
    return res.status(400).json({ error: 'Vendor name and company ID are required' });
  }
  
  db.run(
    'UPDATE Vendor SET name = ?, address = ?, phone = ?, email = ?, contact_person = ?, companyId = ? WHERE id = ?',
    [name, address, phone, email, contact_person, companyId, req.params.id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Vendor not found' });
      }
      res.json({ changes: this.changes });
    }
  );
});

// Delete a vendor
router.delete('/:id', (req, res) => {
  db.run('DELETE FROM Vendor WHERE id = ?', [req.params.id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Vendor not found' });
    }
    res.json({ deleted: true });
  });
});

// Get supplies for a vendor
router.get('/:companyId/:id/supplies', (req, res) => {
  const vendorId = req.params.id;
  const query = `
    SELECT 
      s.*,
      v.name as vendorName,
      w.name as workerName
    FROM Supplies s
    LEFT JOIN Vendor v ON s.supplierId = v.id
    LEFT JOIN Worker w ON s.restockedBy = w.id
    WHERE s.supplierId = ?
    ORDER BY s.createdAt DESC
  `;
  
  db.all(query, [vendorId], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

module.exports = router;