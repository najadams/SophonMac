import React from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { API_BASE_URL } from '../config';
import { motion } from 'framer-motion';
import {
  Container,
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
} from "@mui/material";
import { styled } from "@mui/material/styles";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import EditIcon from "@mui/icons-material/Edit";
import PersonIcon from "@mui/icons-material/Person";
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

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(5),
  borderRadius: "32px",
  boxShadow: "0 32px 80px rgba(102, 126, 234, 0.2), 0 16px 40px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.8)",
  background: 'white',
  border: "2px solid transparent",
  backgroundClip: "padding-box",
  backdropFilter: "blur(30px) saturate(180%)",
  position: "relative",
  overflow: "hidden",
  transition: "all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
  "&::before": {
    content: '""',
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    // background: "linear-gradient(135deg, rgba(102, 126, 234, 0.03) 0%, rgba(118, 75, 162, 0.03) 50%, rgba(240, 147, 251, 0.03) 100%)",
    pointerEvents: "none",
  },
  "&::after": {
    content: '""',
    position: "absolute",
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: "34px",
    zIndex: -1,
    opacity: 0.6,
  },
  "&:hover": {
    transform: "translateY(-4px)",
    boxShadow: "0 40px 100px rgba(102, 126, 234, 0.3), 0 20px 50px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.9)",
  },
}));

