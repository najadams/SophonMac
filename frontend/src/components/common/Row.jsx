import React, { useRef, useState } from "react";
import PropTypes from "prop-types";
import Box from "@mui/material/Box";
import { Tooltip, Menu, MenuItem } from "@mui/material";
import Collapse from "@mui/material/Collapse";
import IconButton from "@mui/material/IconButton";
import Table from "@mui/material/Table";
import FlagIcon from "@mui/icons-material/Flag";
import OutlinedFlagIcon from "@mui/icons-material/OutlinedFlag";
import TableBody from "@mui/material/TableBody";
import TableCell, { tableCellClasses } from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import { styled } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { capitalizeFirstLetter } from "../../config/Functions";
import ReceiptTemplate from "../compPrint/ReceiptTemplate";
import axios from "../../config/index";
import { formatNumber } from "../../config/Functions";
import { useSelector } from "react-redux";
import { useQueryClient } from "react-query";

import { motion, AnimatePresence } from "framer-motion";

const StyledTableCell = styled(TableCell)(({ theme }) => ({
  [`&.${tableCellClasses.head}`]: {
    backgroundColor: "#1a237e",
    color: theme.palette.primary.contrastText,
    fontSize: "16px",
    position: "sticky",
    top: 0,
    zIndex: 1,
  },
  [`&.${tableCellClasses.body}`]: {
    fontSize: "14px",
  },
}));

const StyledTableRow = styled(TableRow)(({ theme, flagged }) => ({
  "&:nth-of-type(odd)": {
    backgroundColor: flagged ? "#ffebee" : "#fff",
  },
  "&:last-child td, &:last-child th": {
    border: 0,
  },
  backgroundColor: flagged ? "#ffebee" : "inherit",
  transition: "all 0.2s ease-in-out",
  "&:hover": {
    backgroundColor: flagged ? "#ffebee" : theme.palette.action.hover,
    transform: "scale(1.001)",
  },
}));

const DetailBox = styled(Box)(({ theme }) => ({
  margin: 1,
  background: "#f8f9fa",
  borderRadius: "8px",
  padding: "16px",
  boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
  transition: "all 0.3s ease-in-out",
  "&:hover": {
    boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
  },
}));

const DetailTypography = styled(Typography)(({ theme }) => ({
  color: "#1a237e",
  fontWeight: 600,
  marginBottom: "16px",
  paddingBottom: "8px",
  borderBottom: "2px solid #e3f2fd",
}));

