import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Typography,
  Box,
  Divider,
} from '@mui/material';
import { SIDEBAR_PAGES, setCustomUserPermissions, getCustomUserPermissions } from '../../context/userRoles';

const CustomPermissionsModal = ({ open, onClose, user, onSave }) => {
  const [selectedPages, setSelectedPages] = useState([]);

  useEffect(() => {
    if (user && open) {
      // Load existing custom permissions or default to all pages
      const userId = user.id || user.worker?.id;
      const existingPermissions = getCustomUserPermissions(userId);
      
      if (existingPermissions) {
        setSelectedPages(existingPermissions.map(page => page.path));
      } else {
        // Default to all pages
        setSelectedPages(Object.values(SIDEBAR_PAGES).map(page => page.path));
      }
    }
  }, [user, open]);

  const handlePageToggle = (pagePath) => {
    setSelectedPages(prev => 
      prev.includes(pagePath)
        ? prev.filter(path => path !== pagePath)
        : [...prev, pagePath]
    );
  };

  const handleSave = () => {
    const userId = user.id || user.worker?.id;
    const customPages = Object.values(SIDEBAR_PAGES).filter(page => 
      selectedPages.includes(page.path)
    );
    
    setCustomUserPermissions(userId, customPages);
    onSave && onSave(userId, customPages);
    onClose();
  };

  const handleSelectAll = () => {
    setSelectedPages(Object.values(SIDEBAR_PAGES).map(page => page.path));
  };

  const handleDeselectAll = () => {
    setSelectedPages([]);
  };

  if (!user) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Customize Sidebar Permissions for {user.name || user.worker?.name || 'User'}
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
          Select which sidebar pages this user can access. These custom permissions will override their role-based permissions.
        </Typography>
        
        <Box sx={{ mb: 2 }}>
          <Button 
            size="small" 
            onClick={handleSelectAll}
            sx={{ mr: 1 }}
          >
            Select All
          </Button>
          <Button 
            size="small" 
            onClick={handleDeselectAll}
          >
            Deselect All
          </Button>
        </Box>
        
        <Divider sx={{ mb: 2 }} />
        
        <FormGroup>
          {Object.values(SIDEBAR_PAGES).map((page) => (
            <FormControlLabel
              key={page.path}
              control={
                <Checkbox
                  checked={selectedPages.includes(page.path)}
                  onChange={() => handlePageToggle(page.path)}
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <i className={`bx ${page.icon}`} />
                  <Typography>{page.text}</Typography>
                </Box>
              }
            />
          ))}
        </FormGroup>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained">
          Save Permissions
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CustomPermissionsModal;