import React, { useState, useEffect } from 'react';
import { Badge, IconButton, Tooltip } from '@mui/material';
import { Warning as WarningIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from '../../config/index';

const ConflictBadge = () => {
  const [conflictCount, setConflictCount] = useState(0);
  const navigate = useNavigate();

  const fetchConflictCount = async () => {
    try {
      const response = await axios.get('/api/conflicts/count');
      setConflictCount(response.data.count);
    } catch (error) {
      console.error('Error fetching conflict count:', error);
    }
  };

  useEffect(() => {
    fetchConflictCount();
    
    // Poll every 30 seconds
    const interval = setInterval(fetchConflictCount, 30000);
    
    return () => clearInterval(interval);
  }, []);

  if (conflictCount === 0) return null;

  return (
    <Tooltip title={`${conflictCount} sync conflict${conflictCount !== 1 ? 's' : ''} need resolution`}>
      <IconButton
        color="warning"
        onClick={() => navigate('/sync-conflicts')}
        size="large"
      >
        <Badge badgeContent={conflictCount} color="error">
          <WarningIcon />
        </Badge>
      </IconButton>
    </Tooltip>
  );
};

export default ConflictBadge;
