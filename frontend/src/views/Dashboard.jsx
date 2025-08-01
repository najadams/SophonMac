import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  Box,
  Typography,
  Grid,
  FormControl,
  Select,
  MenuItem,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Tooltip as MuiTooltip,
  IconButton,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  LinearProgress,
  useTheme,
  useMediaQuery,
  TextField,
} from "@mui/material";
import {
  TrendingUp,
  TrendingDown,
  People,
  ShoppingCart,
  AttachMoney,
  Inventory,
  CalendarToday,
  DateRange,
  Warning,
  Error,
  CheckCircle,
  Category,
  Payment,
  Schedule,
  Analytics,
  Refresh,
  NotificationsActive,
  Visibility,
  VisibilityOff,
  Group,
} from "@mui/icons-material";
import { useSelector } from "react-redux";
import { useQuery } from "react-query";
import { motion } from "framer-motion";
import {
  tableActions,
  formatNumber,
  fetchCategoryAnalytics,
  fetchPaymentAnalytics,
  fetchHourlyAnalytics,
  fetchInventoryAlerts,
  fetchWeekdayAnalytics,
} from "../config/Functions";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart,
  Legend,
} from "recharts";
import MyPie from "../utils/MyPie";
import SlidingCard from "../components/common/SlidingCard";
import Loader from "../components/common/Loader";

// Date Utils
const getMonthsArray = () => {
  const months = [];
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();

  // Generate last 12 months
  for (let i = 0; i < 12; i++) {
    const monthDate = new Date(currentDate);
    monthDate.setMonth(currentDate.getMonth() - i);

    const monthName = monthDate.toLocaleString("default", { month: "long" });
    const year = monthDate.getFullYear();

    months.push({
      label: `${monthName} ${year}`,
      value: `${year}-${(monthDate.getMonth() + 1)
        .toString()
        .padStart(2, "0")}`,
    });
  }

  return months;
};

