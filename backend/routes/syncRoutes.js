const express = require('express');
const router = express.Router();
const db = require('../data/db/db');

// Get sync status
router.get('/status', async (req, res) => {
  try {
    const networkManager = req.app.get('networkManager');
    
    if (!networkManager || !networkManager.syncEngine) {
      return res.status(503).json({
        success: false,
        error: 'Sync engine not available'
      });
    }

    const status = networkManager.syncEngine.getComprehensiveSyncStatus();
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Error getting sync status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get sync status'
    });
  }
});

// Trigger manual Supabase sync
router.post('/supabase/sync', async (req, res) => {
  try {
    const networkManager = req.app.get('networkManager');
    
    if (!networkManager || !networkManager.syncEngine) {
      return res.status(503).json({
        success: false,
        error: 'Sync engine not available'
      });
    }

    const { companyId } = req.body;
    
    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'Company ID is required'
      });
    }

    // Check if sync is already in progress
    if (networkManager.syncEngine.supabaseSyncInProgress) {
      return res.status(409).json({
        success: false,
        error: 'Sync already in progress'
      });
    }

    const result = await networkManager.syncEngine.syncWithSupabase(companyId);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Manual Supabase sync failed:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Sync failed'
    });
  }
});

// Check Supabase connectivity
router.get('/supabase/connectivity', async (req, res) => {
  try {
    const networkManager = req.app.get('networkManager');
    
    if (!networkManager || !networkManager.syncEngine) {
      return res.status(503).json({
        success: false,
        error: 'Sync engine not available'
      });
    }

    const isOnline = await networkManager.syncEngine.checkSupabaseConnectivity();
    
    res.json({
      success: true,
      data: {
        isOnline,
        lastChecked: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error checking connectivity:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check connectivity'
    });
  }
});

// Start automatic Supabase sync
router.post('/supabase/auto-sync/start', async (req, res) => {
  try {
    const networkManager = req.app.get('networkManager');
    
    if (!networkManager || !networkManager.syncEngine) {
      return res.status(503).json({
        success: false,
        error: 'Sync engine not available'
      });
    }

    networkManager.syncEngine.startAutomaticSupabaseSync();
    
    res.json({
      success: true,
      message: 'Automatic Supabase sync started'
    });
  } catch (error) {
    console.error('Error starting automatic sync:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start automatic sync'
    });
  }
});

// Stop automatic Supabase sync
router.post('/supabase/auto-sync/stop', async (req, res) => {
  try {
    const networkManager = req.app.get('networkManager');
    
    if (!networkManager || !networkManager.syncEngine) {
      return res.status(503).json({
        success: false,
        error: 'Sync engine not available'
      });
    }

    networkManager.syncEngine.stopAutomaticSupabaseSync();
    
    res.json({
      success: true,
      message: 'Automatic Supabase sync stopped'
    });
  } catch (error) {
    console.error('Error stopping automatic sync:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to stop automatic sync'
    });
  }
});

// Get outbox status
router.get('/outbox', async (req, res) => {
  try {
    const networkManager = req.app.get('networkManager');
    
    if (!networkManager || !networkManager.syncEngine) {
      return res.status(503).json({
        success: false,
        error: 'Sync engine not available'
      });
    }

    const outboxStats = await networkManager.syncEngine.getOutboxStats();
    
    res.json({
      success: true,
      data: outboxStats
    });
  } catch (error) {
    console.error('Error getting outbox status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get outbox status'
    });
  }
});

// Retry failed operations
router.post('/outbox/retry-failed', async (req, res) => {
  try {
    const networkManager = req.app.get('networkManager');
    
    if (!networkManager || !networkManager.syncEngine) {
      return res.status(503).json({
        success: false,
        error: 'Sync engine not available'
      });
    }

    const result = await networkManager.syncEngine.retryFailedOperations();
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error retrying failed operations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retry operations'
    });
  }
});

// Get sync logs
router.get('/logs', async (req, res) => {
  try {
    const networkManager = req.app.get('networkManager');
    
    if (!networkManager || !networkManager.syncEngine) {
      return res.status(503).json({
        success: false,
        error: 'Sync engine not available'
      });
    }

    const limit = parseInt(req.query.limit) || 50;
    const logs = await networkManager.syncEngine.getSyncLogs(limit);
    
    res.json({
      success: true,
      data: logs
    });
  } catch (error) {
    console.error('Error getting sync logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get sync logs'
    });
  }
});

// Get events for replay (Sync)
router.get('/events', (req, res) => {
  const { companyId, sinceId, limit } = req.query;

  if (!companyId) {
    return res.status(400).json({ error: 'Company ID is required' });
  }

  const startId = parseInt(sinceId) || 0;
  const maxLimit = parseInt(limit) || 100;

  const query = `
    SELECT * FROM EventLog 
    WHERE companyId = ? AND id > ? 
    ORDER BY id ASC 
    LIMIT ?
  `;

  const db = require('../data/db/db');
  db.all(query, [companyId, startId, maxLimit], (err, rows) => {
    if (err) {
      console.error('Error fetching events:', err);
      return res.status(500).json({ error: 'Failed to fetch events' });
    }

    // Parse payload JSON
    const events = rows.map(row => ({
      ...row,
      payload: JSON.parse(row.payload)
    }));

    res.json({
      success: true,
      data: events,
      hasMore: events.length === maxLimit
    });
  });
});

// Get Sync Status (Umbrella)
router.get('/umbrella/status', async (req, res) => {
  try {
    const { companyId } = req.query;
    if (!companyId) return res.status(400).json({ error: 'Company ID required' });

    // Get last synced ID
    const syncState = await new Promise((resolve) => {
      db.get("SELECT lastSyncedId, updatedAt FROM SyncState WHERE key = 'umbrella_events'", (err, row) => {
        resolve(row || { lastSyncedId: 0, updatedAt: null });
      });
    });

    // Get Network Members (Parent + Siblings + Children)
    // Get Network Members (Partners)
    const networkQuery = `
      SELECT 
        c.id, 
        c.companyName, 
        cn.relationshipType as relation,
        'outgoing' as direction
      FROM CompanyNetwork cn
      JOIN Company c ON cn.targetCompanyId = c.id
      WHERE cn.sourceCompanyId = ? AND cn.status = 'active'
      UNION
      SELECT 
        c.id, 
        c.companyName, 
        cn.relationshipType as relation,
        'incoming' as direction
      FROM CompanyNetwork cn
      JOIN Company c ON cn.sourceCompanyId = c.id
      WHERE cn.targetCompanyId = ? AND cn.status = 'active'
    `;

    console.log('Fetching network status for companyId:', companyId);
    const networkMembers = await new Promise((resolve) => {
      db.all(networkQuery, [companyId, companyId], (err, rows) => {
        if (err) console.error('Network query error:', err);
        console.log('Network query rows:', rows);
        resolve(rows || []);
      });
    });

    // Check actual connectivity
    const isOnline = await req.app.get('networkManager').syncEngine.checkSupabaseConnectivity();

    res.json({
      sync: {
        online: isOnline,
        lastSyncedId: syncState.lastSyncedId,
        lastSyncedAt: syncState.updatedAt
      },
      network: networkMembers
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;