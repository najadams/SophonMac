import React, { useState, useEffect } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { useQuery } from "react-query";
import axios from "../config";
import { toSignificantFigures } from "../config/Functions";
import {
  Container,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Box,
  Chip,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tab,
  CircularProgress,
  Alert,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import EditIcon from "@mui/icons-material/Edit";
import InventoryIcon from "@mui/icons-material/Inventory";
import CategoryIcon from "@mui/icons-material/Category";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import HistoryIcon from "@mui/icons-material/History";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import InfoIcon from "@mui/icons-material/Info";
import BarChartIcon from "@mui/icons-material/BarChart";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import DescriptionIcon from "@mui/icons-material/Description";
import QrCodeIcon from "@mui/icons-material/QrCode";
import ScaleIcon from "@mui/icons-material/Scale";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import PersonIcon from "@mui/icons-material/Person";
import BusinessIcon from "@mui/icons-material/Business";
import { capitalizeFirstLetter } from "../config/Functions";

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  borderRadius: "16px",
  boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
}));

const InfoCard = styled(Card)(({ theme }) => ({
  height: "100%",
  borderRadius: "12px",
  boxShadow: "0 4px 16px rgba(0, 0, 0, 0.08)",
  transition: "transform 0.2s ease-in-out",
  "&:hover": {
    transform: "translateY(-4px)",
  },
}));

// Helper function to format currency
const formatCurrency = (amount) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount || 0);
};

// Helper function to format date
const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

