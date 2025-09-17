const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const db = require('../data/db/db');

// Get network status
router.get('/status', verifyToken, (req, res) => {
  try {
    const networkManager = req.app.get('networkManager');
    
    if (!networkManager) {
      return res.status(503).json({ error: 'Network manager not available' });
    }
    
    const status = networkManager.getNetworkStatus();
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Error getting network status:', error);
    res.status(500).json({ error: 'Failed to get network status' });
  }
});

// Get connected peers
router.get('/peers', verifyToken, (req, res) => {
  try {
    const networkManager = req.app.get('networkManager');
    
    if (!networkManager) {
      return res.status(503).json({ error: 'Network manager not available' });
    }
    
    const peers = networkManager.getConnectedPeers();
    res.json({
      success: true,
      data: peers
    });
  } catch (error) {
    console.error('Error getting peers:', error);
    res.status(500).json({ error: 'Failed to get peers' });
  }
});

// Get connected clients
router.get('/clients', verifyToken, (req, res) => {
  try {
    const networkManager = req.app.get('networkManager');
    
    if (!networkManager) {
      return res.status(503).json({ error: 'Network manager not available' });
    }
    
    const clients = networkManager.getConnectedClients();
    res.json({
      success: true,
      data: clients
    });
  } catch (error) {
    console.error('Error getting clients:', error);
    res.status(500).json({ error: 'Failed to get clients' });
  }
});

// Scan for network instances (Master only)
router.post('/scan', verifyToken, (req, res) => {
  try {
    const networkManager = req.app.get('networkManager');
    
    if (!networkManager) {
      return res.status(503).json({ error: 'Network manager not available' });
    }
    
    const status = networkManager.getNetworkStatus();
    if (!status.isMaster) {
      return res.status(403).json({ error: 'Only master instances can initiate network scans' });
    }
    
    // Trigger a fresh discovery scan
    networkManager.startNetworkDiscovery(true);
    
    // Return current peers immediately, fresh discoveries will come via websocket
    const peers = networkManager.getConnectedPeers();
    
    res.json({
      success: true,
      message: 'Network scan initiated',
      data: {
        currentPeers: peers,
        scanInitiated: true
      }
    });
  } catch (error) {
    console.error('Error initiating network scan:', error);
    res.status(500).json({ error: 'Failed to initiate network scan' });
  }
});

// Get network configuration
router.get('/config', verifyToken, (req, res) => {
  const { companyId } = req.user;
  
  db.get(
    'SELECT * FROM NetworkConfig WHERE companyId = ?',
    [companyId],
    (err, row) => {
      if (err) {
        console.error('Error getting network config:', err);
        return res.status(500).json({ error: 'Failed to get network configuration' });
      }
      
      if (!row) {
        // Return default configuration
        return res.json({
          success: true,
          data: {
            autoDiscovery: true,
            autoSync: true,
            masterElection: true,
            conflictResolution: 'last-write-wins'
          }
        });
      }
      
      res.json({
        success: true,
        data: {
          ...JSON.parse(row.config),
          isMaster: row.isMaster === 1
        }
      });
    }
  );
});

// Update network configuration
router.put('/config', verifyToken, async (req, res) => {
  try {
    const { companyId } = req.user;
    const { autoDiscovery, autoSync, masterElection, conflictResolution } = req.body;
    
    const networkManager = req.app.get('networkManager');
    
    if (!networkManager) {
      return res.status(503).json({ error: 'Network manager not available' });
    }
    
    const newConfig = {
      autoDiscovery: autoDiscovery !== undefined ? autoDiscovery : true,
      autoSync: autoSync !== undefined ? autoSync : true,
      masterElection: masterElection !== undefined ? masterElection : true,
      conflictResolution: conflictResolution || 'last-write-wins'
    };
    
    const success = await networkManager.updateNetworkConfig(newConfig);
    
    if (success) {
      res.json({
        success: true,
        message: 'Network configuration updated successfully',
        data: newConfig
      });
    } else {
      res.status(500).json({ error: 'Failed to update network configuration' });
    }
  } catch (error) {
    console.error('Error updating network config:', error);
    res.status(500).json({ error: 'Failed to update network configuration' });
  }
});

// Force master role
router.post('/master/force', verifyToken, (req, res) => {
  try {
    const networkManager = req.app.get('networkManager');
    
    if (!networkManager) {
      return res.status(503).json({ error: 'Network manager not available' });
    }
    
    const success = networkManager.forceMasterRole();
    
    if (success) {
      res.json({
        success: true,
        message: 'Successfully became master'
      });
    } else {
      res.json({
        success: false,
        message: 'Already master or failed to become master'
      });
    }
  } catch (error) {
    console.error('Error forcing master role:', error);
    res.status(500).json({ error: 'Failed to force master role' });
  }
});

// Force slave role
router.post('/slave/force', verifyToken, (req, res) => {
  try {
    const networkManager = req.app.get('networkManager');
    
    if (!networkManager) {
      return res.status(503).json({ error: 'Network manager not available' });
    }
    
    const success = networkManager.forceSlaveRole();
    
    if (success) {
      res.json({
        success: true,
        message: 'Successfully became slave'
      });
    } else {
      res.json({
        success: false,
        message: 'Already slave or failed to become slave'
      });
    }
  } catch (error) {
    console.error('Error forcing slave role:', error);
    res.status(500).json({ error: 'Failed to force slave role' });
  }
});

