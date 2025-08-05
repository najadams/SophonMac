import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Switch,
  FormControlLabel,
  Alert,
  CircularProgress,
  Divider,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Wifi,
  WifiOff,
  Computer,
  Sync,
  Settings,
  Warning,
  CheckCircle,
  Error,
  Refresh,
  PlayArrow,
  Stop,
  BugReport
} from '@mui/icons-material';
import networkService from '../services/networkService';

const NetworkManager = () => {
  const [networkStatus, setNetworkStatus] = useState({
    isOnline: false,
    isMaster: false,
    connectedPeers: [],
    lastSync: null
  });
  const [peers, setPeers] = useState([]);
  const [conflicts, setConflicts] = useState([]);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [diagnosticsDialogOpen, setDiagnosticsDialogOpen] = useState(false);
  const [diagnosticsResult, setDiagnosticsResult] = useState(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    initializeNetworkManager();
    setupEventListeners();

    return () => {
      cleanupEventListeners();
    };
  }, []);

  const initializeNetworkManager = async () => {
    try {
      setLoading(true);
      
      // Get initial network status
      const status = networkService.getNetworkStatus();
      setNetworkStatus(status);
      
      // Load peers
      const peersData = await networkService.getConnectedPeers();
      setPeers(peersData);
      
      // Load conflicts
      const conflictsData = await networkService.getSyncConflicts();
      setConflicts(conflictsData);
      
      // Load config
      const configData = await networkService.getNetworkConfig();
      setConfig(configData);
      
    } catch (error) {
      console.error('Failed to initialize network manager:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupEventListeners = () => {
    networkService.on('networkStatusChanged', handleNetworkStatusChange);
    networkService.on('peerConnected', handlePeerConnected);
    networkService.on('peerDisconnected', handlePeerDisconnected);
    networkService.on('syncComplete', handleSyncComplete);
    networkService.on('syncConflict', handleSyncConflict);
  };

  const cleanupEventListeners = () => {
    networkService.off('networkStatusChanged', handleNetworkStatusChange);
    networkService.off('peerConnected', handlePeerConnected);
    networkService.off('peerDisconnected', handlePeerDisconnected);
    networkService.off('syncComplete', handleSyncComplete);
    networkService.off('syncConflict', handleSyncConflict);
  };

  const handleNetworkStatusChange = (status) => {
    setNetworkStatus(status);
  };

  const handlePeerConnected = (peer) => {
    setPeers(prev => [...prev.filter(p => p.id !== peer.id), peer]);
  };

  const handlePeerDisconnected = (peerId) => {
    setPeers(prev => prev.filter(p => p.id !== peerId));
  };

  const handleSyncComplete = (result) => {
    setSyncing(false);
    setNetworkStatus(prev => ({
      ...prev,
      lastSync: new Date().toISOString()
    }));
  };

  const handleSyncConflict = (conflict) => {
    setConflicts(prev => [...prev, conflict]);
  };

  const handleForceSync = async () => {
    try {
      setSyncing(true);
      await networkService.forceSync();
    } catch (error) {
      console.error('Failed to force sync:', error);
      setSyncing(false);
    }
  };

  const handleForceMaster = async () => {
    try {
      await networkService.forceMaster();
      await networkService.updateNetworkStatus();
    } catch (error) {
      console.error('Failed to force master role:', error);
    }
  };

  const handleForceSlave = async () => {
    try {
      await networkService.forceSlave();
      await networkService.updateNetworkStatus();
    } catch (error) {
      console.error('Failed to force slave role:', error);
    }
  };

  const handleConfigSave = async (newConfig) => {
    try {
      await networkService.updateNetworkConfig(newConfig);
      setConfig(newConfig);
      setConfigDialogOpen(false);
    } catch (error) {
      console.error('Failed to update network config:', error);
    }
  };

  const handleRunDiagnostics = async () => {
    try {
      setDiagnosticsResult(null);
      setDiagnosticsDialogOpen(true);
      const result = await networkService.runDiagnostics();
      setDiagnosticsResult(result);
    } catch (error) {
      console.error('Failed to run diagnostics:', error);
      setDiagnosticsResult({ error: error.message });
    }
  };

  const handleResolveConflict = async (conflictId, resolution) => {
    try {
      await networkService.resolveSyncConflict(conflictId, resolution);
      setConflicts(prev => prev.filter(c => c.id !== conflictId));
    } catch (error) {
      console.error('Failed to resolve conflict:', error);
    }
  };

  const getStatusColor = () => {
    if (!networkStatus.isOnline) return 'error';
    if (conflicts.length > 0) return 'warning';
    return 'success';
  };

  const getStatusIcon = () => {
    if (!networkStatus.isOnline) return <WifiOff />;
    if (conflicts.length > 0) return <Warning />;
    return <Wifi />;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Network Management
      </Typography>

      {/* Network Status Card */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                {getStatusIcon()}
                <Typography variant="h6" ml={1}>
                  Network Status
                </Typography>
                <Chip
                  label={networkStatus.isOnline ? 'Online' : 'Offline'}
                  color={getStatusColor()}
                  size="small"
                  sx={{ ml: 'auto' }}
                />
              </Box>
              
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">
                    Role
                  </Typography>
                  <Typography variant="body1">
                    {networkStatus.isMaster ? 'Master' : 'Slave'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">
                    Connected Peers
                  </Typography>
                  <Typography variant="body1">
                    {peers.length}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2" color="textSecondary">
                    Last Sync
                  </Typography>
                  <Typography variant="body1">
                    {networkStatus.lastSync 
                      ? new Date(networkStatus.lastSync).toLocaleString()
                      : 'Never'
                    }
                  </Typography>
                </Grid>
              </Grid>

              <Box mt={2}>
                <Button
                  variant="contained"
                  startIcon={syncing ? <CircularProgress size={16} /> : <Sync />}
                  onClick={handleForceSync}
                  disabled={syncing || !networkStatus.isOnline}
                  sx={{ mr: 1 }}
                >
                  {syncing ? 'Syncing...' : 'Force Sync'}
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<Refresh />}
                  onClick={initializeNetworkManager}
                >
                  Refresh
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Role Management Card */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Role Management
              </Typography>
              
              <Typography variant="body2" color="textSecondary" mb={2}>
                Current role: {networkStatus.isMaster ? 'Master' : 'Slave'}
              </Typography>
              
              <Box>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<PlayArrow />}
                  onClick={handleForceMaster}
                  disabled={networkStatus.isMaster}
                  sx={{ mr: 1, mb: 1 }}
                >
                  Force Master
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<Stop />}
                  onClick={handleForceSlave}
                  disabled={!networkStatus.isMaster}
                  sx={{ mb: 1 }}
                >
                  Force Slave
                </Button>
              </Box>
              
              <Typography variant="caption" display="block" mt={1}>
                Use with caution. Forcing roles can cause sync conflicts.
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Connected Peers */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Connected Peers ({peers.length})
              </Typography>
              
              {peers.length === 0 ? (
                <Typography variant="body2" color="textSecondary">
                  No peers connected
                </Typography>
              ) : (
                <List>
                  {peers.map((peer) => (
                    <ListItem key={peer.id}>
                      <ListItemIcon>
                        <Computer />
                      </ListItemIcon>
                      <ListItemText
                        primary={peer.name || peer.id}
                        secondary={`${peer.ip}:${peer.port} - ${peer.role} - Last seen: ${new Date(peer.lastSeen).toLocaleString()}`}
                      />
                      <Chip
                        label={peer.status}
                        color={peer.status === 'connected' ? 'success' : 'default'}
                        size="small"
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Sync Conflicts */}
        {conflicts.length > 0 && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom color="warning.main">
                  Sync Conflicts ({conflicts.length})
                </Typography>
                
                {conflicts.map((conflict) => (
                  <Alert
                    key={conflict.id}
                    severity="warning"
                    sx={{ mb: 1 }}
                    action={
                      <Box>
                        <Button
                          size="small"
                          onClick={() => handleResolveConflict(conflict.id, 'local')}
                        >
                          Use Local
                        </Button>
                        <Button
                          size="small"
                          onClick={() => handleResolveConflict(conflict.id, 'remote')}
                        >
                          Use Remote
                        </Button>
                      </Box>
                    }
                  >
                    <Typography variant="body2">
                      {conflict.table} - {conflict.operation} - {conflict.recordId}
                    </Typography>
                    <Typography variant="caption">
                      {new Date(conflict.timestamp).toLocaleString()}
                    </Typography>
                  </Alert>
                ))}
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Action Buttons */}
        <Grid item xs={12}>
          <Box display="flex" gap={2}>
            <Button
              variant="outlined"
              startIcon={<Settings />}
              onClick={() => setConfigDialogOpen(true)}
            >
              Network Settings
            </Button>
            <Button
              variant="outlined"
              startIcon={<BugReport />}
              onClick={handleRunDiagnostics}
            >
              Run Diagnostics
            </Button>
          </Box>
        </Grid>
      </Grid>

      {/* Configuration Dialog */}
      <NetworkConfigDialog
        open={configDialogOpen}
        config={config}
        onClose={() => setConfigDialogOpen(false)}
        onSave={handleConfigSave}
      />

      {/* Diagnostics Dialog */}
      <NetworkDiagnosticsDialog
        open={diagnosticsDialogOpen}
        result={diagnosticsResult}
        onClose={() => setDiagnosticsDialogOpen(false)}
      />
    </Box>
  );
};

// Network Configuration Dialog Component
const NetworkConfigDialog = ({ open, config, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    autoDiscovery: true,
    syncInterval: 30,
    maxPeers: 10,
    enableEncryption: true,
    ...config
  });

  useEffect(() => {
    if (config) {
      setFormData({ ...formData, ...config });
    }
  }, [config]);

  const handleSave = () => {
    onSave(formData);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Network Configuration</DialogTitle>
      <DialogContent>
        <Box mt={2}>
          <FormControlLabel
            control={
              <Switch
                checked={formData.autoDiscovery}
                onChange={(e) => setFormData({ ...formData, autoDiscovery: e.target.checked })}
              />
            }
            label="Auto Discovery"
          />
          
          <TextField
            fullWidth
            label="Sync Interval (seconds)"
            type="number"
            value={formData.syncInterval}
            onChange={(e) => setFormData({ ...formData, syncInterval: parseInt(e.target.value) })}
            margin="normal"
          />
          
          <TextField
            fullWidth
            label="Max Peers"
            type="number"
            value={formData.maxPeers}
            onChange={(e) => setFormData({ ...formData, maxPeers: parseInt(e.target.value) })}
            margin="normal"
          />
          
          <FormControlLabel
            control={
              <Switch
                checked={formData.enableEncryption}
                onChange={(e) => setFormData({ ...formData, enableEncryption: e.target.checked })}
              />
            }
            label="Enable Encryption"
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained">Save</Button>
      </DialogActions>
    </Dialog>
  );
};

// Network Diagnostics Dialog Component
const NetworkDiagnosticsDialog = ({ open, result, onClose }) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Network Diagnostics</DialogTitle>
      <DialogContent>
        {!result ? (
          <Box display="flex" justifyContent="center" p={3}>
            <CircularProgress />
          </Box>
        ) : result.error ? (
          <Alert severity="error">
            {result.error}
          </Alert>
        ) : (
          <Box>
            <Typography variant="h6" gutterBottom>
              Diagnostic Results
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2">Network Status</Typography>
                <Chip
                  label={result.networkStatus ? 'Online' : 'Offline'}
                  color={result.networkStatus ? 'success' : 'error'}
                  size="small"
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2">Database Status</Typography>
                <Chip
                  label={result.databaseStatus ? 'Connected' : 'Disconnected'}
                  color={result.databaseStatus ? 'success' : 'error'}
                  size="small"
                />
              </Grid>
              
              <Grid item xs={12}>
                <Typography variant="subtitle2">Peer Connectivity</Typography>
                {result.peerTests && result.peerTests.length > 0 ? (
                  result.peerTests.map((test, index) => (
                    <Box key={index} display="flex" alignItems="center" mt={1}>
                      {test.success ? <CheckCircle color="success" /> : <Error color="error" />}
                      <Typography ml={1}>
                        {test.peer} - {test.success ? 'Connected' : test.error}
                      </Typography>
                    </Box>
                  ))
                ) : (
                  <Typography variant="body2" color="textSecondary">
                    No peers to test
                  </Typography>
                )}
              </Grid>
            </Grid>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default NetworkManager;