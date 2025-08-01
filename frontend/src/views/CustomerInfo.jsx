import React from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { API_BASE_URL } from '../config';
import { motion } from 'framer-motion';
import {
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Box,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  TextField,
  IconButton,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import EditIcon from "@mui/icons-material/Edit";
import PersonIcon from "@mui/icons-material/Person";
import SaveIcon from "@mui/icons-material/Save";
import CancelIcon from "@mui/icons-material/Cancel";
import PhoneIcon from "@mui/icons-material/Phone";
import EmailIcon from "@mui/icons-material/Email";
import BusinessIcon from "@mui/icons-material/Business";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import ReceiptIcon from "@mui/icons-material/Receipt";
import DebtIcon from "@mui/icons-material/CreditCard";
import PaymentIcon from "@mui/icons-material/Payment";
import SummaryIcon from "@mui/icons-material/Assessment";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import LocalOfferIcon from "@mui/icons-material/LocalOffer";
import { capitalizeFirstLetter, tableActions } from "../config/Functions";

// Removed StyledPaper - using consistent Paper styling from SummaryReports

// Removed InfoCard - using consistent Card styling from SummaryReports

// Tab panel component
function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`customer-tabpanel-${index}`}
      aria-labelledby={`customer-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const CustomerInfo = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const customer = location.state?.customer;
  
  const [tabValue, setTabValue] = useState(0);
  const [customerData, setCustomerData] = useState(null);
  const [receipts, setReceipts] = useState([]);
  const [debts, setDebts] = useState([]);
  const [payments, setPayments] = useState([]);
  const [discounts, setDiscounts] = useState([]);
  const [discountSummary, setDiscountSummary] = useState({ totalDiscounts: 0, discountCount: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingField, setEditingField] = useState(null);
  const [editValues, setEditValues] = useState({});

  const customerId = id || customer?.id;

  useEffect(() => {
    if (customerId) {
      fetchCustomerData();
    }
  }, [customerId]);

  const fetchCustomerData = async () => {
    try {
      setLoading(true);
      const [summaryRes, receiptsRes, debtsRes, paymentsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/customers/${customerId}/summary`),
      fetch(`${API_BASE_URL}/api/customers/${customerId}/receipts`),
      fetch(`${API_BASE_URL}/api/customers/${customerId}/debts`),
      fetch(`${API_BASE_URL}/api/customers/${customerId}/payments`)
      ]);

      if (summaryRes.ok) {
        const summaryData = await summaryRes.json();
        setCustomerData(summaryData.customer);
      }
      
      if (receiptsRes.ok) {
        const receiptsData = await receiptsRes.json();
        setReceipts(receiptsData.receipts || []);
      }
      
      if (debtsRes.ok) {
        const debtsData = await debtsRes.json();
        setDebts(debtsData.debts || []);
      }
      
      if (paymentsRes.ok) {
        const paymentsData = await paymentsRes.json();
        setPayments(paymentsData.payments || []);
      }

      // Fetch discounts
      try {
        const discountData = await tableActions.fetchCustomerDiscounts(customerId);
        setDiscounts(discountData.discounts || []);
        setDiscountSummary({
          totalDiscounts: discountData.totalDiscounts || 0,
          discountCount: discountData.discountCount || 0
        });
      } catch (discountErr) {
        console.error('Error fetching discounts:', discountErr);
        setDiscounts([]);
        setDiscountSummary({ totalDiscounts: 0, discountCount: 0 });
      }
    } catch (err) {
      setError('Failed to fetch customer data');
      console.error('Error fetching customer data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-GH', {
      style: 'currency',
      currency: 'GHS'
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleEditStart = (field, currentValue) => {
    setEditingField(field);
    setEditValues({ [field]: currentValue });
  };

  const handleEditCancel = () => {
    setEditingField(null);
    setEditValues({});
  };

  const handleEditSave = async (field) => {
    try {
      let valueToSave = editValues[field];
      
      // Handle phone numbers as array
      if (field === 'phone') {
        valueToSave = editValues[field]
          .split(',')
          .map(phone => phone.trim())
          .filter(phone => phone.length > 0);
      }

      // Prepare the data object with current customer data plus the updated field
      const updateData = {
        name: displayCustomer.name,
        company: displayCustomer.company,
        address: displayCustomer.address,
        [field]: valueToSave
      };

      const response = await fetch(`${API_BASE_URL}/api/customers/${customerId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData)
      });

      if (response.ok) {
        // Update local state
        setCustomerData(prev => ({
          ...prev,
          [field]: valueToSave
        }));
        setEditingField(null);
        setEditValues({});
        // Refresh customer data to get updated info
        fetchCustomerData();
      } else {
        throw new Error('Failed to update customer');
      }
    } catch (err) {
      console.error('Error updating customer:', err);
      setError('Failed to update customer information');
    }
  };

  const handleEditChange = (field, value) => {
    setEditValues(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (!customerId) {
    return (
      <Box sx={{ p: { xs: 1.5, sm: 2 }, maxWidth: "100%" }}>
        <Paper
          elevation={0}
          sx={{
            p: { xs: 1.5, sm: 2 },
            backgroundColor: "#f8f9fa",
            maxWidth: "100%",
          }}>
          <Typography variant="h6" color="error">
            Customer not found. Please go back and try again.
          </Typography>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate("/customers")}
            sx={{ mt: 2 }}>
            Back to Customers
          </Button>
        </Paper>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box sx={{ p: { xs: 1.5, sm: 2 }, maxWidth: "100%", display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: { xs: 1.5, sm: 2 }, maxWidth: "100%" }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  const displayCustomer = customerData || customer;
  const phoneNumbers = Array.isArray(displayCustomer?.phone) ? displayCustomer.phone : [displayCustomer?.phone].filter(Boolean);
  const emailAddresses = Array.isArray(displayCustomer?.email) ? displayCustomer.email : [displayCustomer?.email].filter(Boolean);

  return (
    <Box sx={{ p: { xs: 0.5, sm: 2 }, pb: { xs: 3, sm: 4 }, maxWidth: "100%", height: "100vh", overflow: "auto" }}>
      <Paper
        elevation={0}
        sx={{
          p: { xs: 1.5, sm: 2 },
          mb: 3,
          backgroundColor: "#f8f9fa",
          maxWidth: "100%",
        }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate("/customers")}
          variant="outlined"
          sx={{
            mb: 2,
            borderRadius: "8px",
            textTransform: "none",
            fontWeight: 600,
          }}>
          Back to Customers
        </Button>
        <Typography
          variant="h4"
          gutterBottom
          sx={{
            fontWeight: 600,
            color: "#1a237e",
            mb: 2,
            fontSize: { xs: "1.25rem", sm: "1.75rem" },
          }}>
          {capitalizeFirstLetter(displayCustomer?.company)}{" "}
          {capitalizeFirstLetter(displayCustomer?.name)} - Customer Details
        </Typography>
      </Paper>

      {/* Customer Summary Cards */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 1.5, sm: 2 },
          mb: 3,
          backgroundColor: "#f8f9fa",
          maxWidth: "100%",
        }}>
        <Typography
          variant="h5"
          sx={{
            fontWeight: 600,
            color: "#1a237e",
            mb: 2,
            fontSize: { xs: "1.1rem", sm: "1.25rem" },
          }}>
          Customer Summary
        </Typography>
        <Grid container spacing={{ xs: 1, sm: 1.5 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card
              elevation={2}
              sx={{
                p: { xs: 1.5, sm: 2 },
                textAlign: "center",
                backgroundColor: "#ffffff",
                borderRadius: "8px",
                transition: "transform 0.2s",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                "&:hover": {
                  transform: "translateY(-3px)",
                  boxShadow: 2,
                },
              }}>
              <Box
                sx={{
                  backgroundColor: "#e3f2fd",
                  borderRadius: "50%",
                  width: { xs: 40, sm: 45 },
                  height: { xs: 40, sm: 45 },
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 8px",
                }}>
                <SummaryIcon
                  color="primary"
                  sx={{ fontSize: { xs: 20, sm: 24 } }}
                />
              </Box>
              <Typography
                variant="h6"
                sx={{
                  color: "#666",
                  mb: 0.5,
                  fontWeight: 500,
                  fontSize: { xs: "0.85rem", sm: "0.9rem" },
                }}>
                Total Purchases
              </Typography>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 700,
                  color: "#1976d2",
                  fontSize: { xs: "1.25rem", sm: "1.5rem" },
                }}>
                {formatCurrency(displayCustomer?.totalPurchases)}
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: "#666",
                  fontWeight: 500,
                }}>
                {displayCustomer?.totalReceipts || 0} receipts
              </Typography>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card
              elevation={2}
              sx={{
                p: { xs: 1.5, sm: 2 },
                textAlign: "center",
                backgroundColor: "#ffffff",
                borderRadius: "8px",
                transition: "transform 0.2s",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                "&:hover": {
                  transform: "translateY(-3px)",
                  boxShadow: 2,
                },
              }}>
              <Box
                sx={{
                  backgroundColor: "#e8f5e9",
                  borderRadius: "50%",
                  width: { xs: 40, sm: 45 },
                  height: { xs: 40, sm: 45 },
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 8px",
                }}>
                <AttachMoneyIcon
                  color="success"
                  sx={{ fontSize: { xs: 20, sm: 24 } }}
                />
              </Box>
              <Typography
                variant="h6"
                sx={{
                  color: "#666",
                  mb: 0.5,
                  fontWeight: 500,
                  fontSize: { xs: "0.85rem", sm: "0.9rem" },
                }}>
                Total Paid
              </Typography>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 700,
                  color: "#2e7d32",
                  fontSize: { xs: "1.25rem", sm: "1.5rem" },
                }}>
                {formatCurrency(displayCustomer?.totalPaid)}
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: "#666",
                  fontWeight: 500,
                }}>
                Payments received
              </Typography>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card
              elevation={2}
              sx={{
                p: { xs: 1.5, sm: 2 },
                textAlign: "center",
                backgroundColor: "#ffffff",
                borderRadius: "8px",
                transition: "transform 0.2s",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                "&:hover": {
                  transform: "translateY(-3px)",
                  boxShadow: 2,
                },
              }}>
              <Box
                sx={{
                  backgroundColor: "#ffebee",
                  borderRadius: "50%",
                  width: { xs: 40, sm: 45 },
                  height: { xs: 40, sm: 45 },
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 8px",
                }}>
                <DebtIcon
                  color="error"
                  sx={{ fontSize: { xs: 20, sm: 24 } }}
                />
              </Box>
              <Typography
                variant="h6"
                sx={{
                  color: "#666",
                  mb: 0.5,
                  fontWeight: 500,
                  fontSize: { xs: "0.85rem", sm: "0.9rem" },
                }}>
                Outstanding Debt
              </Typography>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 700,
                  color: "#d32f2f",
                  fontSize: { xs: "1.25rem", sm: "1.5rem" },
                }}>
                {formatCurrency(displayCustomer?.totalDebt)}
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: "#666",
                  fontWeight: 500,
                }}>
                {displayCustomer?.pendingDebts || 0} pending debts
              </Typography>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card
              elevation={2}
              sx={{
                p: { xs: 1.5, sm: 2 },
                textAlign: "center",
                backgroundColor: "#ffffff",
                borderRadius: "8px",
                transition: "transform 0.2s",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                "&:hover": {
                  transform: "translateY(-3px)",
                  boxShadow: 2,
                },
              }}>
              <Box
                sx={{
                  backgroundColor: "#fff3e0",
                  borderRadius: "50%",
                  width: { xs: 40, sm: 45 },
                  height: { xs: 40, sm: 45 },
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 8px",
                }}>
                <LocalOfferIcon
                  color="warning"
                  sx={{ fontSize: { xs: 20, sm: 24 } }}
                />
              </Box>
              <Typography
                variant="h6"
                sx={{
                  color: "#666",
                  mb: 0.5,
                  fontWeight: 500,
                  fontSize: { xs: "0.85rem", sm: "0.9rem" },
                }}>
                Total Discounts
              </Typography>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 700,
                  color: "#f57c00",
                  fontSize: { xs: "1.25rem", sm: "1.5rem" },
                }}>
                {formatCurrency(discountSummary.totalDiscounts)}
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: "#666",
                  fontWeight: 500,
                }}>
                {discountSummary.discountCount} discount transactions
              </Typography>
            </Card>
          </Grid>
        </Grid>
      </Paper>

      {/* Tabs Section */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 1.5, sm: 2 },
          backgroundColor: "#f8f9fa",
          maxWidth: "100%",
        }}>
        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
            <Tabs
              value={tabValue}
              onChange={handleTabChange}
              aria-label="customer info tabs"
              sx={{
                "& .MuiTab-root": {
                  textTransform: "none",
                  fontWeight: 500,
                  fontSize: "0.9rem",
                  minHeight: "48px",
                  color: "#666",
                  "&.Mui-selected": {
                    color: "#1976d2",
                    fontWeight: 600,
                  },
                },
                "& .MuiTabs-indicator": {
                  backgroundColor: "#1976d2",
                },
              }}>
              <Tab
                icon={<PersonIcon />}
                label="Basic Info"
                id="customer-tab-0"
                aria-controls="customer-tabpanel-0"
              />
              <Tab
                icon={<ReceiptIcon />}
                label={`Receipts (${receipts.length})`}
                id="customer-tab-1"
                aria-controls="customer-tabpanel-1"
              />
              <Tab
                icon={<DebtIcon />}
                label={`Debts (${debts.length})`}
                id="customer-tab-2"
                aria-controls="customer-tabpanel-2"
              />
              <Tab
                icon={<PaymentIcon />}
                label={`Payments (${payments.length})`}
                id="customer-tab-3"
                aria-controls="customer-tabpanel-3"
              />
              <Tab
                icon={<LocalOfferIcon />}
                label={`Discounts (${discounts.length})`}
                id="customer-tab-4"
                aria-controls="customer-tabpanel-4"
              />
            </Tabs>
          </Box>

          {/* Basic Info Tab */}
          <TabPanel value={tabValue} index={0}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={8}>
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6}>
                    <Typography
                      variant="subtitle2"
                      color="text.secondary"
                      gutterBottom>
                      Full Name
                    </Typography>
                    {editingField === 'name' ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <TextField
                          size="small"
                          value={editValues.name || ''}
                          onChange={(e) => handleEditChange('name', e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              handleEditSave('name');
                            } else if (e.key === 'Escape') {
                              handleEditCancel();
                            }
                          }}
                          autoFocus
                        />
                        <IconButton
                          size="small"
                          onClick={() => handleEditSave('name')}
                          color="primary"
                        >
                          <SaveIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={handleEditCancel}
                          color="secondary"
                        >
                          <CancelIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    ) : (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <Typography variant="body1" sx={{ flexGrow: 1 }}>
                          {capitalizeFirstLetter(displayCustomer?.name)}
                        </Typography>
                        <IconButton
                          size="small"
                          onClick={() => handleEditStart('name', displayCustomer?.name)}
                          sx={{ opacity: 0.7, '&:hover': { opacity: 1 } }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    )}
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Typography
                      variant="subtitle2"
                      color="text.secondary"
                      gutterBottom>
                      Customer ID
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                      #{displayCustomer?.id}
                    </Typography>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Typography
                      variant="subtitle2"
                      color="text.secondary"
                      gutterBottom>
                      Company
                    </Typography>
                    {editingField === 'company' ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <TextField
                          size="small"
                          value={editValues.company || ''}
                          onChange={(e) => handleEditChange('company', e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              handleEditSave('company');
                            } else if (e.key === 'Escape') {
                              handleEditCancel();
                            }
                          }}
                          autoFocus
                        />
                        <IconButton
                          size="small"
                          onClick={() => handleEditSave('company')}
                          color="primary"
                        >
                          <SaveIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={handleEditCancel}
                          color="secondary"
                        >
                          <CancelIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    ) : (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <Typography variant="body1" sx={{ flexGrow: 1 }}>
                          {displayCustomer?.company || "Individual Customer"}
                        </Typography>
                        <IconButton
                          size="small"
                          onClick={() => handleEditStart('company', displayCustomer?.company || '')}
                          sx={{ opacity: 0.7, '&:hover': { opacity: 1 } }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    )}
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Typography
                      variant="subtitle2"
                      color="text.secondary"
                      gutterBottom>
                      Loyalty Points
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                      {displayCustomer?.loyaltyPoints || 0}
                    </Typography>
                  </Grid>

                  {displayCustomer?.address && (
                    <Grid item xs={12}>
                      <Typography
                        variant="subtitle2"
                        color="text.secondary"
                        gutterBottom>
                        Address
                      </Typography>
                      <Typography variant="body1" sx={{ mb: 2 }}>
                        {displayCustomer.address}
                      </Typography>
                    </Grid>
                  )}

                  {displayCustomer?.notes && (
                    <Grid item xs={12}>
                      <Typography
                        variant="subtitle2"
                        color="text.secondary"
                        gutterBottom>
                        Notes
                      </Typography>
                      <Typography variant="body1">
                        {displayCustomer.notes}
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              </Grid>

              <Grid item xs={12} md={4}>
                <Card
                  elevation={2}
                  sx={{
                    p: { xs: 1.5, sm: 2 },
                    backgroundColor: "#ffffff",
                    borderRadius: "8px",
                    transition: "transform 0.2s",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    "&:hover": {
                      transform: "translateY(-3px)",
                      boxShadow: 2,
                    },
                  }}>
                  <CardContent>
                    <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                      <PersonIcon color="primary" sx={{ mr: 1 }} />
                      <Typography variant="h6">Contact Information</Typography>
                    </Box>

                    <Box sx={{ mb: 2 }}>
                      <Box
                        sx={{ display: "flex", alignItems: "center", mb: 1, justifyContent: "space-between" }}>
                        <Box sx={{ display: "flex", alignItems: "center" }}>
                          <PhoneIcon
                            fontSize="small"
                            color="primary"
                            sx={{ mr: 1 }}
                          />
                          <Typography
                            variant="subtitle2"
                            color="text.secondary">
                            Phone Numbers
                          </Typography>
                        </Box>
                        <IconButton
                          size="small"
                          onClick={() => handleEditStart('phone', phoneNumbers.join(', '))}
                          sx={{ opacity: 0.7, '&:hover': { opacity: 1 } }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Box>
                      {editingField === 'phone' ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <TextField
                            size="small"
                            fullWidth
                            value={editValues.phone || ''}
                            onChange={(e) => handleEditChange('phone', e.target.value)}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                handleEditSave('phone');
                              } else if (e.key === 'Escape') {
                                handleEditCancel();
                              }
                            }}
                            placeholder="Enter phone numbers separated by commas"
                            autoFocus
                          />
                          <IconButton
                            size="small"
                            onClick={() => handleEditSave('phone')}
                            color="primary"
                          >
                            <SaveIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={handleEditCancel}
                            color="secondary"
                          >
                            <CancelIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      ) : (
                        <List dense>
                          {phoneNumbers.length > 0 ? phoneNumbers.map((phone, index) => (
                            <ListItem key={index} sx={{ px: 0 }}>
                              <ListItemIcon sx={{ minWidth: 32 }}>
                                <PhoneIcon fontSize="small" color="primary" />
                              </ListItemIcon>
                              <ListItemText primary={phone} />
                            </ListItem>
                          )) : (
                            <ListItem sx={{ px: 0 }}>
                              <ListItemText 
                                primary="No phone numbers" 
                                sx={{ color: 'text.secondary', fontStyle: 'italic' }}
                              />
                            </ListItem>
                          )}
                        </List>
                      )}
                    </Box>

                    {emailAddresses.length > 0 && (
                      <Box>
                        <Box
                          sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                          <EmailIcon
                            fontSize="small"
                            color="primary"
                            sx={{ mr: 1 }}
                          />
                          <Typography
                            variant="subtitle2"
                            color="text.secondary">
                            Email Addresses
                          </Typography>
                        </Box>
                        <List dense>
                          {emailAddresses.map((email, index) => (
                            <ListItem key={index} sx={{ px: 0 }}>
                              <ListItemIcon sx={{ minWidth: 32 }}>
                                <EmailIcon fontSize="small" color="primary" />
                              </ListItemIcon>
                              <ListItemText primary={email} />
                            </ListItem>
                          ))}
                        </List>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
          <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
            <CalendarTodayIcon color="info" sx={{ mr: 1 }} />
            <Typography variant="h6">Last Purchase</Typography>
          </Box>
          <Typography variant="body1" color="info.main">
            {displayCustomer?.lastPurchaseDate
              ? formatDate(displayCustomer.lastPurchaseDate)
              : "No purchases yet"}
          </Typography>
        </Grid>
      </Grid>
          </TabPanel>

          {/* Receipts Tab */}
          <TabPanel value={tabValue} index={1}>
            {receipts.length > 0 ? (
              <TableContainer
                sx={{
                  boxShadow:
                    "0 12px 40px rgba(102, 126, 234, 0.15), 0 4px 16px rgba(0, 0, 0, 0.08)",
                  borderRadius: "20px",
                  border: "2px solid transparent",
                  background:
                    "linear-gradient(white, white) padding-box, linear-gradient(135deg, #667eea, #764ba2, #f093fb) border-box",
                  overflow: "hidden",
                  position: "relative",
                  "&::before": {
                    content: '""',
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background:
                      "linear-gradient(135deg, rgba(102, 126, 234, 0.02) 0%, rgba(118, 75, 162, 0.02) 100%)",
                    pointerEvents: "none",
                  },
                }}>
                <Table
                  sx={{
                    "& .MuiTableHead-root": {
                      background:
                        "linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)",
                      position: "relative",
                      "&::after": {
                        content: '""',
                        position: "absolute",
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: "3px",
                        background:
                          "linear-gradient(90deg, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0.6) 50%, rgba(255, 255, 255, 0.3) 100%)",
                      },
                    },
                    "& .MuiTableHead-root .MuiTableCell-root": {
                      color: "white",
                      fontWeight: 700,
                      fontSize: "1.1rem",
                      padding: "24px 20px",
                      borderBottom: "none",
                      textShadow: "0 2px 4px rgba(0, 0, 0, 0.2)",
                      position: "relative",
                    },
                    "& .MuiTableBody-root .MuiTableCell-root": {
                      padding: "20px",
                      borderBottom: "1px solid rgba(102, 126, 234, 0.08)",
                      fontSize: "0.95rem",
                      transition: "all 0.3s ease",
                    },
                  }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>
                        <ReceiptIcon sx={{ mr: 1, verticalAlign: "middle" }} />
                        Receipt ID
                      </TableCell>
                      <TableCell>
                        <CalendarTodayIcon
                          sx={{ mr: 1, verticalAlign: "middle" }}
                        />
                        Date
                      </TableCell>
                      <TableCell>
                        <AttachMoneyIcon
                          sx={{ mr: 1, verticalAlign: "middle" }}
                        />
                        Total
                      </TableCell>
                      <TableCell>
                        <PaymentIcon sx={{ mr: 1, verticalAlign: "middle" }} />
                        Amount Paid
                      </TableCell>
                      <TableCell>
                        <AccountBalanceIcon
                          sx={{ mr: 1, verticalAlign: "middle" }}
                        />
                        Balance
                      </TableCell>
                      <TableCell>
                        <PersonIcon sx={{ mr: 1, verticalAlign: "middle" }} />
                        Served By
                      </TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>
                        <ShoppingCartIcon
                          sx={{ mr: 1, verticalAlign: "middle" }}
                        />
                        Items
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {receipts.map((receipt, index) => (
                      <motion.tr
                        key={receipt.id}
                        component={TableRow}
                        initial={{ opacity: 0, x: -30, scale: 0.95 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        transition={{
                          duration: 0.4,
                          delay: index * 0.08,
                          type: "spring",
                          stiffness: 100,
                        }}
                        sx={{
                          backgroundColor: receipt.flagged
                            ? "rgba(239, 68, 68, 0.05)"
                            : "inherit",
                          transition:
                            "all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
                          borderRadius: "12px",
                          margin: "4px 0",
                          cursor: "pointer",
                          "&:hover": {
                            backgroundColor: receipt.flagged
                              ? "rgba(239, 68, 68, 0.1)"
                              : "rgba(102, 126, 234, 0.06)",
                            transform: "translateX(12px) scale(1.01)",
                            boxShadow:
                              "0 8px 25px rgba(102, 126, 234, 0.2), 0 4px 12px rgba(0, 0, 0, 0.1)",
                            "& .MuiTableCell-root": {
                              color: "#667eea",
                              fontWeight: 600,
                            },
                          },
                        }}>
                        <TableCell>#{receipt.id}</TableCell>
                        <TableCell>{formatDate(receipt.createdAt)}</TableCell>
                        <TableCell>{formatCurrency(receipt.total)}</TableCell>
                        <TableCell>
                          {formatCurrency(receipt.amountPaid)}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={formatCurrency(receipt.balance)}
                            color={receipt.balance > 0 ? "error" : "success"}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{receipt.workerName || "N/A"}</TableCell>
                        <TableCell>
                          <Chip
                            label={receipt.flagged ? "Flagged" : "Active"}
                            color={receipt.flagged ? "error" : "success"}
                            size="small"
                            icon={
                              receipt.flagged ? <span>🚩</span> : <span>✓</span>
                            }
                          />
                        </TableCell>
                        <TableCell>
                          {receipt.items.length > 0 && (
                            <Accordion>
                              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                <Typography variant="body2">
                                  {receipt.items.length} items
                                </Typography>
                              </AccordionSummary>
                              <AccordionDetails>
                                {receipt.items.map((item, index) => (
                                  <Box key={index} sx={{ mb: 1 }}>
                                    <Typography variant="body2">
                                      {item.name} - Qty: {item.quantity} @{" "}
                                      {formatCurrency(item.salesPrice)}
                                    </Typography>
                                  </Box>
                                ))}
                              </AccordionDetails>
                            </Accordion>
                          )}
                        </TableCell>
                      </motion.tr>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Box sx={{ textAlign: "center", py: 4 }}>
                <ReceiptIcon
                  sx={{ fontSize: 64, color: "text.secondary", mb: 2 }}
                />
                <Typography variant="h6" color="text.secondary">
                  No receipts found
                </Typography>
              </Box>
            )}
          </TabPanel>

          {/* Debts Tab */}
          <TabPanel value={tabValue} index={2}>
            {debts.length > 0 ? (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>
                        <DebtIcon sx={{ mr: 1, verticalAlign: "middle" }} />
                        Debt ID
                      </TableCell>
                      <TableCell>
                        <CalendarTodayIcon
                          sx={{ mr: 1, verticalAlign: "middle" }}
                        />
                        Created
                      </TableCell>
                      <TableCell>
                        <AttachMoneyIcon
                          sx={{ mr: 1, verticalAlign: "middle" }}
                        />
                        Amount
                      </TableCell>
                      <TableCell>
                        <AccountBalanceIcon
                          sx={{ mr: 1, verticalAlign: "middle" }}
                        />
                        Status
                      </TableCell>
                      <TableCell>
                        <CalendarTodayIcon
                          sx={{ mr: 1, verticalAlign: "middle" }}
                        />
                        Due Date
                      </TableCell>
                      <TableCell>
                        <ReceiptIcon sx={{ mr: 1, verticalAlign: "middle" }} />
                        Related Receipt
                      </TableCell>
                      <TableCell>
                        <PaymentIcon sx={{ mr: 1, verticalAlign: "middle" }} />
                        Payments
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {debts.map((debt, index) => (
                      <motion.tr
                        key={debt.id}
                        component={TableRow}
                        initial={{ opacity: 0, x: -30, scale: 0.95 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        transition={{
                          duration: 0.4,
                          delay: index * 0.08,
                          type: "spring",
                          stiffness: 100,
                        }}
                        sx={{
                          transition:
                            "all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
                          borderRadius: "12px",
                          margin: "4px 0",
                          cursor: "pointer",
                          "&:hover": {
                            backgroundColor: "rgba(239, 68, 68, 0.06)",
                            transform: "translateX(12px) scale(1.01)",
                            boxShadow:
                              "0 8px 25px rgba(239, 68, 68, 0.2), 0 4px 12px rgba(0, 0, 0, 0.1)",
                            "& .MuiTableCell-root": {
                              color: "#ef4444",
                              fontWeight: 600,
                            },
                          },
                        }}>
                        <TableCell>#{debt.id}</TableCell>
                        <TableCell>{formatDate(debt.createdAt)}</TableCell>
                        <TableCell>{formatCurrency(debt.amount)}</TableCell>
                        <TableCell>
                          <Chip
                            label={debt.status}
                            color={
                              debt.status === "pending" ? "error" : "success"
                            }
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          {debt.dueDate ? formatDate(debt.dueDate) : "N/A"}
                        </TableCell>
                        <TableCell>
                          {debt.receiptId ? (
                            <Box>
                              <Typography variant="body2">
                                #{debt.receiptId}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary">
                                {formatCurrency(debt.receiptTotal)} on{" "}
                                {formatDate(debt.receiptDate)}
                              </Typography>
                            </Box>
                          ) : (
                            "N/A"
                          )}
                        </TableCell>
                        <TableCell>
                          {debt.payments.length > 0 && (
                            <Accordion>
                              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                <Typography variant="body2">
                                  {debt.payments.length} payments
                                </Typography>
                              </AccordionSummary>
                              <AccordionDetails>
                                {debt.payments.map((payment, index) => (
                                  <Box key={index} sx={{ mb: 1 }}>
                                    <Typography variant="body2">
                                      {formatCurrency(payment.amountPaid)} on{" "}
                                      {formatDate(payment.date)}
                                    </Typography>
                                    <Typography
                                      variant="caption"
                                      color="text.secondary">
                                      {payment.paymentMethod} -{" "}
                                      {payment.workerName}
                                    </Typography>
                                  </Box>
                                ))}
                              </AccordionDetails>
                            </Accordion>
                          )}
                        </TableCell>
                      </motion.tr>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Box sx={{ textAlign: "center", py: 4 }}>
                <DebtIcon
                  sx={{ fontSize: 64, color: "text.secondary", mb: 2 }}
                />
                <Typography variant="h6" color="text.secondary">
                  No debts found
                </Typography>
              </Box>
            )}
          </TabPanel>

          {/* Payments Tab */}
          <TabPanel value={tabValue} index={3}>
            {payments.length > 0 ? (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>
                        <PaymentIcon sx={{ mr: 1, verticalAlign: "middle" }} />
                        Payment ID
                      </TableCell>
                      <TableCell>
                        <CalendarTodayIcon
                          sx={{ mr: 1, verticalAlign: "middle" }}
                        />
                        Date
                      </TableCell>
                      <TableCell>
                        <AttachMoneyIcon
                          sx={{ mr: 1, verticalAlign: "middle" }}
                        />
                        Amount
                      </TableCell>
                      <TableCell>
                        <AccountBalanceIcon
                          sx={{ mr: 1, verticalAlign: "middle" }}
                        />
                        Method
                      </TableCell>
                      <TableCell>
                        <PersonIcon sx={{ mr: 1, verticalAlign: "middle" }} />
                        Processed By
                      </TableCell>
                      <TableCell>
                        <DebtIcon sx={{ mr: 1, verticalAlign: "middle" }} />
                        Debt Info
                      </TableCell>
                      <TableCell>
                        <ReceiptIcon sx={{ mr: 1, verticalAlign: "middle" }} />
                        Receipt Info
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {payments.map((payment, index) => (
                      <motion.tr
                        key={payment.id}
                        component={TableRow}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        sx={{
                          transition: "all 0.2s ease",
                          "&:hover": {
                            backgroundColor: "rgba(102, 126, 234, 0.08)",
                            transform: "scale(1.01)",
                            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                          },
                        }}>
                        <TableCell>#{payment.id}</TableCell>
                        <TableCell>{formatDate(payment.date)}</TableCell>
                        <TableCell>
                          {formatCurrency(payment.amountPaid)}
                        </TableCell>
                        <TableCell>
                          <Chip label={payment.paymentMethod} size="small" />
                        </TableCell>
                        <TableCell>{payment.workerName || "N/A"}</TableCell>
                        <TableCell>
                          <Box>
                            <Typography variant="body2">
                              Debt: {formatCurrency(payment.debtAmount)}
                            </Typography>
                            <Chip
                              label={payment.debtStatus}
                              color={
                                payment.debtStatus === "pending"
                                  ? "error"
                                  : "success"
                              }
                              size="small"
                            />
                          </Box>
                        </TableCell>
                        <TableCell>
                          {payment.receiptTotal && (
                            <Box>
                              <Typography variant="body2">
                                {formatCurrency(payment.receiptTotal)}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary">
                                {formatDate(payment.receiptDate)}
                              </Typography>
                            </Box>
                          )}
                        </TableCell>
                      </motion.tr>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Box sx={{ textAlign: "center", py: 4 }}>
                <PaymentIcon
                  sx={{ fontSize: 64, color: "text.secondary", mb: 2 }}
                />
                <Typography variant="h6" color="text.secondary">
                  No payments found
                </Typography>
              </Box>
            )}
          </TabPanel>

          {/* Discounts Tab */}
          <TabPanel value={tabValue} index={4}>
            {discounts.length > 0 ? (
              <>
                <Box
                  sx={{
                    mb: 3,
                    p: 2,
                    bgcolor: "warning.light",
                    borderRadius: 1,
                  }}>
                  <Typography variant="h6" color="warning.dark" gutterBottom>
                    Discount Summary
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body1">
                        <strong>Total Discounts Received:</strong>{" "}
                        {formatCurrency(discountSummary.totalDiscounts)}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body1">
                        <strong>Number of Discount Transactions:</strong>{" "}
                        {discountSummary.discountCount}
                      </Typography>
                    </Grid>
                  </Grid>
                </Box>

                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>
                          <ReceiptIcon
                            sx={{ mr: 1, verticalAlign: "middle" }}
                          />
                          Receipt ID
                        </TableCell>
                        <TableCell>
                          <CalendarTodayIcon
                            sx={{ mr: 1, verticalAlign: "middle" }}
                          />
                          Date
                        </TableCell>
                        <TableCell>
                          <LocalOfferIcon
                            sx={{ mr: 1, verticalAlign: "middle" }}
                          />
                          Discount Amount
                        </TableCell>
                        <TableCell>
                          <AttachMoneyIcon
                            sx={{ mr: 1, verticalAlign: "middle" }}
                          />
                          Receipt Total
                        </TableCell>
                        <TableCell>
                          <PersonIcon sx={{ mr: 1, verticalAlign: "middle" }} />
                          Processed By
                        </TableCell>
                        <TableCell>Discount %</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {discounts.map((discount, index) => {
                        const discountPercentage =
                          discount.total > 0
                            ? (
                                (discount.discount / discount.total) *
                                100
                              ).toFixed(1)
                            : 0;
                        return (
                          <motion.tr
                            key={discount.receiptId}
                            component={TableRow}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3, delay: index * 0.05 }}
                            sx={{
                              transition: "all 0.2s ease",
                              "&:hover": {
                                backgroundColor: "rgba(102, 126, 234, 0.08)",
                                transform: "scale(1.01)",
                                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                              },
                            }}>
                            <TableCell>#{discount.receiptId}</TableCell>
                            <TableCell>
                              {formatDate(discount.createdAt)}
                            </TableCell>
                            <TableCell>
                              <Typography
                                variant="body2"
                                color="warning.dark"
                                fontWeight="bold">
                                {formatCurrency(discount.discount)}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              {formatCurrency(discount.total)}
                            </TableCell>
                            <TableCell>
                              {discount.workerName || "N/A"}
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={`${discountPercentage}%`}
                                color="warning"
                                size="small"
                              />
                            </TableCell>
                          </motion.tr>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            ) : (
              <Box sx={{ textAlign: "center", py: 4 }}>
                <LocalOfferIcon
                  sx={{ fontSize: 64, color: "text.secondary", mb: 2 }}
                />
                <Typography variant="h6" color="text.secondary">
                  No discounts found
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 1 }}>
                  This customer has not received any discounts yet.
                </Typography>
              </Box>
            )}
          </TabPanel>
        </Paper>
    </Box>
  );
};

export default CustomerInfo;