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
  Tabs,
  Tab,
  Chip,
} from "@mui/material";
import SearchField from "../../hooks/SearchField";
import { capitalizeFirstLetter, formatNumber } from "../../config/Functions";
import { styled } from "@mui/material/styles";
import {
  AccountBalance,
  TrendingUp,
  Payment,
  Warning,
  People,
  Business,
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

// Customer Debts Summary Cards
const CustomerDebtSummaryCards = ({ debtData }) => {
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
            Total Customer Debts
          </Typography>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              color: "#d32f2f",
            }}>
            ₵{formatNumber(debtData?.totalDebts?.toFixed(2) || "0.00")}
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
            <Warning color="secondary" sx={{ fontSize: 30 }} />
          </Box>
          <Typography
            variant="h6"
            sx={{
              color: "#666",
              mb: 1,
              fontWeight: 500,
            }}>
            Pending Debts
          </Typography>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              color: "#f57c00",
            }}>
            {debtData?.pendingDebts || 0}
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
            <People color="primary" sx={{ fontSize: 30 }} />
          </Box>
          <Typography
            variant="h6"
            sx={{
              color: "#666",
              mb: 1,
              fontWeight: 500,
            }}>
            Total Debtors
          </Typography>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              color: "#1976d2",
            }}>
            {debtData?.totalDebtsCount || 0}
          </Typography>
        </Card>
      </Grid>
    </Grid>
  );
};

// Vendor Debts Summary Cards
const VendorDebtSummaryCards = ({ vendorDebtData }) => {
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
              backgroundColor: "#ffebee",
              borderRadius: "50%",
              width: 60,
              height: 60,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
            }}>
            <Business color="error" sx={{ fontSize: 30 }} />
          </Box>
          <Typography
            variant="h6"
            sx={{
              color: "#666",
              mb: 1,
              fontWeight: 500,
            }}>
            Total Vendor Debts
          </Typography>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              color: "#d32f2f",
            }}>
            ₵{formatNumber(vendorDebtData?.totalOutstanding?.toFixed(2) || "0.00")}
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
              backgroundColor: "#e8f5e9",
              borderRadius: "50%",
              width: 60,
              height: 60,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
            }}>
            <Payment color="success" sx={{ fontSize: 30 }} />
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
              color: "#2e7d32",
            }}>
            ₵{formatNumber(vendorDebtData?.totalPaid?.toFixed(2) || "0.00")}
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
            <Warning color="secondary" sx={{ fontSize: 30 }} />
          </Box>
          <Typography
            variant="h6"
            sx={{
              color: "#666",
              mb: 1,
              fontWeight: 500,
            }}>
            Pending Payments
          </Typography>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              color: "#f57c00",
            }}>
            {vendorDebtData?.pendingPurchases || 0}
          </Typography>
        </Card>
      </Grid>
    </Grid>
  );
};

