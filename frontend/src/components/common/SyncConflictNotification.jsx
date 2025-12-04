import React, { useState, useEffect } from 'react';
import {
  Snackbar,
  Alert,
  AlertTitle,
  Button,
  Box
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import networkService from '../../services/networkService';

const SyncConflictNotification = () => {
  const [open, setOpen] = useState(false);
  const [conflict, setConflict] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Listen for sync conflict events from WebSocket
    const handleSyncConflict = (conflictData) => {
      console.log('Sync conflict notification received:', conflictData);
      setConflict(conflictData);
      setOpen(true);
    };

    // Subscribe to sync conflict events
    networkService.on('syncConflict', handleSyncConflict);

    // Cleanup
    return () => {
      networkService.off('syncConflict', handleSyncConflict);
    };
  }, []);

  const handleClose = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setOpen(false);
  };

  const handleResolve = () => {
    setOpen(false);
    navigate('/sync-conflicts');
  };

  if (!conflict) return null;

  return (
    <Snackbar
      open={open}
      autoHideDuration={null} // Don't auto-hide
      onClose={handleClose}
      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
    >
      <Alert
        severity="warning"
        onClose={handleClose}
        sx={{ width: '100%', minWidth: 400 }}
      >
        <AlertTitle>Sync Conflict Detected</AlertTitle>
        <Box sx={{ mb: 1 }}>
          {conflict.message}
        </Box>
        <Button
          size="small"
          variant="contained"
          color="warning"
          onClick={handleResolve}
          sx={{ mt: 1 }}
        >
          Resolve Now
        </Button>
      </Alert>
    </Snackbar>
  );
};

export default SyncConflictNotification;
