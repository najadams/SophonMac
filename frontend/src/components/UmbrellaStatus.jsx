import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemIcon,
  Chip,
  Divider,
  CircularProgress
} from '@mui/material';
import SyncIcon from '@mui/icons-material/Sync';
import CloudDoneIcon from '@mui/icons-material/CloudDone';
import CloudOffIcon from '@mui/icons-material/CloudOff';
import BusinessIcon from '@mui/icons-material/Business';
import StoreIcon from '@mui/icons-material/Store';

import { API_BASE_URL } from '../config/constants';

const UmbrellaStatus = ({ companyId }) => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/sync/umbrella/status?companyId=${companyId}`);
        if (response.ok) {
          const data = await response.json();
          setStatus(data);
        }
      } catch (error) {
        console.error('Failed to fetch umbrella status:', error);
      } finally {
        setLoading(false);
      }
    };

    if (companyId) {
      fetchStatus();
      const interval = setInterval(fetchStatus, 10000); // Poll every 10s
      return () => clearInterval(interval);
    }
  }, [companyId]);

  if (loading) return <CircularProgress size={20} />;
  if (!status) return null;

  return (
    <Card variant="outlined" sx={{ mt: 2 }}>
      <CardContent>
        <Box display="flex" alignItems="center" mb={2}>
          <SyncIcon color="primary" sx={{ mr: 1 }} />
          <Typography variant="h6">Umbrella Network Status</Typography>
        </Box>

        <Box display="flex" alignItems="center" mb={2}>
          <Typography variant="body2" color="textSecondary" sx={{ mr: 2 }}>
            Sync Health:
          </Typography>
          <Chip 
            icon={status.sync.online ? <CloudDoneIcon /> : <CloudOffIcon />}
            label={status.sync.online ? "Online" : "Offline"}
            color={status.sync.online ? "success" : "error"}
            size="small"
            variant="outlined"
          />
          <Typography variant="caption" color="textSecondary" sx={{ ml: 2 }}>
            Last Synced: {status.sync.lastSyncedAt ? new Date(status.sync.lastSyncedAt).toLocaleString() : 'Never'}
          </Typography>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle2" gutterBottom>
          Network Members
        </Typography>
        
        {status.network && status.network.length > 0 ? (
          <List dense>
            {status.network.map((member) => (
              <ListItem key={member.id}>
                <ListItemIcon>
                  <BusinessIcon />
                </ListItemIcon>
                <ListItemText 
                  primary={member.companyName} 
                  secondary={`${member.relation} (${member.direction})`} 
                />
              </ListItem>
            ))}
          </List>
        ) : (
          <Typography variant="body2" color="textSecondary">
            No active network connections.
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

export default UmbrellaStatus;
