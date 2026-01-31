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
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Alert,
  Grid,
} from "@mui/material";
import { Add, Delete, Edit, Refresh } from "@mui/icons-material";
import { useSelector } from 'react-redux';
import { formatNumber } from "../config/Functions";
import Loader from '../components/common/Loader';

import FeatureGate from '../components/common/FeatureGate';
import { FEATURES } from '../config/plans';
import { useNavigate } from 'react-router-dom';

const Expenses = () => {
  const companyId = useSelector((state) => state.companyState.data?.id);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [summary, setSummary] = useState([]);
  const [period, setPeriod] = useState('month');

  // Dialog State
  const [open, setOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    category: 'General',
    date: new Date().toISOString().split('T')[0],
    description: '',
    paymentMethod: 'Cash',
  });

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/expenses/${companyId}`);
      if (!res.ok) throw new Error('Failed to fetch expenses');
      const data = await res.json();
      setExpenses(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/expenses/${companyId}/summary?period=${period}`);
      if (!res.ok) throw new Error('Failed to fetch summary');
      const data = await res.json();
      setSummary(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (companyId) {
      fetchExpenses();
      fetchSummary();
    }
  }, [companyId, period]);

  const handleSubmit = async () => {
    try {
      const url = isEdit 
        ? `${API_BASE_URL}/api/expenses/${selectedId}`
        : `${API_BASE_URL}/api/expenses`;
      
      const method = isEdit ? 'PUT' : 'POST';
      const body = { ...formData, companyId };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!res.ok) throw new Error('Failed to save expense');

      setOpen(false);
      fetchExpenses();
      fetchSummary();
      resetForm();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this expense?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/expenses/${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete expense');
      fetchExpenses();
      fetchSummary();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEdit = (expense) => {
    setIsEdit(true);
    setSelectedId(expense.id);
    setFormData({
      title: expense.title,
      amount: expense.amount,
      category: expense.category,
      date: expense.date.split('T')[0],
      description: expense.description,
      paymentMethod: expense.paymentMethod,
    });
    setOpen(true);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      amount: '',
      category: 'General',
      date: new Date().toISOString().split('T')[0],
      description: '',
      paymentMethod: 'Cash',
    });
    setIsEdit(false);
    setSelectedId(null);
  };

  if (loading && expenses.length === 0) return <Loader />;

  const totalExpenses = summary.reduce((acc, curr) => acc + curr.total, 0);

  return (
    <FeatureGate feature={FEATURES.EXPENSE_TRACKING} showLock={true}>
      <Box sx={{ p: 3, backgroundColor: '#f5f7fa', minHeight: '100vh' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" fontWeight="600" color="primary">
            Expenses
          </Typography>
          <Button 
            variant="contained" 
            startIcon={<Add />} 
            onClick={() => { resetForm(); setOpen(true); }}
            sx={{ borderRadius: 2 }}
          >
            Add Expense
          </Button>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={4}>
             <Paper sx={{ p: 3, borderRadius: 3, height: '100%' }} elevation={1}>
               <Typography color="textSecondary" variant="subtitle2">Total Expenses ({period})</Typography>
               <Typography variant="h3" fontWeight="bold" color="error.main" sx={{ mt: 1 }}>
                 ₵{formatNumber(totalExpenses)}
               </Typography>
               <FormControl size="small" sx={{ mt: 2, minWidth: 120 }}>
                 <Select value={period} onChange={(e) => setPeriod(e.target.value)}>
                   <MenuItem value="month">This Month</MenuItem>
                   <MenuItem value="year">This Year</MenuItem>
                   <MenuItem value="all">All Time</MenuItem>
                 </Select>
               </FormControl>
             </Paper>
          </Grid>
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 3, borderRadius: 3, height: '100%' }} elevation={1}>
              <Typography variant="h6" gutterBottom>Category Breakdown</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {summary.map((item) => (
                  <Chip 
                    key={item.category} 
                    label={`${item.category}: ₵${formatNumber(item.total)}`} 
                    color="default" 
                    variant="outlined" 
                    sx={{ borderRadius: 2 }} 
                  />
                ))}
                {summary.length === 0 && <Typography color="textSecondary">No data available for this period.</Typography>}
              </Box>
            </Paper>
          </Grid>
        </Grid>

        <TableContainer component={Paper} sx={{ borderRadius: 3 }} elevation={1}>
          <Table>
            <TableHead sx={{ backgroundColor: '#f4f6f8' }}>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Title</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Method</TableCell>
                <TableCell align="right">Amount</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {expenses.map((expense) => (
                <TableRow key={expense.id} hover>
                  <TableCell>{new Date(expense.date).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="500">{expense.title}</Typography>
                    <Typography variant="caption" color="textSecondary">{expense.description}</Typography>
                  </TableCell>
                  <TableCell><Chip label={expense.category} size="small" /></TableCell>
                  <TableCell>{expense.paymentMethod}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>₵{formatNumber(expense.amount)}</TableCell>
                  <TableCell align="right">
                    <IconButton onClick={() => handleEdit(expense)} color="primary" size="small"><Edit /></IconButton>
                    <IconButton onClick={() => handleDelete(expense.id)} color="error" size="small"><Delete /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {expenses.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                    <Typography color="textSecondary">No expenses found.</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>{isEdit ? 'Edit Expense' : 'Add New Expense'}</DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth label="Title" 
                  value={formData.title} 
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth label="Amount" type="number"
                  value={formData.amount} 
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth label="Date" type="date"
                  value={formData.date} 
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                />
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={formData.category}
                    label="Category"
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                  >
                    <MenuItem value="General">General</MenuItem>
                    <MenuItem value="Utilities">Utilities</MenuItem>
                    <MenuItem value="Rent">Rent</MenuItem>
                    <MenuItem value="Supplies">Supplies</MenuItem>
                    <MenuItem value="Salaries">Salaries</MenuItem>
                    <MenuItem value="Marketing">Marketing</MenuItem>
                    <MenuItem value="Travel">Travel</MenuItem>
                    <MenuItem value="Maintenance">Maintenance</MenuItem>
                    <MenuItem value="Other">Other</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>Payment Method</InputLabel>
                  <Select
                    value={formData.paymentMethod}
                    label="Payment Method"
                    onChange={(e) => setFormData({...formData, paymentMethod: e.target.value})}
                  >
                    <MenuItem value="Cash">Cash</MenuItem>
                    <MenuItem value="Bank Transfer">Bank Transfer</MenuItem>
                    <MenuItem value="Mobile Money">Mobile Money</MenuItem>
                    <MenuItem value="Cheque">Cheque</MenuItem>
                    <MenuItem value="Card">Card</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth label="Description" multiline rows={3}
                  value={formData.description} 
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} variant="contained">Save</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </FeatureGate>
  );
};

export default Expenses;
