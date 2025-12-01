import React, { useState,useEffect } from "react";
import { Formik, Form, Field, useField } from "formik";
import * as Yup from "yup";
import {
  Container,
  TextField,
  Button,
  Typography,
  Box,
  Autocomplete,
  LinearProgress,
  Alert,
  Paper,
  Grid,
  Avatar,
  Divider,
  InputAdornment,
  IconButton,
  Card,
  CardContent,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Collapse,
  Chip,
} from "@mui/material";
import {
  PersonAdd,
  Person,
  Email,
  Phone,
  Lock,
  AccountCircle,
  Visibility,
  VisibilityOff,
  Work,
  Settings,
  ExpandMore,
  ExpandLess,
  Security,
} from "@mui/icons-material";
import { styled } from "@mui/system";
import { ROLES, SIDEBAR_PAGES, rolePermissions, setCustomUserPermissions, getAllRoles, getRoleDisplayName } from "../context/userRoles";
import { tableActions } from "../config/Functions";
import { useSelector } from "react-redux";
import CustomPermissionsModal from "../components/admin/CustomPermissionsModal";
import customRoleService from "../services/customRoleService";

const StyledTextField = styled(TextField)({
  margin: "12px 0",
  '& .MuiOutlinedInput-root': {
    '&:hover fieldset': {
      borderColor: '#1976d2',
    },
  },
});

const StyledPaper = styled(Paper)({
  padding: '32px',
  marginTop: '24px',
  borderRadius: '16px',
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
  background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
});

const HeaderBox = styled(Box)({
  textAlign: 'center',
  marginBottom: '32px',
});

const StyledAvatar = styled(Avatar)({
  width: 80,
  height: 80,
  margin: '0 auto 16px',
  backgroundColor: '#1976d2',
  fontSize: '2rem',
});

const validationSchema = Yup.object().shape({
  name: Yup.string().required("Required"),
  username: Yup.string().required("Required"),
  role: Yup.string().required("Required"),
  email: Yup.string().email("Invalid email"),
  password: Yup.string().required("Required"),
  contact: Yup.string().required("Required"),
});

const MyTextField = ({ label, icon, ...props }) => {
  const [field, meta, helpers] = useField(props);
  const [showPassword, setShowPassword] = useState(false);

  const handleBlur = (event) => {
    if (props.name === 'username' || props.name === 'email') {
      const lowercaseValue = event.target.value.toLowerCase();
      helpers.setValue(lowercaseValue);
    }
    field.onBlur(event);
  };

  const handleTogglePassword = () => {
    setShowPassword(!showPassword);
  };

  return (
    <StyledTextField
      label={label}
      {...field}
      {...props}
      type={props.type === 'password' && showPassword ? 'text' : props.type}
      error={meta.touched && Boolean(meta.error)}
      helperText={meta.touched && meta.error}
      onBlur={handleBlur}
      InputProps={{
        startAdornment: icon && (
          <InputAdornment position="start">
            {icon}
          </InputAdornment>
        ),
        endAdornment: props.type === 'password' && (
          <InputAdornment position="end">
            <IconButton
              onClick={handleTogglePassword}
              edge="end"
              size="small"
            >
              {showPassword ? <VisibilityOff /> : <Visibility />}
            </IconButton>
          </InputAdornment>
        ),
      }}
    />
  );
};

