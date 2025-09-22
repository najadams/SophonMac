// API routes for sync operations
const express = require('express');
const router = express.Router();

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

module.exports = router;