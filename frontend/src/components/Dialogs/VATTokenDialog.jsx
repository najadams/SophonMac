import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Button,
  Box,
  Chip,
  Divider,
  IconButton,
  Paper,
  CircularProgress,
  Tooltip,
  Snackbar,
  Alert,
} from "@mui/material";
import {
  QrCode2 as QrCodeIcon,
  ContentCopy as CopyIcon,
  Download as DownloadIcon,
  CheckCircle as VerifiedIcon,
  Close as CloseIcon,
  Receipt as ReceiptIcon,
} from "@mui/icons-material";

/**
 * VATTokenDialog - Displays VAT Token details with QR code for offline verification
 * 
 * Props:
 * - open: boolean - Whether dialog is open
 * - onClose: function - Close handler
 * - token: object - VAT token data from backend
 * - onExport: function - Optional export handler (format: 'json' | 'qr')
 */
const VATTokenDialog = ({ open, onClose, token, onExport }) => {
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState(null);
  const [loading, setLoading] = useState(false);

  // Generate QR code when token changes
  useEffect(() => {
    if (token?.qrData) {
      generateQRCode(token.qrData);
    }
  }, [token?.qrData]);

  // Generate QR code as data URL using canvas
  const generateQRCode = async (data) => {
    setLoading(true);
    try {
      // Use dynamic import for qrcode library if available
      const QRCode = await import('qrcode').catch(() => null);
      
      if (QRCode) {
        const url = await QRCode.toDataURL(data, {
          width: 250,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#ffffff'
          },
          errorCorrectionLevel: 'M'
        });
        setQrDataUrl(url);
      } else {
        // Fallback: use a simple text representation
        console.warn('QRCode library not available, showing text data');
        setQrDataUrl(null);
      }
    } catch (error) {
      console.error('Error generating QR code:', error);
      setQrDataUrl(null);
    }
    setLoading(false);
  };

  // Copy QR data to clipboard
  const handleCopyQRData = async () => {
    if (token?.qrData) {
      try {
        await navigator.clipboard.writeText(token.qrData);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  // Download QR code as image
  const handleDownloadQR = () => {
    if (qrDataUrl) {
      const link = document.createElement('a');
      link.download = `vat-token-${token?.tokenId?.slice(0, 8) || 'export'}.png`;
      link.href = qrDataUrl;
      link.click();
    }
  };

  // Download token as JSON
  const handleDownloadJSON = () => {
    if (token) {
      const dataStr = JSON.stringify(token, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `vat-token-${token?.tokenId?.slice(0, 8) || 'export'}.json`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  if (!token) {
    return null;
  }

  // Format currency
  const formatCurrency = (amount, currency = 'GHS') => {
    const symbol = currency === 'GHS' ? '₵' : currency;
    return `${symbol}${parseFloat(amount || 0).toFixed(2)}`;
  };

  // Format date
  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  // Get authority badge color
  const getAuthorityColor = (authority) => {
    switch (authority) {
      case 'GRA': return 'success';
      case 'SKA': return 'primary';
      default: return 'default';
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: "16px",
            boxShadow: "0 12px 40px rgba(0, 0, 0, 0.15)",
            overflow: "hidden",
          },
        }}
      >
        {/* Header */}
        <DialogTitle
          sx={{
            background: "linear-gradient(135deg, #00796B 0%, #004D40 100%)",
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            py: 2,
            px: 3,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <ReceiptIcon />
            <Typography variant="h6" fontWeight={600}>
              VAT Token Certificate
            </Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Chip
              icon={<VerifiedIcon sx={{ color: "white !important" }} />}
              label={token.authority || "SKA"}
              size="small"
              color={getAuthorityColor(token.authority)}
              sx={{ 
                color: "white", 
                fontWeight: 600,
                "& .MuiChip-icon": { color: "white" }
              }}
            />
            <IconButton onClick={onClose} sx={{ color: "white" }}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ p: 0 }}>
          {/* QR Code Section */}
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              py: 3,
              px: 2,
              bgcolor: "#f8f9fa",
              borderBottom: "1px solid #e0e0e0",
            }}
          >
            <Paper
              elevation={3}
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                minWidth: 270,
                minHeight: 270,
              }}
            >
              {loading ? (
                <CircularProgress sx={{ color: "#00796B" }} />
              ) : qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="VAT Token QR Code"
                  style={{ width: 250, height: 250 }}
                />
              ) : (
                <Box sx={{ textAlign: "center", p: 2 }}>
                  <QrCodeIcon sx={{ fontSize: 80, color: "#ccc" }} />
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    QR Code unavailable
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Install 'qrcode' package to enable
                  </Typography>
                </Box>
              )}
            </Paper>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mt: 1.5, textAlign: "center" }}
            >
              Scan to verify VAT payment offline
            </Typography>
          </Box>

          {/* Token Details */}
          <Box sx={{ p: 3 }}>
            {/* VAT Amount - Highlighted */}
            <Paper
              sx={{
                p: 2,
                mb: 2,
                borderRadius: 2,
                background: "linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)",
                border: "1px solid #a5d6a7",
              }}
            >
              <Typography variant="body2" color="text.secondary" gutterBottom>
                VAT Amount Paid
              </Typography>
              <Typography variant="h4" fontWeight={700} color="#2e7d32">
                {formatCurrency(token.vatAmount, token.currencyCode)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Rate: {token.vatRate || token.payload?.r}% • Gross: {formatCurrency(token.grossAmount || token.payload?.g, token.currencyCode)}
              </Typography>
            </Paper>

            {/* Token Info Grid */}
            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2, mb: 2 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Token ID
                </Typography>
                <Typography variant="body2" fontWeight={500} sx={{ fontFamily: "monospace" }}>
                  {(token.tokenId || token.payload?.vid)?.slice(0, 8)}...
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Quantity
                </Typography>
                <Typography variant="body2" fontWeight={500}>
                  {token.quantity || token.payload?.q} units
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Issued At
                </Typography>
                <Typography variant="body2" fontWeight={500}>
                  {formatDate(token.issuedAt || token.payload?.iat)}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Issuer TIN
                </Typography>
                <Typography variant="body2" fontWeight={500}>
                  {token.issuerTIN || token.payload?.tin || "N/A"}
                </Typography>
              </Box>
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Token Hash */}
            <Box>
              <Typography variant="caption" color="text.secondary">
                Token Hash (Verification ID)
              </Typography>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  mt: 0.5,
                  p: 1,
                  borderRadius: 1,
                  bgcolor: "#f5f5f5",
                  fontFamily: "monospace",
                  fontSize: "0.75rem",
                  wordBreak: "break-all",
                }}
              >
                <Typography variant="caption" sx={{ flex: 1, fontFamily: "monospace" }}>
                  {token.tokenHash || token.proof?.hash}
                </Typography>
                <Tooltip title={copied ? "Copied!" : "Copy"}>
                  <IconButton size="small" onClick={handleCopyQRData}>
                    <CopyIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          </Box>
        </DialogContent>

        {/* Actions */}
        <DialogActions
          sx={{
            p: 2,
            borderTop: "1px solid #e0e0e0",
            bgcolor: "#fafafa",
            gap: 1,
          }}
        >
          <Button
            startIcon={<DownloadIcon />}
            onClick={handleDownloadJSON}
            variant="outlined"
            sx={{
              borderColor: "#00796B",
              color: "#00796B",
              "&:hover": { borderColor: "#00695C", bgcolor: "rgba(0,121,107,0.04)" },
            }}
          >
            Export JSON
          </Button>
          {qrDataUrl && (
            <Button
              startIcon={<QrCodeIcon />}
              onClick={handleDownloadQR}
              variant="outlined"
              sx={{
                borderColor: "#00796B",
                color: "#00796B",
                "&:hover": { borderColor: "#00695C", bgcolor: "rgba(0,121,107,0.04)" },
              }}
            >
              Save QR
            </Button>
          )}
          <Button
            variant="contained"
            onClick={onClose}
            sx={{
              bgcolor: "#00796B",
              "&:hover": { bgcolor: "#00695C" },
              ml: "auto",
            }}
          >
            Done
          </Button>
        </DialogActions>
      </Dialog>

      {/* Copy Notification */}
      <Snackbar
        open={copied}
        autoHideDuration={2000}
        onClose={() => setCopied(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="success" sx={{ width: "100%" }}>
          Token data copied to clipboard
        </Alert>
      </Snackbar>
    </>
  );
};

export default VATTokenDialog;
