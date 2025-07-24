import React from "react";
import {
  Card,
  Grid,
  Typography,
  Box,
  Divider,
  Paper,
  Tooltip,
  useTheme,
  useMediaQuery,
  Chip,
  LinearProgress,
} from "@mui/material";
import {
  TrendingUp,
  TrendingDown,
  AttachMoney,
  Assessment,
  CreditCard,
  AccountBalance,
  PhoneAndroid,
  MonetizationOn,
} from "@mui/icons-material";
import { formatNumber } from "../../config/Functions";

const SummaryReport = ({ data }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const {
    totalCashReceived,
    totalCashReceivedAmount,
    summary: { sales, amountPaid, debtPayments, vendorPayments, debtsAcquired },
  } = data;
  
  // Use the correct net cash position from backend calculation
  const totalCash = totalCashReceivedAmount || 0;

  return (
    <Box sx={{ p: { xs: 0.5, sm: 2 }, maxWidth: "100%", overflow: "hidden" }}>
      <Paper
        elevation={0}
        sx={{
          p: { xs: 1.5, sm: 2 },
          mb: 3,
          backgroundColor: "#f8f9fa",
          maxWidth: "100%",
          overflow: "hidden",
        }}>
        <Typography
          variant="h4"
          gutterBottom
          sx={{
            fontWeight: 600,
            color: "#1a237e",
            mb: 2,
            fontSize: { xs: "1.25rem", sm: "1.75rem" },
          }}>
          Summary Report
        </Typography>

        {/* Summary Cards */}
        <Grid container spacing={{ xs: 1, sm: 1.5 }}>
          {/* Total Sales */}
          <Grid item xs={12} sm={6} md={3}>
            <Card
              elevation={2}
              sx={{
                p: { xs: 1.5, sm: 2 },
                textAlign: "center",
                backgroundColor: "#ffffff",
                borderRadius: "8px",
                transition: "transform 0.2s",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                "&:hover": {
                  transform: "translateY(-3px)",
                  boxShadow: 2,
                },
              }}>
              <Box
                sx={{
                  backgroundColor: "#e8f5e9",
                  borderRadius: "50%",
                  width: { xs: 40, sm: 45 },
                  height: { xs: 40, sm: 45 },
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 8px",
                }}>
                <TrendingUp
                  color="success"
                  sx={{ fontSize: { xs: 20, sm: 24 } }}
                />
              </Box>
              <Typography
                variant="h6"
                sx={{
                  color: "#666",
                  mb: 0.5,
                  fontWeight: 500,
                  fontSize: { xs: "0.85rem", sm: "0.9rem" },
                }}>
                Total Sales
              </Typography>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 700,
                  color: "#2e7d32",
                  fontSize: { xs: "1.25rem", sm: "1.5rem" },
                }}>
                ₵{`${formatNumber(sales.totalSales)}`}
              </Typography>
            </Card>
          </Grid>

          {/* Total Debt Payments */}
          <Grid item xs={12} sm={6} md={3}>
            <Card
              elevation={2}
              sx={{
                p: { xs: 1.5, sm: 2 },
                textAlign: "center",
                backgroundColor: "#ffffff",
                borderRadius: "8px",
                transition: "transform 0.2s",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                "&:hover": {
                  transform: "translateY(-3px)",
                  boxShadow: 2,
                },
              }}>
              <Box
                sx={{
                  backgroundColor: "#e3f2fd",
                  borderRadius: "50%",
                  width: { xs: 40, sm: 45 },
                  height: { xs: 40, sm: 45 },
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 8px",
                }}>
                <AttachMoney
                  color="primary"
                  sx={{ fontSize: { xs: 20, sm: 24 } }}
                />
              </Box>
              <Typography
                variant="h6"
                sx={{
                  color: "#666",
                  mb: 0.5,
                  fontWeight: 500,
                  fontSize: { xs: "0.85rem", sm: "0.9rem" },
                }}>
                Debt Payments
              </Typography>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 700,
                  color: "#1976d2",
                  fontSize: { xs: "1.25rem", sm: "1.5rem" },
                }}>
                ₵{formatNumber(debtPayments.totalPaid)}
              </Typography>
            </Card>
          </Grid>

          {/* Total Debts Acquired */}
          <Grid item xs={12} sm={6} md={3}>
            <Card
              elevation={2}
              sx={{
                p: { xs: 1.5, sm: 2 },
                textAlign: "center",
                backgroundColor: "#ffffff",
                borderRadius: "8px",
                transition: "transform 0.2s",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                "&:hover": {
                  transform: "translateY(-3px)",
                  boxShadow: 2,
                },
              }}>
              <Box
                sx={{
                  backgroundColor: "#ffebee",
                  borderRadius: "50%",
                  width: { xs: 40, sm: 45 },
                  height: { xs: 40, sm: 45 },
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 8px",
                }}>
                <TrendingDown
                  color="error"
                  sx={{ fontSize: { xs: 20, sm: 24 } }}
                />
              </Box>
              <Typography
                variant="h6"
                sx={{
                  color: "#666",
                  mb: 0.5,
                  fontWeight: 500,
                  fontSize: { xs: "0.85rem", sm: "0.9rem" },
                }}>
                Debts Acquired
              </Typography>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 700,
                  color: "#d32f2f",
                  fontSize: { xs: "1.25rem", sm: "1.5rem" },
                }}>
                ₵{formatNumber(debtsAcquired.totalDebts)}
              </Typography>
            </Card>
          </Grid>

          {/* Net Cash Position */}
          <Grid item xs={12} sm={6} md={3}>
            <Tooltip
              title={`Net Cash = Amount Paid + Debt Payments - Vendor Payments`}
              arrow
              placement="top">
              <Card
                elevation={2}
                sx={{
                  p: { xs: 1.5, sm: 2 },
                  textAlign: "center",
                  backgroundColor: "#ffffff",
                  borderRadius: "8px",
                  transition: "transform 0.2s",
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  "&:hover": {
                    transform: "translateY(-3px)",
                    boxShadow: 2,
                  },
                }}>
                <Box
                  sx={{
                    backgroundColor: "#fff3e0",
                    borderRadius: "50%",
                    width: { xs: 40, sm: 45 },
                    height: { xs: 40, sm: 45 },
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 8px",
                  }}>
                  <AttachMoney
                    color="secondary"
                    sx={{ fontSize: { xs: 20, sm: 24 } }}
                  />
                </Box>
                <Typography
                variant="h6"
                sx={{
                  color: "#666",
                  mb: 0.5,
                  fontWeight: 500,
                  fontSize: { xs: "0.85rem", sm: "0.9rem" },
                }}>
                Net Cash Position
              </Typography>
                <Typography
                  variant="h4"
                  sx={{
                    fontWeight: 700,
                    color: totalCash >= 0 ? "#f57c00" : "#d32f2f",
                    fontSize: { xs: "1.25rem", sm: "1.5rem" },
                  }}>
                  {`₵${formatNumber(totalCash)}`}
                </Typography>
              </Card>
            </Tooltip>
          </Grid>
        </Grid>
      </Paper>

      {/* Breakdown Section */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 1.5, sm: 2 },
          backgroundColor: "#f8f9fa",
          maxWidth: "100%",
          overflow: "hidden",
        }}>
        <Typography
          variant="h5"
          sx={{
            fontWeight: 600,
            color: "#1a237e",
            mb: 2,
            fontSize: { xs: "1.1rem", sm: "1.25rem" },
          }}>
          Breakdown
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <Grid container spacing={{ xs: 1.5, sm: 2 }}>
          <Grid item xs={12} sm={6} md={4}>
            <Card
              elevation={2}
              sx={{ p: { xs: 1.5, sm: 2 }, borderRadius: "8px" }}>
              <Typography
                variant="h6"
                sx={{
                  color: "#1a237e",
                  mb: 1.5,
                  fontWeight: 600,
                  fontSize: { xs: "0.9rem", sm: "1rem" },
                }}>
                Net Cash Breakdown
              </Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
                <Typography
                  variant="body2"
                  sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <MonetizationOn sx={{ fontSize: 16, color: "#f57c00" }} />
                    <span style={{ color: "#666" }}>Cash:</span>
                  </Box>
                  <span style={{ fontWeight: 600, color: totalCash >= 0 ? "#2e7d32" : "#d32f2f" }}>
                    ₵{formatNumber(totalCashReceived || 0)}
                  </span>
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <PhoneAndroid sx={{ fontSize: 16, color: "#4caf50" }} />
                    <span style={{ color: "#666" }}>Momo:</span>
                  </Box>
                  <span style={{ fontWeight: 600, color: "#2e7d32" }}>
                    ₵{formatNumber((amountPaid?.momo || 0) + (debtPayments.momo || 0) - (vendorPayments?.momo || 0))}
                  </span>
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <CreditCard sx={{ fontSize: 16, color: "#2196f3" }} />
                    <span style={{ color: "#666" }}>Card:</span>
                  </Box>
                  <span style={{ fontWeight: 600, color: "#2e7d32" }}>
                    ₵{formatNumber((amountPaid?.card || 0) + (debtPayments.card || 0) - (vendorPayments?.card || 0))}
                  </span>
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <AccountBalance sx={{ fontSize: 16, color: "#9c27b0" }} />
                    <span style={{ color: "#666" }}>Bank Transfer:</span>
                  </Box>
                  <span style={{ fontWeight: 600, color: "#2e7d32" }}>
                    ₵{formatNumber((amountPaid?.bankTransfer || 0) + (debtPayments.bankTransfer || 0) - (vendorPayments?.bankTransfer || 0))}
                  </span>
                </Typography>
              </Box>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Card
              elevation={2}
              sx={{ p: { xs: 1.5, sm: 2 }, borderRadius: "8px" }}>
              <Typography
                variant="h6"
                sx={{
                  color: "#1a237e",
                  mb: 1.5,
                  fontWeight: 600,
                  fontSize: { xs: "0.9rem", sm: "1rem" },
                }}>
                Debt Payments Breakdown
              </Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
                <Typography
                  variant="body2"
                  sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <MonetizationOn sx={{ fontSize: 16, color: "#f57c00" }} />
                    <span style={{ color: "#666" }}>Cash:</span>
                  </Box>
                  <span style={{ fontWeight: 600, color: "#1976d2" }}>
                    ₵{formatNumber(debtPayments.cash)}
                  </span>
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <PhoneAndroid sx={{ fontSize: 16, color: "#4caf50" }} />
                    <span style={{ color: "#666" }}>Momo:</span>
                  </Box>
                  <span style={{ fontWeight: 600, color: "#1976d2" }}>
                    ₵{formatNumber(debtPayments.momo)}
                  </span>
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <CreditCard sx={{ fontSize: 16, color: "#2196f3" }} />
                    <span style={{ color: "#666" }}>Card:</span>
                  </Box>
                  <span style={{ fontWeight: 600, color: "#1976d2" }}>
                    ₵{formatNumber(debtPayments.card || 0)}
                  </span>
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <AccountBalance sx={{ fontSize: 16, color: "#9c27b0" }} />
                    <span style={{ color: "#666" }}>Bank Transfer:</span>
                  </Box>
                  <span style={{ fontWeight: 600, color: "#1976d2" }}>
                    ₵{formatNumber(debtPayments.bankTransfer || 0)}
                  </span>
                </Typography>
              </Box>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Card
              elevation={2}
              sx={{ p: { xs: 1.5, sm: 2 }, borderRadius: "8px" }}>
              <Typography
                variant="h6"
                sx={{
                  color: "#1a237e",
                  mb: 1.5,
                  fontWeight: 600,
                  fontSize: { xs: "0.9rem", sm: "1rem" },
                }}>
                Vendor Payments Breakdown
              </Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
                <Typography
                  variant="body2"
                  sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <MonetizationOn sx={{ fontSize: 16, color: "#f57c00" }} />
                    <span style={{ color: "#666" }}>Cash:</span>
                  </Box>
                  <span style={{ fontWeight: 600, color: "#d32f2f" }}>
                    ₵{formatNumber(vendorPayments?.cash || 0)}
                  </span>
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <PhoneAndroid sx={{ fontSize: 16, color: "#4caf50" }} />
                    <span style={{ color: "#666" }}>Momo:</span>
                  </Box>
                  <span style={{ fontWeight: 600, color: "#d32f2f" }}>
                    ₵{formatNumber(vendorPayments?.momo || 0)}
                  </span>
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <CreditCard sx={{ fontSize: 16, color: "#2196f3" }} />
                    <span style={{ color: "#666" }}>Card:</span>
                  </Box>
                  <span style={{ fontWeight: 600, color: "#d32f2f" }}>
                    ₵{formatNumber(vendorPayments?.card || 0)}
                  </span>
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <AccountBalance sx={{ fontSize: 16, color: "#9c27b0" }} />
                    <span style={{ color: "#666" }}>Bank Transfer:</span>
                  </Box>
                  <span style={{ fontWeight: 600, color: "#d32f2f" }}>
                    ₵{formatNumber(vendorPayments?.bankTransfer || 0)}
                  </span>
                </Typography>
              </Box>
            </Card>
          </Grid>
        </Grid>

        {/* Payment Method Analytics */}
        <Paper
          elevation={0}
          sx={{
            p: { xs: 1.5, sm: 2 },
            mt: 2,
            backgroundColor: "#ffffff",
            borderRadius: "8px",
          }}>
          <Typography
            variant="h6"
            sx={{
              color: "#1a237e",
              mb: 2,
              fontWeight: 600,
              fontSize: { xs: "1rem", sm: "1.1rem" },
            }}>
            Payment Method Analytics
          </Typography>
          <Grid container spacing={2}>
            {(() => {
              const totalSalesAmount = sales.totalSales || 1;
              const totalDebtPaymentsAmount = debtPayments.totalPaid || 1;
              
              const salesMethods = [
                { name: "Cash", amount: sales.cash, icon: MonetizationOn, color: "#f57c00" },
                { name: "Mobile Money", amount: sales.momo, icon: PhoneAndroid, color: "#4caf50" },
                { name: "Card", amount: sales.card || 0, icon: CreditCard, color: "#2196f3" },
                { name: "Bank Transfer", amount: sales.bankTransfer || 0, icon: AccountBalance, color: "#9c27b0" },
              ];
              
              const debtPaymentMethods = [
                { name: "Cash", amount: debtPayments.cash, icon: MonetizationOn, color: "#f57c00" },
                { name: "Mobile Money", amount: debtPayments.momo, icon: PhoneAndroid, color: "#4caf50" },
                { name: "Card", amount: debtPayments.card || 0, icon: CreditCard, color: "#2196f3" },
                { name: "Bank Transfer", amount: debtPayments.bankTransfer || 0, icon: AccountBalance, color: "#9c27b0" },
              ];
              
              return (
                <>
                  <Grid item xs={12} md={6}>
                    <Card elevation={1} sx={{ p: 2, height: "100%" }}>
                      <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600, color: "#2e7d32" }}>
                        Sales by Payment Method
                      </Typography>
                      {salesMethods.map((method) => {
                        const percentage = totalSalesAmount > 0 ? (method.amount / totalSalesAmount) * 100 : 0;
                        const IconComponent = method.icon;
                        return (
                          <Box key={method.name} sx={{ mb: 2 }}>
                            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.5 }}>
                              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                <IconComponent sx={{ fontSize: 16, color: method.color }} />
                                <Typography variant="body2" sx={{ color: "#666" }}>
                                  {method.name}
                                </Typography>
                              </Box>
                              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                  ₵{formatNumber(method.amount)}
                                </Typography>
                                <Chip
                                  label={`${percentage.toFixed(1)}%`}
                                  size="small"
                                  sx={{
                                    backgroundColor: method.color,
                                    color: "white",
                                    fontSize: "0.7rem",
                                    height: 20,
                                  }}
                                />
                              </Box>
                            </Box>
                            <LinearProgress
                              variant="determinate"
                              value={percentage}
                              sx={{
                                height: 6,
                                borderRadius: 3,
                                backgroundColor: "#f5f5f5",
                                "& .MuiLinearProgress-bar": {
                                  backgroundColor: method.color,
                                  borderRadius: 3,
                                },
                              }}
                            />
                          </Box>
                        );
                      })}
                    </Card>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <Card elevation={1} sx={{ p: 2, height: "100%" }}>
                      <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600, color: "#1976d2" }}>
                        Debt Payments by Method
                      </Typography>
                      {debtPaymentMethods.map((method) => {
                        const percentage = totalDebtPaymentsAmount > 0 ? (method.amount / totalDebtPaymentsAmount) * 100 : 0;
                        const IconComponent = method.icon;
                        return (
                          <Box key={method.name} sx={{ mb: 2 }}>
                            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.5 }}>
                              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                <IconComponent sx={{ fontSize: 16, color: method.color }} />
                                <Typography variant="body2" sx={{ color: "#666" }}>
                                  {method.name}
                                </Typography>
                              </Box>
                              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                  ₵{formatNumber(method.amount)}
                                </Typography>
                                <Chip
                                  label={`${percentage.toFixed(1)}%`}
                                  size="small"
                                  sx={{
                                    backgroundColor: method.color,
                                    color: "white",
                                    fontSize: "0.7rem",
                                    height: 20,
                                  }}
                                />
                              </Box>
                            </Box>
                            <LinearProgress
                              variant="determinate"
                              value={percentage}
                              sx={{
                                height: 6,
                                borderRadius: 3,
                                backgroundColor: "#f5f5f5",
                                "& .MuiLinearProgress-bar": {
                                  backgroundColor: method.color,
                                  borderRadius: 3,
                                },
                              }}
                            />
                          </Box>
                        );
                      })}
                    </Card>
                  </Grid>
                </>
              );
            })()}
          </Grid>
        </Paper>
      </Paper>
    </Box>
  );
};

export default SummaryReport;