// DateRangeSelector Component
const DateRangeSelector = ({ dateRange, onDateRangeChange }) => {
  const [selectedOption, setSelectedOption] = useState(
    dateRange.type || "month"
  );
  const [selectedMonth, setSelectedMonth] = useState(
    dateRange.month || getMonthsArray()[0].value
  );
  const [customDateRange, setCustomDateRange] = useState({
    startDate: dateRange.startDate || "",
    endDate: dateRange.endDate || "",
  });
  const [isCustomDialogOpen, setIsCustomDialogOpen] = useState(false);

  const months = getMonthsArray();

  const handleOptionChange = (event) => {
    const option = event.target.value;
    setSelectedOption(option);

    if (option === "month") {
      onDateRangeChange({
        type: "month",
        month: selectedMonth,
      });
    } else if (option === "custom") {
      setIsCustomDialogOpen(true);
    }
  };

  const handleMonthChange = (event) => {
    const month = event.target.value;
    setSelectedMonth(month);

    onDateRangeChange({
      type: "month",
      month: month,
    });
  };

  const handleCustomDateChange = (field, value) => {
    setCustomDateRange((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleCustomDateSubmit = () => {
    onDateRangeChange({
      type: "custom",
      startDate: customDateRange.startDate,
      endDate: customDateRange.endDate,
    });
    setIsCustomDialogOpen(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}>
      <Card
        sx={{
          mb: 3,
          borderRadius: 2,
          boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
        }}>
        <CardContent>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 2,
            }}>
            <CalendarToday sx={{ color: "#2196f3" }} />
            <Typography variant="h6" sx={{ fontWeight: 500, flexGrow: 1 }}>
              Date Range
            </Typography>

            <FormControl sx={{ minWidth: 150 }}>
              <Select
                value={selectedOption}
                onChange={handleOptionChange}
                size="small"
                sx={{ borderRadius: 2 }}>
                <MenuItem value="month">Monthly</MenuItem>
                <MenuItem value="custom">Custom Range</MenuItem>
              </Select>
            </FormControl>

            {selectedOption === "month" && (
              <FormControl sx={{ minWidth: 200 }}>
                <Select
                  value={selectedMonth}
                  onChange={handleMonthChange}
                  size="small"
                  sx={{ borderRadius: 2 }}>
                  {months?.map((month) => (
                    <MenuItem key={month.value} value={month.value}>
                      {month.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {selectedOption === "custom" && (
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <Typography variant="body2" sx={{ color: "#666", mr: 1 }}>
                  {customDateRange.startDate} to {customDateRange.endDate}
                </Typography>
                <Button
                  startIcon={<DateRange />}
                  size="small"
                  onClick={() => setIsCustomDialogOpen(true)}
                  sx={{ ml: 1 }}>
                  Change
                </Button>
              </Box>
            )}
          </Box>
        </CardContent>
      </Card>

      <Dialog
        open={isCustomDialogOpen}
        onClose={() => setIsCustomDialogOpen(false)}>
        <DialogTitle>Select Custom Date Range</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              label="Start Date"
              type="date"
              value={customDateRange.startDate}
              onChange={(e) =>
                handleCustomDateChange("startDate", e.target.value)
              }
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              label="End Date"
              type="date"
              value={customDateRange.endDate}
              onChange={(e) =>
                handleCustomDateChange("endDate", e.target.value)
              }
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsCustomDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleCustomDateSubmit}
            variant="contained"
            disabled={!customDateRange.startDate || !customDateRange.endDate}>
            Apply
          </Button>
        </DialogActions>
      </Dialog>
    </motion.div>
  );
};

// Category Analytics Component
const CategoryAnalytics = ({ dateRange }) => {
  const companyId = useSelector((state) => state.companyState.data?.id);
  const {
    data: categoryData,
    isLoading,
    isError,
  } = useQuery(
    ["categoryAnalytics", companyId, dateRange],
    () => fetchCategoryAnalytics(companyId, dateRange),
    {
      enabled: !!companyId,
    }
  );

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

  return (
    <DummyCard title="Sales by Category" index={6}>
      {isLoading ? (
        <Loader type={2} />
      ) : isError ? (
        <Typography>Error loading category data</Typography>
      ) : !categoryData || categoryData.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 3 }}>
          <img 
            src="/noData.jpg" 
            alt="No data available" 
            style={{ maxWidth: '100%', height: 'auto', maxHeight: '200px' }}
          />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            No category data available for this period
          </Typography>
        </Box>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={categoryData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
            <XAxis dataKey="category" stroke="#666" />
            <YAxis stroke="#666" />
            <RechartsTooltip
              contentStyle={{
                backgroundColor: "rgba(255,255,255,0.9)",
                border: "none",
                borderRadius: "8px",
                boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
              }}
            />
            <Bar dataKey="totalRevenue" fill="#4caf50" />
          </BarChart>
        </ResponsiveContainer>
      )}
    </DummyCard>
  );
};

// Payment Analytics Component
const PaymentAnalytics = ({ dateRange }) => {
  const companyId = useSelector((state) => state.companyState.data?.id);
  const {
    data: paymentData,
    isLoading,
    isError,
  } = useQuery(
    ["paymentAnalytics", companyId, dateRange],
    () => fetchPaymentAnalytics(companyId, dateRange),
    {
      enabled: !!companyId,
    }
  );

  return (
    <DummyCard title="Payment Methods" index={7}>
      {isLoading ? (
        <Loader type={2} />
      ) : isError ? (
        <Typography>Error loading payment data</Typography>
      ) : !paymentData || paymentData.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 3 }}>
          <img 
            src="/noData.jpg" 
            alt="No data available" 
            style={{ maxWidth: '100%', height: 'auto', maxHeight: '200px' }}
          />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            No payment data available for this period
          </Typography>
        </Box>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={paymentData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
            <XAxis dataKey="paymentMethod" stroke="#666" />
            <YAxis stroke="#666" />
            <RechartsTooltip
              contentStyle={{
                backgroundColor: "rgba(255,255,255,0.9)",
                border: "none",
                borderRadius: "8px",
                boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
              }}
            />
            <Bar dataKey="totalAmount" fill="#8884d8" />
          </BarChart>
        </ResponsiveContainer>
      )}
    </DummyCard>
  );
};

// Hourly Sales Component
const HourlySales = ({ dateRange }) => {
  const companyId = useSelector((state) => state.companyState.data?.id);
  const {
    data: hourlyData,
    isLoading,
    isError,
  } = useQuery(
    ["hourlyAnalytics", companyId, dateRange],
    () => fetchHourlyAnalytics(companyId, dateRange),
    {
      enabled: !!companyId,
    }
  );

  return (
    <DummyCard title="Sales by Hour" index={8}>
      {isLoading ? (
        <Loader type={2} />
      ) : isError ? (
        <Typography>Error loading hourly data</Typography>
      ) : !hourlyData || hourlyData.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 3 }}>
          <img 
            src="/noData.jpg" 
            alt="No data available" 
            style={{ maxWidth: '100%', height: 'auto', maxHeight: '200px' }}
          />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            No hourly data available for this period
          </Typography>
        </Box>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={hourlyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
            <XAxis dataKey="hour" stroke="#666" />
            <YAxis stroke="#666" />
            <RechartsTooltip
              contentStyle={{
                backgroundColor: "rgba(255,255,255,0.9)",
                border: "none",
                borderRadius: "8px",
                boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
              }}
            />
            <Area
              type="monotone"
              dataKey="totalSales"
              stroke="#8884d8"
              fill="#8884d8"
              fillOpacity={0.6}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </DummyCard>
  );
};

// Inventory Alerts Component
const InventoryAlerts = () => {
  const companyId = useSelector((state) => state.companyState.data?.id);
  const {
    data: alertsData,
    isLoading,
    isError,
  } = useQuery(
    ["inventoryAlerts", companyId],
    () => fetchInventoryAlerts(companyId),
    {
      enabled: !!companyId,
    }
  );

  const getAlertIcon = (type) => {
    switch (type) {
      case "low_stock":
        return <Warning sx={{ color: "#ff9800" }} />;
      case "out_of_stock":
        return <Error sx={{ color: "#f44336" }} />;
      default:
        return <CheckCircle sx={{ color: "#4caf50" }} />;
    }
  };

  const getAlertColor = (type) => {
    switch (type) {
      case "low_stock":
        return "warning";
      case "out_of_stock":
        return "error";
      default:
        return "success";
    }
  };

  return (
    <DummyCard title="Inventory Alerts" index={9}>
      {isLoading ? (
        <Loader type={2} />
      ) : isError ? (
        <Typography>Error loading inventory alerts</Typography>
      ) : !alertsData || alertsData.length === 0 ? (
        <Box sx={{ textAlign: "center", py: 3 }}>
          <CheckCircle sx={{ fontSize: 48, color: "#4caf50", mb: 2 }} />
          <Typography variant="h6" color="success.main">
            All Good!
          </Typography>
          <Typography variant="body2" color="text.secondary">
            No inventory alerts at this time
          </Typography>
        </Box>
      ) : (
        <List sx={{ maxHeight: 300, overflow: "auto" }}>
          {alertsData.map((alert, index) => (
            <React.Fragment key={alert.id}>
              <ListItem>
                <ListItemIcon>{getAlertIcon(alert.alertType)}</ListItemIcon>
                <ListItemText
                  primary={
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Typography variant="subtitle2">{alert.name}</Typography>
                      <Chip
                        label={alert.alertType.replace("_", " ").toUpperCase()}
                        size="small"
                        color={getAlertColor(alert.alertType)}
                      />
                    </Box>
                  }
                  secondary={
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Current Stock: {alert.onhand} | Reorder Point:{" "}
                        {alert.reorderPoint}
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={Math.min(
                          (alert.onhand / alert.reorderPoint) * 100,
                          100
                        )}
                        color={getAlertColor(alert.alertType)}
                        sx={{ mt: 1, height: 6, borderRadius: 3 }}
                      />
                    </Box>
                  }
                />
              </ListItem>
              {index < alertsData.length - 1 && <Divider />}
            </React.Fragment>
          ))}
        </List>
      )}
    </DummyCard>
  );
};

// // Weekday Analytics Component
// const WeekdayAnalytics = ({ dateRange }) => {
//   const companyId = useSelector((state) => state.companyState.data?.id);
//   const {
//     data: weekdayData,
//     isLoading,
//     isError,
//   } = useQuery(
//     ["weekdayAnalytics", companyId, dateRange],
//     () => fetchWeekdayAnalytics(companyId, dateRange),
//     {
//       enabled: !!companyId,
//     }
//   );

//   return (
//     <DummyCard title="Sales by Day of Week" index={10}>
//       {isLoading ? (
//         <Loader type={2} />
//       ) : isError ? (
//         <Typography>Error loading weekday data</Typography>
//       ) : !weekdayData || weekdayData.length === 0 ? (
//         <Box sx={{ textAlign: 'center', py: 3 }}>
//           <img 
//             src="/noData.jpg" 
//             alt="No data available" 
//             style={{ maxWidth: '100%', height: 'auto', maxHeight: '200px' }}
//           />
//           <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
//             No weekday data available for this period
//           </Typography>
//         </Box>
//       ) : (
//         <ResponsiveContainer width="100%" height={300}>
//           <BarChart data={weekdayData}>
//             <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
//             <XAxis dataKey="dayName" stroke="#666" />
//             <YAxis stroke="#666" />
//             <RechartsTooltip
//               contentStyle={{
//                 backgroundColor: "rgba(255,255,255,0.9)",
//                 border: "none",
//                 borderRadius: "8px",
//                 boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
//               }}
//             />
//             <Bar dataKey="totalSales" fill="#82ca9d" />
//           </BarChart>
//         </ResponsiveContainer>
//       )}
//     </DummyCard>
//   );
//   const [customDateRange, setCustomDateRange] = useState({
//     startDate: dateRange.startDate || "",
//     endDate: dateRange.endDate || "",
//   });
//   const [isCustomDialogOpen, setIsCustomDialogOpen] = useState(false);

//   const months = getMonthsArray();

//   const handleOptionChange = (event) => {
//     const option = event.target.value;
//     setSelectedOption(option);

//     if (option === "month") {
//       onDateRangeChange({
//         type: "month",
//         month: selectedMonth,
//       });
//     } else if (option === "custom") {
//       setIsCustomDialogOpen(true);
//     }
//   };

//   const handleMonthChange = (event) => {
//     const month = event.target.value;
//     setSelectedMonth(month);

//     onDateRangeChange({
//       type: "month",
//       month: month,
//     });
//   };

//   const handleCustomDateChange = (field, value) => {
//     setCustomDateRange((prev) => ({
//       ...prev,
//       [field]: value,
//     }));
//   };

//   const handleCustomDateSubmit = () => {
//     onDateRangeChange({
//       type: "custom",
//       startDate: customDateRange.startDate,
//       endDate: customDateRange.endDate,
//     });
//     setIsCustomDialogOpen(false);
//   };

//   return (
//     <motion.div
//       initial={{ opacity: 0, y: -10 }}
//       animate={{ opacity: 1, y: 0 }}
//       transition={{ duration: 0.3 }}>
//       <Card
//         sx={{
//           mb: 3,
//           borderRadius: 2,
//           boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
//         }}>
//         <CardContent>
//           <Box
//             sx={{
//               display: "flex",
//               alignItems: "center",
//               flexWrap: "wrap",
//               gap: 2,
//             }}>
//             <CalendarToday sx={{ color: "#2196f3" }} />
//             <Typography variant="h6" sx={{ fontWeight: 500, flexGrow: 1 }}>
//               Date Range
//             </Typography>

//             <FormControl sx={{ minWidth: 150 }}>
//               <Select
//                 value={selectedOption}
//                 onChange={handleOptionChange}
//                 size="small"
//                 sx={{ borderRadius: 2 }}>
//                 <MenuItem value="month">Monthly</MenuItem>
//                 <MenuItem value="custom">Custom Range</MenuItem>
//               </Select>
//             </FormControl>

//             {selectedOption === "month" && (
//               <FormControl sx={{ minWidth: 200 }}>
//                 <Select
//                   value={selectedMonth}
//                   onChange={handleMonthChange}
//                   size="small"
//                   sx={{ borderRadius: 2 }}>
//                   {months?.map((month) => (
//                     <MenuItem key={month.value} value={month.value}>
//                       {month.label}
//                     </MenuItem>
//                   ))}
//                 </Select>
//               </FormControl>
//             )}

//             {selectedOption === "custom" && (
//               <Box sx={{ display: "flex", alignItems: "center" }}>
//                 <Typography variant="body2" sx={{ color: "#666", mr: 1 }}>
//                   {customDateRange.startDate} to {customDateRange.endDate}
//                 </Typography>
//                 <Button
//                   startIcon={<DateRange />}
//                   size="small"
//                   onClick={() => setIsCustomDialogOpen(true)}
//                   sx={{ ml: 1 }}>
//                   Change
//                 </Button>
//               </Box>
//             )}
//           </Box>
//         </CardContent>
//       </Card>

//       <Dialog
//         open={isCustomDialogOpen}
//         onClose={() => setIsCustomDialogOpen(false)}>
//         <DialogTitle>Select Custom Date Range</DialogTitle>
//         <DialogContent>
//           <Box sx={{ pt: 1, display: "flex", flexDirection: "column", gap: 2 }}>
//             <TextField
//               label="Start Date"
//               type="date"
//               value={customDateRange.startDate}
//               onChange={(e) =>
//                 handleCustomDateChange("startDate", e.target.value)
//               }
//               InputLabelProps={{ shrink: true }}
//               fullWidth
//             />
//             <TextField
//               label="End Date"
//               type="date"
//               value={customDateRange.endDate}
//               onChange={(e) =>
//                 handleCustomDateChange("endDate", e.target.value)
//               }
//               InputLabelProps={{ shrink: true }}
//               fullWidth
//             />
//           </Box>
//         </DialogContent>
//         <DialogActions>
//           <Button onClick={() => setIsCustomDialogOpen(false)}>Cancel</Button>
//           <Button
//             onClick={handleCustomDateSubmit}
//             variant="contained"
//             disabled={!customDateRange.startDate || !customDateRange.endDate}>
//             Apply
//           </Button>
//         </DialogActions>
//       </Dialog>
//     </motion.div>
//   );
// };

const DummyCard = ({ children, title, sx, index }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay: index * 0.1 }}
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}>
    <Box
      sx={{
        width: "100%",
        height: "100%",
        margin: { xs: 0.5, sm: 1, md: 1.5 },
        ...sx,
      }}>
      <Card
        sx={{
          width: "100%",
          height: "100%",
          borderRadius: 2,
          boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
          transition: "all 0.3s ease-in-out",
          "&:hover": {
            transform: "translateY(-5px)",
            boxShadow: "0 8px 30px rgba(0,0,0,0.1)",
          },
        }}>
        <CardContent>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}>
            <Typography
              variant="h6"
              component="div"
              sx={{
                fontWeight: 600,
                mb: 2,
                color: "#333",
              }}>
              {title}
            </Typography>
          </motion.div>
          {children}
        </CardContent>
      </Card>
    </Box>
  </motion.div>
);

