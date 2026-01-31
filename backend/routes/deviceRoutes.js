const express = require('express');
const router = express.Router();
const db = require('../data/db/db');
const dbUtils = require('../utils/dbUtils');
const { v4: uuidv4 } = require('uuid');
const { enforceLimit } = require('../middleware/planMiddleware');

// Register a new Device
router.post('/register', enforceLimit('devices', 'Device'), (req, res) => {
  const { companyId, name, deviceId } = req.body;

  if (!companyId || !name) {
    return res.status(400).json({ error: 'Company ID and Device Name are required' });
  }

  const newDeviceId = deviceId || uuidv4();
  const status = 'online';
  const lastHeartbeat = new Date().toISOString();

  const query = `
    INSERT INTO Device (id, companyId, deviceId, name, status, lastHeartbeat)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(companyId, deviceId) DO UPDATE SET
      name = excluded.name,
      status = excluded.status,
      lastHeartbeat = excluded.lastHeartbeat,
      updatedAt = CURRENT_TIMESTAMP
  `;

  const id = dbUtils.generateUUID();
  db.run(query, [id, companyId, newDeviceId, name, status, lastHeartbeat], function(err) {
    if (err) {
      console.error('Error registering device:', err);
      return res.status(500).json({ error: 'Failed to register device' });
    }
    
    res.json({
      success: true,
      deviceId: newDeviceId,
      message: 'Device registered successfully'
    });
  });
});

// Heartbeat
router.post('/heartbeat', (req, res) => {
  const { companyId, deviceId, softwareVersion, lastSyncedEventId } = req.body;

  if (!companyId || !deviceId) {
    return res.status(400).json({ error: 'Company ID and Device ID are required' });
  }

  const lastHeartbeat = new Date().toISOString();
  const status = 'online';

  const query = `
    UPDATE Device 
    SET status = ?, lastHeartbeat = ?, softwareVersion = ?, lastSyncedEventId = ?, updatedAt = CURRENT_TIMESTAMP
    WHERE companyId = ? AND deviceId = ?
  `;

  db.run(query, [status, lastHeartbeat, softwareVersion, lastSyncedEventId, companyId, deviceId], function(err) {
    if (err) {
      console.error('Error updating heartbeat:', err);
      return res.status(500).json({ error: 'Failed to update heartbeat' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Device not found' });
    }

    // Return latest event ID available in the system to let device know if it's behind
    db.get('SELECT MAX(id) as maxId FROM EventLog WHERE companyId = ?', [companyId], (err, row) => {
      const latestEventId = row ? row.maxId : 0;
      res.json({
        success: true,
        latestServerEventId: latestEventId || 0
      });
    });
  });
});

module.exports = router;
