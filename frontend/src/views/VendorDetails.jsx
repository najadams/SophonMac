import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "react-query";
import { tableActions } from "../config/Functions";
import { API_BASE_URL } from '../config';
import { useSelector } from "react-redux";
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
} from "@mui/icons-material";
import { styled } from "@mui/material/styles";
import Loader from "../components/common/Loader";

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
      sx={{ mt: 4, mb: 4, height: "calc(100vh - 100px)", overflow: "auto" }}>
      <Box sx={{ mb: 3, display: "flex", alignItems: "center", gap: 2 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate("/vendors")}
          variant="outlined">
          Back to Vendors
        </Button>
        <Typography variant="h4" component="h1" sx={{ flexGrow: 1 }}>
          {vendor?.name || "Vendor Details"}
        </Typography>
        <Button
          startIcon={<DeleteIcon />}
          onClick={handleOpenDeleteDialog}
          variant="outlined"
          color="error"
          disabled={isDeleting}>
          {isDeleting ? "Deleting..." : "Delete Vendor"}
        </Button>
      </Box>
      {/* Vendor Information Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <InfoCard>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                <BusinessIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Company Information</Typography>
              </Box>
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <BusinessIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Company Name"
                    secondary={vendor?.name || "N/A"}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <PersonIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Contact Person"
                    secondary={vendor?.contact_person || "N/A"}
                  />
                </ListItem>
              </List>
            </CardContent>
          </InfoCard>
        </Grid>

        <Grid item xs={12} md={4}>
          <InfoCard>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                <PhoneIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Contact Information</Typography>
              </Box>
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <PhoneIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Phone"
                    secondary={vendor?.phone || "N/A"}
                  />
                </ListItem>
              </List>
            </CardContent>
          </InfoCard>
        </Grid>

        <Grid item xs={12} md={4}>
          <InfoCard>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                <InventoryIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Supply Statistics</Typography>
              </Box>
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <ShippingIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Total Supplies"
                    secondary={supplies?.length || 0}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <MoneyIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Total Value"
                    secondary={formatCurrency(
                      supplies?.reduce(
                        (sum, supply) => sum + (supply.totalCost || 0),
                        0
                      ) || 0
                    )}
                  />
                </ListItem>
              </List>
            </CardContent>
          </InfoCard>
        </Grid>
      </Grid>
      {/* Tabs Section */}
      <StyledPaper
        sx={{ mb: 4, maxHeight: "calc(100vh - 400px)", overflow: "auto" }}>
        <Box
          sx={{
            borderBottom: 1,
            borderColor: "divider",
            position: "sticky",
            top: 0,
            backgroundColor: "white",
            zIndex: 1,
          }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            aria-label="vendor details tabs">
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
                "&::-webkit-scrollbar": {
                  width: "8px",
                },
                "&::-webkit-scrollbar-track": {
                  background: "#f1f1f1",
                  borderRadius: "4px",
                },
                "&::-webkit-scrollbar-thumb": {
                  background: "#c1c1c1",
                  borderRadius: "4px",
                },
                "&::-webkit-scrollbar-thumb:hover": {
                  background: "#a8a8a8",
                },
              }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell />
                    <TableCell>Supply ID</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Restocked By</TableCell>
                    <TableCell align="right">Total Cost</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {supplies.map((supply) => (
                          <SupplyRow
                            key={supply.id}
                            supply={supply}
                            isExpanded={expandedSupply === supply.id}
                            onToggle={() => handleExpandSupply(supply.id)}
                            formatCurrency={formatCurrency}
                            formatDate={formatDate}
                            handleOpenPaymentDialog={handleOpenPaymentDialog}
                          />
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
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleCloseDeleteDialog}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description">
        <DialogTitle id="delete-dialog-title">Delete Vendor</DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-dialog-description">
            Are you sure you want to delete this vendor? This action cannot be
            undone. All associated data will be permanently removed.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog} disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            onClick={handleDeleteVendor}
            color="error"
            variant="contained"
            disabled={isDeleting}>
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog
        open={paymentDialogOpen}
        onClose={handleClosePaymentDialog}
        aria-labelledby="payment-dialog-title"
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle id="payment-dialog-title">
          Make Payment - Supply #{selectedSupplyForPayment?.id}
        </DialogTitle>
        <DialogContent>
          {selectedSupplyForPayment && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Outstanding Balance: {formatCurrency(selectedSupplyForPayment.balance || 0)}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Total Cost: {formatCurrency(selectedSupplyForPayment.totalCost || 0)}
              </Typography>
            </Box>
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
            sx={{ mb: 2 }}
          />
          
          <FormControl fullWidth variant="outlined" sx={{ mb: 2 }}>
            <InputLabel>Payment Method</InputLabel>
            <Select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              label="Payment Method"
            >
              <MenuItem value="cash">Cash</MenuItem>
              <MenuItem value="bank_transfer">Bank Transfer</MenuItem>
              <MenuItem value="card">Check</MenuItem>
              <MenuItem value="mobile_money">Mobile Money</MenuItem>
            </Select>
          </FormControl>

          {paymentError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {paymentError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClosePaymentDialog} disabled={isProcessingPayment}>
            Cancel
          </Button>
          <Button
            onClick={handlePaymentSubmit}
            variant="contained"
            disabled={isProcessingPayment || !paymentAmount}
            startIcon={isProcessingPayment ? <CircularProgress size={20} /> : <PaymentIcon />}
          >
            {isProcessingPayment ? 'Processing...' : 'Make Payment'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default VendorDetails;
