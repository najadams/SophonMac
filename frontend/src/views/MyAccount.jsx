import React, { useState } from "react";
import { Formik, Form, Field } from "formik";
import {
  Container,
  TextField,
  Button,
  Typography,
  Box,
  Grid,
  Divider,
  Autocomplete,
  LinearProgress,
  Alert,
  Card,
  CardContent,
  Fade,
  Zoom,
  Slide,
  Avatar,
  Paper,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Switch,
  Chip,
} from "@mui/material";
import { styled } from "@mui/system";
import { useSelector, useDispatch } from "react-redux";
import * as Yup from "yup";
import { capitalizeFirstLetter, updateAccount } from "../config/Functions";
import { ActionCreators } from "../actions/action";
import { rolePermissions, ROLES, PERMISSIONS } from "../context/userRoles";
import bcrypt from "bcryptjs";
import {
  Person as PersonIcon,
  Lock as LockIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Security as SecurityIcon,
  Edit as EditIcon,
  Receipt as ReceiptIcon,
  Inventory as InventoryIcon,
  Payment as PaymentIcon,
  People as PeopleIcon,
  LocalOffer as LocalOfferIcon,
  PersonAdd,
  Backup as BackupIcon,
  Speed as SpeedIcon,
  Settings as SettingsIcon,
  History as HistoryIcon,
  ShoppingCart as ShoppingCartIcon,
  Assessment as AssessmentIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";

const StyledField = styled(Field)({
  margin: "10px 0",
  transition: "all 0.3s ease-in-out",
  "&:hover": {
    transform: "translateY(-2px)",
  },
});

const StyledCard = styled(Card)(({ theme }) => ({
  transition: "all 0.3s ease-in-out",
  "&:hover": {
    transform: "translateY(-5px)",
    boxShadow: theme.shadows[8],
  },
}));

const StyledButton = styled(Button)(({ theme }) => ({
  transition: "all 0.3s ease-in-out",
  "&:hover": {
    transform: "translateY(-2px)",
    boxShadow: theme.shadows[4],
  },
}));

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`account-tabpanel-${index}`}
      aria-labelledby={`account-tab-${index}`}
      {...other}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const Privileges = ({ user }) => {
  const userRole = user.role;
  const userPermissions = rolePermissions[userRole] || [];

  const chunkArray = (array, size) => {
    const result = [];
    for (let i = 0; i < array.length; i += size) {
      result.push(array.slice(i, i + size));
    }
    return result;
  };

  const permissionChunks = chunkArray(userPermissions, 2);

  return (
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <Box display="flex" alignItems="center" mb={2}>
          <SecurityIcon sx={{ mr: 1, color: "primary.main" }} />
          <Typography variant="h6">Privileges</Typography>
        </Box>
        <Divider sx={{ mb: 3 }} />
      </Grid>
      {permissionChunks.map((chunk, index) => (
        <React.Fragment key={index}>
          {chunk.map((permission) => (
            <Grid item xs={6} key={permission}>
              <Typography
                variant="body1"
                sx={{ display: "flex", alignItems: "center" }}>
                <span style={{ marginRight: "8px", color: "#4CAF50" }}>✓</span>
                {capitalizeFirstLetter(permission.split("_").join(" "))}
              </Typography>
            </Grid>
          ))}
        </React.Fragment>
      ))}
    </Grid>
  );
};

const validationSchema = Yup.object().shape({
  name: Yup.string().required("Required"),
  username: Yup.string().required("Required"),
  role: Yup.string().required("Required"),
  contact: Yup.string(),
  email: Yup.string().email("Invalid email"),
  password: Yup.string(),
});

