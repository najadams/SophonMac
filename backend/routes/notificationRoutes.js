const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const router = express.Router();
const dbPath = path.join(__dirname, '..', 'database.db');

// Get all notifications for a company
router.get('/:companyId', (req, res) => {
    const { companyId } = req.params;
    const db = new sqlite3.Database(dbPath);
    
    const query = `
        SELECT id, message, status, createdAt, updatedAt 
        FROM Notification 
        WHERE companyId = ? 
        ORDER BY createdAt DESC
    `;
    
    db.all(query, [companyId], (err, notifications) => {
        if (err) {
            console.error('Error fetching notifications:', err);
            return res.status(500).json({ error: 'Failed to fetch notifications' });
        }
        
        res.json(notifications);
    });
    
    db.close();
});

// Create a new notification
router.post('/', (req, res) => {
    const { companyId, message, status = 'unread' } = req.body;
    
    if (!companyId || !message) {
        return res.status(400).json({ error: 'Company ID and message are required' });
    }
    
    const db = new sqlite3.Database(dbPath);
    
    const query = `
        INSERT INTO Notification (companyId, message, status, createdAt, updatedAt)
        VALUES (?, ?, ?, datetime('now'), datetime('now'))
    `;
    
    db.run(query, [companyId, message, status], function(err) {
        if (err) {
            console.error('Error creating notification:', err);
            return res.status(500).json({ error: 'Failed to create notification' });
        }
        
        res.status(201).json({
            id: this.lastID,
            companyId,
            message,
            status,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });
    });
    
    db.close();
});

// Mark notification as read
router.patch('/:id/read', (req, res) => {
    const { id } = req.params;
    const db = new sqlite3.Database(dbPath);
    
    const query = `
        UPDATE Notification 
        SET status = 'read', updatedAt = datetime('now')
        WHERE id = ?
    `;
    
    db.run(query, [id], function(err) {
        if (err) {
            console.error('Error updating notification:', err);
            return res.status(500).json({ error: 'Failed to update notification' });
        }
        
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Notification not found' });
        }
        
        res.json({ message: 'Notification marked as read' });
    });
    
    db.close();
});

// Delete a notification
router.delete('/:id', (req, res) => {
    const { id } = req.params;
    const db = new sqlite3.Database(dbPath);
    
    const query = 'DELETE FROM Notification WHERE id = ?';
    
    db.run(query, [id], function(err) {
        if (err) {
            console.error('Error deleting notification:', err);
            return res.status(500).json({ error: 'Failed to delete notification' });
        }
        
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Notification not found' });
        }
        
        res.json({ message: 'Notification deleted successfully' });
    });
    
    db.close();
});

module.exports = router;