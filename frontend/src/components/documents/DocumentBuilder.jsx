import React, { useRef } from 'react';
import { useSelector } from 'react-redux';
import { Box, Paper, Alert } from '@mui/material';
import A4Invoice from './templates/A4Invoice';
import Waybill from './templates/Waybill';
import Template4 from '../compPrint/ReceiptTemplates/Template4';
import FeatureGate from '../common/FeatureGate';
import { hasFeature } from '../../config/plans';
import { useReactToPrint } from 'react-to-print';

/**
 * DocumentBuilder
 * 
 * Orchestrates document generation.
 * - Selects template based on type (INVOICE, WAYBILL, RECEIPT)
 * - Checks Feature Gates (Plan limits)
 * 
 * @param {string} type - 'INVOICE', 'WAYBILL', 'RECEIPT'
 * @param {object} data - Transaction data
 * @param {string} mode - 'VIEW' or 'PRINT_REF' (if passing ref to parent)
 */
const DocumentBuilder = React.forwardRef(({ type = 'RECEIPT', data, ...props }, ref) => {
  const company = useSelector(state => state.companyState.data);
  const plan = company?.currentPlan || 'STARTER';

  // Template Selection
  const getTemplate = () => {
    switch (type) {
      case 'INVOICE':
        return (
          <FeatureGate 
            feature="tax_invoice" 
            fallback={
               <Alert severity="warning">
                 Tax Invoices are available on the <strong>Trader</strong> plan and above. 
                 Please upgrade to generate compliant A4 invoices.
               </Alert>
            }
            showLock={false}
          >
            <A4Invoice ref={ref} data={data} company={company} />
          </FeatureGate>
        );
        
      case 'WAYBILL':
        return (
          <FeatureGate 
            feature="waybill"
            fallback={
                <Alert severity="info" sx={{ p: 2 }}>
                  Waybills (Delivery Notes) are available on the <strong>Trader</strong> plan.
                </Alert>
            }
            showLock={false}
          >
            <Waybill ref={ref} data={data} company={company} />
          </FeatureGate>
        );

      case 'RECEIPT':
      default:
        // Default to Thermal Receipt (Template 4 is the standard one)
        return <Template4 ref={ref} data={data} />;
    }
  };

  return (
    <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
      {/* We wrap in a paper for preview, but print logic will target the inner ref */}
      {getTemplate()}
    </Box>
  );
});

export default DocumentBuilder;
