const express = require('express');
const router = express.Router();
const db = require('../data/db/db');

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

   db.run(
     "INSERT INTO Vendor (name, phone, contact_person, companyId) VALUES (?, ?, ?, ?)",
     [companyName, contact, supplierName, companyId],
     function (err) {
       if (err) {
         return res.status(500).json({ error: err.message });
       }
       res.status(201).json({ id: this.lastID });
     }
   );
 } catch (error) {
    console.log(error)
    res.status(500).json({ message: "failed to add new supplier" })
 }
});

// Update a vendor
router.put('/:id', (req, res) => {
  const { name, address, phone, email, contact_person, company_id } = req.body;
  
  if (!name || !company_id) {
    return res.status(400).json({ error: 'Vendor name and company ID are required' });
  }
  
  db.run(
    'UPDATE Vendor SET name = ?, address = ?, phone = ?, email = ?, contact_person = ?, company_id = ? WHERE id = ?',
    [name, address, phone, email, contact_person, company_id, req.params.id],
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

module.exports = router;