export const Widgets = ({ title, count, icon, index }) => {
  const [isVisible, setIsVisible] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const toggleVisibility = () => {
    setIsVisible(!isVisible);
  };

  const getIcon = () => {
    switch (icon) {
      case "sales":
        return <ShoppingCart sx={{ fontSize: "2rem", color: "#2196f3" }} />;
      case "employees":
        return <People sx={{ fontSize: "2rem", color: "#4caf50" }} />;
      case "products":
        return <Inventory sx={{ fontSize: "2rem", color: "#ff9800" }} />;
      case "customers":
        return <Group sx={{ fontSize: "2rem", color: "#9c27b0" }} />;
      default:
        return null;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}>
      <Card
        sx={{
          width: "100%",
          height: "100%",
          borderRadius: 2,
          boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
          transition: "all 0.3s ease-in-out",
          "&:hover": {
            transform: "translateY(-5px)",
            boxShadow: "0 8px 30px rgba(0,0,0,0.1)",
          },
        }}>
        <CardContent>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 2,
            }}>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              style={{ display: "flex", alignItems: "center", gap: 1 }}>
              {getIcon()}
              <Typography
                variant="subtitle1"
                sx={{
                  fontWeight: 500,
                  color: "#666",
                }}>
                {title}
              </Typography>
            </motion.div>
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
              <IconButton
                onClick={toggleVisibility}
                sx={{
                  height: 24,
                  width: 24,
                  "&:hover": {
                    backgroundColor: "rgba(0,0,0,0.04)",
                  },
                }}>
                {isVisible ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            </motion.div>
          </Box>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 600,
                color: "#2196f3",
                textAlign: "center",
              }}>
              {isVisible ? count : "#".repeat(count.toString().length)}
            </Typography>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

