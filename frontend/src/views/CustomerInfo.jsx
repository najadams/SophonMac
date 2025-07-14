import React from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { API_BASE_URL } from '../config';
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
  padding: theme.spacing(3),
  borderRadius: "16px",
  boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
}));

const InfoCard = styled(Card)(({ theme }) => ({
  height: "100%",
  borderRadius: "12px",
  boxShadow: "0 4px 16px rgba(0, 0, 0, 0.08)",
  transition: "transform 0.2s ease-in-out",
  "&:hover": {
    transform: "translateY(-4px)",
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
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
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
      sx={{ mt: 4, mb: 4, height: "calc(100vh - 120px)", overflow: "auto" }}>
      <Box sx={{ mb: 3 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate("/customers")}
          sx={{ mb: 2 }}>
          Back to Customers
        </Button>
        <Typography variant="h4" component="h1" gutterBottom>
          {capitalizeFirstLetter(displayCustomer?.company)} {capitalizeFirstLetter(displayCustomer?.name)}- Customer Details
        </Typography>
      </Box>

      {/* Customer Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <InfoCard>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                <SummaryIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Total Purchases</Typography>
              </Box>
              <Typography variant="h4" color="primary">
                {formatCurrency(displayCustomer?.totalPurchases)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
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
              <Typography variant="h4" color="success.main">
                {formatCurrency(displayCustomer?.totalPaid)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
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
              <Typography variant="h4" color="error.main">
                {formatCurrency(displayCustomer?.totalDebt)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {displayCustomer?.pendingDebts || 0} pending debts
              </Typography>
            </CardContent>
          </InfoCard>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <InfoCard>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                <CalendarTodayIcon color="info" sx={{ mr: 1 }} />
                <Typography variant="h6">Last Purchase</Typography>
              </Box>
              <Typography variant="body1" color="info.main">
                {displayCustomer?.lastPurchaseDate
                  ? formatDate(displayCustomer.lastPurchaseDate)
                  : "No purchases yet"}
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
              <Typography variant="h4" color="warning.main">
                {formatCurrency(discountSummary.totalDiscounts)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {discountSummary.discountCount} discount transactions
              </Typography>
            </CardContent>
          </InfoCard>
        </Grid>
      </Grid>

      {/* Tabs Section */}
      <StyledPaper>
        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            aria-label="customer info tabs">
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
                        <Typography variant="subtitle2" color="text.secondary">
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
                        <Typography variant="subtitle2" color="text.secondary">
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
          </Grid>
        </TabPanel>

        {/* Receipts Tab */}
        <TabPanel value={tabValue} index={1}>
          {receipts.length > 0 ? (
            <TableContainer>
              <Table>
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
                    <TableCell>
                      Status
                    </TableCell>
                    <TableCell>
                      <ShoppingCartIcon
                        sx={{ mr: 1, verticalAlign: "middle" }}
                      />
                      Items
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {receipts.map((receipt) => (
                    <TableRow 
                      key={receipt.id}
                      sx={{
                        backgroundColor: receipt.flagged ? '#ffebee' : 'inherit',
                        '&:hover': {
                          backgroundColor: receipt.flagged ? '#ffcdd2' : 'rgba(0, 0, 0, 0.04)'
                        }
                      }}
                    >
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
                          icon={receipt.flagged ? <span>🚩</span> : <span>✓</span>}
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
                    </TableRow>
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
                  {debts.map((debt) => (
                    <TableRow key={debt.id}>
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
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Box sx={{ textAlign: "center", py: 4 }}>
              <DebtIcon sx={{ fontSize: 64, color: "text.secondary", mb: 2 }} />
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
                  {payments.map((payment) => (
                    <TableRow key={payment.id}>
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
                    </TableRow>
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
              <Box sx={{ mb: 3, p: 2, bgcolor: 'warning.light', borderRadius: 1 }}>
                <Typography variant="h6" color="warning.dark" gutterBottom>
                  Discount Summary
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body1">
                      <strong>Total Discounts Received:</strong> {formatCurrency(discountSummary.totalDiscounts)}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body1">
                      <strong>Number of Discount Transactions:</strong> {discountSummary.discountCount}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
              
              <TableContainer>
                <Table>
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
                      <TableCell>
                        Discount %
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {discounts.map((discount) => {
                      const discountPercentage = discount.total > 0 ? ((discount.discount / discount.total) * 100).toFixed(1) : 0;
                      return (
                        <TableRow key={discount.receiptId}>
                          <TableCell>#{discount.receiptId}</TableCell>
                          <TableCell>{formatDate(discount.createdAt)}</TableCell>
                          <TableCell>
                            <Typography variant="body2" color="warning.dark" fontWeight="bold">
                              {formatCurrency(discount.discount)}
                            </Typography>
                          </TableCell>
                          <TableCell>{formatCurrency(discount.total)}</TableCell>
                          <TableCell>{discount.workerName || "N/A"}</TableCell>
                          <TableCell>
                            <Chip 
                              label={`${discountPercentage}%`} 
                              color="warning" 
                              size="small" 
                            />
                          </TableCell>
                        </TableRow>
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
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                This customer has not received any discounts yet.
              </Typography>
            </Box>
          )}
        </TabPanel>
      </StyledPaper>
    </Container>
  );
};

export default CustomerInfo;