import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
  Typography,
  Box,
  Alert,
  CircularProgress
} from '@mui/material';
import axios from '../../config/index';

const ConflictResolutionDialog = ({ conflict, open, onClose, onResolved }) => {
  const [selectedAction, setSelectedAction] = useState('');
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (conflict && conflict.suggestions && conflict.suggestions.length > 0) {
      setSelectedAction(conflict.suggestions[0].action);
    }
    setNewName('');
    setError('');
  }, [conflict]);

  const handleResolve = async () => {
    if (!selectedAction) {
      setError('Please select a resolution option');
      return;
    }

    if (selectedAction === 'rename' && !newName.trim()) {
      setError('Please enter a new company name');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await axios.post(`/api/conflicts/${conflict.id}/resolve`, {
        action: selectedAction,
        newName: newName.trim()
      });

      onResolved();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to resolve conflict');
    } finally {
      setLoading(false);
    }
  };

  if (!conflict) return null;

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        <Typography variant="h6" component="div">
          Resolve Sync Conflict
        </Typography>
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <Alert severity="warning" sx={{ mb: 2 }}>
            {conflict.message}
          </Alert>

          {conflict.data?.localName && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Local company name: <strong>{conflict.data.localName}</strong>
            </Typography>
          )}
        </Box>

        <FormControl component="fieldset" fullWidth>
          <FormLabel component="legend" sx={{ mb: 1 }}>
            Choose how to resolve this conflict:
          </FormLabel>
          
          <RadioGroup
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
          >
            {conflict.suggestions?.map((suggestion) => (
              <Box key={suggestion.action} sx={{ mb: 1 }}>
                <FormControlLabel
                  value={suggestion.action}
                  control={<Radio />}
                  label={
                    <Box>
                      <Typography variant="body1" fontWeight="medium">
                        {suggestion.label}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {suggestion.description}
                      </Typography>
                    </Box>
                  }
                />
              </Box>
            ))}
          </RadioGroup>
        </FormControl>

        {selectedAction === 'rename' && (
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="New Company Name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Enter a unique company name"
              helperText="This name will be used for the local company"
              autoFocus
            />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleResolve}
          variant="contained"
          color="primary"
          disabled={loading}
          startIcon={loading && <CircularProgress size={20} />}
        >
          {loading ? 'Resolving...' : 'Resolve Conflict'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConflictResolutionDialog;
