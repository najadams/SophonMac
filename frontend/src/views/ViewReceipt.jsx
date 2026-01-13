import {
  Card,
  Typography,
  Grid,
  Divider,
  Box,
  Button,
  Tabs,
  Tab,
  IconButton
} from "@mui/material";
import { useLocation } from "react-router-dom"; 
import { useSelector } from "react-redux";
import { motion } from "framer-motion";
import { alpha } from "@mui/material/styles";
import React, { useState, useRef } from "react";
import DocumentBuilder from "../components/documents/DocumentBuilder";
import { useReactToPrint } from "react-to-print";
import PrintIcon from "@mui/icons-material/Print";
import ReceiptIcon from "@mui/icons-material/Receipt";
import DescriptionIcon from "@mui/icons-material/Description";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";

const ViewReceipt = () => {
  const company = useSelector((state) => state.companyState.data);
  const location = useLocation();
  const { row } = location.state || {};
  
  const [docType, setDocType] = useState('RECEIPT');
  const [tabValue, setTabValue] = useState(0);
  const componentRef = useRef();

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

  if (!row) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
        <Typography variant="h6" color="text.secondary">No receipt details available</Typography>
      </Box>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      style={{ height: "100%", overflow: "auto" }}>
      <Box
        sx={{
          minHeight: "100vh",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          py: 4,
          px: 2,
          backgroundColor: '#f5f5f5'
        }}>
        
        {/* Controls */}
        <Box sx={{ width: "100%", maxWidth: "800px", mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Tabs 
                value={tabValue} 
                onChange={handleTabChange} 
                textColor="primary" 
                indicatorColor="primary"
                sx={{ bgcolor: 'white', borderRadius: 1 }}
            >
                <Tab label="Receipt" icon={<ReceiptIcon />} iconPosition="start" />
                <Tab label="Invoice" icon={<DescriptionIcon />} iconPosition="start" />
                <Tab label="Waybill" icon={<LocalShippingIcon />} iconPosition="start" />
            </Tabs>

            <Button 
                variant="contained" 
                startIcon={<PrintIcon />} 
                onClick={handlePrint}
                size="large"
            >
                Print
            </Button>
        </Box>

        <Box sx={{ width: "100%", maxWidth: "800px", flex: 1, display: 'flex', justifyContent: 'center' }}>
          <Card
            elevation={3}
            sx={{
              p: 2,
              borderRadius: 2,
              backgroundColor: "#fff",
              minHeight: "100%",
              width: "100%",
              display: "flex",
              justifyContent: "center",
              overflow: 'hidden'
            }}>
             <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                <DocumentBuilder 
                    ref={componentRef}
                    type={docType}
                    data={row}
                    // Pass company explicitly if row doesn't have it fully, 
                    // though DocumentBuilder selects it from Redux too.
                />
             </Box>
          </Card>
        </Box>
      </Box>
    </motion.div>
  );
};

export default ViewReceipt;
