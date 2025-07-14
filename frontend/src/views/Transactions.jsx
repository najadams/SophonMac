import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  TextField,
  InputAdornment,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Card,
  CardContent,
} from "@mui/material";
import { Search, TrendingUp, TrendingDown, AccountBalance, Inventory } from "@mui/icons-material";
import { formatNumber } from "../config/Functions";
import { useSelector } from 'react-redux';

const Transactions = () => {
  const companyId = useSelector((state) => state.companyState.data?.id);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch transactions from API
  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (typeFilter !== 'all') params.append('type', typeFilter);
      
      const response = await fetch(`${API_BASE_URL}/api/transactions/${companyId}?${params}`);
      if (!response.ok) throw new Error('Failed to fetch transactions');
      
      const data = await response.json();
      setTransactions(data);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch transaction summary
  const fetchSummary = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/transactions/${companyId}/summary?period=today`);
      if (!response.ok) throw new Error('Failed to fetch summary');
      
      const data = await response.json();
      setSummary(data);
    } catch (err) {
      console.error('Error fetching summary:', err);
    }
  };

  useEffect(() => {
    if (companyId) {
      fetchTransactions();
      fetchSummary();
    }
  }, [companyId, searchQuery, typeFilter]);

  const getTypeColor = (type) => {
    switch (type) {
      case 'Sale': return 'success';
      case 'Debt Payment': return 'primary';
      case 'Vendor Payment': return 'warning';
      case 'Restock': return 'info';
      default: return 'default';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed': return 'success';
      case 'Partial': return 'warning';
      case 'Pending': return 'error';
      default: return 'default';
    }
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const filteredTransactions = transactions;

  if (loading) {
    return (
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ 
      p: 2, 
      height: '95vh', 
      overflow: 'auto',
      backgroundColor: '#f5f5f5',
    }}>
      <Paper elevation={0} sx={{ 
        p: 3, 
        backgroundColor: "#f8f9fa",
        maxWidth: '100%',
        margin: '0 auto'
      }}>
        <Typography
          variant="h4"
          gutterBottom
          sx={{
            fontWeight: 600,
            color: "#1a237e",
            mb: 3,
          }}>
          Transactions
        </Typography>

        {/* Summary Cards */}
        {summary && (
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography color="textSecondary" gutterBottom variant="body2">
                        Today's Sales
                      </Typography>
                      <Typography variant="h6">
                        ₵{formatNumber(summary.totalSalesReceived)}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        {summary.salesCount} transactions
                      </Typography>
                    </Box>
                    <TrendingUp color="success" />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography color="textSecondary" gutterBottom variant="body2">
                        Debt Payments
                      </Typography>
                      <Typography variant="h6">
                        ₵{formatNumber(summary.totalDebtPayments)}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        {summary.debtPaymentCount} payments
                      </Typography>
                    </Box>
                    <AccountBalance color="primary" />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography color="textSecondary" gutterBottom variant="body2">
                        Vendor Payments
                      </Typography>
                      <Typography variant="h6">
                        ₵{formatNumber(summary.totalVendorPayments)}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        {summary.vendorPaymentCount} payments
                      </Typography>
                    </Box>
                    <TrendingDown color="warning" />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography color="textSecondary" gutterBottom variant="body2">
                        Restocks
                      </Typography>
                      <Typography variant="h6">
                        ₵{formatNumber(summary.totalRestockCost)}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        {summary.restockCount} restocks
                      </Typography>
                    </Box>
                    <Inventory color="info" />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Search and Filter Bar */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {/* <Grid item xs={12} md={8}>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Search transactions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
            />
          </Grid> */}
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Transaction Type</InputLabel>
              <Select
                value={typeFilter}
                label="Transaction Type"
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <MenuItem value="all">All Types</MenuItem>
                <MenuItem value="Sale">Sales</MenuItem>
                <MenuItem value="Debt Payment">Debt Payments</MenuItem>
                <MenuItem value="Vendor Payment">Vendor Payments</MenuItem>
                <MenuItem value="Restock">Restocks</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        {/* Transactions Table */}
        <TableContainer 
          component={Paper} 
          elevation={0}
          sx={{
            maxHeight: '60vh',
            overflow: 'auto',
            '&::-webkit-scrollbar': {
              width: '8px',
            },
            '&::-webkit-scrollbar-track': {
              backgroundColor: '#f1f1f1',
              borderRadius: '4px',
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: '#c1c1c1',
              borderRadius: '4px',
              '&:hover': {
                backgroundColor: '#a8a8a8',
              },
            },
          }}
        >
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ backgroundColor: '#fff', fontWeight: 600 }}>Date</TableCell>
                <TableCell sx={{ backgroundColor: '#fff', fontWeight: 600 }}>Type</TableCell>
                <TableCell sx={{ backgroundColor: '#fff', fontWeight: 600 }}>Reference</TableCell>
                <TableCell sx={{ backgroundColor: '#fff', fontWeight: 600 }}>Amount</TableCell>
                <TableCell sx={{ backgroundColor: '#fff', fontWeight: 600 }}>Payment Method</TableCell>
                <TableCell sx={{ backgroundColor: '#fff', fontWeight: 600 }}>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredTransactions
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((transaction) => (
                  <TableRow 
                    key={transaction.id}
                    sx={{
                      '&:hover': {
                        backgroundColor: '#f5f5f5',
                      },
                    }}
                  >
                    <TableCell>
                      {new Date(transaction.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={transaction.type}
                        color={getTypeColor(transaction.type)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{transaction.reference}</TableCell>
                    <TableCell>₵{formatNumber(transaction.amount)}</TableCell>
                    <TableCell>{transaction.paymentMethod}</TableCell>
                    <TableCell>
                      <Chip
                        label={transaction.status}
                        color={getStatusColor(transaction.status)}
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination */}
        <TablePagination
          component="div"
          count={filteredTransactions.length}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[5, 10, 25]}
        />
      </Paper>
    </Box>
  );
};

export default Transactions;
