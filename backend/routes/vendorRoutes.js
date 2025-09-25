const express = require('express');
const router = express.Router();
const db = require('../data/db/db');
const { verifyToken } = require('../middleware/authMiddleware');

// Get all vendors
router.get('/:companyId', verifyToken, (req, res) => {
  const requestedCompanyId = parseInt(req.params.companyId);
  const userCompanyId = req.user.role === 'company' ? req.user.id : req.user.companyId;
  
  // Security check: Users can only access vendors from their own company
  if (requestedCompanyId !== userCompanyId) {
    return res.status(403).json({ error: 'Access denied. You can only view vendors from your own company.' });
  }
  
  db.all('SELECT * FROM Vendor WHERE companyId = ?', [requestedCompanyId], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Get a single vendor
router.get('/:companyId/:id', verifyToken, (req, res) => {
  const requestedCompanyId = parseInt(req.params.companyId);
  const userCompanyId = req.user.role === 'company' ? req.user.id : req.user.companyId;
  
  // Security check: Users can only access vendors from their own company
  if (requestedCompanyId !== userCompanyId) {
    return res.status(403).json({ error: 'Access denied. You can only view vendors from your own company.' });
  }
  
  db.get('SELECT * FROM Vendor WHERE id = ? AND companyId = ?', [req.params.id, requestedCompanyId], (err, row) => {
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
router.post('/:companyId', verifyToken, (req, res) => {
  const requestedCompanyId = parseInt(req.params.companyId);
  const userCompanyId = req.user.role === 'company' ? req.user.id : req.user.companyId;
  
  // Security check: Users can only create vendors for their own company
  if (requestedCompanyId !== userCompanyId) {
    return res.status(403).json({ error: 'Access denied. You can only create vendors for your own company.' });
  }
  
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
router.put('/:id', verifyToken, (req, res) => {
  const userCompanyId = req.user.role === 'company' ? req.user.id : req.user.companyId;
  const { name, address, phone, email, contact_person, companyId } = req.body;
  
  // Security check: Users can only update vendors from their own company
  if (companyId && parseInt(companyId) !== userCompanyId) {
    return res.status(403).json({ error: 'Access denied. You can only update vendors from your own company.' });
  }
  
  if (!name || !companyId) {
    return res.status(400).json({ error: 'Vendor name and company ID are required' });
  }
  
  // First verify the vendor belongs to the user's company
  db.get('SELECT companyId FROM Vendor WHERE id = ?', [req.params.id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: 'Vendor not found' });
    }
    if (row.companyId !== userCompanyId) {
      return res.status(403).json({ error: 'Access denied. You can only update vendors from your own company.' });
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
    });
  });
});

// Delete a vendor
router.delete('/:id', verifyToken, (req, res) => {
  const userCompanyId = req.user.role === 'company' ? req.user.id : req.user.companyId;
  
  // First verify the vendor belongs to the user's company
  db.get('SELECT companyId FROM Vendor WHERE id = ?', [req.params.id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: 'Vendor not found' });
    }
    if (row.companyId !== userCompanyId) {
      return res.status(403).json({ error: 'Access denied. You can only delete vendors from your own company.' });
    }
    
    db.run('DELETE FROM Vendor WHERE id = ?', [req.params.id], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Vendor not found' });
      }
      res.json({ changes: this.changes });
    });
  });
});

module.exports = router;