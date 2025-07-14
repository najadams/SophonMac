import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Button,
  CircularProgress,
  Paper,
  Box,
} from "@mui/material";
import { capitalizeFirstLetter } from "../../config/Functions";
import { format } from "date-fns";

const PaymentDisplayDialog = ({ open, onClose, paymentData }) => {
  if (!paymentData) {
    return (
      <Dialog open={open} onClose={onClose}>
        <DialogTitle
          sx={{
            background: "#00796B",
            color: "white",
            textAlign: "center",
            py: 2,
            "& .MuiTypography-root": {
              fontSize: "1.5rem",
              fontWeight: 600,
            },
          }}>
          Payment History
        </DialogTitle>
        <DialogContent sx={{ p: 3, display: "flex", justifyContent: "center" }}>
          <CircularProgress sx={{ color: "#00796B" }} />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: "12px",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
        },
      }}>
      <DialogTitle
        sx={{
          background: "#00796B",
          color: "white",
          textAlign: "center",
          py: 2,
          "& .MuiTypography-root": {
            fontSize: "1.5rem",
            fontWeight: 600,
          },
        }}>
        Payment History
      </DialogTitle>
      <DialogContent sx={{ p: 3 }}>
        {paymentData.length > 0 ? (
          <TableContainer
            component={Paper}
            sx={{
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)",
              borderRadius: "8px",
              border: "1px solid #e0e0e0",
            }}>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: "#f5f5f5" }}>
                  <TableCell sx={{ fontWeight: 600, color: "#333" }}>
                    Date
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, color: "#333" }}>
                    Amount Paid
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, color: "#333" }}>
                    Worker Name
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, color: "#333" }}>
                    Payment Method
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paymentData.map((payment) => (
                  <TableRow
                    key={payment._id}
                    sx={{
                      "&:hover": {
                        bgcolor: "rgba(0, 121, 107, 0.04)",
                      },
                    }}>
                    <TableCell>
                      {payment.date && !isNaN(new Date(payment.date).getTime()) 
                        ? format(new Date(payment.date), "dd-MM-yyyy hh:mm a")
                        : "Invalid Date"
                      }
                    </TableCell>
                    <TableCell sx={{ color: "#00796B", fontWeight: 500 }}>
                      ₵{payment.amountPaid}
                    </TableCell>
                    <TableCell>
                      {capitalizeFirstLetter(payment.workerName)  || "N/A"}
                    </TableCell>
                    <TableCell>{payment.paymentMethod}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Box
            sx={{
              p: 3,
              textAlign: "center",
              bgcolor: "#f5f5f5",
              borderRadius: "8px",
              border: "1px solid #e0e0e0",
            }}>
            <Typography color="text.secondary">No payments found.</Typography>
          </Box>
        )}
      </DialogContent>
      <Button
        onClick={onClose}
        variant="contained"
        sx={{
          m: 2,
          bgcolor: "#00796B",
          "&:hover": {
            bgcolor: "#00695C",
          },
        }}>
        Close
      </Button>
    </Dialog>
  );
};

export default PaymentDisplayDialog;
