import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHead,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Alert,
  AlertTitle,
  Collapse
} from '@mui/material';
import {
  Description as DescriptionIcon,
  AccountBalance as AccountBalanceIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  NotificationImportant as AlertIcon
} from '@mui/icons-material';

import { API_BASE_URL } from '../config/constants';

const TaxDashboard = () => {
  const company = useSelector((state) => state.companyState.company);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [advice, setAdvice] = useState([]);
  const [period, setPeriod] = useState('this_month');
  const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' });

  useEffect(() => {
    if (company?.id) {
      fetchTaxSummary();
    }
  }, [period, company?.id]);

  const fetchTaxSummary = async () => {
    if (!company?.id) return;
    
    setLoading(true);
    try {
      let startDate, endDate;
      const today = new Date();
      
      if (period === 'this_month') {
        startDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
      } else if (period === 'last_month') {
        startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString().split('T')[0];
        endDate = new Date(today.getFullYear(), today.getMonth(), 0).toISOString().split('T')[0];
      } else if (period === 'this_year') {
        startDate = new Date(today.getFullYear(), 0, 1).toISOString().split('T')[0];
        endDate = new Date(today.getFullYear(), 11, 31).toISOString().split('T')[0];
      }

      const response = await axios.get(`${API_BASE_URL}/api/tax/summary`, {
        params: {
          companyId: company.id,
          startDate,
          endDate
        }
      });

      setSummary(response.data);

      // Fetch Advice
      const adviceParams = {}; // Could pass companyId if needed, but endpoint is general or uses query
      const adviceResp = await axios.get(`${API_BASE_URL}/api/tax/advice`);
      setAdvice(adviceResp.data);

    } catch (error) {
      console.error('Error fetching tax summary:', error);
      toast.error('Failed to load tax summary');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    try {
      const today = new Date();
      const response = await axios.get(`${API_BASE_URL}/api/tax/report/gra`, {
        params: {
          companyId: company.id,
          month: today.getMonth() + 1,
          year: today.getFullYear()
        }
      });
      
      // In a real app, this would trigger a PDF download or show a modal
      console.log('GRA Report Data:', response.data);
      toast.success('GRA Report generated successfully (Check Console)');
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate GRA report');
    }
  };

  const StatCard = ({ title, value, icon, color, subtitle }) => (
    <Card elevation={2} sx={{ height: '100%' }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography color="textSecondary" gutterBottom variant="subtitle2">
              {title}
            </Typography>
            <Typography variant="h4" component="div" sx={{ fontWeight: 'bold', my: 1 }}>
              {company?.currency?.symbol || '₵'}{typeof value === 'number' ? value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="textSecondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          <Box 
            sx={{ 
              backgroundColor: `${color}20`, 
              borderRadius: '50%', 
              p: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      style={{ padding: '24px' }}
    >
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Tax Dashboard
          </Typography>
          <Typography variant="body1" color="textSecondary">
            Monitor your VAT liability and generate GRA reports
          </Typography>
        </Box>
        
        <Box display="flex" gap={2}>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Period</InputLabel>
            <Select
              value={period}
              label="Period"
              onChange={(e) => setPeriod(e.target.value)}
            >
              <MenuItem value="this_month">This Month</MenuItem>
              <MenuItem value="last_month">Last Month</MenuItem>
              <MenuItem value="this_year">This Year</MenuItem>
            </Select>
          </FormControl>
          
          <Button 
            variant="contained" 
            color="primary" 
            startIcon={<DescriptionIcon />}
            onClick={handleGenerateReport}
          >
            Generate GRA Report
          </Button>
        </Box>
      </Box>

      {/* Smart Alerts Section */}
      {advice.length > 0 && (
        <Box mb={4}>
            {advice.map((alert, index) => (
                <Alert 
                    key={index} 
                    severity={alert.severity || 'warning'} 
                    icon={<AlertIcon />}
                    sx={{ mb: 1 }}
                >
                    <AlertTitle>{alert.title}</AlertTitle>
                    {alert.message}
                </Alert>
            ))}
        </Box>
      )}

      {/* Status Banner */}
      <Paper 
        elevation={0} 
        sx={{ 
          p: 2, 
          mb: 4, 
          backgroundColor: summary?.settings?.isUmbrellaChild ? '#e3f2fd' : (summary?.settings?.isUmbrellaParent ? '#f3e5f5' : '#f5f5f5'), 
          border: '1px solid',
          borderColor: summary?.settings?.isUmbrellaChild ? '#90caf9' : (summary?.settings?.isUmbrellaParent ? '#ce93d8' : '#e0e0e0'),
          borderRadius: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 2
        }}
      >
        <AccountBalanceIcon color={summary?.settings?.isUmbrellaParent ? "secondary" : "primary"} />
        <Box>
          <Typography variant="subtitle1" fontWeight="bold">
            Tax Mode: {summary?.settings?.isUmbrellaChild ? 'Umbrella Child (Managed)' : (summary?.settings?.isUmbrellaParent ? 'Umbrella Parent (Network Manager)' : 'Independent Entity')}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            {summary?.settings?.isUmbrellaChild 
              ? `Your VAT compliance is managed by your Parent Company (ID: ${summary?.summary?.parentCompanyId}).` 
              : (summary?.settings?.isUmbrellaParent 
                  ? `You are managing tax compliance for ${summary?.settings?.childCount} child companies.` 
                  : 'You are responsible for filing your own VAT returns with the GRA.')}
          </Typography>
        </Box>
        <Box flexGrow={1} />
        {summary?.settings?.isUmbrellaParent && (
          <Chip 
            label={`${summary?.settings?.childCount} Linked Stores`} 
            color="secondary" 
            variant="filled" 
            size="small" 
            sx={{ mr: 1 }}
          />
        )}
        <Chip 
          label={summary?.settings?.taxIdType || 'TIN'} 
          color={summary?.settings?.isUmbrellaParent ? "secondary" : "primary"}
          variant="outlined" 
          size="small" 
        />
        <Typography variant="body2" fontWeight="bold">
          {summary?.settings?.taxId || 'N/A'}
        </Typography>
      </Paper>

      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} md={3}>
          <StatCard 
            title={summary?.settings?.isUmbrellaParent ? "Network Sales (Inclusive)" : "Total Sales (Inclusive)"}
            value={summary?.summary?.totalSales} 
            icon={<TrendingUpIcon sx={{ color: '#2e7d32' }} />}
            color="#2e7d32"
            subtitle={summary?.settings?.isUmbrellaParent ? "Aggregated across all stores" : "Gross revenue for period"}
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <StatCard 
            title="Output VAT (Collected)" 
            value={summary?.summary?.outputVat} 
            icon={<TrendingUpIcon sx={{ color: '#ed6c02' }} />}
            color="#ed6c02"
            subtitle={`Based on ${summary?.settings?.taxRate || 0}% rate`}
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <StatCard 
            title="Input VAT (Paid)" 
            value={summary?.summary?.inputVat} 
            icon={<TrendingDownIcon sx={{ color: '#0288d1' }} />}
            color="#0288d1"
            subtitle="Claimable credits"
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <StatCard 
            title={summary?.settings?.isUmbrellaParent ? "Consolidated Liability" : "Net VAT Liability"}
            value={summary?.summary?.netLiability} 
            icon={<AccountBalanceIcon sx={{ color: '#d32f2f' }} />}
            color="#d32f2f"
            subtitle={summary?.settings?.isUmbrellaChild ? "Payable by Parent" : "Amount due to GRA"}
          />
        </Grid>
      </Grid>

      {/* Recent Transactions Table Placeholder */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Recent Taxable Transactions
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Receipt ID</TableCell>
                  <TableCell align="right">Total Amount</TableCell>
                  <TableCell align="right">VAT Amount</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <Typography color="textSecondary" py={3}>
                      Transaction details loading... (Placeholder)
                    </Typography>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default TaxDashboard;
