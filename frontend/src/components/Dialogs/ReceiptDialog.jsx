import React from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  Typography,
  Grid,
  Button,
  IconButton,
  Tabs,
  Tab,
  Box,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import PrintIcon from "@mui/icons-material/Print";
import ReceiptIcon from "@mui/icons-material/Receipt";
import DescriptionIcon from "@mui/icons-material/Description";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import { useSelector } from "react-redux";
import { useMediaQuery } from "@mui/material";
import { useReactToPrint } from "react-to-print";
import DocumentBuilder from "../documents/DocumentBuilder";

const ReceiptDialog = ({
  open,
  onClose,
  receiptData
}) => {
  const company = useSelector((state) => state.companyState.data);
  const [docType, setDocType] = React.useState('RECEIPT');
  const [tabValue, setTabValue] = React.useState(0);
  const componentRef = React.useRef();

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    switch (newValue) {
        case 0: setDocType('RECEIPT'); break;
        case 1: setDocType('INVOICE'); break;
        case 2: setDocType('WAYBILL'); break;
        default: setDocType('RECEIPT');
    }
  };

  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
  });

  const matchesMobile = useMediaQuery("(max-width:600px)");

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        style: {
          height: "90vh",
          width: matchesMobile ? "100vw" : "80vw",
          overflow: "hidden", // Let content scroll
          backgroundColor: "#f5f5f5",
        },
      }}>
      <DialogTitle sx={{ p: 1, backgroundColor: '#fff', borderBottom: '1px solid #ddd' }}>
          <Grid container alignItems="center" justifyContent="space-between">
             <Grid item>
                 <Typography variant="h6" color="primary">Transaction Details</Typography>
             </Grid>
             <Grid item>
                 <Button variant="contained" onClick={handlePrint} startIcon={<PrintIcon />}>
                    Print {docType === 'RECEIPT' ? 'Receipt' : docType === 'WAYBILL' ? 'Waybill' : 'Invoice'}
                 </Button>
                 <IconButton onClick={onClose} sx={{ ml: 1 }}><CloseIcon /></IconButton>
             </Grid>
          </Grid>
          
          <Tabs value={tabValue} onChange={handleTabChange} indicatorColor="primary" textColor="primary" variant="fullWidth" sx={{ mt: 1 }}>
             <Tab label="Receipt (Thermal)" icon={<ReceiptIcon />} iconPosition="start" />
             <Tab label="Tax Invoice (A4)" icon={<DescriptionIcon />} iconPosition="start" />
             <Tab label="Waybill" icon={<LocalShippingIcon />} iconPosition="start" />
          </Tabs>
      </DialogTitle>
      
      <DialogContent sx={{ p: 0, backgroundColor: '#525659', display: 'flex', justifyContent: 'center', overflowY: 'auto' }}>
        <Box sx={{ my: 4, transform: matchesMobile ? 'scale(0.8)' : 'scale(1)', transformOrigin: 'top center' }}>
             <DocumentBuilder 
                ref={componentRef}
                type={docType}
                data={receiptData}
             />
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default ReceiptDialog;