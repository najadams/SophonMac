import React, { useState, useRef } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Button,
  Box,
  TextField,
  Paper,
  CircularProgress,
  Alert,
  Chip,
  IconButton,
  Tabs,
  Tab,
  Divider,
} from "@mui/material";
import {
  QrCodeScanner as ScannerIcon,
  ContentPaste as PasteIcon,
  CheckCircle as ValidIcon,
  Cancel as InvalidIcon,
  Close as CloseIcon,
  Refresh as RefreshIcon,
  VerifiedUser as VerifiedIcon,
} from "@mui/icons-material";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

/**
 * VATTokenVerifier - Component for verifying VAT tokens via QR scan or manual input
 * 
 * Props:
 * - open: boolean - Whether dialog is open
 * - onClose: function - Close handler
 * - companyId: string - Current company ID for logging verification
 * - onVerified: function - Callback with verification result
 */
const VATTokenVerifier = ({ open, onClose, companyId, onVerified }) => {
  const [tabValue, setTabValue] = useState(0);
  const [qrData, setQrData] = useState("");
  const [tokenHash, setTokenHash] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  // Reset state when dialog opens
  const handleReset = () => {
    setQrData("");
    setTokenHash("");
    setResult(null);
    setError(null);
    setLoading(false);
  };

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    handleReset();
  };

  // Paste from clipboard
  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (tabValue === 0) {
        setQrData(text);
      } else {
        setTokenHash(text);
      }
    } catch (err) {
      setError("Failed to paste from clipboard");
    }
  };

  // Verify token via API
  const handleVerify = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const requestBody = {
        verifierId: companyId,
      };

      // Add appropriate field based on input type
      if (tabValue === 0 && qrData) {
        requestBody.qrData = qrData;
      } else if (tabValue === 1 && tokenHash) {
        requestBody.tokenHash = tokenHash;
      } else {
        throw new Error("Please enter token data to verify");
      }

      const response = await fetch(`${API_BASE}/api/vat-tokens/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();
      setResult(data);

      // Callback with result
      if (onVerified) {
        onVerified(data);
      }
    } catch (err) {
      setError(err.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  // Handle QR image upload (using jsQR library if available)
  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      // Try to use jsQR for image-based QR decoding
      const jsQR = await import('jsqr').catch(() => null);
      
      if (!jsQR) {
        setError("QR image scanning requires 'jsqr' package. Please paste token data manually.");
        return;
      }

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR.default(imageData.data, imageData.width, imageData.height);
        
        if (code) {
          setQrData(code.data);
        } else {
          setError("No QR code found in image");
        }
      };
      img.src = URL.createObjectURL(file);
    } catch (err) {
      setError("Failed to process QR image");
    }
  };

  // Format currency
  const formatCurrency = (amount, currency = 'GHS') => {
    const symbol = currency === 'GHS' ? '₵' : currency;
    return `${symbol}${parseFloat(amount || 0).toFixed(2)}`;
  };

  return (
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
          background: "linear-gradient(135deg, #1565c0 0%, #0d47a1 100%)",
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          py: 2,
          px: 3,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <VerifiedIcon />
          <Typography variant="h6" fontWeight={600}>
            Verify VAT Token
          </Typography>
        </Box>
        <IconButton onClick={onClose} sx={{ color: "white" }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        {/* Input Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            variant="fullWidth"
            sx={{
              "& .MuiTab-root": { py: 2 },
              "& .Mui-selected": { color: "#1565c0" },
              "& .MuiTabs-indicator": { backgroundColor: "#1565c0" },
            }}
          >
            <Tab icon={<ScannerIcon />} label="QR Data" iconPosition="start" />
            <Tab icon={<PasteIcon />} label="Token Hash" iconPosition="start" />
          </Tabs>
        </Box>

        {/* Input Section */}
        <Box sx={{ p: 3 }}>
          {tabValue === 0 ? (
            <Box>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="QR Code Data (JSON)"
                placeholder='Paste QR code data or {"p":{"v":"1"...}}'
                value={qrData}
                onChange={(e) => setQrData(e.target.value)}
                sx={{ mb: 2 }}
              />
              <Box sx={{ display: "flex", gap: 1 }}>
                <Button
                  variant="outlined"
                  startIcon={<PasteIcon />}
                  onClick={handlePasteFromClipboard}
                  sx={{ flex: 1 }}
                >
                  Paste
                </Button>
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  style={{ display: "none" }}
                  onChange={handleImageUpload}
                />
                <Button
                  variant="outlined"
                  startIcon={<ScannerIcon />}
                  onClick={() => fileInputRef.current?.click()}
                  sx={{ flex: 1 }}
                >
                  Upload QR Image
                </Button>
              </Box>
            </Box>
          ) : (
            <Box>
              <TextField
                fullWidth
                label="Token Hash"
                placeholder="Enter the 64-character token hash..."
                value={tokenHash}
                onChange={(e) => setTokenHash(e.target.value)}
                sx={{ mb: 2 }}
                inputProps={{ style: { fontFamily: "monospace" } }}
              />
              <Button
                variant="outlined"
                startIcon={<PasteIcon />}
                onClick={handlePasteFromClipboard}
                fullWidth
              >
                Paste from Clipboard
              </Button>
            </Box>
          )}
        </Box>

        {/* Error Display */}
        {error && (
          <Box sx={{ px: 3, pb: 2 }}>
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          </Box>
        )}

        {/* Verification Result */}
        {result && (
          <Box sx={{ px: 3, pb: 3 }}>
            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                borderRadius: 2,
                border: "2px solid",
                borderColor: result.valid ? "#4caf50" : "#f44336",
                bgcolor: result.valid ? "#e8f5e9" : "#ffebee",
              }}
            >
              {/* Result Header */}
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
                {result.valid ? (
                  <ValidIcon sx={{ fontSize: 40, color: "#4caf50" }} />
                ) : (
                  <InvalidIcon sx={{ fontSize: 40, color: "#f44336" }} />
                )}
                <Box>
                  <Typography variant="h6" fontWeight={600} color={result.valid ? "#2e7d32" : "#c62828"}>
                    {result.valid ? "Token Valid ✓" : "Verification Failed"}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {result.reason || (result.valid ? "VAT payment verified" : "Unknown error")}
                  </Typography>
                </Box>
                <Chip
                  label={result.authority || "Unknown"}
                  size="small"
                  color={result.valid ? "success" : "error"}
                  sx={{ ml: "auto" }}
                />
              </Box>

              {/* Token Details (if valid) */}
              {result.valid && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        VAT Amount
                      </Typography>
                      <Typography variant="body1" fontWeight={600} color="#2e7d32">
                        {formatCurrency(result.vatAmount)}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Quantity
                      </Typography>
                      <Typography variant="body1" fontWeight={500}>
                        {result.quantity} units
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Token ID
                      </Typography>
                      <Typography variant="body2" fontFamily="monospace">
                        {result.tokenId?.slice(0, 12)}...
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Issuer
                      </Typography>
                      <Typography variant="body2" fontFamily="monospace">
                        {result.issuer?.slice(0, 12)}...
                      </Typography>
                    </Box>
                  </Box>
                </>
              )}

              {/* Unknown Issuer - Import Option */}
              {!result.valid && result.canImport && (
                <Box sx={{ mt: 2 }}>
                  <Alert severity="warning" sx={{ mb: 1 }}>
                    The issuer's public key is not in your trust store.
                  </Alert>
                  <Typography variant="caption" color="text.secondary">
                    Key Fingerprint: {result.keyFingerprint?.slice(0, 16)}...
                  </Typography>
                </Box>
              )}
            </Paper>
          </Box>
        )}
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
          startIcon={<RefreshIcon />}
          onClick={handleReset}
          variant="outlined"
        >
          Reset
        </Button>
        <Button
          variant="contained"
          onClick={handleVerify}
          disabled={loading || (tabValue === 0 ? !qrData : !tokenHash)}
          sx={{
            bgcolor: "#1565c0",
            "&:hover": { bgcolor: "#0d47a1" },
            ml: "auto",
            minWidth: 120,
          }}
        >
          {loading ? <CircularProgress size={24} color="inherit" /> : "Verify"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default VATTokenVerifier;
