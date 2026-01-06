import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  TextField,
  MenuItem,
  IconButton,
  Typography,
  Grid,
  Select,
  FormControl,
  InputLabel,
  InputAdornment
} from '@mui/material';
import { FieldArray } from 'formik';

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'mobile_money', label: 'Mobile Money' },
  { value: 'card', label: 'Card' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'credit', label: 'Credit (Debt)' }
];

const PaymentInput = ({ values, setFieldValue, totalAmount }) => {
  // Initialize payments if empty or legacy format
  useEffect(() => {
    if (!values.payments || values.payments.length === 0) {
      // If legacy 'amountPaid' exists, migrate it
      if (values.amountPaid && parseFloat(values.amountPaid) > 0) {
        setFieldValue('payments', [{
          method: values.paymentMethod || 'cash',
          amount: values.amountPaid,
          reference: ''
        }]);
      } else {
         // Default start with one row
         setFieldValue('payments', [{ method: 'cash', amount: '', reference: '' }]);
      }
    }
  }, []);

  // Sync payments back to legacy fields for backward compatibility/validation
  useEffect(() => {
     if (values.payments && values.payments.length > 0) {
         const totalPaid = values.payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
         setFieldValue('amountPaid', totalPaid);
         
         // If multiple methods, set legacy method to 'split', else use the single method
         if (values.payments.length > 1) {
             setFieldValue('paymentMethod', 'split');
         } else {
             setFieldValue('paymentMethod', values.payments[0].method);
         }
     }
  }, [values.payments]);

  const totalPaid = values.payments?.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0) || 0;
  const remaining = Math.max(0, totalAmount - totalPaid);

  return (
    <Box sx={{ mt: 2, p: 2, border: '1px solid #e0e0e0', borderRadius: 2, bgcolor: '#fafafa' }}>
      <Typography variant="h6" gutterBottom color="primary">Payment Details</Typography>
      
      <FieldArray name="payments">
        {({ push, remove }) => (
          <>
            {values.payments?.map((payment, index) => (
              <Grid container spacing={2} key={index} alignItems="center" sx={{ mb: 1 }}>
                <Grid item xs={4}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Method</InputLabel>
                    <Select
                      value={payment.method}
                      label="Method"
                      onChange={(e) => setFieldValue(`payments.${index}.method`, e.target.value)}
                    >
                      {PAYMENT_METHODS.map((method) => (
                        <MenuItem key={method.value} value={method.value}>
                          {method.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={3}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Amount"
                    type="number"
                    value={payment.amount}
                    onChange={(e) => setFieldValue(`payments.${index}.amount`, e.target.value)}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">GHC</InputAdornment>,
                    }}
                  />
                </Grid>
                <Grid item xs={4}>
                   {payment.method !== 'cash' && (
                       <TextField
                        fullWidth
                        size="small"
                        label="Ref/Trans ID"
                        value={payment.reference || ''}
                        onChange={(e) => setFieldValue(`payments.${index}.reference`, e.target.value)}
                       />
                   )}
                </Grid>
                <Grid item xs={1}>
                  <IconButton 
                    color="error" 
                    onClick={() => remove(index)}
                    disabled={values.payments.length === 1}
                  >
                    <i className='bx bx-trash'></i>
                  </IconButton>
                </Grid>
              </Grid>
            ))}
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
              <Button
                variant="outlined"
                startIcon={<i className='bx bx-plus'></i>}
                onClick={() => {
                   // Auto-fill remaining amount if valid
                   const left = Math.max(0, totalAmount - totalPaid);
                   push({ method: 'cash', amount: left > 0 ? left : '', reference: '' });
                }}
              >
                Add Payment Method
              </Button>
              
              <Box sx={{ textAlign: 'right' }}>
                 <Typography variant="body2" color="textSecondary">
                    Total Paid: <strong>GHC {totalPaid.toFixed(2)}</strong>
                 </Typography>
                 <Typography variant="body2" color={remaining > 0 ? "error" : "success"}>
                    Remaining: <strong>GHC {remaining.toFixed(2)}</strong>
                 </Typography>
              </Box>
            </Box>
          </>
        )}
      </FieldArray>
    </Box>
  );
};

export default PaymentInput;