const InfoCard = styled(Card)(({ theme }) => ({
  height: "100%",
  borderRadius: "24px",
  boxShadow: "0 16px 50px rgba(102, 126, 234, 0.15), 0 6px 20px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.7)",
  transition: "all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
  background: "linear-gradient(145deg, #ffffff 0%, #fafbff 40%, #f8fafc 80%, #f1f5f9 100%)",
  border: "1px solid rgba(102, 126, 234, 0.12)",
  position: "relative",
  overflow: "hidden",
  "&::before": {
    content: '""',
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "6px",
    background: "linear-gradient(90deg, #4A90E2 0%, #7BB3F0 30%, #A8D5F2 60%, #C8E6F5 100%)",
    transform: "scaleX(0)",
    transformOrigin: "left",
    transition: "transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
  },
  "&::after": {
    content: '""',
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "radial-gradient(circle at 50% 50%, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 50%, rgba(240, 147, 251, 0.05) 100%)",
    opacity: 0,
    transition: "opacity 0.5s ease",
    pointerEvents: "none",
  },
  "&:hover": {
    transform: "translateY(-16px) scale(1.03) rotateX(5deg)",
    boxShadow: "0 40px 100px rgba(102, 126, 234, 0.3), 0 20px 50px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.9)",
    "&::before": {
      transform: "scaleX(1)",
    },
    "&::after": {
      opacity: 1,
    },
  },
}));

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

  if (!customerId) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <StyledPaper>
          <Typography variant="h6" color="error">
            Customer not found. Please go back and try again.
          </Typography>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate("/customers")}
            sx={{ mt: 2 }}>
            Back to Customers
          </Button>
        </StyledPaper>
      </Container>
    );
  }

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  const displayCustomer = customerData || customer;
  const phoneNumbers = Array.isArray(displayCustomer?.phone) ? displayCustomer.phone : [displayCustomer?.phone].filter(Boolean);
  const emailAddresses = Array.isArray(displayCustomer?.email) ? displayCustomer.email : [displayCustomer?.email].filter(Boolean);

  return (
    <Container
      maxWidth="xl"
      sx={{
        mt: 4,
        mb: 4,
        height: "calc(100vh - 120px)",
        overflow: "auto",
        position: "relative",
        "&::before": {
          content: '""',
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background:
            "linear-gradient(135deg, rgba(74, 144, 226, 0.02) 0%, rgba(123, 179, 240, 0.02) 25%, rgba(168, 213, 242, 0.02) 50%, rgba(200, 230, 245, 0.02) 75%, rgba(74, 144, 226, 0.02) 100%)",
          backgroundImage: `
            radial-gradient(circle at 20% 20%, rgba(74, 144, 226, 0.06) 0%, transparent 40%),
            radial-gradient(circle at 80% 80%, rgba(123, 179, 240, 0.06) 0%, transparent 40%),
            radial-gradient(circle at 40% 60%, rgba(168, 213, 242, 0.04) 0%, transparent 40%),
            radial-gradient(circle at 60% 40%, rgba(200, 230, 245, 0.04) 0%, transparent 40%),
            linear-gradient(45deg, transparent 30%, rgba(74, 144, 226, 0.015) 50%, transparent 70%),
            linear-gradient(-45deg, transparent 30%, rgba(123, 179, 240, 0.015) 50%, transparent 70%)
          `,
          backgroundSize:
            "100% 100%, 100% 100%, 100% 100%, 100% 100%, 200% 200%, 200% 200%",
          animation: "backgroundShift 20s ease-in-out infinite",
          pointerEvents: "none",
          zIndex: -1,
        },
        "@keyframes backgroundShift": {
          "0%, 100%": {
            backgroundPosition: "0% 0%, 0% 0%, 0% 0%, 0% 0%, 0% 0%, 0% 0%",
          },
          "50%": {
            backgroundPosition:
              "0% 0%, 0% 0%, 0% 0%, 0% 0%, 100% 100%, -100% -100%",
          },
        },
      }}>
      <Box sx={{ mb: 3 }}>
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate("/customers")}
            variant="outlined"
            sx={{
              mb: 2,
              borderRadius: "12px",
              textTransform: "none",
              fontWeight: 600,
              borderColor: "#4A90E2",
              color: "#4A90E2",
              "&:hover": {
                borderColor: "#7BB3F0",
                backgroundColor: "rgba(155, 190, 230, 0.06)",
                transform: "translateY(-2px)",
                boxShadow: "0 4px 12px rgba(74, 144, 226, 0.25)",
              },
              transition: "all 0.3s ease",
            }}>
            Back to Customers
          </Button>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}>
          <Typography
            variant="h4"
            component="h1"
            gutterBottom
            sx={{
              // background: 'linear-gradient(135deg, #4A90E2 0%, #7BB3F0 100%)',
              background: "black",
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              fontWeight: 700,
              letterSpacing: "-0.02em",
            }}>
            {capitalizeFirstLetter(displayCustomer?.company)}{" "}
            {capitalizeFirstLetter(displayCustomer?.name)} - Customer Details
          </Typography>
        </motion.div>
      </Box>

      {/* Customer Summary Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}>
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <InfoCard>
              <CardContent>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    mb: 2,
                    position: "relative",
                    zIndex: 1,
                  }}>
                  <SummaryIcon color="primary" sx={{ mr: 1 }} />
                  <Typography variant="h6">Total Purchases</Typography>
                </Box>
                <Typography
                  variant="h4"
                  sx={{
                    background:
                      "linear-gradient(135deg, #4A90E2 0%, #7BB3F0 100%)",
                    backgroundClip: "text",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    fontWeight: 700,
                    position: "relative",
                    zIndex: 1,
                  }}>
                  {formatCurrency(displayCustomer?.totalPurchases)}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: "rgba(74, 144, 226, 0.7)",
                    fontWeight: 500,
                    position: "relative",
                    zIndex: 1,
                  }}>
                  {displayCustomer?.totalReceipts || 0} receipts
                </Typography>
              </CardContent>
            </InfoCard>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <InfoCard>
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                  <AttachMoneyIcon color="success" sx={{ mr: 1 }} />
                  <Typography variant="h6">Total Paid</Typography>
                </Box>
                <Typography
                  variant="h4"
                  sx={{
                    background:
                      "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                    backgroundClip: "text",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    fontWeight: 700,
                    position: "relative",
                    zIndex: 1,
                  }}>
                  {formatCurrency(displayCustomer?.totalPaid)}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: "rgba(16, 185, 129, 0.7)",
                    fontWeight: 500,
                    position: "relative",
                    zIndex: 1,
                  }}>
                  Payments received
                </Typography>
              </CardContent>
            </InfoCard>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <InfoCard>
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                  <DebtIcon color="error" sx={{ mr: 1 }} />
                  <Typography variant="h6">Outstanding Debt</Typography>
                </Box>
                <Typography
                  variant="h4"
                  sx={{
                    background:
                      "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                    backgroundClip: "text",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    fontWeight: 700,
                    position: "relative",
                    zIndex: 1,
                  }}>
                  {formatCurrency(displayCustomer?.totalDebt)}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: "rgba(239, 68, 68, 0.7)",
                    fontWeight: 500,
                    position: "relative",
                    zIndex: 1,
                  }}>
                  {displayCustomer?.pendingDebts || 0} pending debts
                </Typography>
              </CardContent>
            </InfoCard>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <InfoCard>
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                  <LocalOfferIcon color="warning" sx={{ mr: 1 }} />
                  <Typography variant="h6">Total Discounts</Typography>
                </Box>
                <Typography
                  variant="h4"
                  sx={{
                    background:
                      "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                    backgroundClip: "text",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    fontWeight: 700,
                    position: "relative",
                    zIndex: 1,
                  }}>
                  {formatCurrency(discountSummary.totalDiscounts)}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: "rgba(245, 158, 11, 0.7)",
                    fontWeight: 500,
                    position: "relative",
                    zIndex: 1,
                  }}>
                  {discountSummary.discountCount} discount transactions
                </Typography>
              </CardContent>
            </InfoCard>
          </Grid>
        </Grid>
      </motion.div>

      {/* Tabs Section */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}>
        <StyledPaper>
          <Box
            sx={{
              borderBottom: "2px solid",
              borderImage:
                "linear-gradient(90deg, #667eea 0%, #764ba2 50%, #f093fb 100%) 1",
              position: "relative",
              "&::after": {
                content: '""',
                position: "absolute",
                bottom: "-2px",
                left: 0,
                right: 0,
                height: "2px",
                background:
                  "linear-gradient(90deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)",
              },
            }}>
            <Tabs
              value={tabValue}
              onChange={handleTabChange}
              aria-label="customer info tabs"
              sx={{
                "& .MuiTab-root": {
                  textTransform: "none",
                  fontWeight: 600,
                  fontSize: "1rem",
                  borderRadius: "16px 16px 0 0",
                  margin: "0 6px",
                  padding: "12px 24px",
                  minHeight: "64px",
                  transition:
                    "all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
                  position: "relative",
                  overflow: "hidden",
                  "&::before": {
                    content: '""',
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background:
                      "linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%)",
                    opacity: 0,
                    transition: "opacity 0.3s ease",
                  },
                  "&:hover": {
                    backgroundColor: "rgba(102, 126, 234, 0.1)",
                    transform: "translateY(-3px) scale(1.02)",
                    boxShadow: "0 8px 25px rgba(102, 126, 234, 0.2)",
                    "&::before": {
                      opacity: 1,
                    },
                  },
                  "&.Mui-selected": {
                    background:
                      "linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)",
                    color: "white",
                    transform: "translateY(-3px)",
                    boxShadow:
                      "0 12px 30px rgba(102, 126, 234, 0.3), 0 6px 15px rgba(0, 0, 0, 0.1)",
                    "& .MuiSvgIcon-root": {
                      color: "white",
                      filter: "drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2))",
                    },
                  },
                },
                "& .MuiTabs-indicator": {
                  display: "none",
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
                    <Typography variant="body1" sx={{ mb: 2 }}>
                      {capitalizeFirstLetter(displayCustomer?.name)}
                    </Typography>
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
                    <Typography variant="body1" sx={{ mb: 2 }}>
                      {displayCustomer?.company || "Individual Customer"}
                    </Typography>
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
                <InfoCard>
                  <CardContent>
                    <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                      <PersonIcon color="primary" sx={{ mr: 1 }} />
                      <Typography variant="h6">Contact Information</Typography>
                    </Box>

                    {phoneNumbers.length > 0 && (
                      <Box sx={{ mb: 2 }}>
                        <Box
                          sx={{ display: "flex", alignItems: "center", mb: 1 }}>
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
                        <List dense>
                          {phoneNumbers.map((phone, index) => (
                            <ListItem key={index} sx={{ px: 0 }}>
                              <ListItemIcon sx={{ minWidth: 32 }}>
                                <PhoneIcon fontSize="small" color="primary" />
                              </ListItemIcon>
                              <ListItemText primary={phone} />
                            </ListItem>
                          ))}
                        </List>
                      </Box>
                    )}

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
                </InfoCard>
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
        </StyledPaper>
      </motion.div>
    </Container>
  );
};

export default CustomerInfo;