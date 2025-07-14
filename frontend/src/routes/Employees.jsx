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
import { PERMISSIONS, ROLES } from '../context/userRoles';

const Employees = () => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    email: '',
    role: 'worker'
  });
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState(null);

  const currentUser = useSelector((state) => state.userState.currentUser);
  const companyId = useSelector((state) => state.userState.currentUser?.companyId);
  const userRole = currentUser?.role || currentUser?.worker?.role;

  const roleOptions = [
    { value: ROLES.WORKER, label: 'Worker' },
    { value: ROLES.ADMIN, label: 'Admin' },
    { value: ROLES.SUPER_ADMIN, label: 'Super Admin' },
    { value: ROLES.STORE_MANAGER, label: 'Store Manager' },
    { value: ROLES.SALES_ASSOCIATE, label: 'Sales Associate' },
    { value: ROLES.SALES_ASSOCIATE_AND_INVENTORY_MANAGER, label: 'Sales Associate & Inventory Manager' },
    { value: ROLES.INVENTORY_MANAGER, label: 'Inventory Manager' },
    { value: ROLES.HR, label: 'HR' },
    { value: ROLES.IT_SUPPORT, label: 'IT Support' }
  ];

  const getRoleColor = (role) => {
    switch (role) {
      case ROLES.SUPER_ADMIN: return 'error';
      case ROLES.ADMIN: return 'warning';
      case ROLES.STORE_MANAGER: return 'info';
      case ROLES.WORKER: return 'primary';
      case ROLES.SALES_ASSOCIATE:
      case ROLES.SALES_ASSOCIATE_AND_INVENTORY_MANAGER:
      case ROLES.INVENTORY_MANAGER: return 'success';
      case ROLES.HR:
      case ROLES.IT_SUPPORT: return 'secondary';
      default: return 'default';
    }
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
    <Box sx={{ p: 3, height: '90vh', overflow: 'auto' }}>
      <Grid container spacing={3}>
        {/* Header */}
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
                            label={employee.role || "worker"}
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
            {canManageUsers() && (
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