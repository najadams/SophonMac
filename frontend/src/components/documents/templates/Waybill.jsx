import React from 'react';
import { Box, Typography, Divider, Grid } from '@mui/material';
import { format } from 'date-fns';

const Waybill = React.forwardRef(({ data, company }, ref) => {
  const {
    customerName,
    products,
    date,
    detail,
    referenceNumber
  } = data;

  const items = products || detail || [];

  return (
    <Box
      ref={ref}
      sx={{
        width: '210mm',
        minHeight: '297mm',
        padding: '20mm',
        backgroundColor: '#fff',
        color: '#000',
        boxSizing: 'border-box',
        fontFamily: 'Helvetica, Arial, sans-serif',
        fontSize: '10pt',
      }}
    >
      {/* Header */}
      <Grid container spacing={0} sx={{ mb: 4 }}>
        <Grid item xs={6}>
          <Typography variant="h4" fontWeight="bold" color="grey.800">
            {company?.companyName?.toUpperCase()}
          </Typography>
          <Box sx={{ mt: 1 }}>
             <Typography variant="body2">{company?.storeAddress}</Typography>
             <Typography variant="body2">{company?.contact}</Typography>
          </Box>
        </Grid>
        <Grid item xs={6} sx={{ textAlign: 'right' }}>
          <Typography variant="h4" sx={{ letterSpacing: 2, fontWeight: 'light' }}>
            WAYBILL
          </Typography>
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle1">Ref: {referenceNumber}</Typography>
            <Typography variant="body2">Date: {date ? format(new Date(date), "dd MMM yyyy") : format(new Date(), "dd MMM yyyy")}</Typography>
          </Box>
        </Grid>
      </Grid>

      <Divider sx={{ mb: 4, borderColor: '#000' }} />

      {/* Shipping Details */}
      <Grid container spacing={4} sx={{ mb: 4 }}>
        <Grid item xs={6}>
            <Typography variant="subtitle2" color="text.secondary">SHIP TO</Typography>
            <Typography variant="h6">{customerName || 'Walk-in Customer'}</Typography>
            {data.deliveryAddress && <Typography variant="body2">{data.deliveryAddress}</Typography>}
            {data.customerPhone && <Typography variant="body2">{data.customerPhone}</Typography>}
        </Grid>
        <Grid item xs={6}>
            <Typography variant="subtitle2" color="text.secondary">DISPATCH DETAILS</Typography>
            <Typography variant="body2">Vehicle No: _________________</Typography>
            <Typography variant="body2">Driver: _____________________</Typography>
        </Grid>
      </Grid>

      {/* Items Table - No Prices */}
      <Box sx={{ mb: 4, minHeight: '400px' }}>
        <Grid container sx={{ borderBottom: '2px solid #000', pb: 1, mb: 1, fontWeight: 'bold' }}>
          <Grid item xs={2}>Item Code</Grid>
          <Grid item xs={6}>Description</Grid>
          <Grid item xs={2} sx={{ textAlign: 'center' }}>Ordered</Grid>
          <Grid item xs={2} sx={{ textAlign: 'center' }}>Shipped</Grid>
        </Grid>

        {items.map((item, index) => (
          <Grid container key={index} sx={{ py: 1.5, borderBottom: '1px solid #eee' }}>
            <Grid item xs={2}>
              <Typography variant="body2" color="text.secondary">{item.sku || index + 1}</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="body2" fontWeight="bold">{item.name}</Typography>
              <Typography variant="caption">{item.description}</Typography>
            </Grid>
            <Grid item xs={2} sx={{ textAlign: 'center' }}>
              {item.quantity}
            </Grid>
            <Grid item xs={2} sx={{ textAlign: 'center', border: '1px solid #ddd', height: '20px' }}>
              {/* Box for manual checking */}
            </Grid>
          </Grid>
        ))}
      </Box>

      {/* Signatures */}
      <Box sx={{ mt: 'auto', pt: 4, display: 'flex', gap: 4 }}>
        <Box sx={{ flex: 1 }}>
            <Divider sx={{ mb: 1 }} />
            <Typography variant="caption">Authorized Signature</Typography>
        </Box>
        <Box sx={{ flex: 1 }}>
            <Divider sx={{ mb: 1 }} />
            <Typography variant="caption">Receiver's Signature / Date</Typography>
        </Box>
      </Box>
      
      <Box sx={{ mt: 2, textAlign: 'center' }}>
        <Typography variant="caption" fontStyle="italic">Please check goods before signing. Claims after signing may not be accepted.</Typography>
      </Box>
    </Box>
  );
});

export default Waybill;
