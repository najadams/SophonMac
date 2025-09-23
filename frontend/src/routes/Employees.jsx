import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Chip,
  Alert,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  Tooltip,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Work as WorkIcon
} from '@mui/icons-material';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import axios from '../config/index';
import { toast } from 'react-toastify';
import ProtectedRoute from '../components/ProtectedRoute';
import { PERMISSIONS, ROLES, canChangeUserRole, getAssignableRoles, getAllRoles, getRoleDisplayName } from '../context/userRoles';
import customRoleService from '../services/customRoleService';

const Employees = () => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    userName: '',
    contact: '',
    email: '',
    role: 'worker'
  });
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState(null);
  const [allRoleOptions, setAllRoleOptions] = useState([]);
  const [customRoles, setCustomRoles] = useState([]);

  const currentUser = useSelector((state) => state.userState.currentUser);
  const companyId = useSelector((state) => state.userState.currentUser?.companyId);
  const userRole = currentUser?.role || currentUser?.worker?.role;

  // Load all roles (built-in + custom)
  useEffect(() => {
    const loadRoles = async () => {
      try {
        // Built-in roles
        const builtInRoles = [
          { value: ROLES.SUPER_ADMIN, label: 'Super Admin', isCustom: false },
          { value: ROLES.ADMIN, label: 'Admin', isCustom: false },
          { value: ROLES.MANAGER, label: 'Manager', isCustom: false },
          { value: ROLES.EMPLOYEE, label: 'Employee', isCustom: false },
          { value: ROLES.VIEWER, label: 'Viewer', isCustom: false }
        ];

        // Load custom roles
        let customRolesList = [];
        try {
          customRolesList = await customRoleService.getAllCustomRoles();
          setCustomRoles(customRolesList);
        } catch (error) {
          console.error('Failed to load custom roles:', error);
        }

        // Convert custom roles to options format
        const customRoleOptions = customRolesList.map(role => ({
          value: role.name,
          label: role.displayName || role.name,
          isCustom: true
        }));

        // Combine all roles
        setAllRoleOptions([...builtInRoles, ...customRoleOptions]);
      } catch (error) {
        console.error('Error loading roles:', error);
        // Fallback to built-in roles only
        setAllRoleOptions([
          { value: ROLES.SUPER_ADMIN, label: 'Super Admin', isCustom: false },
          { value: ROLES.ADMIN, label: 'Admin', isCustom: false },
          { value: ROLES.MANAGER, label: 'Manager', isCustom: false },
          { value: ROLES.EMPLOYEE, label: 'Employee', isCustom: false },
          { value: ROLES.VIEWER, label: 'Viewer', isCustom: false }
        ]);
      }
    };

    if (companyId) {
      loadRoles();
    }
  }, [companyId]);

  // Get roles that current user can assign to others
  const assignableRoles = getAssignableRoles(userRole);
  const roleOptions = allRoleOptions.filter(option => {
    // For built-in roles, check if they're assignable
    if (!option.isCustom) {
      return assignableRoles.includes(option.value);
    }
    // For custom roles, allow assignment (you might want to add hierarchy logic here)
    return true;
  });

  // Check if current user can change the selected employee's role
  const canChangeSelectedUserRole = selectedEmployee ? 
    canChangeUserRole(userRole, selectedEmployee.role) : false;

  const getRoleColor = (role) => {
    switch (role) {
      case ROLES.SUPER_ADMIN: return 'error';
      case ROLES.ADMIN: return 'warning';
      case ROLES.MANAGER: return 'info';
      case ROLES.EMPLOYEE: return 'primary';
      case ROLES.VIEWER: return 'success';
      default: 
        // For custom roles, use a default color
        return 'secondary';
    }
  };

  // Helper function to get role display name
  const getRoleDisplayName = (role) => {
    // Check if it's a custom role
    const customRole = customRoles.find(cr => cr.name === role);
    if (customRole) {
      return customRole.displayName || customRole.name;
    }
    
    // Built-in roles
    const builtInRole = allRoleOptions.find(option => option.value === role && !option.isCustom);
    if (builtInRole) {
      return builtInRole.label;
    }
    
    // Fallback
    return role;
  };

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/workers/${companyId}`);
      setEmployees(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching employees:', err);
      setError('Failed to fetch employees. Please try again.');
      toast.error('Failed to fetch employees');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (companyId) {
      fetchEmployees();
    }
  }, [companyId]);

  const handleEditClick = (employee) => {
    setSelectedEmployee(employee);
    setFormData({
      name: employee.name || '',
      contact: employee.contact || '',
      email: employee.email || '',
      role: employee.role || 'worker'
    });
    setEditDialogOpen(true);
  };

  const handleAddClick = () => {
    navigate("/create-user");
  };

  const handleFormChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveEdit = async () => {
    try {
      if (!selectedEmployee) return;
      
      const response = await axios.put(`/api/workers/${selectedEmployee.id}`, formData);
      
      // Update the employee in the local state
      setEmployees(prev => prev.map(emp => 
        emp.id === selectedEmployee.id ? { ...emp, ...response.data } : emp
      ));
      
      setEditDialogOpen(false);
      setSelectedEmployee(null);
      toast.success('Employee updated successfully');
    } catch (err) {
      console.error('Error updating employee:', err);
      toast.error(err.response?.data?.error || 'Failed to update employee');
    }
  };



  const handleDeleteClick = (employee) => {
    setEmployeeToDelete(employee);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      if (!employeeToDelete) return;
      
      await axios.delete(`/api/workers/${employeeToDelete.id}`);
      
      setEmployees(prev => prev.filter(emp => emp.id !== employeeToDelete.id));
      setDeleteConfirmOpen(false);
      setEmployeeToDelete(null);
      toast.success('Employee deleted successfully');
    } catch (err) {
      console.error('Error deleting employee:', err);
      toast.error(err.response?.data?.error || 'Failed to delete employee');
    }
  };

  const canManageUsers = () => {
    return userRole === 'company' || userRole === 'super_admin';
  };

  const canEditEmployee = (employee) => {
    // Company owners and super admins can edit anyone
    if (userRole === 'company' || userRole === 'super_admin') {
      return true;
    }
    // Users can edit their own profile
    return currentUser?.id === employee.id;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, height: "90vh", overflow: "auto" }}>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            mb={3}>
            <Typography variant="h4" component="h1" fontWeight="bold">
              Employee Management
            </Typography>
            {canManageUsers() && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleAddClick}
                sx={{ borderRadius: 2 }}>
                Add Employee
              </Button>
            )}
          </Box>
        </Grid>

        {/* Error Alert */}
        {error && (
          <Grid item xs={12}>
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          </Grid>
        )}

        {/* Employee Stats Cards */}
        <Grid item xs={12} md={4}>
          <Card sx={{ borderRadius: 2, boxShadow: 2 }}>
            <CardContent>
              <Box display="flex" alignItems="center">
                <PersonIcon
                  sx={{ fontSize: 40, color: "primary.main", mr: 2 }}
                />
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {employees.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Employees
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ borderRadius: 2, boxShadow: 2 }}>
            <CardContent>
              <Box display="flex" alignItems="center">
                <WorkIcon sx={{ fontSize: 40, color: "warning.main", mr: 2 }} />
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {
                      employees.filter(
                        (emp) =>
                          emp.role === "admin" || emp.role === "super_admin"
                      ).length
                    }
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Administrators
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ borderRadius: 2, boxShadow: 2 }}>
            <CardContent>
              <Box display="flex" alignItems="center">
                <PersonIcon
                  sx={{ fontSize: 40, color: "success.main", mr: 2 }}
                />
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {employees.filter((emp) => emp.role === "worker").length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Workers
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Employee Table */}
        <Grid item xs={12}>
          <Paper sx={{ borderRadius: 2, boxShadow: 2 }}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: "grey.50" }}>
                    <TableCell>
                      <strong>Name</strong>
                    </TableCell>
                    <TableCell>
                      <strong>Contact</strong>
                    </TableCell>
                    <TableCell>
                      <strong>Email</strong>
                    </TableCell>
                    <TableCell>
                      <strong>Role</strong>
                    </TableCell>
                    <TableCell align="center">
                      <strong>Actions</strong>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {employees.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                        <Typography variant="body1" color="text.secondary">
                          No employees found.{" "}
                          {canManageUsers() &&
                            'Click "Add Employee" to get started.'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    employees.map((employee) => (
                      <TableRow key={employee.id} hover>
                        <TableCell>
                          <Box display="flex" alignItems="center">
                            <PersonIcon
                              sx={{ mr: 1, color: "text.secondary" }}
                            />
                            {employee.name}
                          </Box>
                        </TableCell>
                        <TableCell>
                          {employee.contact && (
                            <Box display="flex" alignItems="center">
                              <PhoneIcon
                                sx={{
                                  mr: 1,
                                  fontSize: 16,
                                  color: "text.secondary",
                                }}
                              />
                              {employee.contact}
                            </Box>
                          )}
                        </TableCell>
                        <TableCell>
                          {employee.email && (
                            <Box display="flex" alignItems="center">
                              <EmailIcon
                                sx={{
                                  mr: 1,
                                  fontSize: 16,
                                  color: "text.secondary",
                                }}
                              />
                              {employee.email}
                            </Box>
                          )}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={getRoleDisplayName(employee.role) || "Worker"}
                            color={getRoleColor(employee.role)}
                            size="small"
                            sx={{ textTransform: "capitalize" }}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Box display="flex" justifyContent="center" gap={1}>
                            {canEditEmployee(employee) && (
                              <Tooltip title="Edit Employee">
                                <IconButton
                                  size="small"
                                  onClick={() => handleEditClick(employee)}
                                  sx={{ color: "primary.main" }}>
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                            {canManageUsers() &&
                              employee.id !== currentUser?.id && (
                                <Tooltip title="Delete Employee">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleDeleteClick(employee)}
                                    sx={{ color: "error.main" }}>
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* Edit Employee Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="sm"
        fullWidth>
        <DialogTitle>Edit Employee</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="Name"
              value={formData.name}
              onChange={(e) => handleFormChange("name", e.target.value)}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Username"
              value={formData.userName}
              onChange={(e) => handleFormChange("userName", e.target.value)}
              margin="normal"
            />
            <TextField
              fullWidth
              label="Contact"
              value={formData.contact}
              onChange={(e) => handleFormChange("contact", e.target.value)}
              margin="normal"
            />
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => handleFormChange("email", e.target.value)}
              margin="normal"
            />
            {canManageUsers() && selectedEmployee?.id !== currentUser?.id && canChangeSelectedUserRole && (
              <FormControl fullWidth margin="normal">
                <InputLabel>Role</InputLabel>
                <Select
                  value={formData.role}
                  label="Role"
                  onChange={(e) => handleFormChange("role", e.target.value)}>
                  {roleOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
            {(selectedEmployee?.id === currentUser?.id || (canManageUsers() && selectedEmployee?.id !== currentUser?.id && !canChangeSelectedUserRole)) && (
              <TextField
                fullWidth
                label="Role"
                value={allRoleOptions.find(option => option.value === formData.role)?.label || formData.role}
                margin="normal"
                disabled
                helperText={
                  selectedEmployee?.id === currentUser?.id 
                    ? "You cannot change your own role"
                    : "You cannot change the role of someone with equal or higher authority"
                }
              />
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveEdit} variant="contained">
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete employee "{employeeToDelete?.name}"?
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// Wrap with ProtectedRoute to ensure proper permissions
const ProtectedEmployees = () => {
  return (
    <ProtectedRoute requiredPermission={PERMISSIONS.MANAGE_USERS}>
      <Employees />
    </ProtectedRoute>
  );
};

export default ProtectedEmployees;