// Tab panel component
function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`product-tabpanel-${index}`}
      aria-labelledby={`product-tab-${index}`}
      {...other}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const ProductInfo = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const companyId = useSelector((state) => state.companyState.data.id);
  const [tabValue, setTabValue] = useState(0);

  const product = location.state?.product;

  // Fetch detailed product data
  const {
    data: productDetails,
    isLoading,
    error,
  } = useQuery(
    ["productDetails", companyId, id],
    async () => {
      const response = await axios.get(
        `/api/products/product/${companyId}/${id}`
      );
      return response.data;
    },
    {
      enabled: !!companyId && !!id,
      refetchOnWindowFocus: false,
    }
  );

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  if (isLoading) {
    return (
      <Container
        maxWidth="lg"
        sx={{ mt: 4, mb: 4, display: "flex", justifyContent: "center" }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error">
          Error loading product details: {error.message}
        </Alert>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate("/products")}
          sx={{ mt: 2 }}>
          Back to Products
        </Button>
      </Container>
    );
  }

  if (!productDetails && !product) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 0 }}>
        <StyledPaper>
          <Typography variant="h6" color="error">
            Product not found. Please go back and try again.
          </Typography>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate("/products")}
            sx={{ mt: 2 }}>
            Back to Products
          </Button>
        </StyledPaper>
      </Container>
    );
  }

  const displayProduct = productDetails || product;

  return (
    <Container
      className="content"
      maxWidth="lg"
      sx={{ mt: 4, mb: 4, height: "calc(100vh - 100px)", overflow: "auto" }}>
      <Box sx={{ mb: 3 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate("/products")}
          sx={{ mb: 2 }}>
          Back to Products
        </Button>
        <Typography variant="h4" component="h1" gutterBottom>
          {capitalizeFirstLetter(displayProduct.name)} - Product Details
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Main Product Info */}
        <Grid item xs={12}>
          <StyledPaper>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 3,
              }}>
              <Typography variant="h5" component="h2">
                {capitalizeFirstLetter(displayProduct.name)}
              </Typography>
              {/* <Button
                startIcon={<EditIcon />}
                variant="outlined"
                onClick={() => navigate(`/products/${id}/edit`)}>
                Edit Product
              </Button> */}
            </Box>

            <Divider sx={{ mb: 3 }} />

            {/* Tabs for different sections */}
            <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
              <Tabs
                value={tabValue}
                onChange={handleTabChange}
                aria-label="product details tabs">
                <Tab icon={<InfoIcon />} label="Basic Info" />
                <Tab icon={<ScaleIcon />} label="Units" />
                <Tab icon={<LocalShippingIcon />} label="Restock History" />
                <Tab icon={<BarChartIcon />} label="Price History" />
                <Tab icon={<SwapHorizIcon />} label="Stock Transactions" />
              </Tabs>
            </Box>

            {/* Basic Info Tab */}
            <TabPanel value={tabValue} index={0}>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                    <DescriptionIcon sx={{ mr: 1, color: "text.secondary" }} />
                    <Typography variant="subtitle2" color="text.secondary">
                      Product Name
                    </Typography>
                  </Box>
                  <Typography variant="body1" sx={{ mb: 2 }}>
                    {displayProduct.name}
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                    <CategoryIcon sx={{ mr: 1, color: "text.secondary" }} />
                    <Typography variant="subtitle2" color="text.secondary">
                      Category
                    </Typography>
                  </Box>
                  <Typography variant="body1" sx={{ mb: 2 }}>
                    {displayProduct.category || "N/A"}
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                    <InventoryIcon sx={{ mr: 1, color: "text.secondary" }} />
                    <Typography variant="subtitle2" color="text.secondary">
                      Base Unit
                    </Typography>
                  </Box>
                  <Typography variant="body1" sx={{ mb: 2 }}>
                    {displayProduct.baseUnit || "N/A"}
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                    <QrCodeIcon sx={{ mr: 1, color: "text.secondary" }} />
                    <Typography variant="subtitle2" color="text.secondary">
                      SKU
                    </Typography>
                  </Box>
                  <Typography variant="body1" sx={{ mb: 2 }}>
                    {displayProduct.sku || "N/A"}
                  </Typography>
                </Grid>

                {displayProduct.description && (
                  <Grid item xs={12}>
                    <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                      <DescriptionIcon
                        sx={{ mr: 1, color: "text.secondary" }}
                      />
                      <Typography variant="subtitle2" color="text.secondary">
                        Description
                      </Typography>
                    </Box>
                    <Typography variant="body1">
                      {displayProduct.description}
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </TabPanel>

            {/* Units Tab */}
            <TabPanel value={tabValue} index={1}>
              {productDetails?.unitConversions?.length > 0 ? (
                <TableContainer sx={{ maxHeight: 400, overflow: "auto" }}>
                  <Table stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>
                          <Box sx={{ display: "flex", alignItems: "center" }}>
                            <ScaleIcon sx={{ mr: 1 }} />
                            Unit
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: "flex", alignItems: "center" }}>
                            <SwapHorizIcon sx={{ mr: 1 }} />
                            Conversion to Base Unit
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: "flex", alignItems: "center" }}>
                            <AttachMoneyIcon sx={{ mr: 1 }} />
                            Price per Unit
                          </Box>
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {/* Base unit row */}
                      <TableRow>
                        <TableCell>
                          <Chip
                            label={`${displayProduct.baseUnit} (Base)`}
                            color="primary"
                            size="small"
                          />
                        </TableCell>
                        <TableCell>1.0</TableCell>
                        <TableCell>
                          {formatCurrency(displayProduct.salesPrice)}
                        </TableCell>
                      </TableRow>
                      {/* Unit conversions */}
                      {productDetails.unitConversions.map((unit, index) => (
                        <TableRow key={index}>
                          <TableCell>{unit.toUnit}</TableCell>
                          <TableCell>
                            {unit.conversionRate} {unit.toUnit} = 1 {displayProduct.baseUnit}
                          </TableCell>
                          <TableCell>
                            {formatCurrency(unit.salesPrice)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    py: 4,
                  }}>
                  <ScaleIcon sx={{ mr: 1, color: "text.secondary" }} />
                  <Typography variant="body1" color="text.secondary">
                    No unit conversions available for this product. Only the base unit ({displayProduct.baseUnit}) is used.
                  </Typography>
                </Box>
              )}
            </TabPanel>

            {/* Restock History Tab */}
            <TabPanel value={tabValue} index={2}>
              {productDetails?.restockHistory?.length > 0 ? (
                <TableContainer sx={{ maxHeight: 400, overflow: "auto" }}>
                  <Table stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>
                          <Box sx={{ display: "flex", alignItems: "center" }}>
                            <CalendarTodayIcon sx={{ mr: 1 }} />
                            Date
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: "flex", alignItems: "center" }}>
                            <BusinessIcon sx={{ mr: 1 }} />
                            Vendor
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: "flex", alignItems: "center" }}>
                            <InventoryIcon sx={{ mr: 1 }} />
                            Quantity
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: "flex", alignItems: "center" }}>
                            <AttachMoneyIcon sx={{ mr: 1 }} />
                            Cost Price
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: "flex", alignItems: "center" }}>
                            <AttachMoneyIcon sx={{ mr: 1 }} />
                            Sales Price
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: "flex", alignItems: "center" }}>
                            <AttachMoneyIcon sx={{ mr: 1 }} />
                            Total Value
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: "flex", alignItems: "center" }}>
                            <PersonIcon sx={{ mr: 1 }} />
                            Worker
                          </Box>
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {productDetails.restockHistory.map((restock, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            {formatDate(restock.restockDate)}
                          </TableCell>
                          <TableCell>{restock.vendorName || "N/A"}</TableCell>
                          <TableCell>{restock.quantity}</TableCell>
                          <TableCell>
                            {formatCurrency(restock.costPrice)}
                          </TableCell>
                          <TableCell>
                            {formatCurrency(restock.salesPrice)}
                          </TableCell>
                          <TableCell>
                            {formatCurrency(restock.totalPrice)}
                          </TableCell>
                          <TableCell>{restock.workerName || "N/A"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    py: 4,
                  }}>
                  <LocalShippingIcon sx={{ mr: 1, color: "text.secondary" }} />
                  <Typography variant="body1" color="text.secondary">
                    No restock history available for this product.
                  </Typography>
                </Box>
              )}
            </TabPanel>

            {/* Price History Tab */}
            <TabPanel value={tabValue} index={3}>
              {productDetails?.priceHistory?.length > 0 ? (
                <TableContainer sx={{ maxHeight: 400, overflow: "auto" }}>
                  <Table stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>
                          <Box sx={{ display: "flex", alignItems: "center" }}>
                            <CalendarTodayIcon sx={{ mr: 1 }} />
                            Date
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: "flex", alignItems: "center" }}>
                            <AttachMoneyIcon sx={{ mr: 1 }} />
                            Cost Price
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: "flex", alignItems: "center" }}>
                            <AttachMoneyIcon sx={{ mr: 1 }} />
                            Sales Price
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: "flex", alignItems: "center" }}>
                            <DescriptionIcon sx={{ mr: 1 }} />
                            Notes
                          </Box>
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {productDetails.priceHistory.map((price, index) => (
                        <TableRow key={index}>
                          <TableCell>{formatDate(price.date)}</TableCell>
                          <TableCell>
                            {formatCurrency(price.costPrice)}
                          </TableCell>
                          <TableCell>
                            {formatCurrency(price.salesPrice)}
                          </TableCell>
                          <TableCell>{price.notes || "N/A"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    py: 4,
                  }}>
                  <BarChartIcon sx={{ mr: 1, color: "text.secondary" }} />
                  <Typography variant="body1" color="text.secondary">
                    No price history available for this product.
                  </Typography>
                </Box>
              )}
            </TabPanel>

            {/* Stock Transactions Tab */}
            <TabPanel value={tabValue} index={4}>
              {productDetails?.stockTransactions?.length > 0 ? (
                <TableContainer sx={{ maxHeight: 400, overflow: "auto" }}>
                  <Table stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>
                          <Box sx={{ display: "flex", alignItems: "center" }}>
                            <CalendarTodayIcon sx={{ mr: 1 }} />
                            Date
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: "flex", alignItems: "center" }}>
                            <SwapHorizIcon sx={{ mr: 1 }} />
                            Type
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: "flex", alignItems: "center" }}>
                            <InventoryIcon sx={{ mr: 1 }} />
                            Quantity
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: "flex", alignItems: "center" }}>
                            <AttachMoneyIcon sx={{ mr: 1 }} />
                            Cost Price
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: "flex", alignItems: "center" }}>
                            <AttachMoneyIcon sx={{ mr: 1 }} />
                            Sales Price
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: "flex", alignItems: "center" }}>
                            <DescriptionIcon sx={{ mr: 1 }} />
                            Notes
                          </Box>
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {productDetails.stockTransactions.map(
                        (transaction, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              {formatDate(transaction.transactionDate)}
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={transaction.type}
                                color={
                                  transaction.type === "IN"
                                    ? "success"
                                    : "error"
                                }
                                size="small"
                              />
                            </TableCell>
                            <TableCell>{transaction.quantity}</TableCell>
                            <TableCell>
                              {formatCurrency(transaction.costPrice)}
                            </TableCell>
                            <TableCell>
                              {formatCurrency(transaction.salesPrice)}
                            </TableCell>
                            <TableCell>{transaction.notes || "N/A"}</TableCell>
                          </TableRow>
                        )
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    py: 4,
                  }}>
                  <SwapHorizIcon sx={{ mr: 1, color: "text.secondary" }} />
                  <Typography variant="body1" color="text.secondary">
                    No stock transactions available for this product.
                  </Typography>
                </Box>
              )}
            </TabPanel>
          </StyledPaper>
        </Grid>

        {/* Quick Stats - Now placed side by side beneath main card */}
        <Grid item xs={12} sm={6} md={3}>
          <InfoCard>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                <AttachMoneyIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Pricing</Typography>
              </Box>
              <Typography
                variant="body2"
                color="text.secondary"
                gutterBottom>
                Current Cost Price
              </Typography>
              <Typography variant="h5" color="primary" gutterBottom>
                {formatCurrency(displayProduct.costPrice)}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                gutterBottom>
                Current Sales Price
              </Typography>
              <Typography variant="h5" color="success.main" gutterBottom>
                {formatCurrency(displayProduct.salesPrice)}
              </Typography>
              {productDetails?.summary?.averageCostPrice && (
                <>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    gutterBottom>
                    Average Cost Price
                  </Typography>
                  <Typography variant="body1" color="info.main">
                    {formatCurrency(
                      productDetails.summary.averageCostPrice
                    )}
                  </Typography>
                </>
              )}
            </CardContent>
          </InfoCard>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <InfoCard>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                <InventoryIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Inventory</Typography>
              </Box>
              <Typography
                variant="body2"
                color="text.secondary"
                gutterBottom>
                Current Stock
              </Typography>
              <Typography variant="body1">
                {toSignificantFigures(displayProduct.onhand, 2)}{" "}
                {displayProduct.baseUnit}
              </Typography>
              {displayProduct.reorderPoint && (
                <>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    gutterBottom>
                    Reorder Point
                  </Typography>
                  <Typography variant="body1">
                    {displayProduct.reorderPoint}
                  </Typography>
                </>
              )}
            </CardContent>
          </InfoCard>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <InfoCard>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                <LocalShippingIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Restock Summary</Typography>
              </Box>
              {productDetails?.summary ? (
                <>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    gutterBottom>
                    Total Restocked
                  </Typography>
                  <Typography variant="h5" color="primary" gutterBottom>
                    {productDetails.summary.totalRestocked}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    gutterBottom>
                    Total Restock Value
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {formatCurrency(
                      productDetails.summary.totalRestockValue
                    )}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    gutterBottom>
                    Restock Count
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {productDetails.summary.restockCount} times
                  </Typography>
                  {productDetails.summary.lastRestockDate && (
                    <>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        gutterBottom>
                        Last Restock
                      </Typography>
                      <Typography variant="body1">
                        {formatDate(productDetails.summary.lastRestockDate)}
                      </Typography>
                    </>
                  )}
                </>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No restock data available
                </Typography>
              )}
            </CardContent>
          </InfoCard>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <InfoCard>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                <CategoryIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Product Info</Typography>
              </Box>
              <Typography
                variant="body2"
                color="text.secondary"
                gutterBottom>
                Product ID
              </Typography>
              <Typography variant="body1" gutterBottom>
                #{displayProduct.id}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                gutterBottom>
                Category
              </Typography>
              <Typography variant="body1" gutterBottom>
                {displayProduct.category || "N/A"}
              </Typography>
              {displayProduct.barcode && (
                <>
                  <Box
                    sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                    <QrCodeIcon sx={{ mr: 1, color: "text.secondary" }} />
                    <Typography variant="body2" color="text.secondary">
                      Barcode
                    </Typography>
                  </Box>
                  <Typography variant="body1">
                    {displayProduct.barcode}
                  </Typography>
                </>
              )}
            </CardContent>
          </InfoCard>
        </Grid>
      </Grid>
    </Container>
  );
};

export default ProductInfo;