const MyAccount = () => {
  const user = useSelector((state) => state.userState.currentUser);
  const userId = user.id || user._id;
  const dispatch = useDispatch();
  const [alert, setAlert] = useState({ show: false, message: "", type: "" });
  const [tabValue, setTabValue] = useState(0);
  const navigate = useNavigate();

  // Check user permissions
  const userPermissions = rolePermissions[user?.role] || [];
  const canViewSalesHistory = userPermissions.includes(
    PERMISSIONS.VIEW_REPORTS
  );
  const canManageInventory = userPermissions.includes(
    PERMISSIONS.MANAGE_INVENTORY
  );
  const canProcessSales = userPermissions.includes(PERMISSIONS.PROCESS_SALES);
  const canManageUsers = userPermissions.includes(PERMISSIONS.MANAGE_USERS);
  const canManageSettings = userPermissions.includes(
    PERMISSIONS.MANAGE_SETTINGS
  );

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleSubmit = async (values, { setSubmitting }) => {
    try {
      const processedValues = {
        name: values.name?.trim()?.toLowerCase() || user.name,
        username: values.username?.trim()?.toLowerCase() || user.username,
        email: values.email?.trim()?.toLowerCase() || user.email,
        contact: values.contact?.trim() || user.contact,
        role: values.role?.trim()?.toLowerCase() || user.role,
      };

      if (values.password && values.password.trim() !== "") {
        processedValues.password = await bcrypt.hash(values.password, 10);
      }

      const submissionData = { userId, ...processedValues };
      await updateAccount(submissionData);

      dispatch(
        ActionCreators.setCurrentUser({
          id: userId,
          _id: userId,
          ...user,
          ...processedValues,
        })
      );

      setAlert({
        show: true,
        message: "Account updated successfully!",
        type: "success",
      });
    } catch (error) {
      setAlert({
        show: true,
        message: "Error updating account.",
        type: "error",
      });
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page">
      <Container maxWidth="md">
        <Fade in timeout={1000}>
          <Box display="flex" alignItems="center" mb={4}>
            <Avatar
              sx={{
                width: 64,
                height: 64,
                bgcolor: "primary.main",
                mr: 2,
              }}>
              <PersonIcon sx={{ fontSize: 40 }} />
            </Avatar>
            <Box>
              <Typography
                variant="h4"
                component="h1"
                sx={{ fontWeight: "bold" }}>
                My Account
              </Typography>
              <Typography variant="subtitle1" color="text.secondary">
                Manage your account settings and preferences
              </Typography>
            </Box>
          </Box>
        </Fade>

        <Paper sx={{ width: "100%", mb: 4 }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            indicatorColor="primary"
            textColor="primary"
            variant="scrollable"
            scrollButtons="auto"
            aria-label="account tabs">
            <Tab icon={<PersonIcon />} label="Profile" />
            <Tab icon={<SecurityIcon />} label="Security" />
            {canViewSalesHistory && (
              <Tab icon={<ReceiptIcon />} label="Sales History" />
            )}
            {canManageInventory && (
              <Tab icon={<InventoryIcon />} label="Inventory Access" />
            )}
            {canProcessSales && (
              <Tab icon={<PaymentIcon />} label="Payment Methods" />
            )}
            {canManageUsers && (
              <Tab icon={<PeopleIcon />} label="User Management" />
            )}
            {canManageSettings && (
              <Tab icon={<SettingsIcon />} label="System Settings" />
            )}
          </Tabs>
        </Paper>

        <Formik
          initialValues={{
            name: capitalizeFirstLetter(user.name) || "",
            username: capitalizeFirstLetter(user.username) || "",
            role: user.role || "",
            contact: user.contact || "",
            email: user.email || "",
            password: "",
          }}
          validationSchema={validationSchema}
          onSubmit={handleSubmit}>
          {({
            values,
            handleChange,
            handleBlur,
            setFieldValue,
            isSubmitting,
          }) => (
            <Form>
              <TabPanel value={tabValue} index={0}>
                <Zoom in timeout={800}>
                  <StyledCard sx={{ mb: 4 }}>
                    <CardContent>
                      <Box display="flex" alignItems="center" mb={2}>
                        <PersonIcon sx={{ mr: 1, color: "primary.main" }} />
                        <Typography variant="h6">
                          Personal Information
                        </Typography>
                      </Box>
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                          <StyledField
                            as={TextField}
                            fullWidth
                            name="name"
                            label="Full Name"
                            variant="outlined"
                            value={values.name}
                            onChange={handleChange}
                            onBlur={(event) => {
                              handleBlur(event);
                              setFieldValue(
                                "name",
                                capitalizeFirstLetter(event.target.value)
                              );
                            }}
                          />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <StyledField
                            as={TextField}
                            fullWidth
                            name="username"
                            label="Username"
                            variant="outlined"
                            value={values.username}
                            onChange={handleChange}
                            onBlur={(event) => {
                              handleBlur(event);
                              setFieldValue(
                                "username",
                                capitalizeFirstLetter(event.target.value)
                              );
                            }}
                          />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <Autocomplete
                            options={Object.values(ROLES)}
                            getOptionLabel={(option) => option}
                            renderInput={(params) => (
                              <TextField
                                {...params}
                                label="Role"
                                name="role"
                                variant="outlined"
                                required
                              />
                            )}
                            value={values.role}
                            onChange={(event, value) => {
                              setFieldValue("role", value);
                            }}
                            isOptionEqualToValue={(option, value) =>
                              option === value
                            }
                            disableClearable
                            disabled={!!user.role}
                          />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <StyledField
                            as={TextField}
                            fullWidth
                            name="email"
                            label="Email"
                            variant="outlined"
                            value={values.email}
                            onChange={handleChange}
                          />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <StyledField
                            as={TextField}
                            fullWidth
                            type="password"
                            name="password"
                            label="Password"
                            variant="outlined"
                            value={values.password}
                            onChange={handleChange}
                          />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <StyledField
                            as={TextField}
                            fullWidth
                            name="contact"
                            label="Contact"
                            variant="outlined"
                            value={values.contact}
                            onChange={handleChange}
                          />
                        </Grid>
                      </Grid>
                    </CardContent>
                  </StyledCard>
                </Zoom>

                <Slide direction="up" in timeout={800}>
                  <StyledCard sx={{ mb: 4 }}>
                    <CardContent>
                      <Privileges user={user} />
                    </CardContent>
                  </StyledCard>
                </Slide>
              </TabPanel>

              <TabPanel value={tabValue} index={1}>
                <Zoom in timeout={800}>
                  <StyledCard sx={{ mb: 4 }}>
                    <CardContent>
                      <Box display="flex" alignItems="center" mb={2}>
                        <SecurityIcon sx={{ mr: 1, color: "primary.main" }} />
                        <Typography variant="h6">Security Settings</Typography>
                      </Box>
                      <Grid container spacing={2}>
                        <Grid item xs={12}>
                          <List>
                            <ListItem>
                              <ListItemIcon>
                                <LockIcon color="primary" />
                              </ListItemIcon>
                              <ListItemText
                                primary="Change Password"
                                secondary="Update your account password"
                              />
                              <Button variant="outlined" color="primary">
                                Change
                              </Button>
                            </ListItem>
                            <ListItem>
                              <ListItemIcon>
                                <SecurityIcon color="primary" />
                              </ListItemIcon>
                              <ListItemText
                                primary="Two-Factor Authentication"
                                secondary="Add an extra layer of security"
                              />
                              <Switch />
                            </ListItem>
                            <ListItem>
                              <ListItemIcon>
                                <HistoryIcon color="primary" />
                              </ListItemIcon>
                              <ListItemText
                                primary="Login History"
                                secondary="View your recent login activity"
                              />
                              <Button variant="outlined" color="primary">
                                View
                              </Button>
                            </ListItem>
                          </List>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </StyledCard>
                </Zoom>
              </TabPanel>

              {canViewSalesHistory && (
                <TabPanel value={tabValue} index={2}>
                  <Zoom in timeout={800}>
                    <StyledCard sx={{ mb: 4 }}>
                      <CardContent>
                        <Box display="flex" alignItems="center" mb={2}>
                          <ReceiptIcon sx={{ mr: 1, color: "primary.main" }} />
                          <Typography variant="h6">Sales History</Typography>
                        </Box>
                        <Grid container spacing={2}>
                          <Grid item xs={12}>
                            <List>
                              <ListItem>
                                <ListItemIcon>
                                  <ShoppingCartIcon color="primary" />
                                </ListItemIcon>
                                <ListItemText
                                  primary="Today's Sales"
                                  secondary="View your sales for today"
                                />
                                <Chip label="12" color="primary" />
                              </ListItem>
                              <ListItem>
                                <ListItemIcon>
                                  <AssessmentIcon color="primary" />
                                </ListItemIcon>
                                <ListItemText
                                  primary="Weekly Report"
                                  secondary="View your weekly sales report"
                                />
                                <Button variant="outlined" color="primary">
                                  View
                                </Button>
                              </ListItem>
                              <ListItem>
                                <ListItemIcon>
                                  <HistoryIcon color="primary" />
                                </ListItemIcon>
                                <ListItemText
                                  primary="Monthly Report"
                                  secondary="View your monthly sales report"
                                />
                                <Button variant="outlined" color="primary">
                                  View
                                </Button>
                              </ListItem>
                            </List>
                          </Grid>
                        </Grid>
                      </CardContent>
                    </StyledCard>
                  </Zoom>
                </TabPanel>
              )}

              {canManageInventory && (
                <TabPanel value={tabValue} index={3}>
                  <Zoom in timeout={800}>
                    <StyledCard sx={{ mb: 4 }}>
                      <CardContent>
                        <Box display="flex" alignItems="center" mb={2}>
                          <InventoryIcon
                            sx={{ mr: 1, color: "primary.main" }}
                          />
                          <Typography variant="h6">Inventory Access</Typography>
                        </Box>
                        <Grid container spacing={2}>
                          <Grid item xs={12}>
                            <List>
                              <ListItem>
                                <ListItemIcon>
                                  <InventoryIcon color="primary" />
                                </ListItemIcon>
                                <ListItemText
                                  primary="Stock Management"
                                  secondary="Manage inventory levels"
                                />
                                <Chip label="Enabled" color="success" />
                              </ListItem>
                              <ListItem>
                                <ListItemIcon>
                                  <LocalOfferIcon color="primary" />
                                </ListItemIcon>
                                <ListItemText
                                  primary="Price Management"
                                  secondary="Update product prices"
                                />
                                <Chip label="Enabled" color="success" />
                              </ListItem>
                              <ListItem>
                                <ListItemIcon>
                                  <PeopleIcon color="primary" />
                                </ListItemIcon>
                                <ListItemText
                                  primary="Supplier Management"
                                  secondary="Manage supplier information"
                                />
                                <Chip label="Enabled" color="success" />
                              </ListItem>
                            </List>
                          </Grid>
                        </Grid>
                      </CardContent>
                    </StyledCard>
                  </Zoom>
                </TabPanel>
              )}

              {canProcessSales && (
                <TabPanel value={tabValue} index={4}>
                  <Zoom in timeout={800}>
                    <StyledCard sx={{ mb: 4 }}>
                      <CardContent>
                        <Box display="flex" alignItems="center" mb={2}>
                          <PaymentIcon sx={{ mr: 1, color: "primary.main" }} />
                          <Typography variant="h6">Payment Methods</Typography>
                        </Box>
                        <Grid container spacing={2}>
                          <Grid item xs={12}>
                            <List>
                              <ListItem>
                                <ListItemIcon>
                                  <PaymentIcon color="primary" />
                                </ListItemIcon>
                                <ListItemText
                                  primary="Cash"
                                  secondary="Process cash payments"
                                />
                                <Chip label="Enabled" color="success" />
                              </ListItem>
                              <ListItem>
                                <ListItemIcon>
                                  <PaymentIcon color="primary" />
                                </ListItemIcon>
                                <ListItemText
                                  primary="Mobile Money"
                                  secondary="Process mobile money payments"
                                />
                                <Chip label="Enabled" color="success" />
                              </ListItem>
                              <ListItem>
                                <ListItemIcon>
                                  <PaymentIcon color="primary" />
                                </ListItemIcon>
                                <ListItemText
                                  primary="Card"
                                  secondary="Process card payments"
                                />
                                <Chip label="Enabled" color="success" />
                              </ListItem>
                            </List>
                          </Grid>
                        </Grid>
                      </CardContent>
                    </StyledCard>
                  </Zoom>
                </TabPanel>
              )}

              {canManageUsers && (
                <TabPanel value={tabValue} index={5}>
                  <Zoom in timeout={800}>
                    <StyledCard sx={{ mb: 4 }}>
                      <CardContent>
                        <Box display="flex" alignItems="center" mb={2}>
                          <PeopleIcon sx={{ mr: 1, color: "primary.main" }} />
                          <Typography variant="h6">User Management</Typography>
                        </Box>
                        <Grid container spacing={2}>
                          <Grid item xs={12}>
                            <Button
                              variant="contained"
                              color="primary"
                              startIcon={<PersonAdd />}
                              onClick={() => navigate("/employee/new")}
                              fullWidth
                              sx={{ mb: 2 }}>
                              Add New Employee
                            </Button>
                            <Button
                              variant="outlined"
                              color="primary"
                              startIcon={<PeopleIcon />}
                              onClick={() => navigate("/employees")}
                              fullWidth>
                              Manage Employees
                            </Button>
                          </Grid>
                        </Grid>
                      </CardContent>
                    </StyledCard>
                  </Zoom>
                </TabPanel>
              )}

              {canManageSettings && (
                <TabPanel value={tabValue} index={6}>
                  <Zoom in timeout={800}>
                    <StyledCard sx={{ mb: 4 }}>
                      <CardContent>
                        <Box display="flex" alignItems="center" mb={2}>
                          <SettingsIcon sx={{ mr: 1, color: "primary.main" }} />
                          <Typography variant="h6">System Settings</Typography>
                        </Box>
                        <Grid container spacing={2}>
                          <Grid item xs={12}>
                            <List>
                              <ListItem>
                                <ListItemIcon>
                                  <BackupIcon color="primary" />
                                </ListItemIcon>
                                <ListItemText
                                  primary="System Backup"
                                  secondary="Manage system backups"
                                />
                                <Button variant="outlined" color="primary">
                                  Configure
                                </Button>
                              </ListItem>
                              <ListItem>
                                <ListItemIcon>
                                  <SecurityIcon color="primary" />
                                </ListItemIcon>
                                <ListItemText
                                  primary="Security Settings"
                                  secondary="Configure system security"
                                />
                                <Button variant="outlined" color="primary">
                                  Configure
                                </Button>
                              </ListItem>
                              <ListItem>
                                <ListItemIcon>
                                  <SpeedIcon color="primary" />
                                </ListItemIcon>
                                <ListItemText
                                  primary="System Optimization"
                                  secondary="Optimize system performance"
                                />
                                <Button variant="outlined" color="primary">
                                  Configure
                                </Button>
                              </ListItem>
                            </List>
                          </Grid>
                        </Grid>
                      </CardContent>
                    </StyledCard>
                  </Zoom>
                </TabPanel>
              )}

              {alert.show && (
                <Fade in timeout={500}>
                  <Alert
                    severity={alert.type}
                    onClose={() => setAlert({ show: false })}
                    sx={{ mb: 2 }}>
                    {alert.message}
                  </Alert>
                </Fade>
              )}
              {isSubmitting && <LinearProgress sx={{ mb: 2 }} />}

              <Fade in timeout={1000}>
                <Box mt={3}>
                  <StyledButton
                    type="submit"
                    variant="contained"
                    color="primary"
                    disabled={isSubmitting}
                    fullWidth
                    size="large"
                    startIcon={<EditIcon />}>
                    Save Changes
                  </StyledButton>
                </Box>
              </Fade>
            </Form>
          )}
        </Formik>
      </Container>
    </div>
  );
};

export default MyAccount;