const DashboardMetrics = ({ dateRange }) => {
  const companyId = useSelector((state) => state.companyState.data?.id);
  const { data: salesAnalytics } = useQuery(
    ["salesAnalytics", companyId, dateRange],
    () => tableActions.fetchSalesAnalytics(companyId, dateRange)
  );

  const { data: inventoryMetrics } = useQuery(
    ["inventoryMetrics", companyId, dateRange],
    () => tableActions.fetchInventoryMetrics(companyId, dateRange)
  );

  return (
    <Grid container spacing={2}>
      <Grid item xs={12} md={6}>
        <DummyCard title="Peak Hours Analysis" index={0}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={salesAnalytics?.hourlyAnalytics || []}>
              <XAxis dataKey="hour" />
              <YAxis />
              <RechartsTooltip />
              <Legend />
              <Bar dataKey="sales" fill="#8884d8" />
              <Bar dataKey="transactions" fill="#82ca9d" />
            </BarChart>
          </ResponsiveContainer>
        </DummyCard>
      </Grid>

      <Grid item xs={12} md={6}>
        <DummyCard title="Weekly Performance" index={1}>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={salesAnalytics?.weekdayAnalytics || []}>
              <XAxis dataKey="day" />
              <YAxis />
              <RechartsTooltip />
              <Legend />
              <Line type="monotone" dataKey="sales" stroke="#8884d8" />
              <Line type="monotone" dataKey="averageTicket" stroke="#82ca9d" />
            </LineChart>
          </ResponsiveContainer>
        </DummyCard>
      </Grid>

    
    </Grid>
  );
};

