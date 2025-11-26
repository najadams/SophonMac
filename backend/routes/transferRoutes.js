const express = require('express');
const router = express.Router();
const db = require('../data/db/db');
const dbUtils = require('../utils/dbUtils');

// Helper to check if companies are in the same Umbrella Network
const validateUmbrellaRelationship = (sourceId, targetId) => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT id, parentCompanyId, taxMode 
      FROM Company 
      WHERE id IN (?, ?)
    `;
    db.all(query, [sourceId, targetId], (err, rows) => {
      if (err) return reject(err);
      if (rows.length !== 2) return resolve(false);

      const c1 = rows[0];
      const c2 = rows[1];

      // Case 1: Both have same parent
      if (c1.parentCompanyId && c2.parentCompanyId && c1.parentCompanyId === c2.parentCompanyId) {
        return resolve(true);
      }
      // Case 2: One is parent of the other
      if (c1.id === c2.parentCompanyId || c2.id === c1.parentCompanyId) {
        return resolve(true);
      }

      resolve(false);
    });
  });
};

// Process Internal Transfer
router.post('/internal', async (req, res) => {
  const { sourceCompanyId, targetCompanyId, items, notes } = req.body;

  if (!sourceCompanyId || !targetCompanyId || !items || !Array.isArray(items)) {
    return res.status(400).json({ error: 'Invalid request data' });
  }

  try {
    // 1. Validate Relationship
    const isValid = await validateUmbrellaRelationship(sourceCompanyId, targetCompanyId);
    if (!isValid) {
      return res.status(403).json({ error: 'Companies are not in the same Umbrella Network' });
    }

    // 2. Process Items
    const errors = [];
    const processed = [];

    // Begin Transaction (SQLite doesn't support nested transactions easily in this driver, so we do best effort or sequential)
    // Ideally we wrap this in db.serialize or similar if using sqlite3 directly, but better-sqlite3 is synchronous.
    // Since we are using a shim, we'll just execute sequentially.

    for (const item of items) {
      const { sku, quantity, sourceProductId } = item;
      
      // Find Source Product
      const sourceProduct = await new Promise((resolve) => {
        db.get('SELECT * FROM Inventory WHERE id = ? AND companyId = ?', [sourceProductId, sourceCompanyId], (err, row) => resolve(row));
      });

      if (!sourceProduct || sourceProduct.onhand < quantity) {
        errors.push(`Insufficient stock for product ID ${sourceProductId}`);
        continue;
      }

      // Find Target Product (by SKU or Name)
      let targetProduct = await new Promise((resolve) => {
        db.get('SELECT * FROM Inventory WHERE sku = ? AND companyId = ?', [sourceProduct.sku, targetCompanyId], (err, row) => resolve(row));
      });

      // If target product doesn't exist, create it (simplified copy)
      if (!targetProduct) {
        // Logic to clone product to target company would go here.
        // For MVP, we require it to exist or we skip.
        // Let's try to match by Name if SKU fails
        targetProduct = await new Promise((resolve) => {
          db.get('SELECT * FROM Inventory WHERE name = ? AND companyId = ?', [sourceProduct.name, targetCompanyId], (err, row) => resolve(row));
        });

        if (!targetProduct) {
          errors.push(`Product ${sourceProduct.name} not found in target company`);
          continue;
        }
      }

      // Update Stock
      // Source: Decrement
      db.run('UPDATE Inventory SET onhand = onhand - ? WHERE id = ?', [quantity, sourceProduct.id]);
      
      // Target: Increment
      db.run('UPDATE Inventory SET onhand = onhand + ? WHERE id = ?', [quantity, targetProduct.id]);

      // Record Transactions
      const date = new Date().toISOString();
      
      // Source Transaction (Out)
      const sourceTxId = dbUtils.generateUUID();
      db.run(`INSERT INTO StockTransaction (id, inventoryId, type, quantity, transactionDate, notes) VALUES (?, ?, 'transfer_out', ?, ?, ?)`,
        [sourceTxId, sourceProduct.id, quantity, date, `Transfer to Company ${targetCompanyId}`]);

      // Target Transaction (In)
      const targetTxId = dbUtils.generateUUID();
      db.run(`INSERT INTO StockTransaction (id, inventoryId, type, quantity, transactionDate, notes) VALUES (?, ?, 'transfer_in', ?, ?, ?)`,
        [targetTxId, targetProduct.id, quantity, date, `Transfer from Company ${sourceCompanyId}`]);

      processed.push({ sku: sourceProduct.sku, quantity });
    }

    if (processed.length === 0 && errors.length > 0) {
      return res.status(400).json({ error: 'Transfer failed', details: errors });
    }

    res.json({
      success: true,
      message: 'Transfer processed',
      processedCount: processed.length,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Error processing internal transfer:', error);
    res.status(500).json({ error: 'Internal transfer failed' });
  }
});

module.exports = router;
