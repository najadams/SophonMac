import {
  Card,
  Typography,
  Grid,
  Divider,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from "@mui/material";
import { useLocation } from "react-router-dom"; // Import useLocation hook
import { capitalizeFirstLetter } from "../config/Functions";
import { useSelector } from "react-redux";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { alpha } from "@mui/material/styles";

const ViewReceipt = () => {
  const company = useSelector((state) => state.companyState.data);
  const location = useLocation();
  const { row } = location.state || {}; // Destructure row from location.state

  // Ensure that row exists before proceeding
  if (!row) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "60vh",
        }}>
        <Typography variant="h6" color="text.secondary">
          No receipt details available
        </Typography>
      </Box>
    );
  }

  const {
    customerName,
    customerCompany,
    detail,
    amountPaid,
    total,
    balance,
    workerName,
    date,
    discount,
  } = row; // Destructure the receipt data from row

  // Define colors
  const primaryColor = "#00796B"; // A pleasant greenish-blue color
  const secondaryColor = "#004D40"; // Darker shade for contrast
  //   const primaryColor = "#1976d2 ";
  //   const secondaryColor = "#1976d2 "; // Darker shade for contrast

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
        }}>
        <Box
          sx={{
            width: "100%",
            // maxWidth: "800px",
            flex: 1,
          }}>
          <Card
            elevation={0}
            sx={{
              p: { xs: 2, sm: 4 },
              borderRadius: 3,
              backgroundColor: alpha("#fff", 0.8),
              backdropFilter: "blur(10px)",
              boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
              height: "100%",
              display: "flex",
              flexDirection: "column",
            }}>
            {/* Company Info */}
            <Box sx={{ textAlign: "center", mb: 3 }}>
              <Typography
                variant="h4"
                sx={{
                  color: "primary.main",
                  fontWeight: 600,
                  mb: 1,
                }}>
                {capitalizeFirstLetter(company?.companyName)}
              </Typography>

              {company?.tinNumber && (
                <Typography variant="body1" color="text.secondary">
                  Tin Number: {company.tinNumber.toUpperCase()}
                </Typography>
              )}

              {company?.contact && (
                <Typography variant="body1" color="text.secondary">
                  Contact: {company.contact}
                </Typography>
              )}

              {company?.momo && (
                <Typography variant="body1" color="text.secondary">
                  Momo: {company.momo}
                </Typography>
              )}
            </Box>

            <Divider sx={{ my: 3, backgroundColor: "primary.main" }} />

            {/* Customer Info */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={4}>
                <Typography variant="subtitle1" color="primary" sx={{ mb: 1 }}>
                  Customer
                </Typography>
                <Typography variant="body1">
                  {capitalizeFirstLetter(customerName)} -{" "}
                  {capitalizeFirstLetter(customerCompany)}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Typography variant="subtitle1" color="primary" sx={{ mb: 1 }}>
                  Cashier
                </Typography>
                <Typography variant="body1">
                  {capitalizeFirstLetter(workerName)}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Typography variant="subtitle1" color="primary" sx={{ mb: 1 }}>
                  Date
                </Typography>
                <Typography variant="body1">
                  {date && !isNaN(new Date(date).getTime()) 
                    ? format(new Date(date), "dd/MM/yyyy")
                    : "Invalid Date"
                  }
                </Typography>
              </Grid>
            </Grid>

            <Divider sx={{ my: 3, backgroundColor: "primary.main" }} />

            {/* Products Table */}
            <Typography
              variant="h5"
              sx={{
                textAlign: "center",
                color: "primary.main",
                mb: 3,
                fontWeight: 500,
              }}>
              Purchased Products
            </Typography>

            <TableContainer
              component={Paper}
              elevation={0}
              sx={{
                mb: 3,
                borderRadius: 2,
                backgroundColor: alpha("#f5f5f5", 0.5),
                maxHeight: "400px",
                overflow: "auto",
              }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell align="center" sx={{ fontWeight: 600 }}>
                      Qty
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600 }}>
                      Product
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600 }}>
                      Price
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600 }}>
                      Total
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {detail.map((product, index) => {
                    // Display original quantity and sales unit if available
                    const displayQuantity = product.originalQuantity || product.quantity;
                    const displayUnit = product.salesUnit && product.salesUnit !== "none" ? product.salesUnit : "";
                    const quantityWithUnit = displayUnit ? `${displayQuantity} ${displayUnit}` : displayQuantity;
                    
                    // Show unit in product name if it's not the base unit and exists
                    const productNameWithUnit = displayUnit && displayUnit !== "none" 
                      ? `${capitalizeFirstLetter(product.name)} (${displayUnit})`
                      : capitalizeFirstLetter(product.name);
                    
                    return (
                      <TableRow key={index}>
                        <TableCell align="center">{quantityWithUnit}</TableCell>
                        <TableCell align="center">
                          {productNameWithUnit}
                        </TableCell>
                        <TableCell align="center">
                          ₵{product.price || product.salesPrice}
                        </TableCell>
                        <TableCell align="center">
                          ₵
                          {product.price
                            ? Math.ceil(product.price * displayQuantity)
                            : Math.ceil(product.salesPrice * displayQuantity)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>

            <Divider sx={{ my: 3, backgroundColor: "primary.main" }} />

            {/* Summary Info */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
              {company.taxRate && (
                <Grid item xs={6}>
                  <Typography
                    variant="subtitle1"
                    color="primary"
                    sx={{ mb: 1 }}>
                    Tax (%)
                  </Typography>
                  <Typography variant="body1">{company.taxRate}</Typography>
                </Grid>
              )}
              {discount !== undefined &&
                discount !== null &&
                discount !== 0 && (
                  <Grid item xs={6}>
                    <Typography
                      variant="subtitle1"
                      color="primary"
                      sx={{ mb: 1 }}>
                      Discount
                    </Typography>
                    <Typography variant="body1">₵{discount}</Typography>
                  </Grid>
                )}
              <Grid item xs={6}>
                <Typography variant="subtitle1" color="primary" sx={{ mb: 1 }}>
                  Total
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  ₵{total}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle1" color="primary" sx={{ mb: 1 }}>
                  Paid
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  ₵{amountPaid}
                </Typography>
              </Grid>
              {balance !== undefined && balance !== null && balance !== 0 && (
                <Grid item xs={6}>
                  <Typography
                    variant="subtitle1"
                    color="primary"
                    sx={{ mb: 1 }}>
                    Balance
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    ₵{balance}
                  </Typography>
                </Grid>
              )}
            </Grid>

            <Divider sx={{ my: 3, backgroundColor: "primary.main" }} />

            {/* Footer */}
            <Box sx={{ textAlign: "center", mt: "auto" }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Goods Sold Are Not Returnable
              </Typography>
              <Typography variant="h6" color="primary" sx={{ fontWeight: 600 }}>
                Thank you for shopping with us!
              </Typography>
            </Box>
          </Card>
        </Box>
      </Box>
    </motion.div>
  );
};

export default ViewReceipt;
