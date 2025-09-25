const express = require('express');
const router = express.Router();
const db = require('../data/db/supabase-db');

// Get all supplies for a company
router.get('/:companyId', (req, res) => {
  const { companyId } = req.params;
  
  const query = `
    SELECT s.*, v.name as vendorName, w.name as workerName
    FROM Supplies s
    LEFT JOIN Vendor v ON s.supplierId = v.id
    LEFT JOIN Worker w ON s.restockedBy = w.id
    WHERE s.companyId = ?
    ORDER BY s.restockDate DESC
  `;
  
  db.all(query, [companyId], (err, supplies) => {
    if (err) {
      console.error('Error fetching supplies:', err);
      return res.status(500).json({ error: 'Error fetching supplies: ' + err.message });
    }
    res.json(supplies);
  });
});

// Get a single supply record with details
router.get('/:companyId/:supplyId', (req, res) => {
  const { companyId, supplyId } = req.params;
  
  const supplyQuery = `
    SELECT s.*, v.name as vendorName, w.name as workerName
    FROM Supplies s
    LEFT JOIN Vendor v ON s.supplierId = v.id
    LEFT JOIN Worker w ON s.restockedBy = w.id
    WHERE s.id = ? AND s.companyId = ?
  `;
  
  const detailsQuery = `
    SELECT * FROM SuppliesDetail
    WHERE suppliesId = ?
  `;
  
  db.get(supplyQuery, [supplyId, companyId], (err, supply) => {
    if (err) {
      console.error('Error fetching supply:', err);
      return res.status(500).json({ error: 'Error fetching supply: ' + err.message });
    }
    
    if (!supply) {
      return res.status(404).json({ error: 'Supply record not found' });
    }
    
    db.all(detailsQuery, [supplyId], (detailErr, details) => {
      if (detailErr) {
        console.error('Error fetching supply details:', detailErr);
        return res.status(500).json({ error: 'Error fetching supply details: ' + detailErr.message });
      }
      
      res.json({ ...supply, items: details });
    });
  });
});

