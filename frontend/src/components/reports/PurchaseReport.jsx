import React, { useState, useMemo } from 'react';
import {
  Grid,
  Paper,
  Card,
  CardContent,
  Typography,
  Table,
  TableHead,
  TableBody,
  TableCell,
  TableRow,
  TableContainer,
  TableSortLabel,
  Box,
} from "@mui/material";
import SearchField from "../../hooks/SearchField";
import { capitalizeFirstLetter, formatNumber } from "../../config/Functions";
import { styled } from "@mui/material/styles";
import {
  ShoppingCart,
  Payment,
  AccountBalance,
  LocalShipping,
} from "@mui/icons-material";
import { motion, AnimatePresence } from "framer-motion";

export const StyledTableHead = styled(TableHead)(({ theme }) => ({
  backgroundColor: "#1a237e",
  "& th": {
    color: "white",
    fontWeight: "bold",
    padding: "16px",
  },
  "& th .MuiTableSortLabel-root": {
    color: "white",
    fontSize: "0.95rem",
    fontWeight: "600",
  },
  "& th .MuiTableSortLabel-root.Mui-active": {
    color: "white",
    fontSize: "1rem",
    fontWeight: "700",
  },
  "& th:hover": {
    backgroundColor: "#283593",
  },
  "& th .MuiTableSortLabel-root:hover": {
    color: "white",
  },
}));

// SummaryCards Component
const SummaryCards = ({ purchaseData }) => {
  return (
    <Grid container spacing={3}>
      <Grid item xs={12} sm={6} md={3}>
        <Card
          elevation={2}
          sx={{
            p: 3,
            textAlign: "center",
            backgroundColor: "#ffffff",
            borderRadius: "12px",
            transition: "transform 0.2s",
            "&:hover": {
              transform: "translateY(-5px)",
              boxShadow: 3,
            },
          }}>
          <Box
            sx={{
              backgroundColor: "#e8f5e9",
              borderRadius: "50%",
              width: 60,
              height: 60,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
            }}>
            <ShoppingCart color="success" sx={{ fontSize: 30 }} />
          </Box>
          <Typography
            variant="h6"
            sx={{
              color: "#666",
              mb: 1,
              fontWeight: 500,
            }}>
            Total Purchases
          </Typography>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              color: "#2e7d32",
            }}>
            ₵{formatNumber(purchaseData?.totalPurchases?.toFixed(2) || "0.00")}
          </Typography>
        </Card>
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <Card
          elevation={2}
          sx={{
            p: 3,
            textAlign: "center",
            backgroundColor: "#ffffff",
            borderRadius: "12px",
            transition: "transform 0.2s",
            "&:hover": {
              transform: "translateY(-5px)",
              boxShadow: 3,
            },
          }}>
          <Box
            sx={{
              backgroundColor: "#e3f2fd",
              borderRadius: "50%",
              width: 60,
              height: 60,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
            }}>
            <Payment color="primary" sx={{ fontSize: 30 }} />
          </Box>
          <Typography
            variant="h6"
            sx={{
              color: "#666",
              mb: 1,
              fontWeight: 500,
            }}>
            Total Paid
          </Typography>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              color: "#1976d2",
            }}>
            ₵{formatNumber(purchaseData?.totalPaid?.toFixed(2) || "0.00")}
          </Typography>
        </Card>
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <Card
          elevation={2}
          sx={{
            p: 3,
            textAlign: "center",
            backgroundColor: "#ffffff",
            borderRadius: "12px",
            transition: "transform 0.2s",
            "&:hover": {
              transform: "translateY(-5px)",
              boxShadow: 3,
            },
          }}>
          <Box
            sx={{
              backgroundColor: "#ffebee",
              borderRadius: "50%",
              width: 60,
              height: 60,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
            }}>
            <AccountBalance color="error" sx={{ fontSize: 30 }} />
          </Box>
          <Typography
            variant="h6"
            sx={{
              color: "#666",
              mb: 1,
              fontWeight: 500,
            }}>
            Outstanding Balance
          </Typography>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              color: "#d32f2f",
            }}>
            ₵{formatNumber(purchaseData?.totalOutstanding?.toFixed(2) || "0.00")}
          </Typography>
        </Card>
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <Card
          elevation={2}
          sx={{
            p: 3,
            textAlign: "center",
            backgroundColor: "#ffffff",
            borderRadius: "12px",
            transition: "transform 0.2s",
            "&:hover": {
              transform: "translateY(-5px)",
              boxShadow: 3,
            },
          }}>
          <Box
            sx={{
              backgroundColor: "#fff3e0",
              borderRadius: "50%",
              width: 60,
              height: 60,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
            }}>
            <LocalShipping color="secondary" sx={{ fontSize: 30 }} />
          </Box>
          <Typography
            variant="h6"
            sx={{
              color: "#666",
              mb: 1,
              fontWeight: 500,
            }}>
            Pending Orders
          </Typography>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              color: "#f57c00",
            }}>
            {purchaseData?.pendingPurchases || 0}
          </Typography>
        </Card>
      </Grid>
    </Grid>
  );
};