const Dashboard = () => {
  const companyId = useSelector((state) => state.companyState.data?.id);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  useEffect(() => {
    console.log(companyId, "from dashboard");
  }, [companyId]);
  // Default to current month
  const today = new Date();
  const currentYearMonth = `${today.getFullYear()}-${(today.getMonth() + 1)
    .toString()
    .padStart(2, "0")}`;

  const [dateRange, setDateRange] = useState({
    type: "month",
    month: currentYearMonth,
  });

  const {
    data: counts,
    isLoading: isCountsLoading,
    isError: isCountsError,
  } = useQuery(
    ["counts", companyId, dateRange],
    () => tableActions.fetchCounts(companyId, dateRange),
    {
      enabled: !!companyId,
    }
  );

  const {
    data: overall,
    isLoading: isOverallLoading,
    isError: isOverallError,
  } = useQuery(
    ["overall", companyId, dateRange],
    () => tableActions.fetchSalesData(companyId, dateRange),
    {
      enabled: !!companyId,
    }
  );

  const productCount = counts?.productCount || 0;
  const userCount = counts?.userCount || 0;
  const customerCount = counts?.customerCount || 0;
  const sales = counts?.salesCount || 0;

  const handleDateRangeChange = (newDateRange) => {
    setDateRange(newDateRange);
  };

  // Format the selected date range for display
  const getDateRangeLabel = () => {
    if (dateRange.type === "month") {
      const [year, month] = dateRange.month.split("-");
      const monthName = new Date(
        parseInt(year),
        parseInt(month) - 1
      ).toLocaleString("default", { month: "long" });
      return `${monthName} ${year}`;
    } else {
      return `${dateRange.startDate} to ${dateRange.endDate}`;
    }
  };

  return (
    <motion.div
      className="page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}>
      <motion.div
        className="heading"
        style={{ background: "none" }}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}>
        <Typography
          variant="h4"
          sx={{
            fontWeight: 500,
            color: "#333",
            mb: 2,
          }}>
          Dashboard
        </Typography>
      </motion.div>

      {/* Date Range Selector */}
      <DateRangeSelector
        dateRange={dateRange}
        onDateRangeChange={handleDateRangeChange}
      />

      {/* Display current date range */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}>
        <Typography
          variant="subtitle1"
          sx={{
            mb: 2,
            fontWeight: 500,
            color: "#666",
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}>
          <DateRange fontSize="small" sx={{ color: "#2196f3" }} />
          Current data for:{" "}
          <span style={{ color: "#2196f3", fontWeight: 600 }}>
            {getDateRangeLabel()}
          </span>
        </Typography>
      </motion.div>

      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={3}>
          <Widgets
            title="Sales"
            count={formatNumber(sales)}
            icon="sales"
            index={0}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Widgets
            title="Employees"
            count={formatNumber(userCount)}
            icon="employees"
            index={1}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Widgets
            title="Products"
            count={formatNumber(productCount)}
            icon="products"
            index={2}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Widgets
            title="Customers"
            count={formatNumber(customerCount)}
            icon="customers"
            index={3}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <DummyCard title="Revenue" index={0}>
            {isOverallLoading ? (
              <Loader type={2} />
            ) : isOverallError ? (
              <Typography>Error loading sales data</Typography>
            ) : overall?.sales.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 3 }}>
                <img 
                  src="/noData.jpg" 
                  alt="No data available" 
                  style={{ maxWidth: '100%', height: 'auto', maxHeight: '200px' }}
                />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  No Sales made in this period
                </Typography>
              </Box>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart
                  data={overall?.sales}
                  margin={{
                    top: 10,
                    right: 30,
                    left: 0,
                    bottom: 0,
                  }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis dataKey="month" stroke="#666" />
                  <YAxis stroke="#666" />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: "rgba(255,255,255,0.9)",
                      border: "none",
                      borderRadius: "8px",
                      boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="totalSales"
                    stroke="#2196f3"
                    strokeWidth={2}
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </DummyCard>
        </Grid>

        <Grid item xs={12} md={6}>
          <DummyCard title="Sales Profit" index={1}>
            {isOverallLoading ? (
              <Loader type={2} />
            ) : isOverallError ? (
              <Typography>Error loading Revenue data</Typography>
            ) : overall?.profit.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 3 }}>
                <img 
                  src="/noData.jpg" 
                  alt="No data available" 
                  style={{ maxWidth: '100%', height: 'auto', maxHeight: '200px' }}
                />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  No Revenue data available for this period
                </Typography>
              </Box>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart
                  data={overall?.profit}
                  margin={{
                    top: 5,
                    right: 30,
                    left: 0,
                    bottom: 0,
                  }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis dataKey="month" stroke="#666" />
                  <YAxis stroke="#666" />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: "rgba(255,255,255,0.9)",
                      border: "none",
                      borderRadius: "8px",
                      boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="totalProfit"
                    stroke="#4caf50"
                    strokeWidth={2}
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </DummyCard>
        </Grid>

        <Grid item xs={12} md={7}>
          <DummyCard title="Most Selling Products" index={2}>
            {isOverallLoading ? (
              <Loader type={2} />
            ) : isOverallError ? (
              <Typography>Error loading product sales data</Typography>
            ) : overall?.topProductsByQuantity.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 3 }}>
                <img 
                  src="/noData.jpg" 
                  alt="No data available" 
                  style={{ maxWidth: '100%', height: 'auto', maxHeight: '200px' }}
                />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  No product sales data available for this period
                </Typography>
              </Box>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={overall?.topProductsByQuantity}
                  margin={{
                    top: 10,
                    right: 30,
                    left: 0,
                    bottom: 0,
                  }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis dataKey="name" stroke="#666" />
                  <YAxis stroke="#666" />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: "rgba(255,255,255,0.9)",
                      border: "none",
                      borderRadius: "8px",
                      boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                    }}
                  />
                  <Legend />
                  <Bar dataKey="quantity" fill="#00caff" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </DummyCard>
        </Grid>

        <Grid item xs={12} md={5}>
          <DummyCard title="Top Profitable Products" index={3}>
            {isOverallLoading ? (
              <Loader type={2} />
            ) : isOverallError ? (
              <Typography>Error loading product sales data</Typography>
            ) : overall?.topProductsByProfit.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 3 }}>
                <img 
                  src="/noData.jpg" 
                  alt="No data available" 
                  style={{ maxWidth: '100%', height: 'auto', maxHeight: '200px' }}
                />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  No product sales data available for this period
                </Typography>
              </Box>
            ) : (
              <MyPie
                data={overall?.topProductsByProfit}
                dataKey="profit"
                nameKey="name"
              />
            )}
          </DummyCard>
        </Grid>

        <Grid item xs={12} md={6}>
          <DummyCard title="Top 10 Customers By Sale" index={4}>
            {isOverallLoading ? (
              <Loader type={2} />
            ) : isOverallError ? (
              <Typography>Error loading customer data</Typography>
            ) : overall?.topCustomers.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 3 }}>
                <img 
                  src="/noData.jpg" 
                  alt="No data available" 
                  style={{ maxWidth: '100%', height: 'auto', maxHeight: '200px' }}
                />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  No customer data available for this period
                </Typography>
              </Box>
            ) : (
              <MyPie
                data={overall?.topCustomers}
                dataKey="totalSales"
                nameKey="name"
              />
            )}
          </DummyCard>
        </Grid>

        {/* <Grid item xs={12} md={6}>
          <DummyCard title="Recent Sales" index={5}>
            <SlidingCard dateRange={dateRange} />
          </DummyCard>
        </Grid> */}

        {/* New Analytics Components */}
        <Grid item xs={12} md={6}>
          <CategoryAnalytics dateRange={dateRange} />
        </Grid>

        <Grid item xs={12} md={6}>
          <PaymentAnalytics dateRange={dateRange} />
        </Grid>

        <Grid item xs={12} md={6}>
          <HourlySales dateRange={dateRange} />
        </Grid>

        <Grid item xs={12} md={12}>
          <InventoryAlerts />
        </Grid>

        {/* <Grid item xs={12}>
          <WeekdayAnalytics dateRange={dateRange} />
        </Grid> */}
      </Grid>
      <DashboardMetrics dateRange={dateRange} />
    </motion.div>
  );
};

export default Dashboard;
