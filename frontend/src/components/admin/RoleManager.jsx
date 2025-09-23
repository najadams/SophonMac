import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Grid,
  Chip,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  Divider,
  Tooltip,
  Switch,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Security as SecurityIcon,
  Group as GroupIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import { 
  PERMISSIONS, 
  SIDEBAR_PAGES, 
  ROLES,
  ROLE_HIERARCHY,
  getAllPermissions
} from '../../context/userRoles';
import customRoleService from '../../services/customRoleService';
import { useSelector } from 'react-redux';

const RoleManager = ({ currentUserRole }) => {
  const [customRoles, setCustomRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    displayName: '',
    description: '',
    permissions: [],
    hierarchyLevel: 1,
    isActive: true,
  });

  // Get company ID from Redux store
  const companyId = useSelector((state) => state.companyState.data.id);

  // Check if current user can manage roles
  const canManageRoles = currentUserRole === ROLES.SUPER_ADMIN || currentUserRole === ROLES.ADMIN;

  useEffect(() => {
    if (companyId) {
      loadCustomRoles();
    }
  }, [companyId]);

  const loadCustomRoles = async () => {
    try {
      setLoading(true);
      console.log('Loading custom roles for companyId:', companyId);
      const roles = await customRoleService.getCustomRoles(companyId);
      console.log('Custom roles loaded successfully:', roles);
      setCustomRoles(roles);
    } catch (error) {
      console.error('Error loading custom roles:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      toast.error(`Failed to load custom roles: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRole = () => {
    setFormData({
      name: '',
      displayName: '',
      description: '',
      permissions: [],
      hierarchyLevel: 1,
      isActive: true,
    });
    setCreateDialogOpen(true);
  };

  const handleEditRole = (role) => {
    setSelectedRole(role);
    setFormData({
      name: role.name,
      displayName: role.displayName,
      description: role.description,
      permissions: role.permissions || [],
      hierarchyLevel: role.hierarchyLevel || 1,
      isActive: role.isActive !== false,
    });
    setEditDialogOpen(true);
  };

  const handleDeleteRole = (role) => {
    setSelectedRole(role);
    setDeleteDialogOpen(true);
  };

  const handleSaveRole = async () => {
    if (!formData.name || !formData.displayName) {
      toast.error('Role name and display name are required');
      return;
    }

    if (formData.permissions.length === 0) {
      toast.error('At least one permission must be selected');
      return;
    }

    try {
      setLoading(true);
      const roleData = {
        ...formData,
        name: formData.name.toLowerCase().replace(/\s+/g, '_'),
        companyId: companyId,
        permissions: JSON.stringify(formData.permissions), // Convert to JSON string for database
      };

      if (selectedRole) {
        await customRoleService.updateCustomRole(selectedRole.id, roleData);
        toast.success('Role updated successfully');
      } else {
        await customRoleService.createCustomRole(roleData);
        toast.success('Role created successfully');
      }

      await loadCustomRoles();
      setCreateDialogOpen(false);
      setEditDialogOpen(false);
      setSelectedRole(null);
    } catch (error) {
      console.error('Error saving role:', error);
      toast.error('Failed to save role: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    try {
      setLoading(true);
      await customRoleService.deleteCustomRole(selectedRole.id);
      toast.success('Role deleted successfully');
      await loadCustomRoles();
      setDeleteDialogOpen(false);
      setSelectedRole(null);
    } catch (error) {
      console.error('Error deleting role:', error);
      toast.error('Failed to delete role: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionChange = (permission, checked) => {
    setFormData(prev => ({
      ...prev,
      permissions: checked 
        ? [...prev.permissions, permission]
        : prev.permissions.filter(p => p !== permission)
    }));
  };

  const handleSelectAllPermissions = () => {
    setFormData(prev => ({
      ...prev,
      permissions: Object.values(PERMISSIONS)
    }));
  };

  const handleDeselectAllPermissions = () => {
    setFormData(prev => ({
      ...prev,
      permissions: []
    }));
  };

  const getPermissionLabel = (permission) => {
    return permission.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getRoleHierarchyLabel = (level) => {
    const labels = {
      1: 'Basic (Level 1)',
      2: 'Standard (Level 2)', 
      3: 'Advanced (Level 3)',
      4: 'Senior (Level 4)',
      5: 'Executive (Level 5)'
    };
    return labels[level] || `Level ${level}`;
  };

  if (!canManageRoles) {
    return (
      <Alert severity="warning">
        You don't have permission to manage roles. Only Super Admins and Admins can create custom roles.
      </Alert>
    );
  }

  return (
    <Card>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
          <Box display="flex" alignItems="center">
            <SecurityIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6">Custom Role Management</Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateRole}
            color="primary"
          >
            Create Custom Role
          </Button>
        </Box>

        <Typography variant="body2" color="textSecondary" mb={3}>
          Create and manage custom roles with specific permissions for your organization.
        </Typography>

        {customRoles.length === 0 ? (
          <Alert severity="info">
            No custom roles created yet. Click "Create Custom Role" to get started.
          </Alert>
        ) : (
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Role Name</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Permissions</TableCell>
                  <TableCell>Hierarchy</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {customRoles.map((role) => {
                  // Parse permissions from JSON string if needed
                  const permissions = typeof role.permissions === 'string' 
                    ? JSON.parse(role.permissions) 
                    : role.permissions || [];
                  
                  return (
                    <TableRow key={role.id}>
                      <TableCell>
                        <Box>
                          <Typography variant="subtitle2">{role.displayName}</Typography>
                          <Typography variant="caption" color="textSecondary">
                            {role.name}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{role.description || 'No description'}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={`${permissions.length} permissions`}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={getRoleHierarchyLabel(role.hierarchyLevel || 1)}
                          size="small"
                          color="info"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={role.isActive !== false ? 'Active' : 'Inactive'}
                          size="small"
                          color={role.isActive !== false ? 'success' : 'default'}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="Edit Role">
                          <IconButton 
                            size="small" 
                            onClick={() => handleEditRole(role)}
                            color="primary"
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete Role">
                          <IconButton 
                            size="small" 
                            onClick={() => handleDeleteRole(role)}
                            color="error"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Create/Edit Role Dialog */}
        <Dialog 
          open={createDialogOpen || editDialogOpen} 
          onClose={() => {
            setCreateDialogOpen(false);
            setEditDialogOpen(false);
            setSelectedRole(null);
          }}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            <Box display="flex" alignItems="center">
              <GroupIcon sx={{ mr: 1 }} />
              {selectedRole ? 'Edit Custom Role' : 'Create Custom Role'}
            </Box>
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={3} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Role Name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., custom_manager"
                  helperText="Internal role identifier (lowercase, underscores only)"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Display Name"
                  value={formData.displayName}
                  onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                  placeholder="e.g., Custom Manager"
                  helperText="User-friendly name shown in interface"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe the role's purpose and responsibilities"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Hierarchy Level</InputLabel>
                  <Select
                    value={formData.hierarchyLevel}
                    label="Hierarchy Level"
                    onChange={(e) => setFormData(prev => ({ ...prev, hierarchyLevel: e.target.value }))}
                  >
                    {[1, 2, 3, 4, 5].map(level => (
                      <MenuItem key={level} value={level}>
                        {getRoleHierarchyLabel(level)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.isActive}
                      onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                    />
                  }
                  label="Active Role"
                />
              </Grid>
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                  <Typography variant="h6">Permissions</Typography>
                  <Box>
                    <Button 
                      size="small" 
                      onClick={handleSelectAllPermissions}
                      sx={{ mr: 1 }}
                    >
                      Select All
                    </Button>
                    <Button 
                      size="small" 
                      onClick={handleDeselectAllPermissions}
                    >
                      Deselect All
                    </Button>
                  </Box>
                </Box>
                <Typography variant="body2" color="textSecondary" mb={2}>
                  Selected: {formData.permissions.length} of {Object.keys(PERMISSIONS).length} permissions
                </Typography>
                <FormGroup>
                  <Grid container spacing={1}>
                    {Object.values(PERMISSIONS).map((permission) => (
                      <Grid item xs={12} sm={6} md={4} key={permission}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={formData.permissions.includes(permission)}
                              onChange={(e) => handlePermissionChange(permission, e.target.checked)}
                            />
                          }
                          label={getPermissionLabel(permission)}
                        />
                      </Grid>
                    ))}
                  </Grid>
                </FormGroup>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={() => {
                setCreateDialogOpen(false);
                setEditDialogOpen(false);
                setSelectedRole(null);
              }}
              startIcon={<CancelIcon />}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSaveRole} 
              variant="contained"
              startIcon={<SaveIcon />}
            >
              {selectedRole ? 'Update Role' : 'Create Role'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
          <DialogTitle>Confirm Delete</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete the role "{selectedRole?.displayName}"? 
              This action cannot be undone.
            </Typography>
            <Alert severity="warning" sx={{ mt: 2 }}>
              Users with this role will lose their permissions. Make sure to reassign users before deleting.
            </Alert>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleConfirmDelete} color="error" variant="contained">
              Delete Role
            </Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default RoleManager;