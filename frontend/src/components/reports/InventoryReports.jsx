import React, { useState, useEffect } from "react";
import {
  Grid,
  Paper,
  Card,
  CardContent,
  TablePagination,
  Typography,
  Table,
  TableHead,
  TableBody,
  TableCell,
  TableRow,
  TableContainer,
  TableSortLabel,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  CircularProgress,
} from "@mui/material";
import SearchField from "../../hooks/SearchField";
import { StyledTableHead } from "./SalesReport";
import { Inventory, TrendingUp, AttachMoney, LocalMall } from "@mui/icons-material";

const capitalizeFirstLetter = (str) => {
  if (typeof str === "string") {
    return str
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }
  return str;
};

// Helper function to convert quantity to display format with unit conversion
const formatQuantityWithUnits = (quantity, baseUnit, salesUnit, conversionRate) => {
  if (!quantity || quantity === 0) return "0";
  
  // If baseUnit is 'none' or empty, show numeric value without unit
  if (!baseUnit || baseUnit === 'none' || baseUnit === '') {
    return `${quantity}`;
  }
  
  // If no conversion rate or it's 1, just show the quantity with base unit
  if (!conversionRate || conversionRate === 1 || !salesUnit) {
    return `${quantity} ${baseUnit}`;
  }
  
  // Convert to sales units if conversion rate is decimal (less than 1)
  if (conversionRate < 1) {
    const salesUnits = Math.floor(quantity * conversionRate);
    const remainingBaseUnits = quantity % Math.floor(1 / conversionRate);
    
    if (salesUnits > 0 && remainingBaseUnits > 0) {
      return `${salesUnits} ${salesUnit} ${remainingBaseUnits} ${baseUnit}`;
    } else if (salesUnits > 0) {
      return `${salesUnits} ${salesUnit}`;
    } else {
      return `${remainingBaseUnits} ${baseUnit}`;
    }
  } else {
    // For conversion rates >= 1, show in base units
    return `${quantity} ${baseUnit}`;
  }
};

// Customer Details Modal Component
const CustomerDetailsModal = ({ 
  selectedProduct, 
  customerData, 
  modalOpen, 
  handleCloseModal, 
  loadingCustomers 
}) => {
  return (
    <Dialog 
      open={modalOpen} 
      onClose={handleCloseModal} 
      maxWidth="md" 
      fullWidth
    >
      <DialogTitle>
        Customer Purchase Details - {selectedProduct?.name}
      </DialogTitle>
      <DialogContent>
        {loadingCustomers ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Customer Name</TableCell>
                <TableCell>Company</TableCell>
                <TableCell align="right">Quantity</TableCell>
                <TableCell align="right">Total Amount</TableCell>
                <TableCell align="right">Purchase Count</TableCell>
                <TableCell>Last Purchase</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {customerData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    No customer data available
                  </TableCell>
                </TableRow>
              ) : (
                customerData.map((customer, index) => (
                  <TableRow key={index}>
                    <TableCell>{customer.customerName}</TableCell>
                    <TableCell>{customer.customerCompany || 'N/A'}</TableCell>
                    <TableCell align="right">{customer.totalQuantity}</TableCell>
                    <TableCell align="right">₵{customer.totalAmount.toFixed(2)}</TableCell>
                    <TableCell align="right">{customer.purchaseCount}</TableCell>
                    <TableCell>{new Date(customer.lastPurchaseDate).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCloseModal} color="primary">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Inventory Summary Cards Component
const InventorySummaryCards = ({ inventoryData, totalQuantitySold, totalItemsWithSales }) => {
  return (
    <Grid container spacing={3}>
      <Grid item xs={12} sm={6} md={4}>
        <Card
          elevation={2}
          sx={{
            p: 3,
            textAlign: "center",
            backgroundColor: "#ffffff",
            borderRadius: "12px",
            transition: "transform 0.2s",
            "&:hover": {
              transform: "translateY(-5px)",
              boxShadow: 3,
            },
          }}>
          <Box
            sx={{
              backgroundColor: "#e3f2fd",
              borderRadius: "50%",
              width: 60,
              height: 60,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
            }}>
            <Inventory color="primary" sx={{ fontSize: 30 }} />
          </Box>
          <Typography
            variant="h6"
            sx={{
              color: "#666",
              mb: 1,
              fontWeight: 500,
            }}>
            Total Quantity Sold
          </Typography>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              color: "#1976d2",
            }}>
            {totalQuantitySold || 0}
          </Typography>
        </Card>
      </Grid>
      <Grid item xs={12} sm={6} md={4}>
        <Card
          elevation={2}
          sx={{
            p: 3,
            textAlign: "center",
            backgroundColor: "#ffffff",
            borderRadius: "12px",
            transition: "transform 0.2s",
            "&:hover": {
              transform: "translateY(-5px)",
              boxShadow: 3,
            },
          }}>
          <Box
            sx={{
              backgroundColor: "#e8f5e9",
              borderRadius: "50%",
              width: 60,
              height: 60,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
            }}>
            <TrendingUp color="success" sx={{ fontSize: 30 }} />
          </Box>
          <Typography
            variant="h6"
            sx={{
              color: "#666",
              mb: 1,
              fontWeight: 500,
            }}>
            Total Amount Sold
          </Typography>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              color: "#2e7d32",
            }}>
            ₵{(inventoryData || 0).toFixed(2)}
          </Typography>
        </Card>
      </Grid>
      <Grid item xs={12} sm={6} md={4}>
        <Card
          elevation={2}
          sx={{
            p: 3,
            textAlign: "center",
            backgroundColor: "#ffffff",
            borderRadius: "12px",
            transition: "transform 0.2s",
            "&:hover": {
              transform: "translateY(-5px)",
              boxShadow: 3,
            },
          }}>
          <Box
            sx={{
              backgroundColor: "#fff3e0",
              borderRadius: "50%",
              width: 60,
              height: 60,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
            }}>
            <AttachMoney color="secondary" sx={{ fontSize: 30 }} />
          </Box>
          <Typography
            variant="h6"
            sx={{
              color: "#666",
              mb: 1,
              fontWeight: 500,
            }}>
            Items with Sales
          </Typography>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              color: "#f57c00",
            }}>
            {totalItemsWithSales || 0}
          </Typography>
        </Card>
      </Grid>
    </Grid>
  );
};

