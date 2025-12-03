const express = require('express');
const router = express.Router();
const db = require('../data/db/db');
const dbUtils = require('../utils/dbUtils');

// Get all pending sync conflicts
router.get('/conflicts', (req, res) => {
  db.all(`
    SELECT * FROM SyncConflicts 
    WHERE status = 'pending' 
    ORDER BY createdAt DESC
  `, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    // Parse JSON fields
    const conflicts = rows.map(row => ({
      ...row,
      suggestions: JSON.parse(row.suggestions),
      data: JSON.parse(row.data || '{}')
    }));

    res.json(conflicts);
  });
});

// Resolve a sync conflict
router.post('/conflicts/:id/resolve', async (req, res) => {
  const { id } = req.params;
  const { action, newName } = req.body;

  try {
    // Get the conflict details
    const conflict = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM SyncConflicts WHERE id = ?', [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!conflict) {
      return res.status(404).json({ error: 'Conflict not found' });
    }

    const data = JSON.parse(conflict.data || '{}');

    // Handle different actions
    switch (action) {
      case 'rename':
        if (!newName) {
          return res.status(400).json({ error: 'New name is required for rename action' });
        }
        // Update the local record with new name
        await new Promise((resolve, reject) => {
          db.run(
            `UPDATE ${conflict.tableName} SET companyName = ?, is_synced = 0 WHERE id = ?`,
            [newName, conflict.recordId],
            (err) => err ? reject(err) : resolve()
          );
        });
        break;

      case 'skip':
        // Mark the local record as synced (won't try to upload again)
        await new Promise((resolve, reject) => {
          db.run(
            `UPDATE ${conflict.tableName} SET is_synced = 1 WHERE id = ?`,
            [conflict.recordId],
            (err) => err ? reject(err) : resolve()
          );
        });
        break;

      case 'merge':
        // Delete the local record (will use cloud version)
        await new Promise((resolve, reject) => {
          db.run(
            `DELETE FROM ${conflict.tableName} WHERE id = ?`,
            [conflict.recordId],
            (err) => err ? reject(err) : resolve()
          );
        });
        break;

      case 'overwrite':
        // Force upload by trying upsert again (for non-Company tables)
        // This would need sync engine access - for now just mark as not synced
        await new Promise((resolve, reject) => {
          db.run(
            `UPDATE ${conflict.tableName} SET is_synced = 0 WHERE id = ?`,
            [conflict.recordId],
            (err) => err ? reject(err) : resolve()
          );
        });
        break;

      default:
        return res.status(400).json({ error: 'Invalid action' });
    }

    // Mark conflict as resolved
    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE SyncConflicts SET status = 'resolved', resolvedAt = CURRENT_TIMESTAMP WHERE id = ?`,
        [id],
        (err) => err ? reject(err) : resolve()
      );
    });

    res.json({ success: true, message: 'Conflict resolved successfully' });

  } catch (error) {
    console.error('Error resolving conflict:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get conflict count
router.get('/conflicts/count', (req, res) => {
  db.get(`
    SELECT COUNT(*) as count FROM SyncConflicts WHERE status = 'pending'
  `, [], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ count: row.count });
  });
});

module.exports = router;
