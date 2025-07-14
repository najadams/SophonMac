const express = require('express');
const router = express.Router();
const db = require('../data/db/db');

// Create a new vendor payment
router.post('/', (req, res) => {
  const { companyId, vendorId, purchaseOrderId, amount, paymentMethod, reference, notes, processedBy } = req.body;
  
  if (!companyId || !vendorId || !amount) {
    return res.status(400).json({ error: 'Company ID, vendor ID, and amount are required' });
  }
  
  if (amount <= 0) {
    return res.status(400).json({ error: 'Payment amount must be greater than 0' });
  }
  
  const paymentDate = new Date().toISOString();
  
  db.run(
    `INSERT INTO VendorPayment (
      companyId, vendorId, purchaseOrderId, amount, paymentDate,
      paymentMethod, reference, notes, processedBy
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      companyId, vendorId, purchaseOrderId, amount, paymentDate,
      paymentMethod || 'cash', reference, notes, processedBy
    ],
    function(err) {
      if (err) {
        console.error('Error creating vendor payment:', err);
        return res.status(500).json({ error: 'Failed to create vendor payment: ' + err.message });
      }
      
      res.status(201).json({
        id: this.lastID,
        companyId,
        vendorId,
        purchaseOrderId,
        amount,
        paymentDate,
        paymentMethod: paymentMethod || 'cash',
        reference,
        notes,
        processedBy
      });
    }
  );
});

// Get vendor payments by vendor ID
router.get('/vendor/:vendorId', (req, res) => {
  const { vendorId } = req.params;
  const { companyId } = req.query;
  
  if (!companyId) {
    return res.status(400).json({ error: 'Company ID is required' });
  }
  
  db.all(
    `SELECT * FROM VendorPayment 
     WHERE vendorId = ? AND companyId = ? 
     ORDER BY paymentDate DESC`,
    [vendorId, companyId],
    (err, rows) => {
      if (err) {
        console.error('Error fetching vendor payments:', err);
        return res.status(500).json({ error: 'Failed to fetch vendor payments: ' + err.message });
      }
      
      res.json(rows);
    }
  );
});

// Get all vendor payments for a company
router.get('/company/:companyId', (req, res) => {
  const { companyId } = req.params;
  
  db.all(
    `SELECT vp.*, v.name as vendorName 
     FROM VendorPayment vp
     LEFT JOIN Vendor v ON vp.vendorId = v.id
     WHERE vp.companyId = ? 
     ORDER BY vp.paymentDate DESC`,
    [companyId],
    (err, rows) => {
      if (err) {
        console.error('Error fetching company vendor payments:', err);
        return res.status(500).json({ error: 'Failed to fetch vendor payments: ' + err.message });
      }
      
      res.json(rows);
    }
  );
});

module.exports = router;