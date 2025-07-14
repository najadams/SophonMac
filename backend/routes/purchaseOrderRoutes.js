const express = require('express');
const router = express.Router();
const db = require('../data/db/db');

// Get all purchase orders
router.get('/', (req, res) => {
  db.all('SELECT * FROM PurchaseOrder', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Get a single purchase order
router.get('/:companyId', (req, res) => {
  db.get('SELECT * FROM PurchaseOrder WHERE id = ?', [req.params.id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: 'Purchase order not found' });
    }
    res.json(row);
  });
});

// Create a new purchase order with items
router.post('/:companyId', (req, res) => {
  const { companyId } = req.params;
  const { 
    orderNumber,
    vendorId, 
    totalAmount, 
    status = 'pending',
    paymentStatus = 'unpaid',
    amountPaid = 0,
    dueDate,
    notes,
    orderedBy,
    items = [] // Array of purchase order items
  } = req.body;
  
  // Validation
  if (!vendorId || !orderedBy || !orderNumber) {
    return res.status(400).json({ 
      error: 'Vendor ID, ordered by worker ID, and order number are required' 
    });
  }
  
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ 
      error: 'At least one item is required for the purchase order' 
    });
  }
  
  // Validate items
  for (const item of items) {
    if (!item.productId || !item.quantity || !item.unit || !item.costPrice) {
      return res.status(400).json({ 
        error: 'Each item must have productId, quantity, unit, and costPrice' 
      });
    }
  }
  
  // Calculate total if not provided
  const calculatedTotal = items.reduce((sum, item) => {
    return sum + (item.quantity * item.costPrice);
  }, 0);
  
  const finalTotal = totalAmount || calculatedTotal;
  
  // Start transaction
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    
    // Insert purchase order
    db.run(
      `INSERT INTO PurchaseOrder (
        companyId, vendorId, orderNumber, status, totalAmount, 
        paymentStatus, amountPaid, dueDate, notes, orderedBy
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        companyId, vendorId, orderNumber, status, finalTotal,
        paymentStatus, amountPaid, dueDate, notes, orderedBy
      ],
      function(err) {
        if (err) {
          db.run('ROLLBACK');
          return res.status(500).json({ error: err.message });
        }
        
        const purchaseOrderId = this.lastID;
        let itemsInserted = 0;
        let hasError = false;
        
        // Insert purchase order items
        items.forEach((item) => {
          const totalCost = item.quantity * item.costPrice;
          
          db.run(
            `INSERT INTO PurchaseOrderItem (
              purchaseOrderId, productId, quantity, unit, costPrice, totalCost
            ) VALUES (?, ?, ?, ?, ?, ?)`,
            [
              purchaseOrderId, item.productId, item.quantity, 
              item.unit, item.costPrice, totalCost
            ],
            function(itemErr) {
              if (itemErr && !hasError) {
                hasError = true;
                db.run('ROLLBACK');
                return res.status(500).json({ error: itemErr.message });
              }
              
              itemsInserted++;
              
              // If all items inserted successfully
              if (itemsInserted === items.length && !hasError) {
                db.run('COMMIT', (commitErr) => {
                  if (commitErr) {
                    return res.status(500).json({ error: commitErr.message });
                  }
                  
                  res.status(201).json({ 
                    id: purchaseOrderId,
                    orderNumber,
                    message: 'Purchase order created successfully',
                    itemsCount: items.length,
                    totalAmount: finalTotal
                  });
                });
              }
            }
          );
        });
      }
    );
  });
});

// Update a purchase order
router.put('/:id', (req, res) => {
  const { order_date, total_amount, status, vendor_id, company_id } = req.body;
  
  if (!vendor_id || !company_id) {
    return res.status(400).json({ error: 'Vendor ID and company ID are required' });
  }
  
  db.run(
    'UPDATE PurchaseOrder SET order_date = ?, total_amount = ?, status = ?, vendor_id = ?, company_id = ? WHERE id = ?',
    [order_date, total_amount, status, vendor_id, company_id, req.params.id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Purchase order not found' });
      }
      res.json({ changes: this.changes });
    }
  );
});

// Delete a purchase order
router.delete('/:id', (req, res) => {
  db.run('DELETE FROM PurchaseOrder WHERE id = ?', [req.params.id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Purchase order not found' });
    }
    res.json({ deleted: true });
  });
});

// Get purchase order with items
router.get('/:companyId/:orderId', (req, res) => {
  const { orderId } = req.params;
  
  db.get(
    `SELECT po.*, v.name as vendorName, w.name as orderedByName
     FROM PurchaseOrder po
     LEFT JOIN Vendor v ON po.vendorId = v.id
     LEFT JOIN Worker w ON po.orderedBy = w.id
     WHERE po.id = ?`,
    [orderId],
    (err, order) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (!order) {
        return res.status(404).json({ error: 'Purchase order not found' });
      }
      
      // Get order items
      db.all(
        `SELECT poi.*, i.name as productName
         FROM PurchaseOrderItem poi
         LEFT JOIN Inventory i ON poi.productId = i.id
         WHERE poi.purchaseOrderId = ?`,
        [orderId],
        (itemsErr, items) => {
          if (itemsErr) {
            return res.status(500).json({ error: itemsErr.message });
          }
          
          res.json({ ...order, items });
        }
      );
    }
  );
});

// Mark purchase order as received and update inventory
router.put('/:companyId/:orderId/receive', (req, res) => {
  const { orderId } = req.params;
  const { receivedBy, notes } = req.body;
  
  if (!receivedBy) {
    return res.status(400).json({ error: 'Received by worker ID is required' });
  }
  
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    
    // Update purchase order status
    db.run(
      `UPDATE PurchaseOrder 
       SET status = 'received', receivedBy = ?, receivedAt = CURRENT_TIMESTAMP, notes = ?
       WHERE id = ?`,
      [receivedBy, notes, orderId],
      function(err) {
        if (err) {
          db.run('ROLLBACK');
          return res.status(500).json({ error: err.message });
        }
        
        // Get order items to update inventory
        db.all(
          'SELECT * FROM PurchaseOrderItem WHERE purchaseOrderId = ?',
          [orderId],
          (itemsErr, items) => {
            if (itemsErr) {
              db.run('ROLLBACK');
              return res.status(500).json({ error: itemsErr.message });
            }
            
            let itemsProcessed = 0;
            let hasError = false;
            
            items.forEach((item) => {
              // Update inventory quantity
              db.run(
                'UPDATE Inventory SET onhand = onhand + ? WHERE id = ?',
                [item.quantity, item.productId],
                (updateErr) => {
                  if (updateErr && !hasError) {
                    hasError = true;
                    db.run('ROLLBACK');
                    return res.status(500).json({ error: updateErr.message });
                  }
                  
                  itemsProcessed++;
                  
                  if (itemsProcessed === items.length && !hasError) {
                    db.run('COMMIT', (commitErr) => {
                      if (commitErr) {
                        return res.status(500).json({ error: commitErr.message });
                      }
                      
                      res.json({ 
                        message: 'Purchase order marked as received and inventory updated',
                        itemsUpdated: items.length
                      });
                    });
                  }
                }
              );
            });
          }
        );
      }
    );
  });
});

module.exports = router;