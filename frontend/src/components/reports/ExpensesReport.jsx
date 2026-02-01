import React, { useState, useMemo } from "react";
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
  TrendingDown,
  Receipt,
} from "@mui/icons-material";
import { motion, AnimatePresence } from "framer-motion";

export const StyledTableHead = styled(TableHead)(({ theme }) => ({
  backgroundColor: "#d32f2f", 
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
    backgroundColor: "#b71c1c",
  },
  "& th .MuiTableSortLabel-root:hover": {
    color: "white",
  },
}));

// SummaryCards Component
const SummaryCards = ({ summary }) => {
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
            <TrendingDown color="error" sx={{ fontSize: 30 }} />
          </Box>
          <Typography
            variant="h6"
            sx={{
              color: "#666",
              mb: 1,
              fontWeight: 500,
            }}>
            Total Expenses
          </Typography>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              color: "#d32f2f",
            }}>
            ₵{formatNumber(summary?.totalExpenses?.toFixed(2) || '0.00')}
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
              backgroundColor: "#eceff1",
              borderRadius: "50%",
              width: 60,
              height: 60,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
            }}>
            <Receipt color="action" sx={{ fontSize: 30 }} />
          </Box>
          <Typography
            variant="h6"
            sx={{
              color: "#666",
              mb: 1,
              fontWeight: 500,
            }}>
            Total Count
          </Typography>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              color: "#546e7a",
            }}>
            {formatNumber(summary?.count || 0)}
          </Typography>
        </Card>
      </Grid>
    </Grid>
  );
};

// ExpensesTable Component
const ExpensesTable = ({ expenses = [] }) => {
  const [order, setOrder] = useState("desc");
  const [orderBy, setOrderBy] = useState("date");

  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  const sortedExpenses = [...expenses].sort((a, b) => {
    let comparator = 0;

    if (orderBy === "date") {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      if (isNaN(dateA.getTime()) && isNaN(dateB.getTime())) comparator = 0;
      else if (isNaN(dateA.getTime())) comparator = 1;
      else if (isNaN(dateB.getTime())) comparator = -1;
      else comparator = dateA - dateB;
    } else if (orderBy === "title") {
      comparator = (a.title || "").localeCompare(b.title || "");
    } else if (orderBy === "category") {
      comparator = (a.category || "").localeCompare(b.category || "");
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
                active={orderBy === "title"}
                direction={orderBy === "title" ? order : "asc"}
                onClick={() => handleRequestSort("title")}>
                Title
              </TableSortLabel>
            </TableCell>
            <TableCell>
              <TableSortLabel
                active={orderBy === "category"}
                direction={orderBy === "category" ? order : "asc"}
                onClick={() => handleRequestSort("category")}>
                Category
              </TableSortLabel>
            </TableCell>
             <TableCell>
                Payment Method
            </TableCell>
            <TableCell align="right">
              <TableSortLabel
                active={orderBy === "amount"}
                direction={orderBy === "amount" ? order : "asc"}
                onClick={() => handleRequestSort("amount")}>
                Amount
              </TableSortLabel>
            </TableCell>
          </TableRow>
        </StyledTableHead>
        <TableBody>
          <AnimatePresence mode="popLayout">
            {sortedExpenses.map((expense, index) => (
              <motion.tr
                key={expense.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{
                  duration: 0.2,
                  delay: index * 0.02,
                  ease: "easeOut",
                }}
                style={{
                  display: "table-row",
                  backgroundColor: "white",
                }}>
                <TableCell>
                  {expense.date && !isNaN(new Date(expense.date).getTime()) 
                    ? new Date(expense.date).toLocaleDateString()
                    : "Invalid Date"
                  }
                </TableCell>
                <TableCell>
                  {capitalizeFirstLetter(expense.title)}
                </TableCell>
                <TableCell>
                  {capitalizeFirstLetter(expense.category || 'General')}
                </TableCell>
                <TableCell>
                  {capitalizeFirstLetter(expense.paymentMethod || 'Cash')}
                </TableCell>
                <TableCell align="right">
                  ₵{formatNumber((expense.amount || 0).toFixed(2))}
                </TableCell>
              </motion.tr>
            ))}
          </AnimatePresence>
        </TableBody>
      </Table>
    </TableContainer>
  );
};

// ExpensesReport Component
const ExpensesReport = ({ expenses, summary }) => {
  const [searchTerm, setSearchTerm] = useState("");

  const handleSearch = (term) => {
    setSearchTerm(term);
  };

  const filteredExpenses = useMemo(() => {
    return expenses.filter((expense) => {
      const searchLower = searchTerm.toLowerCase();
      return (
        (expense.title || '').toLowerCase().includes(searchLower) ||
        (expense.category || '').toLowerCase().includes(searchLower)
      );
    });
  }, [expenses, searchTerm]);

  return (
    <Box sx={{ p: 3 }}>
      <Paper elevation={0} sx={{ p: 3, mb: 4, backgroundColor: "#f8f9fa" }}>
        <Typography
          variant="h4"
          sx={{
            fontWeight: 600,
            color: "#b71c1c",
            mb: 3,
          }}>
          Expenses Report
        </Typography>
        <SummaryCards summary={summary} />
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
              color: "#b71c1c",
            }}>
            Expense Transactions
          </Typography>
          <SearchField onSearch={handleSearch} />
        </Box>
        <ExpensesTable expenses={filteredExpenses} />
      </Paper>
    </Box>
  );
};

export default ExpensesReport;