const CreateUser = () => {
  const companyId = useSelector((state) => state.companyState.data.id);
  const workerRole = useSelector((state) => state.userState.currentUser.role);
  const [showAlert, setShowAlert] = useState(false);
  const [error, setError] = useState("");
  const [permissionsModalOpen, setPermissionsModalOpen] = useState(false);
  const [createdUser, setCreatedUser] = useState(null);
  const [showCustomPermissions, setShowCustomPermissions] = useState(false);
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [availableRoles, setAvailableRoles] = useState(Object.values(ROLES));
  const [customRoles, setCustomRoles] = useState([]);

  // Load custom roles from backend
  useEffect(() => {
    const loadCustomRoles = async () => {
      try {
        const customRoleService = await import('../services/customRoleService');
        const roles = await customRoleService.default.getAllCustomRoles();
        setCustomRoles(roles);
        
        // Combine built-in and custom roles
        const builtInRoles = Object.values(ROLES);
        const customRoleNames = roles.map(role => ({ 
          value: role.name, 
          displayName: role.displayName 
        }));
        const allRoles = [
          ...builtInRoles.map(role => ({ value: role, displayName: getRoleDisplayName(role) })),
          ...customRoleNames
        ];
        setAvailableRoles(allRoles);
      } catch (error) {
        console.error('Error loading custom roles:', error);
        // Fallback to built-in roles only
        const builtInRoles = Object.values(ROLES);
        setAvailableRoles(builtInRoles.map(role => ({ value: role, displayName: getRoleDisplayName(role) })));
      }
    };

    loadCustomRoles();
  }, []);

  const handlePermissionToggle = (pagePath) => {
    setSelectedPermissions(prev => 
      prev.includes(pagePath)
        ? prev.filter(path => path !== pagePath)
        : [...prev, pagePath]
    );
  };

  const handleSelectAllPermissions = () => {
    setSelectedPermissions(Object.values(SIDEBAR_PAGES).map(page => page.path));
  };

  const handleDeselectAllPermissions = () => {
    setSelectedPermissions([]);
  };

  const handleRoleChange = (role) => {
    // When role changes, set default permissions based on role
    if (role) {
      // Check if it's a custom role
      const customRole = customRoles.find(cr => cr.name === role);
      if (customRole) {
        // For custom roles, use their defined permissions
        const customPermissions = JSON.parse(customRole.permissions || '[]');
        const defaultPages = Object.values(SIDEBAR_PAGES).filter(page => 
          customPermissions.includes(page.permission)
        );
        setSelectedPermissions(defaultPages.map(page => page.path));
      } else if (rolePermissions[role]) {
        // For built-in roles, use role permissions
        const defaultPages = Object.values(SIDEBAR_PAGES).filter(page => 
          rolePermissions[role].includes(page.permission)
        );
        setSelectedPermissions(defaultPages.map(page => page.path));
      }
    }
  };

  return (
    <div className="page">
      <Container maxWidth="lg">
        <StyledPaper elevation={3}>
          <HeaderBox>
            <StyledAvatar>
              <PersonAdd fontSize="large" />
            </StyledAvatar>
            <Typography variant="h4" component="h1" gutterBottom color="primary" fontWeight="bold">
              Create New User
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Add a new team member to your organization
            </Typography>
            <Divider sx={{ mt: 2, mb: 3 }} />
          </HeaderBox>
        <Formik
          initialValues={{
            name: "",
            username: "",
            role: "",
            email: "",
            password: "",
            contact: "",
          }}
          validationSchema={validationSchema}
          onSubmit={async (values, { setSubmitting, resetForm }) => {
            setSubmitting(true);
            setError(""); // Reset error message
            try {
              // Prepare data for backend
              const submitData = {
                companyId,
                name: values.name,
                username: values.username,
                contact: values.contact,
                password: values.password,
                role: values.role
              };
              // Only include email if it's provided
              if (values.email && values.email.trim()) {
                submitData.email = values.email;
              }
              
              const response = await tableActions.addWorker(submitData);
              
              // If user was created successfully and has custom permissions, save them
              if (response && selectedPermissions.length > 0) {
                const userId = response.id || response.worker?.id;
                if (userId) {
                  const customPages = Object.values(SIDEBAR_PAGES).filter(page => 
                    selectedPermissions.includes(page.path)
                  );
                  setCustomUserPermissions(userId, customPages);
                }
              }
              
              setCreatedUser({
                username: values.username,
                name: values.name,
                role: values.role
              });
              setShowAlert(true);
              setTimeout(() => {
                setShowAlert(false);
                resetForm();
                setSelectedPermissions([]);
                setShowCustomPermissions(false);
              }, 1000);
            } catch (err) {
              // Capture error message from the server
              const errorMessage = err?.response?.data?.error || err?.message || err || "An error occurred while creating the user.";
              setError(errorMessage);
              setTimeout(() => {
                setError("")
              }, 4000);
              console.error('Error creating user:', err);
            }
            setSubmitting(false); // Ensure submitting is stopped
          }}> 
          {({ values, setFieldValue, isSubmitting }) => (
            <Form>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <MyTextField
                    name="name"
                    label="Full Name"
                    variant="outlined"
                    fullWidth
                    icon={<Person color="action" />}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <MyTextField
                    name="username"
                    label="Username"
                    variant="outlined"
                    fullWidth
                    icon={<AccountCircle color="action" />}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Field name="role">
                    {({ field, form, meta }) => (
                      <Autocomplete
                        options={availableRoles}
                        getOptionLabel={(option) => {
                          // Handle object structure with displayName
                          if (typeof option === 'object' && option.displayName) {
                            return option.displayName;
                          }
                          // Handle string values (fallback)
                          if (typeof option === 'string') {
                            return option.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                          }
                          return '';
                        }}
                        getOptionValue={(option) => {
                          // Extract the actual value for form submission
                          return typeof option === 'object' ? option.value : option;
                        }}
                        renderInput={(params) => (
                          <StyledTextField
                            {...params}
                            label="Role"
                            variant="outlined"
                            error={meta.touched && Boolean(meta.error)}
                            helperText={meta.touched && meta.error}
                            InputProps={{
                              ...params.InputProps,
                              startAdornment: (
                                <InputAdornment position="start">
                                  <Work color="action" />
                                </InputAdornment>
                              ),
                            }}
                          />
                        )}
                        onChange={(event, value) => {
                          const roleValue = typeof value === 'object' ? value.value : value;
                          setFieldValue("role", roleValue);
                          handleRoleChange(roleValue);
                        }}
                        value={values.role}
                        disableClearable
                      />
                    )}
                  </Field>
                </Grid>
                <Grid item xs={12} md={6}>
                  <MyTextField
                    name="email"
                    label="Email Address (Optional)"
                    variant="outlined"
                    fullWidth
                    icon={<Email color="action" />}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <MyTextField
                    name="contact"
                    label="Phone Number"
                    variant="outlined"
                    fullWidth
                    icon={<Phone color="action" />}
                  />
                </Grid>
                <Grid item xs={12}>
                  <MyTextField
                    name="password"
                    label="Password"
                    type="password"
                    variant="outlined"
                    fullWidth
                    icon={<Lock color="action" />}
                  />
                </Grid>

                {/* Custom Permissions Section - COMMENTED OUT */}
                {/* 
                {values.role && (
                  <Grid item xs={12}>
                    <Card sx={{ mt: 2, border: '2px solid #e3f2fd', borderRadius: 2 }}>
                      <CardContent>
                        <Box 
                          display="flex" 
                          alignItems="center" 
                          justifyContent="space-between"
                          sx={{ cursor: 'pointer' }}
                          onClick={() => setShowCustomPermissions(!showCustomPermissions)}
                        >
                          <Box display="flex" alignItems="center">
                            <Security color="primary" sx={{ mr: 1 }} />
                            <Typography variant="h6" color="primary">
                              Custom Permissions
                            </Typography>
                            <Chip 
                              label={`${selectedPermissions.length} selected`}
                              size="small"
                              color="primary"
                              variant="outlined"
                              sx={{ ml: 2 }}
                            />
                          </Box>
                          {showCustomPermissions ? <ExpandLess /> : <ExpandMore />}
                        </Box>
                        
                        <Typography variant="body2" color="textSecondary" sx={{ mt: 1, mb: 2 }}>
                          Customize which pages this user can access. Default permissions are set based on their role.
                        </Typography>

                        <Collapse in={showCustomPermissions}>
                          <Box sx={{ mt: 2 }}>
                            <Box sx={{ mb: 2 }}>
                              <Button 
                                size="small" 
                                onClick={handleSelectAllPermissions}
                                sx={{ mr: 1 }}
                                variant="outlined"
                              >
                                Select All
                              </Button>
                              <Button 
                                size="small" 
                                onClick={handleDeselectAllPermissions}
                                variant="outlined"
                              >
                                Deselect All
                              </Button>
                            </Box>
                            
                            <Divider sx={{ mb: 2 }} />
                            
                            <FormGroup>
                              <Grid container spacing={1}>
                                {Object.values(SIDEBAR_PAGES).map((page) => (
                                  <Grid item xs={12} sm={6} md={4} key={page.path}>
                                    <FormControlLabel
                                      control={
                                        <Checkbox
                                          checked={selectedPermissions.includes(page.path)}
                                          onChange={() => handlePermissionToggle(page.path)}
                                          size="small"
                                        />
                                      }
                                      label={
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                          <i className={`bx ${page.icon}`} style={{ fontSize: '16px' }} />
                                          <Typography variant="body2">{page.text}</Typography>
                                        </Box>
                                      }
                                    />
                                  </Grid>
                                ))}
                              </Grid>
                            </FormGroup>
                          </Box>
                        </Collapse>
                      </CardContent>
                    </Card>
                  </Grid>
                )}
                */}
              </Grid>
              {isSubmitting && (
                <Box mt={3}>
                  <LinearProgress sx={{ borderRadius: 2, height: 6 }} />
                </Box>
              )}
              <Box mt={4}>
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  disabled={isSubmitting}
                  size="large"
                  fullWidth
                  startIcon={<PersonAdd />}
                  sx={{
                    py: 1.5,
                    fontSize: '1.1rem',
                    fontWeight: 'bold',
                    borderRadius: 3,
                    background: 'linear-gradient(45deg, #1976d2 30%, #42a5f5 90%)',
                    boxShadow: '0 4px 20px rgba(25, 118, 210, 0.3)',
                    '&:hover': {
                      background: 'linear-gradient(45deg, #1565c0 30%, #1976d2 90%)',
                      boxShadow: '0 6px 25px rgba(25, 118, 210, 0.4)',
                    },
                  }}
                >
                  {isSubmitting ? 'Creating User...' : 'Create User'}
                </Button>
                
                {/* Custom Permissions Button - Only show after user is created */}
                {createdUser && (
                  <Button
                    variant="outlined"
                    color="secondary"
                    size="large"
                    fullWidth
                    startIcon={<Settings />}
                    onClick={() => setPermissionsModalOpen(true)}
                    sx={{
                      mt: 2,
                      py: 1.5,
                      fontSize: '1.1rem',
                      fontWeight: 'bold',
                      borderRadius: 3,
                      borderWidth: 2,
                      '&:hover': {
                        borderWidth: 2,
                        backgroundColor: 'rgba(156, 39, 176, 0.04)',
                      },
                    }}
                  >
                    Set Custom Permissions for {createdUser.name}
                  </Button>
                )}
              </Box>
              {/* Error Alert */}
              {error && (
                <div
                  style={{
                    position: "fixed",
                    top: "80px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    zIndex: 1000,
                  }}>
                  <Alert variant="filled" severity="error">
                    {error}
                  </Alert>
                </div>
              )}
              {/* Success Alert */}
              {showAlert && !error && (
                <div
                  style={{
                    position: "fixed",
                    top: "80px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    zIndex: 1000,
                  }}>
                  <Alert variant="filled" severity="success">
                    User created successfully!
                  </Alert>
                </div>
              )}
            </Form>
          )}
        </Formik>
        
        {/* Custom Permissions Modal */}
        {createdUser && (
          <CustomPermissionsModal
            open={permissionsModalOpen}
            onClose={() => setPermissionsModalOpen(false)}
            username={createdUser.username}
            userDisplayName={createdUser.name}
          />
        )}
        </StyledPaper>
      </Container>
    </div>
  );
};

export default CreateUser;
