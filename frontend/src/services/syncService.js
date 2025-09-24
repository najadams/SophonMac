// Sync service for handling API calls to sync endpoints
import axios from '../config/index';

class SyncService {
  constructor() {
    this.baseURL = '/api/sync';
    
    // Check if we're in web deployment mode (not Electron)
    this.isWebDeployment = typeof window !== 'undefined' && 
                          !window.require && 
                          !window.process?.versions?.electron;
  }

  // Get sync status
  async getSyncStatus() {
    // Disable sync functionality for web deployment
    if (this.isWebDeployment) {
      return {
        success: true,
        data: {
          status: 'disabled',
          message: 'Sync functionality disabled for web deployment'
        }
      };
    }
    
    try {
      const response = await axios.get(`${this.baseURL}/status`);
      return response.data;
    } catch (error) {
      console.error('Failed to get sync status:', error);
      throw error;
    }
  }

  // Check Supabase connectivity
  async checkConnectivity() {
    // Disable connectivity check for web deployment
    if (this.isWebDeployment) {
      return {
        success: true,
        data: {
          connected: false,
          message: 'Connectivity check disabled for web deployment'
        }
      };
    }
    
    try {
      const response = await axios.get(`${this.baseURL}/supabase/connectivity`);
      return response.data;
    } catch (error) {
      console.error('Failed to check connectivity:', error);
      throw error;
    }
  }

  // Trigger manual Supabase sync
  async triggerManualSync(companyId) {
    // Disable manual sync for web deployment
    if (this.isWebDeployment) {
      return {
        success: false,
        message: 'Manual sync disabled for web deployment'
      };
    }
    
    try {
      const response = await axios.post(`${this.baseURL}/supabase/sync`, {
        companyId
      });
      return response.data;
    } catch (error) {
      console.error('Manual sync failed:', error);
      throw error;
    }
  }

  // Start automatic Supabase sync
  async startAutoSync() {
    // Disable auto sync for web deployment
    if (this.isWebDeployment) {
      return {
        success: false,
        message: 'Auto sync disabled for web deployment'
      };
    }
    
    try {
      const response = await axios.post(`${this.baseURL}/supabase/auto-sync/start`);
      return response.data;
    } catch (error) {
      console.error('Failed to start auto sync:', error);
      throw error;
    }
  }

  // Stop automatic Supabase sync
  async stopAutoSync() {
    // Disable auto sync for web deployment
    if (this.isWebDeployment) {
      return {
        success: false,
        message: 'Auto sync disabled for web deployment'
      };
    }
    
    try {
      const response = await axios.post(`${this.baseURL}/supabase/auto-sync/stop`);
      return response.data;
    } catch (error) {
      console.error('Failed to stop auto sync:', error);
      throw error;
    }
  }

  // Get outbox status
  async getOutboxStatus() {
    try {
      const response = await axios.get(`${this.baseURL}/outbox`);
      return response.data;
    } catch (error) {
      console.error('Failed to get outbox status:', error);
      throw error;
    }
  }

  // Retry failed sync operations
  async retryFailedOperations() {
    try {
      const response = await axios.post(`${this.baseURL}/outbox/retry-failed`);
      return response.data;
    } catch (error) {
      console.error('Failed to retry failed operations:', error);
      throw error;
    }
  }

  // Get sync logs
  async getSyncLogs(limit = 50, operation = null) {
    try {
      const params = { limit };
      if (operation) {
        params.operation = operation;
      }
      
      const response = await axios.get(`${this.baseURL}/logs`, { params });
      return response.data;
    } catch (error) {
      console.error('Failed to get sync logs:', error);
      throw error;
    }
  }

  // Listen for sync events (WebSocket integration)
  onSyncEvent(callback) {
    // This would integrate with the existing WebSocket service
    // For now, we'll use polling, but this could be enhanced with real-time events
    const interval = setInterval(async () => {
      try {
        const status = await this.getSyncStatus();
        callback('sync_status_update', status);
      } catch (error) {
        callback('sync_error', error);
      }
    }, 30000); // Poll every 30 seconds

    return () => clearInterval(interval);
  }

  // Utility method to format sync status for display
  formatSyncStatus(status) {
    if (!status) return { text: 'Unknown', color: 'default' };

    if (status.supabaseSyncInProgress) {
      return { text: 'Syncing...', color: 'info' };
    }

    if (status.lastSupabaseSync) {
      const lastSync = new Date(status.lastSupabaseSync);
      const now = new Date();
      const diffMinutes = (now - lastSync) / (1000 * 60);
      
      if (diffMinutes < 5) {
        return { text: 'Synced', color: 'success' };
      } else if (diffMinutes < 30) {
        return { text: 'Stale', color: 'warning' };
      }
    }

    return { text: 'Not Synced', color: 'error' };
  }

  // Check if sync is available (online and configured)
  async isSyncAvailable() {
    try {
      const connectivity = await this.checkConnectivity();
      return connectivity.success && connectivity.data.isOnline;
    } catch (error) {
      return false;
    }
  }
}

// Create and export a singleton instance
const syncService = new SyncService();
export default syncService;