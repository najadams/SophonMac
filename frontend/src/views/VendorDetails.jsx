import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "react-query";
import { tableActions } from "../config/Functions";
import { API_BASE_URL } from '../config';
import { useSelector } from "react-redux";
import axios from 'axios';
import {
  Container,
  Paper,
  Typography,
  Box,
  Grid,
  Button,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
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
  Collapse,
  IconButton,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
} from "@mui/material";
import {
  Business as BusinessIcon,
  Phone as PhoneIcon,
  Person as PersonIcon,
  ArrowBack as ArrowBackIcon,
  Inventory as InventoryIcon,
  CalendarToday as CalendarIcon,
  AttachMoney as MoneyIcon,
  LocalShipping as ShippingIcon,
  KeyboardArrowDown as KeyboardArrowDownIcon,
  KeyboardArrowUp as KeyboardArrowUpIcon,
  ShoppingCart as ShoppingCartIcon,
  Delete as DeleteIcon,
  Payment as PaymentIcon,
  TrendingUp as TrendingUpIcon,
  AccountBalance as AccountBalanceIcon,
  Receipt as ReceiptIcon,
  Analytics as AnalyticsIcon,
  Warning as WarningIcon,
} from "@mui/icons-material";
import { styled } from "@mui/material/styles";
import Loader from "../components/common/Loader";

// Additional styled components for enhanced aesthetics
const GradientBox = styled(Box)(({ theme }) => ({
  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  borderRadius: "20px",
  padding: theme.spacing(3),
  color: "white",
  position: "relative",
  overflow: "hidden",
  "&::before": {
    content: '""',
    position: "absolute",
    top: "-50%",
    left: "-50%",
    width: "200%",
    height: "200%",
    background: "radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)",
    animation: "float 6s ease-in-out infinite",
  },
  "@keyframes float": {
    "0%, 100%": { transform: "translate(-50%, -50%) rotate(0deg)" },
    "50%": { transform: "translate(-50%, -50%) rotate(180deg)" },
  },
}));

const StatsCard = styled(Card)(({ theme }) => ({
  borderRadius: "16px",
  background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
  boxShadow: "0 8px 24px rgba(0, 0, 0, 0.06)",
  border: "1px solid rgba(226, 232, 240, 0.8)",
  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
  position: "relative",
  overflow: "hidden",
  "&:hover": {
    transform: "translateY(-4px)",
    boxShadow: "0 16px 32px rgba(0, 0, 0, 0.12)",
  },
}));

const AnimatedButton = styled(Button)(({ theme }) => ({
  borderRadius: "12px",
  textTransform: "none",
  fontWeight: 600,
  padding: "12px 24px",
  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
  position: "relative",
  overflow: "hidden",
  "&::before": {
    content: '""',
    position: "absolute",
    top: 0,
    left: "-100%",
    width: "100%",
    height: "100%",
    background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)",
    transition: "left 0.5s",
  },
  "&:hover::before": {
    left: "100%",
  },
}));

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  borderRadius: "20px",
  background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
  boxShadow: "0 20px 40px rgba(0, 0, 0, 0.08), 0 8px 16px rgba(0, 0, 0, 0.04)",
  border: "1px solid rgba(255, 255, 255, 0.2)",
  backdropFilter: "blur(10px)",
  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
  "&:hover": {
    transform: "translateY(-2px)",
    boxShadow: "0 25px 50px rgba(0, 0, 0, 0.12), 0 12px 20px rgba(0, 0, 0, 0.06)",
  },
}));

