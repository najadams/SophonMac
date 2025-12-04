import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Alert,
  CircularProgress,
  Button
} from '@mui/material';
import {
  Warning as WarningIcon,
  Build as BuildIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import axios from '../config/index';
import ConflictResolutionDialog from '../components/Dialogs/ConflictResolutionDialog';

const SyncConflicts = () => {
  const [conflicts, setConflicts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedConflict, setSelectedConflict] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchConflicts = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/conflicts');
      setConflicts(response.data);
    } catch (error) {
      console.error('Error fetching conflicts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConflicts();
  }, []);

  const handleResolveClick = (conflict) => {
    setSelectedConflict(conflict);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setSelectedConflict(null);
  };

  const handleResolved = () => {
    fetchConflicts(); // Refresh the list
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Sync Conflicts
        </Typography>
        <Button
          startIcon={<RefreshIcon />}
          onClick={fetchConflicts}
          variant="outlined"
        >
          Refresh
        </Button>
      </Box>

      {conflicts.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary">
            No pending sync conflicts
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            All your data is syncing smoothly!
          </Typography>
        </Paper>
      ) : (
        <>
          <Alert severity="info" sx={{ mb: 2 }}>
            You have {conflicts.length} pending sync conflict{conflicts.length !== 1 ? 's' : ''} that need your attention.
          </Alert>

          <Paper>
            <List>
              {conflicts.map((conflict, index) => (
                <ListItem
                  key={conflict.id}
                  divider={index < conflicts.length - 1}
                  sx={{
                    '&:hover': {
                      backgroundColor: 'action.hover'
                    }
                  }}
                >
                  <Box sx={{ mr: 2 }}>
                    <WarningIcon color="warning" />
                  </Box>
                  
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle1">
                          {conflict.message}
                        </Typography>
                        <Chip 
                          label={conflict.tableName} 
                          size="small" 
                          color="primary" 
                          variant="outlined"
                        />
                      </Box>
                    }
                    secondary={
                      <Typography variant="body2" color="text.secondary">
                        Detected: {formatDate(conflict.createdAt)}
                      </Typography>
                    }
                  />
                  
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      color="primary"
                      onClick={() => handleResolveClick(conflict)}
                      title="Resolve conflict"
                    >
                      <BuildIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          </Paper>
        </>
      )}

      <ConflictResolutionDialog
        conflict={selectedConflict}
        open={dialogOpen}
        onClose={handleDialogClose}
        onResolved={handleResolved}
      />
    </Container>
  );
};

export default SyncConflicts;