// Force full synchronization
router.post('/sync/full', verifyToken, (req, res) => {
  try {
    const networkManager = req.app.get('networkManager');
    
    if (!networkManager) {
      return res.status(503).json({ error: 'Network manager not available' });
    }
    
    const success = networkManager.requestFullSync();
    
    if (success) {
      res.json({
        success: true,
        message: 'Full sync requested successfully'
      });
    } else {
      res.json({
        success: false,
        message: 'Cannot request sync (already master or no master available)'
      });
    }
  } catch (error) {
    console.error('Error requesting full sync:', error);
    res.status(500).json({ error: 'Failed to request full sync' });
  }
});

// Get sync conflicts
router.get('/conflicts', verifyToken, (req, res) => {
  const { companyId } = req.user;
  const { page = 1, limit = 20, resolved } = req.query;
  
  let query = 'SELECT * FROM SyncConflicts WHERE companyId = ?';
  const params = [companyId];
  
  if (resolved !== undefined) {
    query += ' AND resolution != ?';
    params.push(resolved === 'true' ? 'pending' : 'pending');
  }
  
  query += ' ORDER BY createdAt DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));
  
  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('Error getting sync conflicts:', err);
      return res.status(500).json({ error: 'Failed to get sync conflicts' });
    }
    
    res.json({
      success: true,
      data: rows.map(row => ({
        ...row,
        localData: JSON.parse(row.localData),
        remoteData: JSON.parse(row.remoteData)
      }))
    });
  });
});

// Resolve sync conflict
router.post('/conflicts/:conflictId/resolve', verifyToken, (req, res) => {
  const { conflictId } = req.params;
  const { resolution, resolvedData } = req.body; // 'local_wins', 'remote_wins', 'manual'
  const { id: userId } = req.user;
  
  if (!['local_wins', 'remote_wins', 'manual'].includes(resolution)) {
    return res.status(400).json({ error: 'Invalid resolution type' });
  }
  
  db.run(
    'UPDATE SyncConflicts SET resolution = ?, resolvedBy = ?, resolvedAt = ? WHERE id = ?',
    [resolution, userId, new Date().toISOString(), conflictId],
    function(err) {
      if (err) {
        console.error('Error resolving conflict:', err);
        return res.status(500).json({ error: 'Failed to resolve conflict' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Conflict not found' });
      }
      
      res.json({
        success: true,
        message: 'Conflict resolved successfully'
      });
    }
  );
});

// Get network events/logs
router.get('/events', verifyToken, (req, res) => {
  const { companyId } = req.user;
  const { page = 1, limit = 50, eventType, severity } = req.query;
  
  let query = 'SELECT * FROM NetworkEvents WHERE companyId = ?';
  const params = [companyId];
  
  if (eventType) {
    query += ' AND eventType = ?';
    params.push(eventType);
  }
  
  if (severity) {
    query += ' AND severity = ?';
    params.push(severity);
  }
  
  query += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));
  
  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('Error getting network events:', err);
      return res.status(500).json({ error: 'Failed to get network events' });
    }
    
    res.json({
      success: true,
      data: rows.map(row => ({
        ...row,
        eventData: row.eventData ? JSON.parse(row.eventData) : null
      }))
    });
  });
});

// Run network diagnostics
router.get('/diagnostics', verifyToken, (req, res) => {
  try {
    const networkManager = req.app.get('networkManager');
    
    if (!networkManager) {
      return res.status(503).json({ error: 'Network manager not available' });
    }
    
    const diagnostics = networkManager.runNetworkDiagnostics();
    res.json({
      success: true,
      data: diagnostics
    });
  } catch (error) {
    console.error('Error running diagnostics:', error);
    res.status(500).json({ error: 'Failed to run network diagnostics' });
  }
});

// Test peer connectivity
router.get('/connectivity', verifyToken, (req, res) => {
  try {
    const networkManager = req.app.get('networkManager');
    
    if (!networkManager) {
      return res.status(503).json({ error: 'Network manager not available' });
    }
    
    const results = networkManager.testPeerConnectivity();
    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Error testing connectivity:', error);
    res.status(500).json({ error: 'Failed to test peer connectivity' });
  }
});

// Broadcast message to network
router.post('/broadcast', verifyToken, (req, res) => {
  try {
    const { event, data } = req.body;
    const networkManager = req.app.get('networkManager');
    
    if (!networkManager) {
      return res.status(503).json({ error: 'Network manager not available' });
    }
    
    if (!event) {
      return res.status(400).json({ error: 'Event name is required' });
    }
    
    networkManager.broadcastToNetwork(event, data);
    
    res.json({
      success: true,
      message: 'Message broadcasted successfully'
    });
  } catch (error) {
    console.error('Error broadcasting message:', error);
    res.status(500).json({ error: 'Failed to broadcast message' });
  }
});

module.exports = router;