import React, { useState, useMemo } from "react";
import {
  Box,
  Paper,
  Typography,
  Button,
  Divider,
  Alert,
  Switch,
  FormControlLabel,
  TextField,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from "@mui/material";
import { useSelector } from "react-redux";
import axios from "../config";

const ImportBackup = () => {
  const currentCompanyId = useSelector((state) => state.companyState?.data?.id);

  const [fileName, setFileName] = useState("");
  const [backupJson, setBackupJson] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [overwrite, setOverwrite] = useState(false);
  const [targetCompanyId, setTargetCompanyId] = useState(currentCompanyId || "");

  const analysis = useMemo(() => {
    if (!backupJson) return null;
    const meta = backupJson.metadata || {};
    const company = backupJson.company || {};
    const tables = backupJson.tables || {};
    const counts = Object.entries(tables).map(([name, rows]) => ({
      name,
      count: Array.isArray(rows) ? rows.length : 0,
    }));
    return {
      meta,
      companyName: company.companyName || company.name || "",
      companyId: company.id ?? meta.companyId ?? null,
      counts,
    };
  }, [backupJson]);

  const handleFile = async (evt) => {
    setError("");
    setSuccess("");
    const file = evt.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      if (!json.metadata || (!json.company && !json.tables)) {
        setError("Invalid backup structure: missing metadata/company/tables.");
        setBackupJson(null);
        return;
      }
      setBackupJson(json);
      // Prefill target company ID from backup if present
      const inferredId = json.company?.id ?? json.metadata?.companyId ?? "";
      if (inferredId) setTargetCompanyId(inferredId);
    } catch (e) {
      console.error(e);
      setError("Failed to parse JSON file.");
      setBackupJson(null);
    }
  };

  const handleRestore = async () => {
    if (!backupJson) {
      setError("Please select a valid backup JSON file first.");
      return;
    }
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const params = new URLSearchParams();
      if (overwrite) params.set("overwrite", "1");
      if (targetCompanyId) params.set("targetCompanyId", String(targetCompanyId));
      const url = `/api/backup/restore${params.toString() ? `?${params.toString()}` : ""}`;
      const res = await axios.post(url, backupJson, {
        headers: { "Content-Type": "application/json" },
      });
      setSuccess(
        `Restore completed for company ${res.data?.companyId ?? targetCompanyId}.`
      );
    } catch (e) {
      console.error(e);
      const msg = e.response?.data?.error || e.message || "Restore failed.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3, height: '100%', overflow: 'auto' , pb: 5}}>
      <Typography variant="h4" sx={{ mb: 2 }}>
        Import Backup
      </Typography>
      <Paper sx={{ p: 3 , maxHeight: `calc(100vh - 150px)`, overflow: 'auto', scrollbarColor:'none'}}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
          <Button variant="contained" component="label">
            Select JSON File
            <input
              type="file"
              hidden
              accept="application/json,.json"
              onChange={handleFile}
            />
          </Button>
          <Typography variant="body2" color="text.secondary">
            {fileName || "No file selected"}
          </Typography>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 3, mb: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={overwrite}
                onChange={(e) => setOverwrite(e.target.checked)}
              />
            }
            label="Overwrite existing company data"
          />
          <TextField
            label="Target Company ID"
            type="number"
            value={targetCompanyId ?? ""}
            onChange={(e) => setTargetCompanyId(e.target.value)}
            size="small"
          />
          <Button
            variant="contained"
            color="primary"
            onClick={handleRestore}
            disabled={!backupJson || loading}
          >
            {loading ? "Importing..." : "Import Now"}
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        <Divider sx={{ my: 2 }} />

        {!backupJson && (
          <Typography variant="body1" color="text.secondary">
            Upload a backup JSON to see a summary and restore.
          </Typography>
        )}

        {backupJson && analysis && (
          <Box>
            <Typography variant="h6" sx={{ mb: 1 }}>
              Backup Summary
            </Typography>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2">
                Company: {analysis.companyName || "Unknown"} (ID: {analysis.companyId ?? "N/A"})
              </Typography>
              <Typography variant="body2">
                Created: {analysis.meta.createdAt || "N/A"}
              </Typography>
              <Typography variant="body2">
                Schema: {analysis.meta.schema || "pos-backup"}
              </Typography>
            </Box>

            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Table</TableCell>
                  <TableCell align="right">Rows</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {analysis.counts.map((row) => (
                  <TableRow key={row.name}>
                    <TableCell>{row.name}</TableCell>
                    <TableCell align="right">{row.count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default ImportBackup;