// Create a new supply record (restock)
router.post('/:companyId', (req, res) => {
  try {
    const { companyId } = req.params;
    console.log(req.body)
    const { supplierName, products, total, amountPaid, discount, balance, workerId } = req.body;
    
    if (!workerId) {
      return res.status(400).json({ error: 'Worker ID is required' });
    }
    
    if (!products || products.length === 0) {
      return res.status(400).json({ error: 'Products are required' });
    }
    
    // Start transaction
    db.run('BEGIN TRANSACTION', (transactionErr) => {
      if (transactionErr) {
        console.error('Transaction start error:', transactionErr);
        return res.status(500).json({ error: 'Error starting transaction: ' + transactionErr.message });
      }
      
      let hasError = false;
      
      // Find or create vendor
          // Parse the supplier name which comes in format "CompanyName - ContactPerson"
          let vendorName = supplierName;
          let contactPerson = supplierName;
          
          if (supplierName && supplierName.includes(' - ')) {
            const parts = supplierName.split(' - ');
            vendorName = parts[0].trim().toLowerCase();
            contactPerson = parts[1].trim().toLowerCase();
          }
          
          db.get(
            `SELECT id FROM Vendor WHERE name = ? AND companyId = ?`,
            [vendorName, companyId],
            (vendorErr, vendor) => {
              if (vendorErr && !hasError) {
                console.error('Vendor lookup error:', vendorErr);
                hasError = true;
                db.run('ROLLBACK');
                return res.status(500).json({ error: 'Error looking up vendor: ' + vendorErr.message });
              }
              
              let supplierId = vendor ? vendor.id : null;
              
              const processSupply = () => {
            // Calculate totals
            const totalCost = parseFloat(total) || products.reduce((sum, item) => sum + (item.quantity * item.costPrice), 0);
            const totalQuantity = products.reduce((sum, item) => sum + item.quantity, 0);
            const paidAmount = parseFloat(amountPaid) || 0;
            const discountAmount = parseFloat(discount) || 0;
            const balanceAmount = parseFloat(balance) || (totalCost - paidAmount - discountAmount);
            const paymentStatus = balanceAmount <= 0 ? 'completed' : 'pending';
            
            // Insert supply record
            db.run(
              `INSERT INTO Supplies (
                companyId, supplierId, totalCost, totalQuantity, amountPaid, discount, balance, status, restockedBy
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [companyId, supplierId, totalCost, totalQuantity, paidAmount, discountAmount, balanceAmount, paymentStatus, workerId],
              function(supplyErr) {
                if (supplyErr && !hasError) {
                  console.error('Supply insert error:', supplyErr);
                  hasError = true;
                  db.run('ROLLBACK');
                  return res.status(500).json({ error: 'Error creating supply record: ' + supplyErr.message });
                }
                
                const suppliesId = this.lastID;
                console.log('Supply record created with ID:', suppliesId);
                
                // Process each product
                let itemsInserted = 0;
                let inventoryUpdated = 0;
                
                products.forEach((item, index) => {
                  // Insert supply detail
                  db.run(
                    `INSERT INTO SuppliesDetail (
                      suppliesId, name, quantity, costPrice, salesPrice, totalPrice
                    ) VALUES (?, ?, ?, ?, ?, ?)`,
                    [
                      suppliesId,
                      item.name,
                      item.quantity,
                      item.costPrice,
                      item.salesPrice,
                      item.quantity * item.costPrice
                    ],
                    function(itemErr) {
                      if (itemErr && !hasError) {
                        console.error(`Supply detail error for item ${index + 1}:`, itemErr);
                        hasError = true;
                        db.run('ROLLBACK');
                        return res.status(500).json({ error: 'Error inserting supply detail: ' + itemErr.message });
                      }
                      
                      itemsInserted++;
                      console.log(`Supply detail inserted for item ${index + 1}, total inserted: ${itemsInserted}`);
                      
                      // Update inventory
                      db.run(
                        `UPDATE Inventory 
                         SET onhand = onhand + ?, costPrice = ?, salesPrice = ?, updatedAt = CURRENT_TIMESTAMP
                         WHERE companyId = ? AND name = ?`,
                        [item.quantity, item.costPrice, item.salesPrice, companyId, item.name],
                        function(updateErr) {
                          if (updateErr && !hasError) {
                            console.error(`Inventory update error for item ${index + 1}:`, updateErr);
                            hasError = true;
                            db.run('ROLLBACK');
                            return res.status(500).json({ error: 'Error updating inventory: ' + updateErr.message });
                          }
                          
                          // Get inventory ID and create stock transaction
                          db.get(
                            `SELECT id FROM Inventory WHERE companyId = ? AND name = ?`,
                            [companyId, item.name],
                            function(getErr, inventoryRow) {
                              if (getErr && !hasError) {
                                console.error(`Error getting inventory ID for item ${index + 1}:`, getErr);
                                hasError = true;
                                db.run('ROLLBACK');
                                return res.status(500).json({ error: 'Error getting inventory ID: ' + getErr.message });
                              }
                              
                              if (inventoryRow) {
                                // Create stock transaction record
                                db.run(
                                  `INSERT INTO StockTransaction (
                                    inventoryId, type, quantity, costPrice, salesPrice, transactionDate
                                  ) VALUES (?, 'inbound', ?, ?, ?, ?)`,
                                  [
                                    inventoryRow.id,
                                    item.quantity,
                                    item.costPrice,
                                    item.salesPrice,
                                    new Date().toISOString()
                                  ],
                                  function(stockTransactionErr) {
                                    if (stockTransactionErr && !hasError) {
                                      console.error(`Stock transaction error for item ${index + 1}:`, stockTransactionErr);
                                      hasError = true;
                                      db.run('ROLLBACK');
                                      return res.status(500).json({ error: 'Error creating stock transaction: ' + stockTransactionErr.message });
                                    }
                                    
                                    inventoryUpdated++;
                                    console.log(`Inventory and stock transaction updated for item ${index + 1}, total updated: ${inventoryUpdated}`);
                                    
                                    checkAllItemsProcessed();
                                  }
                                );
                              } else {
                                inventoryUpdated++;
                                console.log(`Inventory updated for item ${index + 1} (no ID found), total updated: ${inventoryUpdated}`);
                                checkAllItemsProcessed();
                              }
                            }
                          );
                        }
                      );
                    }
                  );
                });
                
                function checkAllItemsProcessed() {
                  if (itemsInserted === products.length && inventoryUpdated === products.length && !hasError) {
                    console.log('All items processed, updating vendor and finalizing...');
                    
                    // Update vendor statistics if vendor exists
                    if (supplierId) {
                      db.run(
                        `UPDATE Vendor 
                         SET totalPurchases = totalPurchases + 1,
                             totalAmount = totalAmount + ?,
                             lastPurchaseDate = ?,
                             updatedAt = CURRENT_TIMESTAMP
                         WHERE id = ?`,
                        [totalCost, new Date().toISOString(), supplierId],
                        function(vendorUpdateErr) {
                          if (vendorUpdateErr && !hasError) {
                            console.error('Vendor update error:', vendorUpdateErr);
                            hasError = true;
                            db.run('ROLLBACK');
                            return res.status(500).json({ error: 'Error updating vendor: ' + vendorUpdateErr.message });
                          }
                          
                          console.log('Vendor updated successfully');
                          finalizeTransaction();
                        }
                      );
                    } else {
                      finalizeTransaction();
                    }
                  }
                }
                
                function finalizeTransaction() {
                  // Record vendor payment if amount was paid
                  const paidAmount = parseFloat(amountPaid) || 0;
                  if (paidAmount > 0 && supplierId) {
                    console.log('Recording payment:', paidAmount);
                    db.run(
                      `INSERT INTO VendorPayment (
                        companyId, vendorId, amount, paymentDate, 
                        paymentMethod, notes, processedBy
                      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                      [
                        companyId, supplierId, paidAmount, new Date().toISOString(),
                        'cash', `Payment for supply record #${suppliesId}`, workerId
                      ],
                      function(paymentErr) {
                        if (paymentErr && !hasError) {
                          console.error('Payment insert error:', paymentErr);
                          hasError = true;
                          db.run('ROLLBACK');
                          return res.status(500).json({ error: 'Error recording payment: ' + paymentErr.message });
                        }
                        
                        console.log('Payment recorded successfully');
                        commitTransaction();
                      }
                    );
                  } else {
                    commitTransaction();
                  }
                }
                
                function commitTransaction() {
                  db.run('COMMIT', (commitErr) => {
                    if (commitErr) {
                      console.error('Commit error:', commitErr);
                      return res.status(500).json({ error: 'Error committing transaction: ' + commitErr.message });
                    }
                    
                    console.log('Transaction committed successfully');
                    
                    res.status(201).json({ 
                      id: suppliesId,
                      message: 'Supply record created, inventory updated, and stock transactions recorded successfully',
                      itemsCount: products.length,
                      totalCost,
                      totalQuantity,
                      amountPaid: paidAmount,
                      discount: discountAmount,
                      balance: balanceAmount,
                      status: paymentStatus,
                      vendorId: supplierId
                    });
                  });
                }
              }
            );
          };
          
          // Create vendor if it doesn't exist
          if (!vendor && vendorName) {
            db.run(
              `INSERT INTO Vendor (companyId, name, contact_person, createdAt, updatedAt) VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
              [companyId, vendorName, contactPerson],
              function(vendorInsertErr) {
                if (vendorInsertErr && !hasError) {
                  console.error('Vendor insert error:', vendorInsertErr);
                  hasError = true;
                  db.run('ROLLBACK');
                  return res.status(500).json({ error: 'Error creating vendor: ' + vendorInsertErr.message });
                }
                
                supplierId = this.lastID;
                console.log('New vendor created with ID:', supplierId, 'Name:', vendorName, 'Contact:', contactPerson);
                processSupply();
              }
            );
          } else {
            processSupply();
          }
        }
      );
    });
  } catch (mainErr) {
    console.error('Main route error:', mainErr);
    res.status(500).json({ error: 'Unexpected error in supply route: ' + mainErr.message });
  }
});

// Update a supply record
router.put('/:companyId/:supplyId', (req, res) => {
  const { supplyId } = req.params;
  const { supplierId, totalCost, totalQuantity, restockDate, workerId, amountPaid, discount, balance } = req.body;
  
  if (!workerId) {
    return res.status(400).json({ error: 'Worker ID is required' });
  }
  
  // Build dynamic query based on provided fields
  let updateFields = [];
  let updateValues = [];
  
  if (supplierId !== undefined) {
    updateFields.push('supplierId = ?');
    updateValues.push(supplierId);
  }
  if (totalCost !== undefined) {
    updateFields.push('totalCost = ?');
    updateValues.push(totalCost);
  }
  if (totalQuantity !== undefined) {
    updateFields.push('totalQuantity = ?');
    updateValues.push(totalQuantity);
  }
  if (restockDate !== undefined) {
    updateFields.push('restockDate = ?');
    updateValues.push(restockDate);
  }
  if (amountPaid !== undefined) {
    updateFields.push('amountPaid = ?');
    updateValues.push(amountPaid);
  }
  if (discount !== undefined) {
    updateFields.push('discount = ?');
    updateValues.push(discount);
  }
  if (balance !== undefined) {
    updateFields.push('balance = ?');
    updateValues.push(balance);
    
    // Auto-update status based on balance
    if (balance <= 0) {
      updateFields.push('status = ?');
      updateValues.push('completed');
    }
  }
  
  updateFields.push('restockedBy = ?', 'updatedAt = CURRENT_TIMESTAMP');
  updateValues.push(workerId);
  
  // Add supplyId for WHERE clause
  updateValues.push(supplyId);
  
  const query = `UPDATE Supplies SET ${updateFields.join(', ')} WHERE id = ?`;
  
  db.run(query, updateValues, function(err) {
    if (err) {
      console.error('Error updating supply:', err);
      return res.status(500).json({ error: 'Error updating supply: ' + err.message });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Supply record not found' });
    }
    
    res.json({ message: 'Supply record updated successfully', changes: this.changes });
  });
});

// Delete a supply record
router.delete('/:companyId/:supplyId', (req, res) => {
  const { supplyId } = req.params;
  
  // Start transaction to delete supply and its details
  db.run('BEGIN TRANSACTION', (transactionErr) => {
    if (transactionErr) {
      console.error('Transaction start error:', transactionErr);
      return res.status(500).json({ error: 'Error starting transaction: ' + transactionErr.message });
    }
    
    // Delete supply details first
    db.run(
      `DELETE FROM SuppliesDetail WHERE suppliesId = ?`,
      [supplyId],
      function(detailErr) {
        if (detailErr) {
          console.error('Error deleting supply details:', detailErr);
          db.run('ROLLBACK');
          return res.status(500).json({ error: 'Error deleting supply details: ' + detailErr.message });
        }
        
        // Delete supply record
        db.run(
          `DELETE FROM Supplies WHERE id = ?`,
          [supplyId],
          function(supplyErr) {
            if (supplyErr) {
              console.error('Error deleting supply:', supplyErr);
              db.run('ROLLBACK');
              return res.status(500).json({ error: 'Error deleting supply: ' + supplyErr.message });
            }
            
            if (this.changes === 0) {
              db.run('ROLLBACK');
              return res.status(404).json({ error: 'Supply record not found' });
            }
            
            // Commit transaction
            db.run('COMMIT', (commitErr) => {
              if (commitErr) {
                console.error('Commit error:', commitErr);
                return res.status(500).json({ error: 'Error committing transaction: ' + commitErr.message });
              }
              
              res.json({ message: 'Supply record and details deleted successfully' });
            });
          }
        );
      }
    );
  });
});

module.exports = router;