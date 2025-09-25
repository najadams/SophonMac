const express = require('express');
const db = require('../data/db/supabase-db');

const router = express.Router();

// Get all notifications
router.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM "Notification" ORDER BY "createdAt" DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Mark notification as read
router.put('/:id/read', async (req, res) => {
  const { id } = req.params;
  
  try {
    await db.query('UPDATE "Notification" SET "isRead" = true WHERE id = $1', [id]);
    res.json({ message: 'Notification marked as read' });
  } catch (err) {
    console.error('Error updating notification:', err);
    res.status(500).json({ error: 'Failed to update notification' });
  }
});

// Delete notification
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    await db.query('DELETE FROM "Notification" WHERE id = $1', [id]);
    res.json({ message: 'Notification deleted' });
  } catch (err) {
    console.error('Error deleting notification:', err);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

module.exports = router;