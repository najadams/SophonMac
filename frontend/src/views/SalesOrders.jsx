import React, { lazy, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useQuery } from "react-query";
import { formatNumber, serverAid, tableActions } from "../config/Functions";
import CollapsibleTable from "../components/common/CollapsibleTable";
import axios from "../config";
import Loader from "../components/common/Loader";
import { Widgets } from "./Dashboard";
import { Tabs, Tab, Paper, IconButton, Tooltip } from "@mui/material";
import SearchField from "../hooks/SearchField";
import { TabPanel, allyProps } from "./ProductCatalogue";
import MakeSales from "../components/forms/MakeSales";
import { motion, AnimatePresence } from "framer-motion";
import { styled } from "@mui/material/styles";
import FilterListIcon from "@mui/icons-material/FilterList";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import SearchIcon from "@mui/icons-material/Search";

const FilterContainer = styled(motion.div)(({ theme }) => ({
  display: "flex",
  width: "100%",
  flexWrap: "wrap",
  flexDirection: "row-reverse",
  alignItems: "flex-end",
  justifyContent: "space-between",
  marginBottom: "20px",
  gap: "16px",
}));

const FilterOptions = styled(motion.div)(({ theme }) => ({
  display: "flex",
  gap: "16px",
  alignItems: "center",
  padding: "16px",
  background: "white",
  borderRadius: "12px",
  boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
  transition: "all 0.3s ease-in-out",
  "&:hover": {
    boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
  },
}));

const DateInput = styled("input")(({ theme }) => ({
  padding: "8px 12px",
  borderRadius: "8px",
  border: "1px solid #e0e0e0",
  fontSize: "14px",
  transition: "all 0.2s ease-in-out",
  "&:focus": {
    outline: "none",
    borderColor: "#1a237e",
    boxShadow: "0 0 0 2px rgba(26, 35, 126, 0.1)",
  },
}));

const FilterButton = styled(IconButton)(({ theme }) => ({
  background: "white",
  boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
  transition: "all 0.2s ease-in-out",
  "&:hover": {
    background: "#f5f5f5",
    transform: "scale(1.05)",
  },
}));

const SalesOrders = () => {
  const companyId = useSelector((state) => state.companyState.data.id);
  const [customerOptions, setCustomerOptions] = useState([]);
  const [value, setValue] = useState(0);
  const [productOptions, setProductOptions] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState("");
  const [totalSales, setTotalSales] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const fetchCustomers = async () => {
      const response = await tableActions.fetchCustomersNames(companyId);
      setCustomerOptions(response);
    };
    fetchCustomers();
  }, [companyId]);

  useEffect(() => {
    const fetchProducts = async () => {
      const response = await tableActions.fetchProductNames(companyId);
      setProductOptions(response);
    };
    fetchProducts();
  }, [companyId]);
  
  const fetchReceipts = async () => {
    try {
      const formattedDate = selectedDate.toISOString().split("T")[0];
      const response = await axios.get(
        `/api/receipts/${companyId}?date=${formattedDate}`
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching receipts:", error);
      throw error;
    }
  };

  const {
    data: receipts,
    isLoading,
    isError,
    refetch,
  } = useQuery(["receipts", companyId, selectedDate], fetchReceipts, {
    refetchOnWindowFocus: true,
    enabled: value === 0,
  });

  const calculateTotalSales = (receiptsData) => {
    if (receiptsData) {
      const total = receiptsData
        .filter((receipt) => !receipt.flagged)
        .reduce((total, receipt) => total + receipt.total, 0);
      setTotalSales(total);
    }
  };

  useEffect(() => {
    calculateTotalSales(receipts);
  }, [receipts]);

  const handleChange = (event, newValue) => {
    setValue(newValue);
    if (newValue === 0) {
      refetch();
    }
  };

  const handleSearch = (term) => {
    setSearchTerm(term);
  };

  const toggleFilters = () => {
    setShowFilters((prev) => !prev);
  };

  const newCustomer = (newCustomerOption) => {
    setCustomerOptions(newCustomerOption);
  };

  const newProduct = (newProductOption) => {
    setProductOptions(newProductOption);
  };

  if (isLoading) return <Loader />;

  return (
    <div className="page">
      <div className="heading">
        <div>
          <h1 style={{ fontWeight: 200 }}>Sales</h1>
        </div>
        <div style={{ width: "40%" }}>
          <Tabs
            value={value}
            onChange={handleChange}
            indicatorColor="secondary"
            textColor="inherit"
            variant="fullWidth"
            aria-label="full width tabs example">
            <Tab label="Sales" {...allyProps(0)} />
            <Tab label="Make Sales" {...allyProps(1)} />
          </Tabs>
        </div>
        <div className="dot" style={{ paddingRight: 4 }}>
          .
        </div>
      </div>

      <TabPanel value={value} index={0}>
        <div className="content">
          <FilterContainer>
            <Widgets title={"Sales"} count={`₵${formatNumber(totalSales)}`} />

            <AnimatePresence>
              {showFilters && (
                <FilterOptions
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2, ease: "easeInOut" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}>
                    <CalendarTodayIcon color="action" />
                    <DateInput
                      type="date"
                      value={selectedDate.toISOString().split("T")[0]}
                      onChange={(e) =>
                        setSelectedDate(new Date(e.target.value))
                      }
                    />
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}>
                    <SearchIcon color="action" />
                    <SearchField
                      onSearch={handleSearch}
                      placeholder="Search Customer Name"
                    />
                  </div>
                </FilterOptions>
              )}
            </AnimatePresence>

            <Tooltip title={showFilters ? "Hide Filters" : "Show Filters"}>
              <FilterButton onClick={toggleFilters}>
                <FilterListIcon color={showFilters ? "primary" : "action"} />
              </FilterButton>
            </Tooltip>
          </FilterContainer>

          {!isLoading && !isError && receipts && receipts.length > 0 ? (
            <div style={{ width: "100%" }}>
              <CollapsibleTable
                receipts={receipts}
                searchTerm={searchTerm}
                onFlagChange={refetch}
                setValue={setValue}
              />
            </div>
          ) : (
            <div>
              {selectedDate.toISOString().split("T")[0] ===
              new Date().toISOString().split("T")[0] ? (
                <h2 style={{ paddingTop: "50%" }}>No Sales Made Today</h2>
              ) : (
                <h2 style={{ paddingTop: "50%" }}>
                  No Sales Made on {selectedDate.toISOString().split("T")[0]}
                </h2>
              )}
            </div>
          )}
        </div>
      </TabPanel>

      <TabPanel value={value} index={1}>
        <MakeSales
          customers={customerOptions}
          Products={productOptions}
          handleCustomerUpdate={newCustomer}
          handleProductUpdate={newProduct}
        />
      </TabPanel>
    </div>
  );
};

export default SalesOrders;