// PurchaseTable Component
const PurchaseTable = ({ purchaseTransactions = [] }) => {
  const [order, setOrder] = useState("asc");
  const [orderBy, setOrderBy] = useState("date");

  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  const sortedTransactions = [...purchaseTransactions].sort((a, b) => {
    let comparator = 0;

    if (orderBy === "date") {
      const dateA = new Date(a.createdAt || a.date);
      const dateB = new Date(b.createdAt || b.date);
      if (isNaN(dateA.getTime()) && isNaN(dateB.getTime())) {
        comparator = 0;
      } else if (isNaN(dateA.getTime())) {
        comparator = 1;
      } else if (isNaN(dateB.getTime())) {
        comparator = -1;
      } else {
        comparator = dateA - dateB;
      }
    } else if (orderBy === "vendorName") {
      comparator = (a.vendorName || "").localeCompare(b.vendorName || "");
    } else if (orderBy === "balance") {
      comparator = (a.balance || 0) - (b.balance || 0);
    } else if (orderBy === "amountPaid") {
      comparator = (a.amountPaid || 0) - (b.amountPaid || 0);
    } else if (orderBy === "totalCost") {
      comparator = (a.totalCost || 0) - (b.totalCost || 0);
    }

    return comparator * (order === "asc" ? 1 : -1);
  });

  return (
    <TableContainer
      component={Paper}
      elevation={2}
      sx={{
        borderRadius: "12px",
        overflow: "hidden",
      }}>
      <Table>
        <StyledTableHead>
          <TableRow>
            <TableCell>
              <TableSortLabel
                active={orderBy === "date"}
                direction={orderBy === "date" ? order : "asc"}
                onClick={() => handleRequestSort("date")}>
                Date
              </TableSortLabel>
            </TableCell>
            <TableCell>
              <TableSortLabel
                active={orderBy === "vendorName"}
                direction={orderBy === "vendorName" ? order : "asc"}
                onClick={() => handleRequestSort("vendorName")}>
                Vendor
              </TableSortLabel>
            </TableCell>
            <TableCell align="right">
              <TableSortLabel
                active={orderBy === "workerName"}
                direction={orderBy === "workerName" ? order : "asc"}
                onClick={() => handleRequestSort("workerName")}>
                Restocked By
              </TableSortLabel>
            </TableCell>
            <TableCell align="right">
              <TableSortLabel
                active={orderBy === "totalCost"}
                direction={orderBy === "totalCost" ? order : "asc"}
                onClick={() => handleRequestSort("totalCost")}>
                Total Cost
              </TableSortLabel>
            </TableCell>
            <TableCell align="right">
              <TableSortLabel
                active={orderBy === "amountPaid"}
                direction={orderBy === "amountPaid" ? order : "asc"}
                onClick={() => handleRequestSort("amountPaid")}>
                Amount Paid
              </TableSortLabel>
            </TableCell>
            <TableCell align="right">
              <TableSortLabel
                active={orderBy === "balance"}
                direction={orderBy === "balance" ? order : "asc"}
                onClick={() => handleRequestSort("balance")}>
                Balance
              </TableSortLabel>
            </TableCell>
            <TableCell align="right">Status</TableCell>
          </TableRow>
        </StyledTableHead>
        <TableBody>
          <AnimatePresence>
            {sortedTransactions.map((transaction, index) => (
              <motion.tr
                key={transaction.id || index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{
                  duration: 0.3,
                  delay: index * 0.05,
                }}
                style={{
                  display: "table-row",
                  backgroundColor: "white",
                }}>
                <TableCell>
                  {transaction.createdAt || transaction.date
                    ? new Date(transaction.createdAt || transaction.date).toLocaleDateString()
                    : "N/A"
                  }
                </TableCell>
                <TableCell>
                  {capitalizeFirstLetter(transaction.vendorName || "Unknown Vendor")}
                </TableCell>
                <TableCell align="right">
                  {capitalizeFirstLetter(transaction.workerName || "N/A")}
                </TableCell>
                <TableCell align="right">
                  ₵{formatNumber((transaction.totalCost || 0).toFixed(2))}
                </TableCell>
                <TableCell align="right">
                  ₵{formatNumber((transaction.amountPaid || 0).toFixed(2))}
                </TableCell>
                <TableCell align="right">
                  ₵{formatNumber((transaction.balance || 0).toFixed(2))}
                </TableCell>
                <TableCell align="right">
                  <Typography
                    variant="body2"
                    sx={{
                      color: transaction.status === "completed" ? "#2e7d32" : "#f57c00",
                      fontWeight: 600,
                      textTransform: "capitalize",
                    }}>
                    {transaction.status || "pending"}
                  </Typography>
                </TableCell>
              </motion.tr>
            ))}
          </AnimatePresence>
        </TableBody>
      </Table>
    </TableContainer>
  );
};

// PurchaseReport Component
const PurchaseReport = ({ purchaseData, purchaseTransactions }) => {
  const [searchTerm, setSearchTerm] = useState("");

  const handleSearch = (term) => {
    setSearchTerm(term);
  };

  const filteredTransactions = useMemo(() => {
    if (!purchaseTransactions || !Array.isArray(purchaseTransactions)) {
      return [];
    }
    return purchaseTransactions.filter((transaction) => {
      const searchLower = searchTerm.toLowerCase();
      return (
        (transaction.vendorName || "").toLowerCase().includes(searchLower) ||
        (transaction.workerName || "").toLowerCase().includes(searchLower) ||
        (transaction.status || "").toLowerCase().includes(searchLower)
      );
    });
  }, [purchaseTransactions, searchTerm]);

  return (
    <Box sx={{ p: 3 }}>
      <Paper elevation={0} sx={{ p: 3, mb: 4, backgroundColor: "#f8f9fa" }}>
        <Typography
          variant="h4"
          sx={{
            fontWeight: 600,
            color: "#1a237e",
            mb: 3,
          }}>
          Purchase Report
        </Typography>
        <SummaryCards purchaseData={purchaseData} />
      </Paper>

      <Paper elevation={0} sx={{ p: 3, backgroundColor: "#f8f9fa" }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 3,
          }}>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 600,
              color: "#1a237e",
            }}>
            Purchase Transactions
          </Typography>
          <SearchField onSearch={handleSearch} />
        </Box>
        <PurchaseTable purchaseTransactions={filteredTransactions} />
      </Paper>
    </Box>
  );
};

export default PurchaseReport;