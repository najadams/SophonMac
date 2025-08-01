import { useQuery } from "react-query";
import { useSelector } from "react-redux";
import { capitalizeFirstLetter } from "../config/Functions";
import { tableActions } from "../config/Functions";
import Loader from "../components/common/Loader";
import { useState } from "react";
import React from "react";
import { Formik, Form, Field } from "formik";
import {
  Container,
  TextField,
  Button,
  Typography,
  Box,
  Grid,
  FormControlLabel,
  Checkbox,
  Snackbar,
  Paper,
  Fade,
  Zoom,
  Slide,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  Divider,
  Chip,
} from "@mui/material";
import { styled } from "@mui/system";
import ErrorBoundary from "../components/common/ErrorBoundary";
import { useDispatch } from "react-redux";
import { ActionCreators } from "../actions/action";
import {
  Store as StoreIcon,
  Payment as PaymentIcon,
  Receipt as ReceiptIcon,
  Notifications as NotificationsIcon,
  LocationOn as LocationIcon,
  People as PeopleIcon,
  Assessment as AssessmentIcon,
  Help as HelpIcon,
  History as HistoryIcon,
  Print as PrintIcon,
  ReceiptLong as ReceiptLongIcon,
  Inventory as InventoryIcon,
  LocalOffer as LocalOfferIcon,
  Security as SecurityIcon,
  Backup as BackupIcon,
  Settings as SettingsIcon,
  PersonAdd,
  Add as AddIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";
import { ROLES, rolePermissions } from "../context/userRoles";
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

const Settings = () => {
  const company = useSelector((state) => state.companyState.data);
  const companyId = useSelector((state) => state.companyState.data.id);
  const user = useSelector((state) => state.userState.currentUser);
  const [open, setOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [newUnit, setNewUnit] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newPaymentMethod, setNewPaymentMethod] = useState("");
  const [paymentMethods, setPaymentMethods] = useState([
    "cash",
    "card",
    "mobile_money",
    "bank_transfer",
    "check",
  ]);

  // Check if user has admin privileges
  const isAdmin =
    user?.role === ROLES.SUPER_ADMIN || user?.role === ROLES.STORE_MANAGER;
  const canManageUsers = isAdmin;
  const canManageSettings = isAdmin || user?.role === ROLES.IT_SUPPORT;

  const {
    data: workers,
    isLoading,
    error,
  } = useQuery(["api/workers", companyId], () =>
    tableActions.fetchWorkers(companyId)
  );

  const handleBlur = (event, setFieldValue) => {
    const { name, value } = event.target;
    setFieldValue(name, capitalizeFirstLetter(value));
  };

  const handleSnackbarClose = () => {
    setOpen(false);
    setSnackbarMessage("");
  };

  return (
    <ErrorBoundary>
      <div className="page">
        <Container maxWidth="md">
          <Fade in timeout={1000}>
            <Box display="flex" alignItems="center" mb={4}>
              <SettingsIcon
                sx={{ fontSize: 40, mr: 2, color: "primary.main" }}
              />
              <Box>
                <Typography
                  variant="h4"
                  component="h1"
                  sx={{ fontWeight: "bold" }}>
                  Settings
                </Typography>
                <Typography variant="subtitle1" color="text.secondary">
                  Configure your POS system preferences
                </Typography>
              </Box>
            </Box>
          </Fade>

          <Formik
            initialValues={{
              companyName: capitalizeFirstLetter(company.companyName) || "",
              email: company.email || "",
              contact: company.contact || "",
              momo: company.momo || "",
              address: company.address || "",
              paymentMethod: "",
              location: company.location || "",
              paymentProvider: "",
              currency: "cedis  ₵",
              tinNumber: company.tinNumber || "",
              taxRate: company.taxRate || "",
              taxId: company.taxId || "",
              emailNotifications: company.emailNotifications || true,
              smsNotifications: company.smsNotifications || false,
              currentPlan: company.currentPlan || "Standard",
              nextBillingDate: company.nextBillingDate || "2024-06-15",
              receiptHeader: company.receiptHeader || "",
              receiptFooter: company.receiptFooter || "",
              defaultPrinter: company.defaultPrinter || "",
              receiptWidth: company.receiptWidth || "80mm",
              enableBarcode: company.enableBarcode || true,
              enableStockAlerts: company.enableStockAlerts || true,
              lowStockThreshold: company.lowStockThreshold || 10,
              enableCustomerLoyalty: company.enableCustomerLoyalty || false,
              loyaltyPointsRate: company.loyaltyPointsRate || 1,
              enableDiscounts: company.enableDiscounts || true,
              defaultTaxRate: company.defaultTaxRate || 12.5,
              enableMultipleTaxRates: company.enableMultipleTaxRates || false,
              enableCashDrawer: company.enableCashDrawer || false,
              cashDrawerPort: company.cashDrawerPort || "",
              backupFrequency: company.backupFrequency || "daily",
              enableAutoBackup: company.enableAutoBackup || true,
              enableOfflineMode: company.enableOfflineMode || true,
              enableCustomerManagement:
                company.enableCustomerManagement || true,
              enableSupplierManagement:
                company.enableSupplierManagement || true,
              enableInventoryTracking: company.enableInventoryTracking || true,
              enablePurchaseOrders: company.enablePurchaseOrders || true,
              enableSalesReturns: company.enableSalesReturns || true,
              enableStockTransfers: company.enableStockTransfers || true,
              enablePriceHistory: company.enablePriceHistory || true,
              enableBulkOperations: company.enableBulkOperations || true,
              enableReports: company.enableReports || true,
              enableAnalytics: company.enableAnalytics || true,
              enableMultiCurrency: company.enableMultiCurrency || false,
              defaultCurrency: company.defaultCurrency || "GHS",
              enableExchangeRates: company.enableExchangeRates || false,
              enablePaymentMethods: company.enablePaymentMethods || true,
              defaultPaymentMethod: company.defaultPaymentMethod || "cash",
              enableSplitPayments: company.enableSplitPayments || true,
              enablePartialPayments: company.enablePartialPayments || true,
              enableHoldOrders: company.enableHoldOrders || true,
              enableTableManagement: company.enableTableManagement || false,
              enableKitchenDisplay: company.enableKitchenDisplay || false,
              enableEmployeeTimeTracking:
                company.enableEmployeeTimeTracking || true,
              enableEmployeeCommission:
                company.enableEmployeeCommission || false,
              commissionRate: company.commissionRate || 0,
              enableShiftManagement: company.enableShiftManagement || true,
              enableCashManagement: company.enableCashManagement || true,
              enableBankReconciliation:
                company.enableBankReconciliation || true,
              enableAuditLogs: company.enableAuditLogs || true,
              enableUserActivityLogs: company.enableUserActivityLogs || true,
              enableSystemLogs: company.enableSystemLogs || true,
              enableSecurityLogs: company.enableSecurityLogs || true,
              enableDataExport: company.enableDataExport || true,
              enableDataImport: company.enableDataImport || true,
              enableDataBackup: company.enableDataBackup || true,
              enableDataRestore: company.enableDataRestore || true,
              enableSystemUpdates: company.enableSystemUpdates || true,
              enableSystemMaintenance: company.enableSystemMaintenance || true,
              enableSystemDiagnostics: company.enableSystemDiagnostics || true,
              enableSystemOptimization:
                company.enableSystemOptimization || true,
              enableSystemSecurity: company.enableSystemSecurity || true,
              enableSystemMonitoring: company.enableSystemMonitoring || true,
              enableSystemAlerts: company.enableSystemAlerts || true,
              enableSystemReports: company.enableSystemReports || true,
              enableSystemAnalytics: company.enableSystemAnalytics || true,
              enableSystemBackup: company.enableSystemBackup || true,
              enableSystemRestore: company.enableSystemRestore || true,
              receiptTemplate: company.receiptTemplate || "template1",
              allowedUnits: company.allowedUnits || [],
              allowedCategories: company.allowedCategories || [],
              enableStockValidationNotification:
                company.enableStockValidationNotification !== undefined
                  ? company.enableStockValidationNotification
                  : true,
            }}
            onSubmit={async (values, { setSubmitting, setErrors }) => {
              setSubmitting(true);
              const processedValues = {
                ...values,
                companyName: values.companyName.trim().toLowerCase(),
                email: values.email.trim().toLowerCase(),
                contact: values.contact.trim(),
                momo: values.momo.trim().toLowerCase(),
                address: values.address.trim().toLowerCase(),
              };
              try {
                const submissionData = { companyId, ...processedValues };
                await tableActions.updateCompanyData(submissionData);
                dispatch(
                  ActionCreators.fetchCompanySuccess({
                    id: companyId,
                    ...submissionData,
                  })
                );
                setSnackbarMessage("Company details updated successfully!");
                setOpen(true);
              } catch (error) {
                console.error(error);
                setErrors({
                  submit:
                    error?.message?.data ||
                    "Failed to update company details. Please try again.",
                });
                setSnackbarMessage(
                  "Failed to update company details. Please try again."
                );
                setOpen(true);
              }
              setSubmitting(false);
            }}>
            {({ values, handleChange, setFieldValue, errors }) => (
              <Form>
                <Zoom in timeout={800}>
                  <StyledCard sx={{ mb: 4 }}>
                    <CardContent>
                      <Box display="flex" alignItems="center" mb={2}>
                        <StoreIcon sx={{ mr: 1, color: "primary.main" }} />
                        <Typography variant="h6">General Settings</Typography>
                      </Box>
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                          <StyledField
                            as={TextField}
                            fullWidth
                            name="companyName"
                            label="Store Name"
                            variant="outlined"
                            value={values.companyName}
                            onChange={handleChange}
                            onBlur={(event) => handleBlur(event, setFieldValue)}
                          />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <StyledField
                            as={TextField}
                            fullWidth
                            name="email"
                            label="Store Email"
                            variant="outlined"
                            value={values.email}
                            onChange={handleChange}
                          />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <StyledField
                            as={TextField}
                            fullWidth
                            name="contact"
                            label="Store Phone"
                            variant="outlined"
                            value={values.contact}
                            onChange={handleChange}
                          />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <StyledField
                            as={TextField}
                            fullWidth
                            name="momo"
                            label="Momo Number"
                            variant="outlined"
                            value={values.momo}
                            onChange={handleChange}
                          />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <StyledField
                            as={TextField}
                            fullWidth
                            name="address"
                            label="Store Digital Address"
                            variant="outlined"
                            value={values.address}
                            onChange={handleChange}
                          />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <StyledField
                            as={TextField}
                            fullWidth
                            name="location"
                            label="Store Location"
                            variant="outlined"
                            value={values.location}
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
                      <Box display="flex" alignItems="center" mb={2}>
                        <ReceiptIcon sx={{ mr: 1, color: "primary.main" }} />
                        <Typography variant="h6">Tax Settings</Typography>
                      </Box>
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={4}>
                          <StyledField
                            as={TextField}
                            fullWidth
                            name="tinNumber"
                            label="Tin Number"
                            variant="outlined"
                            value={values.tinNumber}
                            onChange={handleChange}
                          />
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <StyledField
                            as={TextField}
                            fullWidth
                            name="taxRate"
                            label="Tax Rate (%)"
                            variant="outlined"
                            value={values.taxRate}
                            onChange={handleChange}
                          />
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <StyledField
                            as={TextField}
                            fullWidth
                            name="taxId"
                            label="Tax ID"
                            variant="outlined"
                            value={values.taxId}
                            onChange={handleChange}
                          />
                        </Grid>
                      </Grid>
                    </CardContent>
                  </StyledCard>
                </Slide>

                <Slide direction="up" in timeout={800}>
                  <StyledCard sx={{ mb: 4 }}>
                    <CardContent>
                      <Box display="flex" alignItems="center" mb={2}>
                        <NotificationsIcon
                          sx={{ mr: 1, color: "primary.main" }}
                        />
                        <Typography variant="h6">
                          Notification Settings
                        </Typography>
                      </Box>
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                          <FormControlLabel
                            control={
                              <Checkbox
                                name="emailNotifications"
                                checked={values.emailNotifications}
                                onChange={handleChange}
                                color="primary"
                              />
                            }
                            label="Email Notifications"
                          />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <FormControlLabel
                            control={
                              <Checkbox
                                name="smsNotifications"
                                checked={values.smsNotifications}
                                onChange={handleChange}
                                color="primary"
                              />
                            }
                            label="SMS Notifications"
                          />
                        </Grid>
                        <Grid item xs={12}>
                          <FormControlLabel
                            control={
                              <Switch
                                name="enableStockValidationNotification"
                                checked={
                                  values.enableStockValidationNotification
                                }
                                onChange={handleChange}
                                color="primary"
                              />
                            }
                            label="Enable Stock Validation Notifications"
                          />
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            display="block">
                            Show notifications when sales quantity exceeds
                            available stock
                          </Typography>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </StyledCard>
                </Slide>

                <Slide direction="up" in timeout={800}>
                  <StyledCard sx={{ mb: 4 }}>
                    <CardContent>
                      <Box display="flex" alignItems="center" mb={2}>
                        <ReceiptLongIcon
                          sx={{ mr: 1, color: "primary.main" }}
                        />
                        <Typography variant="h6">Receipt Settings</Typography>
                      </Box>
                      <Grid container spacing={2}>
                        <Grid item xs={12}>
                          <FormControl fullWidth>
                            <InputLabel>Receipt Template</InputLabel>
                            <Select
                              name="receiptTemplate"
                              value={values.receiptTemplate}
                              onChange={handleChange}
                              label="Receipt Template">
                              <MenuItem value="template1">
                                <Box>
                                  <Typography variant="subtitle1">
                                    Template 1
                                  </Typography>
                                  <Typography
                                    variant="caption"
                                    color="text.secondary">
                                    Standard receipt with logo and footer
                                  </Typography>
                                </Box>
                              </MenuItem>
                              <MenuItem value="template2">
                                <Box>
                                  <Typography variant="subtitle1">
                                    Template 2
                                  </Typography>
                                  <Typography
                                    variant="caption"
                                    color="text.secondary">
                                    Compact receipt with QR code
                                  </Typography>
                                </Box>
                              </MenuItem>
                              <MenuItem value="template3">
                                <Box>
                                  <Typography variant="subtitle1">
                                    Template 3
                                  </Typography>
                                  <Typography
                                    variant="caption"
                                    color="text.secondary">
                                    Detailed receipt with tax breakdown
                                  </Typography>
                                </Box>
                              </MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid item xs={12}>
                          <StyledField
                            as={TextField}
                            fullWidth
                            multiline
                            rows={2}
                            name="receiptHeader"
                            label="Receipt Header"
                            variant="outlined"
                            value={values.receiptHeader}
                            onChange={handleChange}
                          />
                        </Grid>
                        <Grid item xs={12}>
                          <StyledField
                            as={TextField}
                            fullWidth
                            multiline
                            rows={2}
                            name="receiptFooter"
                            label="Receipt Footer"
                            variant="outlined"
                            value={values.receiptFooter}
                            onChange={handleChange}
                          />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <FormControl fullWidth>
                            <InputLabel>Default Printer</InputLabel>
                            <Select
                              name="defaultPrinter"
                              value={values.defaultPrinter}
                              onChange={handleChange}
                              label="Default Printer">
                              <MenuItem value="thermal">
                                Thermal Printer
                              </MenuItem>
                              <MenuItem value="dot-matrix">Dot Matrix</MenuItem>
                              <MenuItem value="laser">Laser Printer</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <FormControl fullWidth>
                            <InputLabel>Receipt Width</InputLabel>
                            <Select
                              name="receiptWidth"
                              value={values.receiptWidth}
                              onChange={handleChange}
                              label="Receipt Width">
                              <MenuItem value="58mm">58mm</MenuItem>
                              <MenuItem value="80mm">80mm</MenuItem>
                              <MenuItem value="112mm">112mm</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <FormControlLabel
                            control={
                              <Switch
                                name="enableBarcode"
                                checked={values.enableBarcode}
                                onChange={handleChange}
                              />
                            }
                            label="Enable Barcode Scanning"
                          />
                        </Grid>
                      </Grid>
                    </CardContent>
                  </StyledCard>
                </Slide>

                <Slide direction="up" in timeout={800}>
                  <StyledCard sx={{ mb: 4 }}>
                    <CardContent>
                      <Box display="flex" alignItems="center" mb={2}>
                        <InventoryIcon sx={{ mr: 1, color: "primary.main" }} />
                        <Typography variant="h6">Inventory Settings</Typography>
                      </Box>
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                          <FormControlLabel
                            control={
                              <Switch
                                name="enableStockAlerts"
                                checked={values.enableStockAlerts}
                                onChange={handleChange}
                              />
                            }
                            label="Enable Stock Alerts"
                          />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <StyledField
                            as={TextField}
                            fullWidth
                            type="number"
                            name="lowStockThreshold"
                            label="Low Stock Threshold"
                            variant="outlined"
                            value={values.lowStockThreshold}
                            onChange={handleChange}
                          />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <FormControlLabel
                            control={
                              <Switch
                                name="enableCustomerLoyalty"
                                checked={values.enableCustomerLoyalty}
                                onChange={handleChange}
                              />
                            }
                            label="Enable Customer Loyalty Program"
                          />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <StyledField
                            as={TextField}
                            fullWidth
                            type="number"
                            name="loyaltyPointsRate"
                            label="Loyalty Points Rate"
                            variant="outlined"
                            value={values.loyaltyPointsRate}
                            onChange={handleChange}
                          />
                        </Grid>
                      </Grid>
                    </CardContent>
                  </StyledCard>
                </Slide>

                <Slide direction="up" in timeout={800}>
                  <StyledCard sx={{ mb: 4 }}>
                    <CardContent>
                      <Box display="flex" alignItems="center" mb={2}>
                        <PaymentIcon sx={{ mr: 1, color: "primary.main" }} />
                        <Typography variant="h6">Payment Settings</Typography>
                      </Box>
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                          <FormControlLabel
                            control={
                              <Switch
                                name="enableDiscounts"
                                checked={values.enableDiscounts}
                                onChange={handleChange}
                              />
                            }
                            label="Enable Discounts"
                          />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <StyledField
                            as={TextField}
                            fullWidth
                            type="number"
                            name="defaultTaxRate"
                            label="Default Tax Rate (%)"
                            variant="outlined"
                            value={values.defaultTaxRate}
                            onChange={handleChange}
                          />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <FormControlLabel
                            control={
                              <Switch
                                name="enableMultipleTaxRates"
                                checked={values.enableMultipleTaxRates}
                                onChange={handleChange}
                              />
                            }
                            label="Enable Multiple Tax Rates"
                          />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <FormControlLabel
                            control={
                              <Switch
                                name="enableCashDrawer"
                                checked={values.enableCashDrawer}
                                onChange={handleChange}
                              />
                            }
                            label="Enable Cash Drawer"
                          />
                        </Grid>
                      </Grid>
                    </CardContent>
                  </StyledCard>
                </Slide>

                <Slide direction="up" in timeout={800}>
                  <StyledCard sx={{ mb: 4 }}>
                    <CardContent>
                      <Box display="flex" alignItems="center" mb={2}>
                        <BackupIcon sx={{ mr: 1, color: "primary.main" }} />
                        <Typography variant="h6">Backup & Security</Typography>
                      </Box>
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                          <FormControl fullWidth>
                            <InputLabel>Backup Frequency</InputLabel>
                            <Select
                              name="backupFrequency"
                              value={values.backupFrequency}
                              onChange={handleChange}
                              label="Backup Frequency">
                              <MenuItem value="daily">Daily</MenuItem>
                              <MenuItem value="weekly">Weekly</MenuItem>
                              <MenuItem value="monthly">Monthly</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <FormControlLabel
                            control={
                              <Switch
                                name="enableAutoBackup"
                                checked={values.enableAutoBackup}
                                onChange={handleChange}
                              />
                            }
                            label="Enable Auto Backup"
                          />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <FormControlLabel
                            control={
                              <Switch
                                name="enableOfflineMode"
                                checked={values.enableOfflineMode}
                                onChange={handleChange}
                              />
                            }
                            label="Enable Offline Mode"
                          />
                        </Grid>
                      </Grid>
                    </CardContent>
                  </StyledCard>
                </Slide>

                {canManageUsers && (
                  <Slide direction="up" in timeout={800}>
                    <StyledCard sx={{ mb: 4 }}>
                      <CardContent>
                        <Box display="flex" alignItems="center" mb={2}>
                          <PeopleIcon sx={{ mr: 1, color: "primary.main" }} />
                          <Typography variant="h6">
                            Employee Management
                          </Typography>
                        </Box>
                        <Grid container spacing={2}>
                          <Grid item xs={12}>
                            <Button
                              variant="contained"
                              color="primary"
                              startIcon={<PersonAdd />}
                              onClick={() => navigate("/employee/new")}
                              fullWidth>
                              Add New Employee
                            </Button>
                          </Grid>
                          <Grid item xs={12}>
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
                  </Slide>
                )}

                {canManageSettings && (
                  <>
                    <Slide direction="up" in timeout={800}>
                      <StyledCard sx={{ mb: 4 }}>
                        <CardContent>
                          <Box display="flex" alignItems="center" mb={2}>
                            <PeopleIcon sx={{ mr: 1, color: "primary.main" }} />
                            <Typography variant="h6">
                              Customer Management
                            </Typography>
                          </Box>
                          <Grid container spacing={2}>
                            <Grid item xs={12}>
                              <Button
                                variant="outlined"
                                color="primary"
                                startIcon={<PeopleIcon />}
                                onClick={() => navigate("/customers")}
                                fullWidth>
                                Manage Customers
                              </Button>
                            </Grid>
                          </Grid>
                        </CardContent>
                      </StyledCard>
                    </Slide>

                    <Slide direction="up" in timeout={800}>
                      <StyledCard sx={{ mb: 4 }}>
                        <CardContent>
                          <Box display="flex" alignItems="center" mb={2}>
                            <PeopleIcon sx={{ mr: 1, color: "primary.main" }} />
                            <Typography variant="h6">
                              Supplier Management
                            </Typography>
                          </Box>
                          <Grid container spacing={2}>
                            <Grid item xs={12}>
                              <Button
                                variant="outlined"
                                color="primary"
                                startIcon={<PeopleIcon />}
                                onClick={() => navigate("/suppliers")}
                                fullWidth>
                                Manage Suppliers
                              </Button>
                            </Grid>
                          </Grid>
                        </CardContent>
                      </StyledCard>
                    </Slide>

                    <Slide direction="up" in timeout={800}>
                      <StyledCard sx={{ mb: 4 }}>
                        <CardContent>
                          <Box display="flex" alignItems="center" mb={2}>
                            <LocalOfferIcon
                              sx={{ mr: 1, color: "primary.main" }}
                            />
                            <Typography variant="h6">
                              Product Settings
                            </Typography>
                          </Box>
                          <Grid container spacing={2}>
                            <Grid item xs={12}>
                              <Typography variant="subtitle1" gutterBottom>
                                Allowed Units
                              </Typography>
                              <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
                                <TextField
                                  size="small"
                                  value={newUnit}
                                  onChange={(e) => setNewUnit(e.target.value)}
                                  placeholder="Add new unit"
                                  fullWidth
                                />
                                <Button
                                  variant="contained"
                                  onClick={async () => {
                                    if (newUnit.trim()) {
                                      const trimmedUnit = newUnit
                                        .trim()
                                        .toLowerCase();
                                      const updatedUnits = [
                                        ...(values.allowedUnits || []),
                                        trimmedUnit,
                                      ];
                                      setFieldValue(
                                        "allowedUnits",
                                        updatedUnits
                                      );
                                      setNewUnit("");

                                      // Save changes immediately
                                      try {
                                        const submissionData = {
                                          companyId,
                                          allowedUnits: updatedUnits,
                                          allowedCategories:
                                            values.allowedCategories || [],
                                        };
                                        await tableActions.updateCompanyData(
                                          submissionData
                                        );
                                        dispatch(
                                          ActionCreators.addAllowedUnit(
                                            trimmedUnit
                                          )
                                        );
                                        dispatch(
                                          ActionCreators.fetchCompanySuccess({
                                            id: companyId,
                                            ...company,
                                            allowedUnits: updatedUnits,
                                          })
                                        );
                                        setSnackbarMessage(
                                          "Units updated successfully!"
                                        );
                                        setOpen(true);
                                      } catch (error) {
                                        console.error(error);
                                        setSnackbarMessage(
                                          "Failed to update units. Please try again."
                                        );
                                        setOpen(true);
                                      }
                                    }
                                  }}>
                                  <AddIcon />
                                </Button>
                              </Box>
                              <Box
                                sx={{
                                  display: "flex",
                                  flexWrap: "wrap",
                                  gap: 1,
                                }}>
                                {values.allowedUnits?.map((unit, index) => (
                                  <Chip
                                    key={index}
                                    label={unit}
                                    onDelete={async () => {
                                      try {
                                        const newUnits =
                                          values.allowedUnits.filter(
                                            (u) => u !== unit
                                          );
                                        setFieldValue("allowedUnits", newUnits);

                                        const submissionData = {
                                          companyId,
                                          allowedUnits: newUnits,
                                          allowedCategories:
                                            values.allowedCategories || [],
                                        };
                                        await tableActions.updateCompanyData(
                                          submissionData
                                        );
                                        dispatch(
                                          ActionCreators.removeAllowedUnit(unit)
                                        );
                                        dispatch(
                                          ActionCreators.fetchCompanySuccess({
                                            id: companyId,
                                            ...company,
                                            allowedUnits: newUnits,
                                          })
                                        );
                                        setSnackbarMessage(
                                          "Unit removed successfully!"
                                        );
                                        setOpen(true);
                                      } catch (error) {
                                        console.error(error);
                                        setSnackbarMessage(
                                          "Failed to remove unit. Please try again."
                                        );
                                        setOpen(true);
                                      }
                                    }}
                                  />
                                ))}
                              </Box>
                            </Grid>

                            <Grid item xs={12}>
                              <Typography variant="subtitle1" gutterBottom>
                                Allowed Categories
                              </Typography>
                              <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
                                <TextField
                                  size="small"
                                  value={newCategory}
                                  onChange={(e) =>
                                    setNewCategory(e.target.value)
                                  }
                                  placeholder="Add new category"
                                  fullWidth
                                />
                                <Button
                                  variant="contained"
                                  onClick={async () => {
                                    if (newCategory.trim()) {
                                      const trimmedCategory = newCategory
                                        .trim()
                                        .toLowerCase();
                                      const updatedCategories = [
                                        ...(values.allowedCategories || []),
                                        trimmedCategory,
                                      ];
                                      setFieldValue(
                                        "allowedCategories",
                                        updatedCategories
                                      );
                                      setNewCategory("");

                                      // Save changes immediately
                                      try {
                                        const submissionData = {
                                          companyId,
                                          allowedUnits:
                                            values.allowedUnits || [],
                                          allowedCategories: updatedCategories,
                                        };
                                        await tableActions.updateCompanyData(
                                          submissionData
                                        );
                                        dispatch(
                                          ActionCreators.addAllowedCategory(
                                            trimmedCategory
                                          )
                                        );
                                        dispatch(
                                          ActionCreators.fetchCompanySuccess({
                                            id: companyId,
                                            ...company,
                                            allowedCategories:
                                              updatedCategories,
                                          })
                                        );
                                        setSnackbarMessage(
                                          "Categories updated successfully!"
                                        );
                                        setOpen(true);
                                      } catch (error) {
                                        console.error(error);
                                        setSnackbarMessage(
                                          "Failed to update categories. Please try again."
                                        );
                                        setOpen(true);
                                      }
                                    }
                                  }}>
                                  <AddIcon />
                                </Button>
                              </Box>
                              <Box
                                sx={{
                                  display: "flex",
                                  flexWrap: "wrap",
                                  gap: 1,
                                }}>
                                {values.allowedCategories?.map(
                                  (category, index) => (
                                    <Chip
                                      key={index}
                                      label={category}
                                      onDelete={async () => {
                                        try {
                                          const newCategories =
                                            values.allowedCategories.filter(
                                              (c) => c !== category
                                            );
                                          setFieldValue(
                                            "allowedCategories",
                                            newCategories
                                          );

                                          const submissionData = {
                                            companyId,
                                            allowedUnits:
                                              values.allowedUnits || [],
                                            allowedCategories: newCategories,
                                          };
                                          await tableActions.updateCompanyData(
                                            submissionData
                                          );
                                          dispatch(
                                            ActionCreators.removeAllowedCategory(
                                              category
                                            )
                                          );
                                          dispatch(
                                            ActionCreators.fetchCompanySuccess({
                                              id: companyId,
                                              ...company,
                                              allowedCategories: newCategories,
                                            })
                                          );
                                          setSnackbarMessage(
                                            "Category removed successfully!"
                                          );
                                          setOpen(true);
                                        } catch (error) {
                                          console.error(error);
                                          setSnackbarMessage(
                                            "Failed to remove category. Please try again."
                                          );
                                          setOpen(true);
                                        }
                                      }}
                                    />
                                  )
                                )}
                              </Box>
                            </Grid>
                          </Grid>
                        </CardContent>
                      </StyledCard>
                    </Slide>
                  </>
                )}

                <Fade in timeout={1000}>
                  <Box mt={3}>
                    <StyledButton
                      type="submit"
                      variant="contained"
                      color="primary"
                      fullWidth
                      size="large"
                      startIcon={<SettingsIcon />}
                      disabled={!canManageSettings}>
                      Save Changes
                    </StyledButton>
                    {errors.submit && (
                      <Typography color="error" variant="body2" sx={{ mt: 1 }}>
                        {errors.submit}
                      </Typography>
                    )}
                  </Box>
                </Fade>
              </Form>
            )}
          </Formik>
        </Container>
        <Snackbar
          open={open}
          autoHideDuration={2000}
          onClose={handleSnackbarClose}
          message={snackbarMessage}
          anchorOrigin={{ vertical: "top", horizontal: "center" }}
          TransitionComponent={Slide}
        />
      </div>
    </ErrorBoundary>
  );
};

export default Settings;