// Customer Debts Table
const CustomerDebtsTable = ({ debts = [] }) => {
  const [order, setOrder] = useState("asc");
  const [orderBy, setOrderBy] = useState("date");

  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  const sortedDebts = [...debts].sort((a, b) => {
    let comparator = 0;

    if (orderBy === "date") {
      const dateA = new Date(a.createdAt);
      const dateB = new Date(b.createdAt);
      comparator = dateA - dateB;
    } else if (orderBy === "customerName") {
      comparator = (a.customerName || "").localeCompare(b.customerName || "");
    } else if (orderBy === "amount") {
      comparator = (a.amount || 0) - (b.amount || 0);
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
                active={orderBy === "customerName"}
                direction={orderBy === "customerName" ? order : "asc"}
                onClick={() => handleRequestSort("customerName")}>
                Customer
              </TableSortLabel>
            </TableCell>
            <TableCell align="right">
              Phone
            </TableCell>
            <TableCell align="right">
              <TableSortLabel
                active={orderBy === "amount"}
                direction={orderBy === "amount" ? order : "asc"}
                onClick={() => handleRequestSort("amount")}>
                Amount Owed
              </TableSortLabel>
            </TableCell>
            <TableCell align="right">Status</TableCell>
            <TableCell align="right">Handled By</TableCell>
          </TableRow>
        </StyledTableHead>
        <TableBody>
          <AnimatePresence>
            {sortedDebts.map((debt, index) => (
              <motion.tr
                key={debt.id || index}
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
                  {debt.createdAt
                    ? new Date(debt.createdAt).toLocaleDateString()
                    : "N/A"
                  }
                </TableCell>
                <TableCell>
                  {capitalizeFirstLetter(debt.customerName || "Unknown Customer")}
                </TableCell>
                <TableCell align="right">
                  {debt.customerPhone || "N/A"}
                </TableCell>
                <TableCell align="right">
                  ₵{formatNumber((debt.amount || 0).toFixed(2))}
                </TableCell>
                <TableCell align="right">
                  <Chip
                    label={debt.status || "pending"}
                    color={debt.status === "paid" ? "success" : "warning"}
                    size="small"
                    sx={{ textTransform: "capitalize" }}
                  />
                </TableCell>
                <TableCell align="right">
                  {capitalizeFirstLetter(debt.workerName || "N/A")}
                </TableCell>
              </motion.tr>
            ))}
          </AnimatePresence>
        </TableBody>
      </Table>
    </TableContainer>
  );
};

// Vendor Debts Table
const VendorDebtsTable = ({ vendorDebts = [] }) => {
  const [order, setOrder] = useState("asc");
  const [orderBy, setOrderBy] = useState("date");

  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  const sortedDebts = [...vendorDebts].sort((a, b) => {
    let comparator = 0;

    if (orderBy === "date") {
      const dateA = new Date(a.createdAt);
      const dateB = new Date(b.createdAt);
      comparator = dateA - dateB;
    } else if (orderBy === "vendorName") {
      comparator = (a.vendorName || "").localeCompare(b.vendorName || "");
    } else if (orderBy === "balance") {
      comparator = (a.balance || 0) - (b.balance || 0);
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
              Phone
            </TableCell>
            <TableCell align="right">
              Total Cost
            </TableCell>
            <TableCell align="right">
              Amount Paid
            </TableCell>
            <TableCell align="right">
              <TableSortLabel
                active={orderBy === "balance"}
                direction={orderBy === "balance" ? order : "asc"}
                onClick={() => handleRequestSort("balance")}>
                Balance Owed
              </TableSortLabel>
            </TableCell>
            <TableCell align="right">Status</TableCell>
          </TableRow>
        </StyledTableHead>
        <TableBody>
          <AnimatePresence>
            {sortedDebts.map((debt, index) => (
              <motion.tr
                key={debt.id || index}
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
                  {debt.createdAt
                    ? new Date(debt.createdAt).toLocaleDateString()
                    : "N/A"
                  }
                </TableCell>
                <TableCell>
                  {capitalizeFirstLetter(debt.vendorName || "Unknown Vendor")}
                </TableCell>
                <TableCell align="right">
                  {debt.vendorPhone || "N/A"}
                </TableCell>
                <TableCell align="right">
                  ₵{formatNumber((debt.totalCost || 0).toFixed(2))}
                </TableCell>
                <TableCell align="right">
                  ₵{formatNumber((debt.amountPaid || 0).toFixed(2))}
                </TableCell>
                <TableCell align="right">
                  ₵{formatNumber((debt.balance || 0).toFixed(2))}
                </TableCell>
                <TableCell align="right">
                  <Chip
                    label={debt.status || "pending"}
                    color={debt.status === "completed" ? "success" : "warning"}
                    size="small"
                    sx={{ textTransform: "capitalize" }}
                  />
                </TableCell>
              </motion.tr>
            ))}
          </AnimatePresence>
        </TableBody>
      </Table>
    </TableContainer>
  );
};

// Main DebtsReports Component
const DebtsReports = ({ debtData, vendorDebtData, customerDebts, vendorDebts }) => {
  const [tabValue, setTabValue] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    setSearchTerm(""); // Reset search when switching tabs
  };

  const handleSearch = (term) => {
    setSearchTerm(term);
  };

  const filteredCustomerDebts = useMemo(() => {
    if (!customerDebts || !Array.isArray(customerDebts)) {
      return [];
    }
    return customerDebts.filter((debt) => {
      const searchLower = searchTerm.toLowerCase();
      return (
        (debt.customerName || "").toLowerCase().includes(searchLower) ||
        (debt.customerPhone || "").toLowerCase().includes(searchLower) ||
        (debt.workerName || "").toLowerCase().includes(searchLower)
      );
    });
  }, [customerDebts, searchTerm]);

  const filteredVendorDebts = useMemo(() => {
    if (!vendorDebts || !Array.isArray(vendorDebts)) {
      return [];
    }
    return vendorDebts.filter((debt) => {
      const searchLower = searchTerm.toLowerCase();
      return (
        (debt.vendorName || "").toLowerCase().includes(searchLower) ||
        (debt.vendorPhone || "").toLowerCase().includes(searchLower) ||
        (debt.status || "").toLowerCase().includes(searchLower)
      );
    });
  }, [vendorDebts, searchTerm]);

  return (
    <Box sx={{ p: 3 }}>
      <Typography
        variant="h4"
        sx={{
          fontWeight: 600,
          color: "#1a237e",
          mb: 3,
        }}>
        Debts Report
      </Typography>

      <Paper elevation={0} sx={{ mb: 4 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          sx={{
            borderBottom: 1,
            borderColor: "divider",
            "& .MuiTab-root": {
              fontWeight: 600,
              fontSize: "1rem",
            },
          }}>
          <Tab label="Customer Debts" />
          <Tab label="Vendor Debts" />
        </Tabs>
      </Paper>

      {tabValue === 0 && (
        <>
          <Paper elevation={0} sx={{ p: 3, mb: 4, backgroundColor: "#f8f9fa" }}>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 600,
                color: "#1a237e",
                mb: 3,
              }}>
              Customer Debts Summary
            </Typography>
            <CustomerDebtSummaryCards debtData={debtData} />
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
                Customer Debt Details
              </Typography>
              <SearchField onSearch={handleSearch} />
            </Box>
            <CustomerDebtsTable debts={filteredCustomerDebts} />
          </Paper>
        </>
      )}

      {tabValue === 1 && (
        <>
          <Paper elevation={0} sx={{ p: 3, mb: 4, backgroundColor: "#f8f9fa" }}>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 600,
                color: "#1a237e",
                mb: 3,
              }}>
              Vendor Debts Summary
            </Typography>
            <VendorDebtSummaryCards vendorDebtData={vendorDebtData} />
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
                Vendor Debt Details
              </Typography>
              <SearchField onSearch={handleSearch} />
            </Box>
            <VendorDebtsTable vendorDebts={filteredVendorDebts} />
          </Paper>
        </>
      )}
    </Box>
  );
};

export default DebtsReports;