// Inventory Table Component
const InventoryTable = ({ inventoryItems = [], searchTerm, onProductClick }) => {
  const [order, setOrder] = useState("asc");
  const [orderBy, setOrderBy] = useState("name");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const items = Array.isArray(inventoryItems) ? inventoryItems : [];

  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  const filteredItems = items.filter((item) =>
    (item.name || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedItems = [...filteredItems].sort((a, b) => {
    let comparator = 0;
    if (orderBy === "name") {
      comparator = a.name.localeCompare(b.name);
    } else if (orderBy === "totalQuantity") {
      const aQty = a.totalQuantity ?? a.quantitySold ?? 0;
      const bQty = b.totalQuantity ?? b.quantitySold ?? 0;
      comparator = aQty - bQty;
    } else if (orderBy === "onhand") {
      comparator = (a.onhand || 0) - (b.onhand || 0);
    } else if (orderBy === "totalSalesPrice") {
      const aRev = a.totalSalesPrice ?? a.totalRevenue ?? 0;
      const bRev = b.totalSalesPrice ?? b.totalRevenue ?? 0;
      comparator = aRev - bRev;
    }
    return comparator * (order === "asc" ? 1 : -1);
  });

  // Pagination handlers
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const paginatedItems = sortedItems.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <TableContainer
      component={Paper}
      elevation={2}
      sx={{
        borderRadius: "12px",
        overflow: "hidden",
      }}>
      <Table>
        <StyledTableHead>
          <TableRow>
            <TableCell>
              <TableSortLabel
                active={orderBy === "name"}
                direction={orderBy === "name" ? order : "asc"}
                onClick={() => handleRequestSort("name")}>
                Item Name
              </TableSortLabel>
            </TableCell>
            <TableCell align="right">
              <TableSortLabel
                active={orderBy === "totalQuantity"}
                direction={orderBy === "totalQuantity" ? order : "asc"}
                onClick={() => handleRequestSort("totalQuantity")}>
                Quantity Sold
              </TableSortLabel>
            </TableCell>
            <TableCell align="right">
              <TableSortLabel
                active={orderBy === "onhand"}
                direction={orderBy === "onhand" ? order : "asc"}
                onClick={() => handleRequestSort("onhand")}>
                Quantity Remaining
              </TableSortLabel>
            </TableCell>
            <TableCell align="right">
              <TableSortLabel
                active={orderBy === "totalSalesPrice"}
                direction={orderBy === "totalSalesPrice" ? order : "asc"}
                onClick={() => handleRequestSort("totalSalesPrice")}>
                Total Amount Sold
              </TableSortLabel>
            </TableCell>
          </TableRow>
        </StyledTableHead>
        <TableBody>
          {paginatedItems.map((item) => (
          <TableRow
            key={item.id || item._id}
            onClick={() => onProductClick && onProductClick(item)}
            sx={{
              "&:hover": {
                backgroundColor: "#f5f5f5",
                cursor:
                  ((item.totalQuantity ?? item.quantitySold ?? 0) > 0)
                    ? "pointer"
                    : "default",
              },
            }}>
            <TableCell>{capitalizeFirstLetter(item.name)}</TableCell>
            <TableCell align="right">
              {formatQuantityWithUnits(
                item.totalQuantity ?? item.quantitySold ?? 0,
                item.baseUnit,
                item.salesUnit || null,
                item.conversionRate || 1
              )}
            </TableCell>
            <TableCell align="right">
              {formatQuantityWithUnits(
                item.onhand || 0,
                item.baseUnit,
                item.salesUnit || null,
                item.conversionRate || 1
              )}
            </TableCell>
            <TableCell align="right">
              ₵{(item.totalSalesPrice ?? item.totalRevenue ?? 0).toFixed(2)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
      </Table>
      <Box sx={{ display: "flex", justifyContent: "flex-end", p: 2 }}>
        <TablePagination
          component="div"
          count={sortedItems.length}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[10, 25, 50, 100]}
        />
      </Box>
    </TableContainer>
  );
};

// InventoryReports Component
const InventoryReports = ({ products = [], inventoryItems, companyId, startDate, endDate }) => {
  const [totalCash, setTotalCash] = useState(0);
  const [totalQuantitySold, setTotalQuantitySold] = useState(0);
  const [totalItemsWithSales, setTotalItemsWithSales] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [customerData, setCustomerData] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [loadingCustomers, setLoadingCustomers] = useState(false);

  useEffect(() => {
    const src = Array.isArray(inventoryItems) && inventoryItems.length > 0
      ? inventoryItems
      : Array.isArray(products) ? products : [];

    const totalAmount = src.reduce(
      (sum, item) => sum + (item.totalSalesPrice ?? item.totalRevenue ?? 0),
      0
    );
    const totalQty = src.reduce(
      (sum, item) => sum + (item.totalQuantity ?? item.quantitySold ?? 0),
      0
    );
    const itemsWithSales = src.filter(
      (item) => (item.totalQuantity ?? item.quantitySold ?? 0) > 0
    ).length;

    setTotalCash(totalAmount);
    setTotalQuantitySold(totalQty);
    setTotalItemsWithSales(itemsWithSales);
  }, [inventoryItems, products]);

  const handleProductClick = async (item) => {
    if (!item || ((item.totalQuantity ?? item.quantitySold ?? 0) === 0)) return;
    
    setLoadingCustomers(true);
    setSelectedProduct(item);
    
    try {
      const response = await fetch(
        `/api/reports/product-customers?companyId=${companyId}&productName=${encodeURIComponent(item.name)}&startDate=${startDate}&endDate=${endDate}`
      );
      
      if (response.ok) {
        const data = await response.json();
        setCustomerData(data.customers || []);
        setModalOpen(true);
      } else {
        console.error('Failed to fetch customer data');
      }
    } catch (error) {
      console.error('Error fetching customer data:', error);
    } finally {
      setLoadingCustomers(false);
    }
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedProduct(null);
    setCustomerData([]);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Paper elevation={0} sx={{ p: 3, mb: 4, backgroundColor: "#f8f9fa" }}>
        <Typography
          variant="h4"
          sx={{
            fontWeight: 600,
            color: "#1a237e",
            mb: 3,
          }}>
          Inventory Report
        </Typography>
        <InventorySummaryCards 
          inventoryData={totalCash} 
          totalQuantitySold={totalQuantitySold}
          totalItemsWithSales={totalItemsWithSales}
        />
      </Paper>

      <Paper elevation={0} sx={{ p: 3, backgroundColor: "#f8f9fa" }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 3,
          }}>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 600,
              color: "#1a237e",
            }}>
            Inventory Items
          </Typography>
          <SearchField onSearch={setSearchTerm} />
        </Box>
        <InventoryTable 
          inventoryItems={
            (Array.isArray(inventoryItems) && inventoryItems.length > 0)
              ? inventoryItems
              : (Array.isArray(products) ? products : [])
          } 
          searchTerm={searchTerm} 
          onProductClick={handleProductClick}
        />
      
      <CustomerDetailsModal
        selectedProduct={selectedProduct}
        customerData={customerData}
        modalOpen={modalOpen}
        handleCloseModal={handleCloseModal}
        loadingCustomers={loadingCustomers}
      />
      </Paper>
    </Box>
  );
};

export default InventoryReports;