const InfoCard = styled(Card)(({ theme }) => ({
  height: "100%",
  borderRadius: "16px",
  background: "linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%)",
  boxShadow: "0 8px 24px rgba(0, 0, 0, 0.06), 0 4px 8px rgba(0, 0, 0, 0.04)",
  border: "1px solid rgba(226, 232, 240, 0.8)",
  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
  position: "relative",
  overflow: "hidden",
  "&::before": {
    content: '""',
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "4px",
    background: "linear-gradient(90deg, #3b82f6, #8b5cf6, #06b6d4)",
    opacity: 0,
    transition: "opacity 0.3s ease",
  },
  "&:hover": {
    transform: "translateY(-6px) scale(1.02)",
    boxShadow: "0 20px 40px rgba(0, 0, 0, 0.12), 0 8px 16px rgba(0, 0, 0, 0.08)",
    "&::before": {
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
      id={`vendor-tabpanel-${index}`}
      aria-labelledby={`vendor-tab-${index}`}
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

// Supply row component with expandable details
function SupplyRow({ supply, isExpanded, onToggle, formatCurrency, formatDate, handleOpenPaymentDialog }) {
  const [supplyDetails, setSupplyDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const companyId = useSelector((state) => state.companyState.data.id);

  // Function to determine payment status
  const getPaymentStatus = () => {
    if (!supplyDetails) {
      // If we don't have details yet, check if supply has payment info
      if (supply.status) {
        return supply.status === 'completed' ? 'Completed' : 
               supply.balance > 0 && supply.amountPaid > 0 ? 'Partial' : 'Pending';
      }
      if (supply.balance !== undefined) {
        return supply.balance > 0 ? 'Partial' : 'Completed';
      }
      return 'Pending'; // Default when no payment info available
    }
    
    const balance = supplyDetails.balance || 0;
    const amountPaid = supplyDetails.amountPaid || 0;
    const status = supplyDetails.status || 'pending';
    
    // Check database status first, then calculate based on amounts
    if (status === 'completed' || (balance <= 0 && amountPaid > 0)) {
      return 'Completed';
    } else if (amountPaid > 0 && balance > 0) {
      return 'Partial';
    } else {
      return 'Pending';
    }
  };

  // Function to get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed':
        return 'success';
      case 'Partial':
        return 'warning';
      case 'Pending':
        return 'error';
      default:
        return 'default';
    }
  };

  const fetchDetails = async () => {
    if (!supplyDetails && !loading) {
      setLoading(true);
      try {
        const response = await tableActions.fetchSupplyDetails(supply.id, companyId);
        setSupplyDetails(response);
      } catch (error) {
        console.error('Error fetching supply details:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleToggle = () => {
    if (!isExpanded) {
      fetchDetails();
    }
    onToggle();
  };

  return (
    <React.Fragment>
      <TableRow hover>
        <TableCell>
          <IconButton
            aria-label="expand row"
            size="small"
            onClick={handleToggle}
          >
            {isExpanded ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
        <TableCell>
          <Typography variant="body2" fontWeight="medium">
            #{supply.id}
          </Typography>
        </TableCell>
        <TableCell>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <CalendarIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
            {formatDate(supply.restockDate)}
          </Box>
        </TableCell>
        <TableCell>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <PersonIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
            {supply.workerName || 'Unknown'}
          </Box>
        </TableCell>
        <TableCell align="right">
          <Typography variant="body2" fontWeight="medium" color="primary">
            {formatCurrency(supply.totalCost)}
          </Typography>
        </TableCell>
        <TableCell>
          {(() => {
            const status = getPaymentStatus();
            return (
              <Chip
                label={status}
                color={getStatusColor(status)}
                size="small"
                variant="outlined"
              />
            );
          })()}
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
            <Box sx={{ margin: 1 }}>
              <Typography variant="h6" gutterBottom component="div">
                Supply Details
              </Typography>
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : supplyDetails?.items && supplyDetails.items.length > 0 ? (
                <>
                  <Box sx={{ mb: 2 }}>
                    <Grid container spacing={2}>
                      <Grid item xs={6} md={3}>
                        <Typography variant="body2" color="text.secondary">
                          Amount Paid
                        </Typography>
                        <Typography variant="body1" fontWeight="medium">
                          {formatCurrency(supplyDetails.amountPaid || 0)}
                        </Typography>
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <Typography variant="body2" color="text.secondary">
                          Discount
                        </Typography>
                        <Typography variant="body1" fontWeight="medium">
                          {formatCurrency(supplyDetails.discount || 0)}
                        </Typography>
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <Typography variant="body2" color="text.secondary">
                          Balance
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body1" fontWeight="medium" color={supplyDetails.balance > 0 ? 'error' : 'success'}>
                            {formatCurrency(supplyDetails.balance || 0)}
                          </Typography>
                          {supplyDetails.balance > 0 && (
                            <Button
                              size="small"
                              variant="outlined"
                              color="primary"
                              startIcon={<PaymentIcon />}
                              onClick={() => handleOpenPaymentDialog(supply)}
                              sx={{ ml: 1 }}
                            >
                              Pay
                            </Button>
                          )}
                        </Box>
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <Typography variant="body2" color="text.secondary">
                          Total Items
                        </Typography>
                        <Typography variant="body1" fontWeight="medium">
                          {supplyDetails.items.length}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Box>
                  <Divider sx={{ mb: 2 }} />
                  <Table size="small" aria-label="supply items">
                    <TableHead>
                      <TableRow>
                        <TableCell>Item Name</TableCell>
                        <TableCell align="right">Quantity</TableCell>
                        <TableCell align="right">Cost Price</TableCell>
                        <TableCell align="right">Sales Price</TableCell>
                        <TableCell align="right">Total</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {supplyDetails.items.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell component="th" scope="row">
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <ShoppingCartIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                              {item.name}
                            </Box>
                          </TableCell>
                          <TableCell align="right">{item.quantity}</TableCell>
                          <TableCell align="right">{formatCurrency(item.costPrice)}</TableCell>
                          <TableCell align="right">{formatCurrency(item.salesPrice)}</TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" fontWeight="medium">
                              {formatCurrency(item.totalPrice)}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No items found for this supply.
                </Typography>
              )}
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </React.Fragment>
  );
}

const VendorDetails = () => {
  const { id: vendorId } = useParams();
  const navigate = useNavigate();
  const companyId = useSelector((state) => state.companyState.data.id);
  const [tabValue, setTabValue] = useState(0);
  const [expandedSupply, setExpandedSupply] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [selectedSupplyForPayment, setSelectedSupplyForPayment] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: '',
    contact_person: '',
    phone: ''
  });
  const [isUpdating, setIsUpdating] = useState(false);

  // Fetch vendor details
  const {
    data: vendor,
    isLoading: vendorLoading,
    isError: vendorError,
    error: vendorErrorMsg,
  } = useQuery(
    ["fetchVendorDetails", vendorId, companyId],
    () => tableActions.fetchSupplierDetails(vendorId, companyId),
    {
      enabled: !!vendorId && !!companyId,
    }
  );

  // Fetch vendor supplies
  const {
    data: supplies,
    isLoading: suppliesLoading,
    isError: suppliesError,
  } = useQuery(
    ["fetchVendorSupplies", vendorId, companyId],
    () => tableActions.fetchSuppliesByVendor(vendorId, companyId),
    {
      enabled: !!vendorId && !!companyId,
    }
  );

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleExpandSupply = (supplyId) => {
    setExpandedSupply(expandedSupply === supplyId ? null : supplyId);
  };

  const handleDeleteVendor = async () => {
    setIsDeleting(true);
    try {
      await tableActions.deleteVendor(vendorId);
      navigate('/vendors');
    } catch (error) {
      console.error('Error deleting vendor:', error);
      alert('Failed to delete vendor: ' + error.message);
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const handleOpenDeleteDialog = () => {
    setDeleteDialogOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
  };

  const handleOpenPaymentDialog = (supply) => {
    setSelectedSupplyForPayment(supply);
    setPaymentAmount('');
    setPaymentMethod('cash');
    setPaymentError('');
    setPaymentDialogOpen(true);
  };

  const handleClosePaymentDialog = () => {
    setPaymentDialogOpen(false);
    setSelectedSupplyForPayment(null);
    setPaymentAmount('');
    setPaymentError('');
  };

  const handleOpenEditDialog = () => {
    setEditFormData({
      name: vendor?.name || '',
      contact_person: vendor?.contact_person || '',
      phone: vendor?.phone || ''
    });
    setEditDialogOpen(true);
  };

  const handleCloseEditDialog = () => {
    setEditDialogOpen(false);
    setEditFormData({
      name: '',
      contact_person: '',
      phone: ''
    });
  };

  const handleEditFormChange = (field) => (event) => {
    setEditFormData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
  };

  const handleUpdateVendor = async () => {
    setIsUpdating(true);
    try {
      const response = await axios.put(`${API_BASE_URL}/api/vendors/${vendorId}`, {
        ...editFormData,
        companyId: companyId
      });

      // Refresh the page to show updated data
      window.location.reload();
      
      handleCloseEditDialog();
    } catch (error) {
      console.error('Error updating vendor:', error);
      alert('Failed to update vendor: ' + (error.response?.data?.error || error.message));
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePaymentSubmit = async () => {
    if (!selectedSupplyForPayment) return;

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      setPaymentError('Please enter a valid payment amount');
      return;
    }

    // Get the current balance for the selected supply
    const supplyDetails = await fetchSupplyDetails(selectedSupplyForPayment.id);
    const currentBalance = supplyDetails?.balance || 0;
    const currentAmountPaid = supplyDetails?.amountPaid || 0;
    const totalCost = supplyDetails?.totalCost || 0;

    // Validate payment amount
    if (amount > currentBalance) {
      setPaymentError(`Payment amount cannot exceed the outstanding balance of ${formatCurrency(currentBalance)}`);
      return;
    }

    // Additional validation: ensure total payments don't exceed total cost
    if (currentAmountPaid + amount > totalCost) {
      setPaymentError(`Total payments cannot exceed the total cost of ${formatCurrency(totalCost)}`);
      return;
    }

    // Ensure the calculated balance matches expected balance
    const expectedBalance = totalCost - currentAmountPaid;
    if (Math.abs(currentBalance - expectedBalance) > 0.01) {
      setPaymentError('Data inconsistency detected. Please refresh and try again.');
      return;
    }

    setIsProcessingPayment(true);
    setPaymentError('');

    try {
      // Create vendor payment record
      const response = await fetch(`${API_BASE_URL}/api/vendor-payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyId,
          vendorId: parseInt(vendorId),
          amount,
          paymentMethod,
          notes: `Payment for supply #${selectedSupplyForPayment.id}`,
          processedBy: 1, // You might want to get this from user context
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to process payment');
      }

      // Update the supply balance
      const newBalance = Math.max(0, currentBalance - amount); // Ensure balance doesn't go negative
      const newAmountPaid = (supplyDetails?.amountPaid || 0) + amount;
      
      const updatePayload = {
        amountPaid: newAmountPaid,
        balance: newBalance,
        workerId: 1 // Required by backend - you might want to get this from user context
      };
      
      // Add status if payment is complete
      if (newBalance <= 0) {
        updatePayload.status = 'completed';
      }
      
      const updateResponse = await fetch(`${API_BASE_URL}/api/supplies/${companyId}/${selectedSupplyForPayment.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatePayload),
      });
      
      if (!updateResponse.ok) {
        throw new Error('Failed to update supply balance');
      }

      // Refresh the supplies data
      window.location.reload(); // Simple refresh, you could use react-query refetch instead
      
      handleClosePaymentDialog();
    } catch (error) {
      console.error('Error processing payment:', error);
      setPaymentError('Failed to process payment. Please try again.');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Fetch detailed supply information
  const fetchSupplyDetails = async (supplyId) => {
    try {
      const response = await tableActions.fetchSupplyDetails(supplyId, companyId);
      return response;
    } catch (error) {
      console.error('Error fetching supply details:', error);
      return null;
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (vendorLoading) {
    return <Loader />;
  }

  if (vendorError) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error">
          Error loading vendor details: {vendorErrorMsg?.message || 'Unknown error'}
        </Alert>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate("/vendors")}
          sx={{ mt: 2 }}
        >
          Back to Vendors
        </Button>
      </Container>
    );
  }

  if (!vendorId) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <StyledPaper>
          <Typography variant="h6" color="error">
            Vendor not found. Please go back and try again.
          </Typography>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate("/vendors")}
            sx={{ mt: 2 }}
          >
            Back to Vendors
          </Button>
        </StyledPaper>
      </Container>
    );
  }

  return (
    <Container
      maxWidth="xl"
      sx={{ 
        mt: 4, 
        mb: 4, 
        height: "calc(100vh - 100px)", 
        overflow: "auto",
        background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)",
        borderRadius: "24px",
        padding: 3,
        position: "relative",
        "&::before": {
          content: '""',
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "url('data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 100 100\"><defs><pattern id=\"grain\" width=\"100\" height=\"100\" patternUnits=\"userSpaceOnUse\"><circle cx=\"50\" cy=\"50\" r=\"1\" fill=\"rgba(0,0,0,0.02)\"/></pattern></defs><rect width=\"100\" height=\"100\" fill=\"url(%23grain)\"/></svg>')",
          opacity: 0.5,
          pointerEvents: "none",
        },
      }}>
      <GradientBox sx={{ mb: 4, position: "relative", zIndex: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, position: "relative", zIndex: 2 }}>
          <AnimatedButton
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate("/vendors")}
            variant="contained"
            sx={{ 
              backgroundColor: "rgba(255, 255, 255, 0.2)",
              backdropFilter: "blur(10px)",
              border: "1px solid rgba(255, 255, 255, 0.3)",
              color: "white",
              "&:hover": {
                backgroundColor: "rgba(255, 255, 255, 0.3)",
                transform: "translateY(-2px)",
              },
            }}>
            Back to Vendors
          </AnimatedButton>
          <Box sx={{ flexGrow: 1, textAlign: "center" }}>
            <Typography 
              variant="h3" 
              component="h1" 
              sx={{ 
                fontWeight: 700,
                background: "linear-gradient(45deg, #ffffff 30%, #e2e8f0 90%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                textShadow: "0 2px 4px rgba(0,0,0,0.1)",
                mb: 1,
              }}>
              {vendor?.name || "Vendor Details"}
            </Typography>
            <Typography 
              variant="subtitle1" 
              sx={{ 
                opacity: 0.9,
                fontWeight: 400,
              }}>
              Comprehensive vendor management and analytics
            </Typography>
          </Box>
          <AnimatedButton
            startIcon={<DeleteIcon />}
            onClick={handleOpenDeleteDialog}
            variant="contained"
            disabled={isDeleting}
            sx={{
              backgroundColor: "rgba(239, 68, 68, 0.2)",
              backdropFilter: "blur(10px)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              color: "white",
              "&:hover": {
                backgroundColor: "rgba(239, 68, 68, 0.3)",
                transform: "translateY(-2px)",
              },
              "&:disabled": {
                backgroundColor: "rgba(255, 255, 255, 0.1)",
                color: "rgba(255, 255, 255, 0.5)",
              },
            }}>
            {isDeleting ? "Deleting..." : "Delete Vendor"}
          </AnimatedButton>
        </Box>
      </GradientBox>
      {/* Enhanced Vendor Information Cards */}
      <Grid container spacing={4} sx={{ mb: 4, position: "relative", zIndex: 1 }}>
        <Grid item xs={12} md={3}>
          <InfoCard 
            onClick={handleOpenEditDialog}
            sx={{ cursor: 'pointer' }}
          >
            <CardContent sx={{ textAlign: "center", p: 3 }}>
              <Box sx={{ 
                display: "flex", 
                flexDirection: "column", 
                alignItems: "center", 
                mb: 2 
              }}>
                <Box sx={{
                  p: 2,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
                  color: "white",
                  mb: 2,
                  boxShadow: "0 8px 16px rgba(59, 130, 246, 0.3)",
                }}>
                  <BusinessIcon sx={{ fontSize: 32 }} />
                </Box>
                <Typography variant="h6" fontWeight={600} color="text.primary">
                  Company Info
                </Typography>
              </Box>
              <Box sx={{ textAlign: "left" }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Company Name
                </Typography>
                <Typography variant="h6" fontWeight={500} sx={{ mb: 2 }}>
                  {vendor?.name || "N/A"}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Contact Person
                </Typography>
                <Typography variant="body1" fontWeight={500}>
                  {vendor?.contact_person || "N/A"}
                </Typography>
              </Box>
            </CardContent>
          </InfoCard>
        </Grid>

        <Grid item xs={12} md={3}>
          <InfoCard 
            onClick={handleOpenEditDialog}
            sx={{ cursor: 'pointer' }}
          >
            <CardContent sx={{ textAlign: "center", p: 3 }}>
              <Box sx={{ 
                display: "flex", 
                flexDirection: "column", 
                alignItems: "center", 
                mb: 2 
              }}>
                <Box sx={{
                  p: 2,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                  color: "white",
                  mb: 2,
                  boxShadow: "0 8px 16px rgba(16, 185, 129, 0.3)",
                }}>
                  <PhoneIcon sx={{ fontSize: 32 }} />
                </Box>
                <Typography variant="h6" fontWeight={600} color="text.primary">
                  Contact Details
                </Typography>
              </Box>
              <Box sx={{ textAlign: "left" }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Phone Number
                </Typography>
                <Typography variant="h6" fontWeight={500} sx={{ mb: 2 }}>
                  {vendor?.phone || "N/A"}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Vendor ID
                </Typography>
                <Typography variant="body1" fontWeight={500}>
                  #{vendor?.id || "N/A"}
                </Typography>
              </Box>
            </CardContent>
          </InfoCard>
        </Grid>

        <Grid item xs={12} md={3}>
          <InfoCard>
            <CardContent sx={{ textAlign: "center", p: 3 }}>
              <Box sx={{ 
                display: "flex", 
                flexDirection: "column", 
                alignItems: "center", 
                mb: 2 
              }}>
                <Box sx={{
                  p: 2,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
                  color: "white",
                  mb: 2,
                  boxShadow: "0 8px 16px rgba(139, 92, 246, 0.3)",
                }}>
                  <InventoryIcon sx={{ fontSize: 32 }} />
                </Box>
                <Typography variant="h6" fontWeight={600} color="text.primary">
                  Supply Count
                </Typography>
              </Box>
              <Typography variant="h2" fontWeight={700} color="primary" sx={{ mb: 1 }}>
                {supplies?.length || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Supplies
              </Typography>
            </CardContent>
          </InfoCard>
        </Grid>

        <Grid item xs={12} md={3}>
          <InfoCard>
            <CardContent sx={{ textAlign: "center", p: 3 }}>
              <Box sx={{ 
                display: "flex", 
                flexDirection: "column", 
                alignItems: "center", 
                mb: 2 
              }}>
                <Box sx={{
                  p: 2,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                  color: "white",
                  mb: 2,
                  boxShadow: "0 8px 16px rgba(245, 158, 11, 0.3)",
                }}>
                  <TrendingUpIcon sx={{ fontSize: 32 }} />
                </Box>
                <Typography variant="h6" fontWeight={600} color="text.primary">
                  Total Value
                </Typography>
              </Box>
              <Typography variant="h4" fontWeight={700} color="primary" sx={{ mb: 1 }}>
                {formatCurrency(
                  supplies?.reduce(
                    (sum, supply) => sum + (supply.totalCost || 0),
                    0
                  ) || 0
                )}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                All Supplies
              </Typography>
            </CardContent>
          </InfoCard>
        </Grid>
      </Grid>
      {/* Enhanced Tabs Section */}
      <StyledPaper
        sx={{ 
          mb: 4, 
          maxHeight: "calc(100vh - 400px)", 
          overflow: "auto",
          position: "relative",
          zIndex: 1,
        }}>
        <Box
          sx={{
            borderBottom: "2px solid",
            borderImage: "linear-gradient(90deg, #3b82f6, #8b5cf6, #06b6d4) 1",
            position: "sticky",
            top: 0,
            background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
            backdropFilter: "blur(10px)",
            zIndex: 2,
            borderRadius: "20px 20px 0 0",
          }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            aria-label="vendor details tabs"
            sx={{
              "& .MuiTab-root": {
                textTransform: "none",
                fontWeight: 600,
                fontSize: "1rem",
                minHeight: 64,
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                borderRadius: "12px 12px 0 0",
                margin: "0 4px",
                "&:hover": {
                  backgroundColor: "rgba(59, 130, 246, 0.08)",
                  transform: "translateY(-2px)",
                },
                "&.Mui-selected": {
                  background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
                  color: "white",
                  "& .MuiSvgIcon-root": {
                    color: "white",
                  },
                },
              },
              "& .MuiTabs-indicator": {
                display: "none",
              },
            }}>
            <Tab
              label="Vendor Information"
              icon={<BusinessIcon />}
              iconPosition="start"
            />
            <Tab
              label={`Supplies History (${supplies?.length || 0})`}
              icon={<InventoryIcon />}
              iconPosition="start"
            />
          </Tabs>
        </Box>

        {/* Vendor Information Tab */}
        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Basic Information
              </Typography>
              <List>
                <ListItem>
                  <ListItemIcon>
                    <BusinessIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary="Company Name"
                    secondary={vendor?.name || "Not provided"}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <PersonIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary="Contact Person"
                    secondary={vendor?.contact_person || "Not provided"}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <PhoneIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary="Phone Number"
                    secondary={vendor?.phone || "Not provided"}
                  />
                </ListItem>
              </List>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Additional Details
              </Typography>
              <List>
                <ListItem>
                  <ListItemText
                    primary="Vendor ID"
                    secondary={vendor?.id || "N/A"}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Company ID"
                    secondary={vendor?.companyId || "N/A"}
                  />
                </ListItem>
              </List>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Supplies History Tab */}
        <TabPanel value={tabValue} index={1}>
          {suppliesLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
              <CircularProgress />
            </Box>
          ) : suppliesError ? (
            <Alert severity="error">Failed to load supplies data</Alert>
          ) : supplies && supplies.length > 0 ? (
            <TableContainer
              component={Paper}
              elevation={0}
              sx={{
                maxHeight: "calc(100vh - 500px)",
                overflow: "auto",
                borderRadius: "16px",
                background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
                border: "1px solid rgba(226, 232, 240, 0.8)",
                "&::-webkit-scrollbar": {
                  width: "12px",
                },
                "&::-webkit-scrollbar-track": {
                  background: "linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)",
                  borderRadius: "6px",
                },
                "&::-webkit-scrollbar-thumb": {
                  background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
                  borderRadius: "6px",
                  border: "2px solid transparent",
                  backgroundClip: "padding-box",
                },
                "&::-webkit-scrollbar-thumb:hover": {
                  background: "linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)",
                },
              }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell 
                      sx={{ 
                        background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
                        color: "white",
                        fontWeight: 600,
                        fontSize: "0.875rem",
                        borderBottom: "none",
                        "&:first-of-type": {
                          borderTopLeftRadius: "16px",
                        },
                      }} 
                    />
                    <TableCell 
                      sx={{ 
                        background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
                        color: "white",
                        fontWeight: 600,
                        fontSize: "0.875rem",
                        borderBottom: "none",
                      }}
                    >
                      Supply ID
                    </TableCell>
                    <TableCell 
                      sx={{ 
                        background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
                        color: "white",
                        fontWeight: 600,
                        fontSize: "0.875rem",
                        borderBottom: "none",
                      }}
                    >
                      Date
                    </TableCell>
                    <TableCell 
                      sx={{ 
                        background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
                        color: "white",
                        fontWeight: 600,
                        fontSize: "0.875rem",
                        borderBottom: "none",
                      }}
                    >
                      Restocked By
                    </TableCell>
                    <TableCell 
                      align="right"
                      sx={{ 
                        background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
                        color: "white",
                        fontWeight: 600,
                        fontSize: "0.875rem",
                        borderBottom: "none",
                      }}
                    >
                      Total Cost
                    </TableCell>
                    <TableCell 
                      sx={{ 
                        background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
                        color: "white",
                        fontWeight: 600,
                        fontSize: "0.875rem",
                        borderBottom: "none",
                        "&:last-of-type": {
                          borderTopRightRadius: "16px",
                        },
                      }}
                    >
                      Status
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {supplies.map((supply, index) => (
                    <React.Fragment key={supply.id}>
                      <SupplyRow
                        supply={supply}
                        isExpanded={expandedSupply === supply.id}
                        onToggle={() => handleExpandSupply(supply.id)}
                        formatCurrency={formatCurrency}
                        formatDate={formatDate}
                        handleOpenPaymentDialog={handleOpenPaymentDialog}
                        sx={{
                          "& .MuiTableRow-root": {
                            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                            "&:hover": {
                              backgroundColor: "rgba(59, 130, 246, 0.04)",
                              transform: "scale(1.01)",
                              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                            },
                          },
                          "& .MuiTableCell-root": {
                            borderBottom: "1px solid rgba(226, 232, 240, 0.5)",
                            padding: "16px",
                          },
                        }}
                      />
                      {index < supplies.length - 1 && (
                        <TableRow>
                          <TableCell 
                            colSpan={6} 
                            sx={{ 
                              padding: 0, 
                              border: "none",
                              background: "linear-gradient(90deg, transparent 0%, rgba(59, 130, 246, 0.1) 50%, transparent 100%)",
                              height: "2px",
                            }} 
                          />
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Box sx={{ textAlign: "center", py: 4 }}>
              <InventoryIcon
                sx={{ fontSize: 64, color: "text.secondary", mb: 2 }}
              />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No Supplies Found
              </Typography>
              <Typography variant="body2" color="text.secondary">
                This vendor hasn't made any supplies yet.
              </Typography>
            </Box>
          )}
        </TabPanel>
      </StyledPaper>
      {/* Enhanced Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleCloseDeleteDialog}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: "20px",
            background: "linear-gradient(135deg, #ffffff 0%, #fef2f2 100%)",
            boxShadow: "0 25px 50px rgba(239, 68, 68, 0.15)",
            border: "1px solid rgba(239, 68, 68, 0.1)",
            backdropFilter: "blur(10px)",
          },
        }}
      >
        <DialogTitle 
          id="delete-dialog-title"
          sx={{
            background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
            color: "white",
            textAlign: "center",
            fontWeight: 600,
            fontSize: "1.25rem",
            borderRadius: "20px 20px 0 0",
            position: "relative",
            "&::after": {
              content: '""',
              position: "absolute",
              bottom: "-10px",
              left: "50%",
              transform: "translateX(-50%)",
              width: 0,
              height: 0,
              borderLeft: "10px solid transparent",
              borderRight: "10px solid transparent",
              borderTop: "10px solid #dc2626",
            },
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1 }}>
            <WarningIcon sx={{ fontSize: 28 }} />
            Delete Vendor
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 4, mt: 2 }}>
          <Box sx={{ textAlign: "center", mb: 3 }}>
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
                border: "3px solid #fecaca",
              }}
            >
              <DeleteIcon sx={{ fontSize: 40, color: "#ef4444" }} />
            </Box>
          </Box>
          <DialogContentText 
            id="delete-dialog-description"
            sx={{
              textAlign: "center",
              fontSize: "1.1rem",
              color: "rgb(75, 85, 99)",
              lineHeight: 1.6,
              mb: 2,
            }}
          >
            Are you sure you want to delete this vendor?
          </DialogContentText>
          <DialogContentText 
            sx={{
              textAlign: "center",
              fontSize: "0.95rem",
              color: "rgb(107, 114, 128)",
              fontStyle: "italic",
            }}
          >
            This action cannot be undone and will permanently remove all vendor data.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 3, gap: 2 }}>
          <AnimatedButton 
            onClick={handleCloseDeleteDialog} 
            disabled={isDeleting}
            variant="outlined"
            sx={{
              borderColor: "rgba(107, 114, 128, 0.3)",
              color: "rgb(107, 114, 128)",
              minWidth: "100px",
              "&:hover": {
                borderColor: "rgba(107, 114, 128, 0.5)",
                backgroundColor: "rgba(107, 114, 128, 0.05)",
              },
            }}
          >
            Cancel
          </AnimatedButton>
          <AnimatedButton
            onClick={handleDeleteVendor}
            variant="contained"
            disabled={isDeleting}
            startIcon={isDeleting ? <CircularProgress size={20} color="inherit" /> : <DeleteIcon />}
            sx={{
              background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
              color: "white",
              minWidth: "120px",
              "&:hover": {
                background: "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)",
                transform: "translateY(-2px)",
                boxShadow: "0 8px 16px rgba(239, 68, 68, 0.4)",
              },
              "&:disabled": {
                background: "rgba(107, 114, 128, 0.3)",
                color: "rgba(255, 255, 255, 0.7)",
              },
            }}
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </AnimatedButton>
        </DialogActions>
      </Dialog>

      {/* Enhanced Payment Dialog */}
      <Dialog
        open={paymentDialogOpen}
        onClose={handleClosePaymentDialog}
        aria-labelledby="payment-dialog-title"
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: "20px",
            background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
            boxShadow: "0 25px 50px rgba(0, 0, 0, 0.15)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            backdropFilter: "blur(10px)",
          },
        }}
      >
        <DialogTitle 
          id="payment-dialog-title"
          sx={{
            background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
            color: "white",
            textAlign: "center",
            fontWeight: 600,
            fontSize: "1.25rem",
            borderRadius: "20px 20px 0 0",
            position: "relative",
            "&::after": {
              content: '""',
              position: "absolute",
              bottom: "-10px",
              left: "50%",
              transform: "translateX(-50%)",
              width: 0,
              height: 0,
              borderLeft: "10px solid transparent",
              borderRight: "10px solid transparent",
              borderTop: "10px solid #8b5cf6",
            },
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1 }}>
            <PaymentIcon sx={{ fontSize: 28 }} />
            Make Payment - Supply #{selectedSupplyForPayment?.id}
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 3, mt: 2 }}>
          {selectedSupplyForPayment && (
            <StatsCard sx={{ mb: 3, p: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Box sx={{ textAlign: "center" }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Outstanding Balance
                    </Typography>
                    <Typography variant="h5" fontWeight={700} color="error">
                      {formatCurrency(selectedSupplyForPayment.balance || 0)}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box sx={{ textAlign: "center" }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Total Cost
                    </Typography>
                    <Typography variant="h5" fontWeight={700} color="primary">
                      {formatCurrency(selectedSupplyForPayment.totalCost || 0)}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </StatsCard>
          )}
          
          <TextField
            autoFocus
            margin="dense"
            label="Payment Amount"
            type="number"
            fullWidth
            variant="outlined"
            value={paymentAmount}
            onChange={(e) => setPaymentAmount(e.target.value)}
            inputProps={{ 
              min: 0, 
              max: selectedSupplyForPayment?.balance || 0,
              step: 0.01 
            }}
            sx={{ 
              mb: 3,
              "& .MuiOutlinedInput-root": {
                borderRadius: "12px",
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                "&:hover": {
                  transform: "translateY(-2px)",
                  boxShadow: "0 8px 16px rgba(59, 130, 246, 0.2)",
                },
                "&.Mui-focused": {
                  transform: "translateY(-2px)",
                  boxShadow: "0 8px 16px rgba(59, 130, 246, 0.3)",
                },
              },
            }}
          />
          
          <FormControl 
            fullWidth 
            variant="outlined" 
            sx={{ 
              mb: 3,
              "& .MuiOutlinedInput-root": {
                borderRadius: "12px",
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                "&:hover": {
                  transform: "translateY(-2px)",
                  boxShadow: "0 8px 16px rgba(59, 130, 246, 0.2)",
                },
                "&.Mui-focused": {
                  transform: "translateY(-2px)",
                  boxShadow: "0 8px 16px rgba(59, 130, 246, 0.3)",
                },
              },
            }}
          >
            <InputLabel>Payment Method</InputLabel>
            <Select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              label="Payment Method"
            >
              <MenuItem value="cash">
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <MoneyIcon fontSize="small" />
                  Cash
                </Box>
              </MenuItem>
              <MenuItem value="bank_transfer">
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <AccountBalanceIcon fontSize="small" />
                  Bank Transfer
                </Box>
              </MenuItem>
              <MenuItem value="card">
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <ReceiptIcon fontSize="small" />
                  Check
                </Box>
              </MenuItem>
              <MenuItem value="mobile_money">
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <PhoneIcon fontSize="small" />
                  Mobile Money
                </Box>
              </MenuItem>
            </Select>
          </FormControl>

          {paymentError && (
            <Alert 
              severity="error" 
              sx={{ 
                mb: 2,
                borderRadius: "12px",
                "& .MuiAlert-icon": {
                  fontSize: "1.5rem",
                },
              }}
            >
              {paymentError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, gap: 2 }}>
          <AnimatedButton 
            onClick={handleClosePaymentDialog} 
            disabled={isProcessingPayment}
            variant="outlined"
            sx={{
              borderColor: "rgba(107, 114, 128, 0.3)",
              color: "rgb(107, 114, 128)",
              "&:hover": {
                borderColor: "rgba(107, 114, 128, 0.5)",
                backgroundColor: "rgba(107, 114, 128, 0.05)",
              },
            }}
          >
            Cancel
          </AnimatedButton>
          <AnimatedButton
            onClick={handlePaymentSubmit}
            variant="contained"
            disabled={isProcessingPayment || !paymentAmount}
            startIcon={isProcessingPayment ? <CircularProgress size={20} color="inherit" /> : <PaymentIcon />}
            sx={{
              background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
              color: "white",
              minWidth: "140px",
              "&:hover": {
                background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
                transform: "translateY(-2px)",
                boxShadow: "0 8px 16px rgba(16, 185, 129, 0.4)",
              },
              "&:disabled": {
                background: "rgba(107, 114, 128, 0.3)",
                color: "rgba(255, 255, 255, 0.7)",
              },
            }}
          >
            {isProcessingPayment ? 'Processing...' : 'Make Payment'}
          </AnimatedButton>
        </DialogActions>
      </Dialog>

      {/* Edit Vendor Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={handleCloseEditDialog}
        aria-labelledby="edit-vendor-dialog-title"
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: "20px",
            background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
            boxShadow: "0 25px 50px rgba(0, 0, 0, 0.15)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            backdropFilter: "blur(10px)",
          },
        }}
      >
        <DialogTitle 
          id="edit-vendor-dialog-title"
          sx={{
            background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
            color: "white",
            textAlign: "center",
            fontWeight: 600,
            fontSize: "1.25rem",
            borderRadius: "20px 20px 0 0",
            position: "relative",
            "&::after": {
              content: '""',
              position: "absolute",
              bottom: "-10px",
              left: "50%",
              transform: "translateX(-50%)",
              width: 0,
              height: 0,
              borderLeft: "10px solid transparent",
              borderRight: "10px solid transparent",
              borderTop: "10px solid #059669",
            },
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1 }}>
            <BusinessIcon sx={{ fontSize: 28 }} />
            Edit Vendor Information
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 3, mt: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <TextField
              autoFocus
              label="Company Name"
              type="text"
              fullWidth
              variant="outlined"
              value={editFormData.name}
              onChange={handleEditFormChange('name')}
              sx={{ 
                "& .MuiOutlinedInput-root": {
                  borderRadius: "12px",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  "&:hover": {
                    boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
                  },
                  "&.Mui-focused": {
                    boxShadow: "0 8px 16px rgba(16, 185, 129, 0.2)",
                  },
                },
              }}
            />
            
            <TextField
              label="Contact Person"
              type="text"
              fullWidth
              variant="outlined"
              value={editFormData.contact_person}
              onChange={handleEditFormChange('contact_person')}
              sx={{ 
                "& .MuiOutlinedInput-root": {
                  borderRadius: "12px",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  "&:hover": {
                    boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
                  },
                  "&.Mui-focused": {
                    boxShadow: "0 8px 16px rgba(16, 185, 129, 0.2)",
                  },
                },
              }}
            />
            
            <TextField
              label="Phone Number"
              type="tel"
              fullWidth
              variant="outlined"
              value={editFormData.phone}
              onChange={handleEditFormChange('phone')}
              sx={{ 
                "& .MuiOutlinedInput-root": {
                  borderRadius: "12px",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  "&:hover": {
                    boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
                  },
                  "&.Mui-focused": {
                    boxShadow: "0 8px 16px rgba(16, 185, 129, 0.2)",
                  },
                },
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, gap: 2 }}>
          <AnimatedButton 
            onClick={handleCloseEditDialog} 
            disabled={isUpdating}
            variant="outlined"
            sx={{
              borderColor: "rgba(107, 114, 128, 0.3)",
              color: "rgb(107, 114, 128)",
              minWidth: "100px",
              "&:hover": {
                borderColor: "rgba(107, 114, 128, 0.5)",
                backgroundColor: "rgba(107, 114, 128, 0.05)",
              },
            }}
          >
            Cancel
          </AnimatedButton>
          <AnimatedButton
            onClick={handleUpdateVendor}
            variant="contained"
            disabled={isUpdating || !editFormData.name.trim()}
            startIcon={isUpdating ? <CircularProgress size={20} color="inherit" /> : <BusinessIcon />}
            sx={{
              background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
              color: "white",
              minWidth: "120px",
              "&:hover": {
                background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
                transform: "translateY(-2px)",
                boxShadow: "0 8px 16px rgba(16, 185, 129, 0.4)",
              },
              "&:disabled": {
                background: "rgba(107, 114, 128, 0.3)",
                color: "rgba(255, 255, 255, 0.7)",
              },
            }}
          >
            {isUpdating ? "Updating..." : "Update Vendor"}
          </AnimatedButton>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default VendorDetails;
