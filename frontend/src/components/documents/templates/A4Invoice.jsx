import React from 'react';
import { Box, Typography, Divider, Grid } from '@mui/material';
import { format } from 'date-fns';

const A4Invoice = React.forwardRef(({ data, company }, ref) => {
  const {
    customerName,
    products,
    total,
    amountPaid,
    balance,
    date,
    detail,
    referenceNumber,
    discount
  } = data;

  const items = products || detail || [];
  const taxRate = company?.taxRate || 0;
  
  // Calculations
  const subTotal = items.reduce((sum, item) => sum + (item.price || item.salesPrice || 0) * (item.quantity || 0), 0);
  const vatAmount = (subTotal * (taxRate / 100)); // Simple calculation, assumes exclusive or inclusive based on logic (here simplified)
  // Note: Production logic should strictly follow the backend's tax mode (inclusive vs exclusive)

  return (
    <Box
      ref={ref}
      sx={{
        width: '210mm', // A4 width
        minHeight: '297mm', // A4 height
        padding: '20mm',
        backgroundColor: '#fff',
        color: '#000',
        boxSizing: 'border-box',
        fontFamily: 'Helvetica, Arial, sans-serif',
        fontSize: '10pt',
        '& @media print': {
          margin: 0,
          boxShadow: 'none',
        }
      }}
    >
      {/* Header */}
      <Grid container spacing={0} sx={{ mb: 4 }}>
        <Grid item xs={6}>
          {company?.logo ? (
             <img src={company.logo} alt="Logo" style={{ maxHeight: '60px', marginBottom: '10px' }} />
          ) : (
            <Typography variant="h4" fontWeight="bold" color="primary.main">
              {company?.companyName?.toUpperCase()}
            </Typography>
          )}
          <Box sx={{ mt: 1, lineHeight: 1.5 }}>
             <Typography variant="body2">{company?.storeAddress || company?.location}</Typography>
             <Typography variant="body2">{company?.contact}</Typography>
             <Typography variant="body2">{company?.email}</Typography>
             {company?.tinNumber && <Typography variant="body2" fontWeight="bold">TIN: {company.tinNumber}</Typography>}
          </Box>
        </Grid>
        <Grid item xs={6} sx={{ textAlign: 'right' }}>
          <Typography variant="h3" color="text.secondary" sx={{ opacity: 0.3, letterSpacing: 2 }}>
            INVOICE
          </Typography>
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6">#{referenceNumber}</Typography>
            <Typography variant="body2">Date: {date ? format(new Date(date), "dd MMM yyyy") : format(new Date(), "dd MMM yyyy")}</Typography>
          </Box>
        </Grid>
      </Grid>

      <Divider sx={{ mb: 4, borderColor: '#000' }} />

      {/* Bill To */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="subtitle2" gutterBottom color="text.secondary">BILL TO</Typography>
        <Typography variant="h6">{customerName || 'Walk-in Customer'}</Typography>
        {data.customerAddress && <Typography variant="body2">{data.customerAddress}</Typography>}
        {data.customerPhone && <Typography variant="body2">{data.customerPhone}</Typography>}
        {data.customerTin && <Typography variant="body2">TIN: {data.customerTin}</Typography>}
      </Box>

      {/* Items Table */}
      <Box sx={{ mb: 4 }}>
        <Grid container sx={{ borderBottom: '2px solid #000', pb: 1, mb: 1, fontWeight: 'bold' }}>
          <Grid item xs={5}>Description</Grid>
          <Grid item xs={2} sx={{ textAlign: 'right' }}>Price</Grid>
          <Grid item xs={2} sx={{ textAlign: 'center' }}>Qty</Grid>
          <Grid item xs={3} sx={{ textAlign: 'right' }}>Total</Grid>
        </Grid>

        {items.map((item, index) => (
          <Grid container key={index} sx={{ py: 1, borderBottom: '1px solid #eee' }}>
            <Grid item xs={5}>
              <Typography variant="body2" fontWeight="medium">{item.name}</Typography>
              <Typography variant="caption" color="text.secondary">{item.description}</Typography>
            </Grid>
            <Grid item xs={2} sx={{ textAlign: 'right' }}>
              {parseFloat(item.price || item.salesPrice).toFixed(2)}
            </Grid>
            <Grid item xs={2} sx={{ textAlign: 'center' }}>
              {item.quantity}
            </Grid>
            <Grid item xs={3} sx={{ textAlign: 'right' }} fontWeight="bold">
              {((item.price || item.salesPrice) * item.quantity).toFixed(2)}
            </Grid>
          </Grid>
        ))}
      </Box>

      {/* Totals */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 6 }}>
        <Box sx={{ width: '40%' }}>
          <Grid container sx={{ mb: 1 }}>
             <Grid item xs={6}>Subtotal</Grid>
             <Grid item xs={6} sx={{ textAlign: 'right' }}>{company?.currencyCode} {subTotal.toFixed(2)}</Grid>
          </Grid>
          {discount > 0 && (
             <Grid container sx={{ mb: 1, color: 'error.main' }}>
                <Grid item xs={6}>Discount</Grid>
                <Grid item xs={6} sx={{ textAlign: 'right' }}>-{parseFloat(discount).toFixed(2)}</Grid>
             </Grid>
          )}
          {/* Mock Tax - In real implementation verify if inclusive/exclusive */}
          {taxRate > 0 && (
             <Grid container sx={{ mb: 1 }}>
                <Grid item xs={6}>VAT ({taxRate}%)</Grid>
                <Grid item xs={6} sx={{ textAlign: 'right' }}>{vatAmount.toFixed(2)}</Grid>
             </Grid>
          )}
          <Divider sx={{ my: 1 }} />
          <Grid container>
             <Grid item xs={6}><Typography variant="h6">Total</Typography></Grid>
             <Grid item xs={6} sx={{ textAlign: 'right' }}><Typography variant="h6">{company?.currencyCode} {parseFloat(total).toFixed(2)}</Typography></Grid>
          </Grid>
        </Box>
      </Box>

      {/* Footer / Terms */}
      <Box sx={{ mt: 'auto', pt: 4, borderTop: '1px solid #eee' }}>
        <Typography variant="subtitle2" gutterBottom>Payment Terms</Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Payment is due within 30 days. Please make checks payable to {company?.companyName}.
        </Typography>
        
        {company?.bankDetails && (
          <Box sx={{ mt: 2, p: 2, bgcolor: '#f9f9f9', borderRadius: 1 }}>
            <Typography variant="subtitle2">Bank Details:</Typography>
            <Typography variant="caption" sx={{ whiteSpace: 'pre-wrap' }}>{company.bankDetails}</Typography>
          </Box>
        )}
      </Box>
      
      <Box sx={{ mt: 4, textAlign: 'center' }}>
        <Typography variant="caption" color="text.secondary">Target powered by Sophon POS</Typography>
      </Box>
    </Box>
  );
});

export default A4Invoice;