function Row({ row, onFlagChange, setValue }) {
  const [open, setOpen] = React.useState(false);
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = React.useState(null);
  const printRef = useRef();
  const [printValues, setPrintValues] = useState(null);
  const companyId = useSelector((state) => state.companyState.data.id);
  const queryClient = useQueryClient();

  const formatDate = (date) => {
    if (!date || isNaN(new Date(date).getTime())) {
      return "Invalid Date";
    }
    return new Date(date).toLocaleString();
  };

  const handleMenuClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleView = () => {
    handleMenuClose();
    navigate(`/receipts/${row._id}`, { state: { row } });
  };

  const handleEdit = () => {
    navigate(`/sales/${row._id}`, { state: { row } });
    handleMenuClose();
    setValue(1);
  };

  const handleFlag = async () => {
    handleMenuClose();
    const updatedFlag = !row.flagged;
    const originalFlag = row.flagged;

    try {
      // Optimistically update the UI first
      onFlagChange(row._id, updatedFlag);
      
      // Make the API call
      const response = await axios.patch(`/api/receipts/${row._id}/flag`, {
        flagged: updatedFlag,
        companyId,
      });
      
      // Log success for debugging
      console.log(`Receipt ${updatedFlag ? 'flagged' : 'unflagged'} successfully:`, response.data);
      
      // Invalidate products cache to refresh inventory data
      queryClient.invalidateQueries(["api/products", companyId]);
      
    } catch (error) {
      // Revert the optimistic update on error
      onFlagChange(row._id, originalFlag);
      
      console.error("Failed to update the flag status:", error);
      
      // Show user-friendly error message
      const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Failed to update flag status';
      alert(`Error: ${errorMessage}`);
    }
  };

  const handlePrintClick = () => {
    setPrintValues({
      customerName: `${row.customerName} - ${row.customerCompany}`,
      products: row.detail,
      total: row.total,
      balance: row.balance,
      discount: row.discount,
      amountPaid: row.amountPaid,
      date: formatDate(row.date),
      workerName: row.workerusername ? row.workerusername : row.workerName,
    });
    setTimeout(() => {
      setPrintValues(null);
    }, 2000);
    setAnchorEl(null);
  };

  return (
    <React.Fragment>
      {printValues && (
        <div style={{ display: "none" }}>
          <ReceiptTemplate
            ref={printRef}
            customerName={printValues.customerName}
            products={printValues.products}
            total={printValues.total}
            balance={printValues.balance}
            amountPaid={printValues.amountPaid}
            date={printValues.date}
            workerName={printValues.workerName}
            discount={printValues.discount}
          />
        </div>
      )}
      <Tooltip title={formatDate(row.date)} placement="top" arrow>
        <StyledTableRow
          sx={{ "& > *": { borderBottom: "unset" } }}
          flagged={row.flagged}>
          <TableCell>
            <IconButton
              aria-label="expand row"
              size="small"
              onClick={() => setOpen(!open)}
              sx={{
                transition: "transform 0.2s ease-in-out",
                transform: open ? "rotate(180deg)" : "rotate(0)",
              }}>
              <KeyboardArrowDownIcon />
            </IconButton>
          </TableCell>
          <TableCell component="th" scope="row" style={{ width: "30%" }}>
            {capitalizeFirstLetter(row.customerName)}
          </TableCell>
          <TableCell align="left">
            {capitalizeFirstLetter(row.workerName)}
          </TableCell>
          <TableCell align="right">{formatNumber(row.total)}</TableCell>
          <TableCell align="right">{row.detail.length}</TableCell>
          <TableCell align="right">
            <IconButton
              aria-label="more options"
              size="small"
              onClick={handleMenuClick}
              sx={{
                transition: "transform 0.2s ease-in-out",
                "&:hover": {
                  transform: "scale(1.1)",
                },
              }}>
              <MoreVertIcon />
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
              PaperProps={{
                sx: {
                  borderRadius: "8px",
                  boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                },
              }}>
              <MenuItem onClick={handlePrintClick}>Print</MenuItem>
              <MenuItem onClick={handleView}>View</MenuItem>
              <MenuItem onClick={handleFlag}>
                {row.flagged ? "Unflag" : "Flag"}
                {row.flagged ? (
                  <FlagIcon fontSize="small" sx={{ ml: 1 }} />
                ) : (
                  <OutlinedFlagIcon fontSize="small" sx={{ ml: 1 }} />
                )}
              </MenuItem>
              <MenuItem onClick={handleEdit}>Edit</MenuItem>
            </Menu>
          </TableCell>
        </StyledTableRow>
      </Tooltip>
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <AnimatePresence>
              {open && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2, ease: "easeInOut" }}>
                  <DetailBox>
                    <DetailTypography variant="h6" component="div">
                      Detail
                    </DetailTypography>
                    <Table size="small" aria-label="purchases">
                      <TableHead>
                        <TableRow>
                          <TableCell>
                            <strong>Name</strong>
                          </TableCell>
                          <TableCell align="right">
                            <strong>Quantity</strong>
                          </TableCell>
                          <TableCell align="right">
                            <strong>Unit Price</strong>
                          </TableCell>
                          <TableCell align="right">
                            <strong>Total Price</strong>
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {row.detail.map((item) => (
                          <StyledTableRow key={item.name}>
                            <TableCell component="th" scope="row">
                              {capitalizeFirstLetter(item.name)}
                            </TableCell>
                            <TableCell align="right">{item.quantity}</TableCell>
                            <TableCell align="right">
                              {item.salesPrice}
                            </TableCell>
                            <TableCell align="right">
                              {formatNumber(
                                Math.ceil(item.salesPrice * item.quantity)
                              )}
                            </TableCell>
                          </StyledTableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </DetailBox>
                </motion.div>
              )}
            </AnimatePresence>
          </Collapse>
        </TableCell>
      </TableRow>
    </React.Fragment>
  );
}

Row.propTypes = {
  row: PropTypes.object.isRequired,
  onFlagChange: PropTypes.func.isRequired,
};

export default Row;
