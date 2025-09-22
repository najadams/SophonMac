import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Button, 
  Chip, 
  Typography, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
  Switch,
  FormControlLabel,
  Divider
} from '@mui/material';
import { 
  CloudSync, 
  CloudOff, 
  CloudDone, 
  Warning, 
  Refresh,
  Settings as SettingsIcon
} from '@mui/icons-material';
import syncService from '../services/syncService';

const SyncStatus = ({ companyId }) => {
  const [syncStatus, setSyncStatus] = useState(null);
  const [isOnline, setIsOnline] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);
  const [outboxStats, setOutboxStats] = useState(null);
  const [syncLogs, setSyncLogs] = useState([]);

  // Fetch sync status
  const fetchSyncStatus = async () => {
    try {
      const result = await syncService.getSyncStatus();
      if (result.success) {
        setSyncStatus(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch sync status:', error);
    }
  };

  // Check connectivity
  const checkConnectivity = async () => {
    try {
      const result = await syncService.checkConnectivity();
      if (result.success) {
        setIsOnline(result.data.isOnline);
      }
    } catch (error) {
      console.error('Failed to check connectivity:', error);
      setIsOnline(false);
    }
  };

  // Trigger manual sync
  const handleManualSync = async () => {
    if (!companyId) {
      alert('Company ID is required for sync');
      return;
    }

    setLoading(true);
    try {
      const result = await syncService.triggerManualSync(companyId);
      if (result.success) {
        alert('Sync completed successfully!');
        fetchSyncStatus();
      } else {
        alert(`Sync failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Manual sync failed:', error);
      alert('Sync failed: Network error');
    } finally {
      setLoading(false);
    }
  };

  // Toggle auto sync
  const handleAutoSyncToggle = async (enabled) => {
    try {
      const result = enabled 
        ? await syncService.startAutoSync()
        : await syncService.stopAutoSync();
      
      if (result.success) {
        setAutoSyncEnabled(enabled);
      } else {
        alert(`Failed to ${enabled ? 'start' : 'stop'} auto sync: ${result.error}`);
      }
    } catch (error) {
      console.error('Failed to toggle auto sync:', error);
      alert('Failed to toggle auto sync');
    }
  };

  // Fetch outbox stats
  const fetchOutboxStats = async () => {
    try {
      const result = await syncService.getOutboxStatus();
      if (result.success) {
        setOutboxStats(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch outbox stats:', error);
    }
  };

  // Fetch sync logs
  const fetchSyncLogs = async () => {
    try {
      const result = await syncService.getSyncLogs(10);
      if (result.success) {
        setSyncLogs(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch sync logs:', error);
    }
  };

  // Retry failed operations
  const handleRetryFailed = async () => {
    try {
      const result = await syncService.retryFailedOperations();
      
      if (result.success) {
        alert('Failed operations queued for retry');
        fetchOutboxStats();
      } else {
        alert(`Failed to retry operations: ${result.error}`);
      }
    } catch (error) {
      console.error('Failed to retry operations:', error);
      alert('Failed to retry operations');
    }
  };

  // Initial load and periodic updates
  useEffect(() => {
    fetchSyncStatus();
    checkConnectivity();
    
    const interval = setInterval(() => {
      fetchSyncStatus();
      checkConnectivity();
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  // Get sync status color and icon
  const getSyncStatusDisplay = () => {
    if (!syncStatus) {
      return { color: 'default', icon: <CloudOff />, text: 'Unknown' };
    }

    if (!isOnline) {
      return { color: 'warning', icon: <CloudOff />, text: 'Offline' };
    }

    if (syncStatus.supabaseSyncInProgress) {
      return { color: 'info', icon: <CloudSync className="animate-spin" />, text: 'Syncing...' };
    }

    if (syncStatus.lastSupabaseSync) {
      const lastSync = new Date(syncStatus.lastSupabaseSync);
      const now = new Date();
      const diffMinutes = (now - lastSync) / (1000 * 60);
      
      if (diffMinutes < 5) {
        return { color: 'success', icon: <CloudDone />, text: 'Synced' };
      } else if (diffMinutes < 30) {
        return { color: 'warning', icon: <Warning />, text: 'Stale' };
      }
    }

    return { color: 'error', icon: <CloudOff />, text: 'Not Synced' };
  };

  const statusDisplay = getSyncStatusDisplay();

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      {/* Sync Status Chip */}
      <Chip
        icon={statusDisplay.icon}
        label={statusDisplay.text}
        color={statusDisplay.color}
        size="small"
        onClick={() => setDialogOpen(true)}
        sx={{ cursor: 'pointer' }}
      />

      {/* Manual Sync Button */}
      <Button
        size="small"
        variant="outlined"
        startIcon={loading ? <CircularProgress size={16} /> : <Refresh />}
        onClick={handleManualSync}
        disabled={loading || !isOnline || !companyId}
        sx={{ minWidth: 'auto', px: 1 }}
      >
        Sync
      </Button>

      {/* Sync Details Dialog */}
      <Dialog 
        open={dialogOpen} 
        onClose={() => setDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SettingsIcon />
          Sync Status & Settings
        </DialogTitle>
        
        <DialogContent>
          {/* Connection Status */}
          <Alert severity={isOnline ? 'success' : 'warning'} sx={{ mb: 2 }}>
            {isOnline ? 'Connected to Supabase' : 'Offline - Changes will sync when connection is restored'}
          </Alert>

          {/* Auto Sync Toggle */}
          <FormControlLabel
            control={
              <Switch
                checked={autoSyncEnabled}
                onChange={(e) => handleAutoSyncToggle(e.target.checked)}
              />
            }
            label="Enable Automatic Sync"
            sx={{ mb: 2 }}
          />

          <Divider sx={{ my: 2 }} />

          {/* Sync Statistics */}
          {syncStatus && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="h6" gutterBottom>Sync Statistics</Typography>
              <Typography variant="body2">
                Last Sync: {syncStatus.lastSupabaseSync 
                  ? new Date(syncStatus.lastSupabaseSync).toLocaleString()
                  : 'Never'
                }
              </Typography>
              <Typography variant="body2">
                Sync in Progress: {syncStatus.supabaseSyncInProgress ? 'Yes' : 'No'}
              </Typography>
              <Typography variant="body2">
                Auto Sync Interval: {syncStatus.supabaseAutoSyncInterval || 'Not set'}ms
              </Typography>
            </Box>
          )}

          {/* Outbox Status */}
          {outboxStats && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="h6" gutterBottom>Pending Operations</Typography>
              {outboxStats.stats.length > 0 ? (
                <List dense>
                  {outboxStats.stats.map((stat, index) => (
                    <ListItem key={index}>
                      <ListItemText
                        primary={`${stat.status}: ${stat.count} operations`}
                        secondary={stat.oldest ? `Oldest: ${new Date(stat.oldest).toLocaleString()}` : ''}
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No pending operations
                </Typography>
              )}
              
              {outboxStats.recentFailures?.length > 0 && (
                <Box sx={{ mt: 1 }}>
                  <Button
                    size="small"
                    variant="outlined"
                    color="warning"
                    onClick={handleRetryFailed}
                  >
                    Retry Failed Operations ({outboxStats.recentFailures.length})
                  </Button>
                </Box>
              )}
            </Box>
          )}

          {/* Recent Sync Logs */}
          <Box>
            <Typography variant="h6" gutterBottom>Recent Sync Activity</Typography>
            <Button
              size="small"
              onClick={() => {
                fetchSyncLogs();
                fetchOutboxStats();
              }}
              sx={{ mb: 1 }}
            >
              Refresh Details
            </Button>
            
            {syncLogs.length > 0 ? (
              <List dense>
                {syncLogs.slice(0, 5).map((log, index) => (
                  <ListItem key={index}>
                    <ListItemText
                      primary={`${log.operation} - ${log.status}`}
                      secondary={`${new Date(log.started_at).toLocaleString()} ${log.error_message ? `- Error: ${log.error_message}` : ''}`}
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No sync activity recorded
              </Typography>
            )}
          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Close</Button>
          <Button 
            variant="contained" 
            onClick={handleManualSync}
            disabled={loading || !isOnline || !companyId}
            startIcon={loading ? <CircularProgress size={16} /> : <Refresh />}
          >
            Sync Now
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SyncStatus;