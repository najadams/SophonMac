import React, { useState, useEffect, lazy, Suspense } from "react";
import {
  Tabs,
  Tab,
  CircularProgress,
  Typography,
  Button,
  Box,
  IconButton,
  Tooltip,
  Collapse,
  Paper,
  TextField,
  Stack,
} from "@mui/material";
import { useMediaQuery } from "@mui/material";
import { useQuery } from "react-query";
import { useSelector } from "react-redux";
import { fetchReportData, getNextDayDate } from "../config/Functions";
import SummaryReport from "../components/reports/SummaryReports";
import { motion, AnimatePresence } from "framer-motion";
import { DateRange, FilterList, Refresh } from "@mui/icons-material";

// Lazy-loaded components
const PurchasesReport = lazy(() =>
  import("../components/reports/PurchaseReport")
);
const InventoryReport = lazy(() =>
  import("../components/reports/InventoryReports")
);
const DebtsReport = lazy(() => import("../components/reports/DebtsReports"));
const SalesReport = lazy(() => import("../components/reports/SalesReport"));

const pageVariants = {
  initial: {
    opacity: 0,
    y: 20,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: "easeOut",
    },
  },
  exit: {
    opacity: 0,
    y: -20,
  },
};

const loadingVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

const Reports = () => {
  const [value, setValue] = useState(0);
  const [filters, setFilters] = useState({
    startDate: new Date().toISOString().split("T")[0],
    endDate: getNextDayDate(),
  });
  const [showFilters, setShowFilters] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const companyId = useSelector((state) => state.companyState.data.id);
  // const matchesMobile = useMediaQuery("(max-width:600px)");

  // Add a refetch function to all queries
  const {
    data: summaryData,
    isLoading: isSummaryLoading,
    isError: isSummaryError,
    refetch: refetchSummary,
  } = useQuery(
    ["summary", companyId, filters],
    () => fetchReportData(companyId, "summary", filters),
    {
      enabled: value === 0,
      keepPreviousData: true,
      staleTime: 0, // Always fetch fresh data
    }
  );

  const {
    data: salesData,
    isLoading: isSalesLoading,
    isError: isSalesError,
    refetch: refetchSales,
  } = useQuery(
    ["sales", companyId, filters],
    () => fetchReportData(companyId, "sales", filters),
    {
      enabled: value === 1,
      keepPreviousData: true,
      staleTime: 0,
    }
  );

  const {
    data: purchasesData,
    isLoading: isPurchasesLoading,
    isError: isPurchasesError,
    refetch: refetchPurchases,
  } = useQuery(
    ["purchases", companyId, filters],
    () => fetchReportData(companyId, "purchases", filters),
    {
      enabled: value === 3,
      keepPreviousData: true,
      staleTime: 0,
    }
  );

  const {
    data: inventoryData,
    isLoading: isInventoryLoading,
    isError: isInventoryError,
    refetch: refetchInventory,
  } = useQuery(
    ["inventory", companyId, filters],
    () => fetchReportData(companyId, "inventory", filters),
    {
      enabled: value === 2,
      keepPreviousData: true,
      staleTime: 0,
    }
  );

  const {
    data: debtsData,
    isLoading: isDebtsLoading,
    isError: isDebtsError,
    refetch: refetchDebts,
  } = useQuery(
    ["debts", companyId, filters],
    () => fetchReportData(companyId, "debts", filters),
    {
      enabled: value === 4,
      keepPreviousData: true,
      staleTime: 0,
    }
  );

  const handleDateChange = (e, type) => {
    setFilters({ ...filters, [type]: e.target.value });
    setIsRefreshing(true);
  };

  const toggleFilters = () => {
    setShowFilters((prev) => !prev);
  };

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  // Function to refetch data based on current tab
  const refetchCurrentData = async () => {
    setIsRefreshing(true);
    try {
      switch (value) {
        case 0:
          await refetchSummary();
          break;
        case 1:
          await refetchSales();
          break;
        case 2:
          await refetchInventory();
          break;
        case 3:
          await refetchPurchases();
          break;
        case 4:
          await refetchDebts();
          break;
        default:
          break;
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  // Effect to handle data refetching when filters change
  useEffect(() => {
    if (isRefreshing) {
      refetchCurrentData();
    }
  }, [filters, value]);

  const renderContent = () => {
    if (value === 0) {
      if (!summaryData) return <Typography>No summary available</Typography>;
      return (
        <motion.div
          key="summary"
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit">
          <SummaryReport data={summaryData} />
        </motion.div>
      );
    }
    if (value === 1) {
      if (isSalesLoading) {
        return (
          <motion.div
            key="loading"
            variants={loadingVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              minHeight: "60vh",
            }}>
            <CircularProgress />
          </motion.div>
        );
      }
      if (isSalesError) {
        return (
          <motion.div
            key="error"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit">
            <Typography color="error">Error loading sales report</Typography>
          </motion.div>
        );
      }
      if (!salesData) return <Typography>No sales data available</Typography>;
      return (
        <motion.div
          key="sales"
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit">
          <SalesReport
            salesData={salesData.sales}
            salesTransactions={salesData.salesTransactions}
          />
        </motion.div>
      );
    }

    // if (value === 2) {
    //   if (isInventoryLoading) {
    //     return (
    //       <motion.div
    //         key="loading"
    //         variants={loadingVariants}
    //         initial="initial"
    //         animate="animate"
    //         exit="exit"
    //         style={{
    //           display: "flex",
    //           justifyContent: "center",
    //           alignItems: "center",
    //           minHeight: "60vh",
    //         }}>
    //         <CircularProgress />
    //       </motion.div>
    //     );
    //   }
    //   if (isInventoryError) {
    //     return (
    //       <motion.div
    //         key="error"
    //         variants={pageVariants}
    //         initial="initial"
    //         animate="animate"
    //         exit="exit">
    //         <Typography color="error">
    //           Error loading inventory report
    //         </Typography>
    //       </motion.div>
    //     );
    //   }
    //   if (!inventoryData)
    //     return <Typography>No inventory data available</Typography>;
    //   return (
    //     <motion.div
    //       key="inventory"
    //       variants={pageVariants}
    //       initial="initial"
    //       animate="animate"
    //       exit="exit">
    //       <InventoryReport inventoryItems={inventoryData.aggregatedData} />
    //     </motion.div>
    //   );
    // }

    if (value === 3) {
      if (isPurchasesLoading) {
        return (
          <motion.div
            key="loading"
            variants={loadingVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              minHeight: "60vh",
            }}>
            <CircularProgress />
          </motion.div>
        );
      }
      if (isPurchasesError) {
        return (
          <motion.div
            key="error"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit">
            <Typography color="error">
              Error loading purchases report
            </Typography>
          </motion.div>
        );
      }
      if (!purchasesData)
        return <Typography>No purchases data available</Typography>;
      return (
        <motion.div
          key="purchases"
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit">
          <PurchasesReport data={purchasesData.purchases} />
        </motion.div>
      );
    }

    if (value === 4) {
      if (isDebtsLoading) {
        return (
          <motion.div
            key="loading"
            variants={loadingVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              minHeight: "60vh",
            }}>
            <CircularProgress />
          </motion.div>
        );
      }
      if (isDebtsError) {
        return (
          <motion.div
            key="error"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit">
            <Typography color="error">Error loading debts report</Typography>
          </motion.div>
        );
      }
      if (!debtsData) return <Typography>No debts data available</Typography>;
      return (
        <motion.div
          key="debts"
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit">
          <DebtsReport data={debtsData.debts} />
        </motion.div>
      );
    }

    return null;
  };

  return (
    <div className="page">
      <div className="heading">
        <div>
          <h1 style={{ fontWeight: 200 }}>Reports</h1>
        </div>
        <div className="tabs">
          <Tabs
            value={value}
            onChange={handleChange}
            indicatorColor="secondary"
            textColor="inherit"
            variant="fullWidth"
            aria-label="full width tabs example">
            <Tab label="Summary" />
            <Tab label="Sales" />
            {/* <Tab label="Inventory" /> */}
            {/* <Tab label="Purchases" /> */}
            {/* <Tab label="Debts" /> */}
          </Tabs>
        </div>
        <div style={{ padding: 20 }}>.</div>
      </div>
      <div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          style={{
            display: "flex",
            width: "100%",
            flexWrap: "wrap",
            flexDirection: "row-reverse",
            alignItems: "flex-end",
            justifyContent: "space-between",
            marginBottom: 10,
          }}>
          <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
            <Collapse in={showFilters} orientation="horizontal">
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  backgroundColor: "#f8f9fa",
                  borderRadius: 2,
                  display: "flex",
                  gap: 2,
                  alignItems: "center",
                }}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <TextField
                    label="Start Date"
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => handleDateChange(e, "startDate")}
                    InputLabelProps={{ shrink: true }}
                    size="small"
                  />
                  <TextField
                    label="End Date"
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => handleDateChange(e, "endDate")}
                    InputLabelProps={{ shrink: true }}
                    size="small"
                  />
                </Stack>
              </Paper>
            </Collapse>
            <Box sx={{ display: "flex", gap: 1 }}>
              <Tooltip title="Toggle Filters">
                <IconButton
                  onClick={toggleFilters}
                  color={showFilters ? "primary" : "default"}
                  sx={{
                    backgroundColor: showFilters
                      ? "primary.light"
                      : "background.paper",
                    "&:hover": {
                      backgroundColor: showFilters
                        ? "primary.light"
                        : "action.hover",
                    },
                  }}>
                  <FilterList />
                </IconButton>
              </Tooltip>
              <Tooltip title="Refresh Data">
                <IconButton
                  onClick={refetchCurrentData}
                  disabled={isRefreshing}
                  sx={{
                    backgroundColor: "background.paper",
                    "&:hover": {
                      backgroundColor: "action.hover",
                    },
                  }}>
                  <Refresh className={isRefreshing ? "rotating" : ""} />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </motion.div>
        <AnimatePresence mode="wait">{renderContent()}</AnimatePresence>
      </div>
    </div>
  );
};

export default Reports;
