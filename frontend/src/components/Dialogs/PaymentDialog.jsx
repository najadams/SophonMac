import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  CircularProgress,
  Typography,
  Grid,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
} from "@mui/material";
import { capitalizeFirstLetter, tableActions } from "../../config/Functions";
import ReceiptDialog from "./ReceiptDialog";
import PaymentDisplayDialog from "./PaymentDisplayDialog";

const PaymentDialog = ({ open, onClose, selectedDebt, onSubmit }) => {
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [submitting, setSubmitting] = useState(false);
  const [submittingView, setSubmittingView] = useState(false);
  const [paymentDisplayDialogOpen, setPaymentDisplayDialogOpen] =
    useState(false);
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [paymentData, setPaymentData] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const calculateBalance = () => {
    return selectedDebt ? selectedDebt.amount - paymentAmount : 0;
  };

  const handlePayment = async () => {
    setError('');
    setSuccess('');
    
    // Validation
    if (!paymentAmount || paymentAmount <= 0) {
      setError('Please enter a valid payment amount');
      return;
    }
    
    if (paymentAmount > selectedDebt?.amount) {
      setError('Payment amount cannot exceed the debt amount');
      return;
    }
    
    try {
      setSubmitting(true);
      await onSubmit(paymentAmount, paymentMethod);
      setSuccess('Payment processed successfully!');
      setTimeout(() => {
        onClose();
        setPaymentAmount(0);
        setPaymentMethod('cash');
        setError('');
        setSuccess('');
      }, 1500);
    } catch (err) {
      setError('Failed to process payment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewReceipt = async () => {
    setSubmittingView(true);
    try {
      const data = await tableActions.fetchReceiptsById({
        receiptId: selectedDebt?.receiptId,
      });
      setReceiptData(data);
      setReceiptDialogOpen(true);
    } catch (error) {
      setError('Failed to load receipt data');
    } finally {
      setSubmittingView(false);
    }
  };

  const handleViewPayment = async () => {
    setSubmittingView(true);
    try {
      const data = await tableActions.fetchPaymentsById({
        debtId: selectedDebt?.id,
      });
      setPaymentData(data);
      setPaymentDisplayDialogOpen(true);
    } catch (error) {
      setError('Failed to load payment data');
    } finally {
      setSubmittingView(false);
    }
  };

  const handleCloseReceiptDialog = () => {
    setReceiptDialogOpen(false);
    setReceiptData(null);
  };

  const handleClosePaymentDialog = () => {
    setPaymentDisplayDialogOpen(false);
    setPaymentData(null);
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: "16px",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
            overflow: "hidden",
          },
        }}>
        <DialogTitle
          sx={{
            background: "linear-gradient(135deg, #00796B 0%, #009688 100%)",
            color: "white",
            textAlign: "center",
            py: 2,
            "& .MuiTypography-root": {
              fontSize: "1.5rem",
              fontWeight: 600,
            },
          }}>
          Clear Customer Debt
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {success}
            </Alert>
          )}
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Box
                sx={{
                  p: 2,
                  bgcolor: "#f8f9fa",
                  borderRadius: 2,
                  border: "1px solid #e9ecef",
                  transition: "all 0.2s ease",
                  "&:hover": {
                    borderColor: "#00796B",
                    bgcolor: "#f0f7f5",
                  },
                }}>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 0.5 }}>
                  Customer
                </Typography>
                <Typography
                  variant="body1"
                  sx={{ fontWeight: 600, color: "#2c3e50" }}>
                  {selectedDebt?.customerCompany !== "NoCompany" ? (
                    capitalizeFirstLetter(
                      `${selectedDebt?.customerName} - ${selectedDebt?.customerCompany}`
                    )
                  ) : (
                    capitalizeFirstLetter(selectedDebt?.customerName)
                  )}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6}>
              <Box
                sx={{
                  p: 2,
                  bgcolor: "#f8f9fa",
                  borderRadius: 2,
                  border: "1px solid #e9ecef",
                  transition: "all 0.2s ease",
                  "&:hover": {
                    borderColor: "#00796B",
                    bgcolor: "#f0f7f5",
                  },
                }}>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 0.5 }}>
                  Cashier
                </Typography>
                <Typography
                  variant="body1"
                  sx={{ fontWeight: 600, color: "#2c3e50" }}>
                  {capitalizeFirstLetter(selectedDebt?.workerName)}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6}>
              <Button
                variant="outlined"
                onClick={handleViewPayment}
                disabled={submittingView}
                startIcon={
                  submittingView ? (
                    <CircularProgress size={16} sx={{ color: "#00796B" }} />
                  ) : (
                    <i
                      className="bx bx-history"
                      style={{ fontSize: "1.2rem" }}></i>
                  )
                }
                sx={{
                  color: "#00796B",
                  borderColor: "#00796B",
                  borderRadius: "8px",
                  textTransform: "none",
                  fontWeight: 500,
                  "&:hover": {
                    borderColor: "#00796B",
                    bgcolor: "rgba(0, 121, 107, 0.04)",
                  },
                  "&:disabled": {
                    borderColor: "#ccc",
                    color: "#ccc",
                  },
                }}>
                View Payments
              </Button>
            </Grid>
            <Grid item xs={6}>
              <Button
                variant="outlined"
                onClick={handleViewReceipt}
                disabled={submittingView}
                startIcon={
                  submittingView ? (
                    <CircularProgress size={16} sx={{ color: "#00796B" }} />
                  ) : (
                    <i
                      className="bx bx-receipt"
                      style={{ fontSize: "1.2rem" }}></i>
                  )
                }
                sx={{
                  color: "#00796B",
                  borderColor: "#00796B",
                  borderRadius: "8px",
                  textTransform: "none",
                  fontWeight: 500,
                  "&:hover": {
                    borderColor: "#00796B",
                    bgcolor: "rgba(0, 121, 107, 0.04)",
                  },
                  "&:disabled": {
                    borderColor: "#ccc",
                    color: "#ccc",
                  },
                }}>
                View Receipt
              </Button>
            </Grid>
            <Grid item xs={6}>
              <TextField
                margin="dense"
                label="Amount Owed"
                type="number"
                fullWidth
                variant="outlined"
                value={selectedDebt?.amount || 0}
                InputProps={{
                  readOnly: true,
                  sx: {
                    bgcolor: "#f8f9fa",
                    borderRadius: "8px",
                    "& .MuiOutlinedInput-notchedOutline": {
                      borderColor: "#e9ecef",
                    },
                  },
                }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                margin="dense"
                label="Amount Paid"
                type="number"
                fullWidth
                variant="outlined"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(Number(e.target.value))}
                InputProps={{
                  sx: {
                    borderRadius: "8px",
                    "& .MuiOutlinedInput-notchedOutline": {
                      borderColor: "#00796B",
                    },
                    "&:hover .MuiOutlinedInput-notchedOutline": {
                      borderColor: "#00796B",
                    },
                  },
                }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                margin="dense"
                label="Balance Left"
                type="number"
                fullWidth
                variant="outlined"
                value={calculateBalance()}
                InputProps={{
                  readOnly: true,
                  sx: {
                    bgcolor: "#f8f9fa",
                    borderRadius: "8px",
                    "& .MuiOutlinedInput-notchedOutline": {
                      borderColor: "#e9ecef",
                    },
                  },
                }}
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth margin="dense">
                <InputLabel>Payment Method</InputLabel>
                <Select
                  value={paymentMethod}
                  label="Payment Method"
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  sx={{
                    borderRadius: "8px",
                    "& .MuiOutlinedInput-notchedOutline": {
                      borderColor: "#00796B",
                    },
                  }}
                >
                  <MenuItem value="cash">Cash</MenuItem>
                  <MenuItem value="momo">Mobile Money</MenuItem>
                  <MenuItem value="card">Card</MenuItem>
                  <MenuItem value="bank_transfer">Bank Transfer</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions
          sx={{
            p: 2,
            justifyContent: "space-between",
            borderTop: "1px solid #e9ecef",
          }}>
          <Button
            onClick={onClose}
            variant="text"
            sx={{
              color: "#666",
              textTransform: "none",
              fontWeight: 500,
              "&:hover": {
                bgcolor: "rgba(0, 0, 0, 0.04)",
              },
            }}>
            Cancel
          </Button>
          {submitting ? (
            <CircularProgress size={24} sx={{ color: "#00796B" }} />
          ) : (
            <Button
              onClick={handlePayment}
              variant="contained"
              startIcon={
                <i className="bx bx-check" style={{ fontSize: "1.2rem" }}></i>
              }
              sx={{
                bgcolor: "#00796B",
                color: "white",
                borderRadius: "8px",
                textTransform: "none",
                fontWeight: 500,
                px: 3,
                "&:hover": {
                  bgcolor: "#00695C",
                },
              }}>
              Submit Payment
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {receiptData && (
        <ReceiptDialog
          open={receiptDialogOpen}
          onClose={handleCloseReceiptDialog}
          receiptData={receiptData}
        />
      )}

      {paymentData && (
        <PaymentDisplayDialog
          open={paymentDisplayDialogOpen}
          onClose={handleClosePaymentDialog}
          paymentData={paymentData}
          customerName={selectedDebt?.customerName}
        />
      )}
    </>
  );
};

export default PaymentDialog;
