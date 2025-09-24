import React, { lazy, useState } from "react";
import { useQuery, useQueryClient } from "react-query";
import ProductForm from "../components/forms/ProductForm";
import TableCreater from "../components/common/TableCreater";
import AddItem from "../hooks/AddItem";
import axios from "../config/index";
import { useSelector } from "react-redux";
import Loader from "../components/common/Loader";
import { Box, Tabs, Tab, Typography, Paper } from "@mui/material";
import ReceiveInventory from "../components/forms/ReceiveInventory";

import { alpha } from "@mui/material/styles";

const fetchProducts = async (companyId) => {
  try {
    const response = await axios.get(`/api/products/${companyId}`);
    const data = response.data.products.map((item, index) => ({
      id: item.id,
      index: index + 1,
      name: item.name,
      category: item.category,
      baseUnit: item.baseUnit,
      unitConversions: item.unitConversions || [],
      costPrice: item.costPrice,
      salesPrice: item.salesPrice,
      onhand: item.onhand,
      reorderPoint: item.reorderPoint,
      minimumStock: item.minimumStock,
      description: item.description,
      sku: item.sku,
      barcode: item.barcode,
    }));
    return data;
  } catch (error) {
    throw new Error("Failed to fetch products");
  }
};

export const TabPanel = (props) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`full-width-tabpanel-${index}`}
      aria-labelledby={`full-width-tab-${index}`}
      {...other}>
      {value === index && (
        <Box sx={{ p: 0 }}>
          <Typography>{children}</Typography>
        </Box>
      )}
    </div>
  );
};

export const allyProps = (index) => {
  return {
    id: `full-width-tab-${index}`,
    "aria-controls": `full-width-tabpanel-${index}`,
  };
};

const ProductCatalogue = () => {
  const [value, setValue] = React.useState(0);
  const companyId = useSelector((state) => state.companyState.data.id);
  const queryClient = useQueryClient();

  const { data: products = [], isLoading, isError } = useQuery(
    ["api/products", companyId],
    () => fetchProducts(companyId),
    {
      staleTime: 1000 * 30, // 30 seconds
      cacheTime: 1000 * 60 * 5, // 5 minutes
    }
  );

  const handleProductUpdate = (newProduct) => {
    // Invalidate and refetch the products query
    queryClient.invalidateQueries(["api/products", companyId]);
  };

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  if (isLoading) return <Loader />;
  if (isError) return <div>Error fetching data</div>;

  return (
    <div
      className="page">
      <Box
        className="heading"
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 3,
          mb: 4,
          p: 0,
          borderRadius: "12px",
          backgroundColor: alpha("#fff", 0.8),
          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
          backdropFilter: "blur(10px)",
        }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 300,
              color: "primary.main",
              letterSpacing: "0.5px",
            }}>
            Products
          </Typography>
          <AddItem>
            <ProductForm onProductUpdate={handleProductUpdate} />
          </AddItem>
        </Box>
        <Box
          sx={{
            width: "100%",
            maxWidth: "600px",
            mx: "auto",
            "& .MuiTabs-root": {
              "& .MuiTab-root": {
                textTransform: "none",
                fontSize: "1rem",
                fontWeight: 500,
                transition: "all 0.2s ease-in-out",
                "&:hover": {
                  transform: "translateY(-1px)",
                },
              },
            },
          }}>
          <Tabs
            value={value}
            onChange={handleChange}
            indicatorColor="secondary"
            textColor="primary"
            variant="fullWidth"
            aria-label="full width tabs example">
            <Tab label="Products" {...allyProps(0)} />
            <Tab label="Receive inventory" {...allyProps(1)} />
          </Tabs>
        </Box>
      </Box>

      <Box
        className="cotent"
        sx={{
          p: 3,
          borderRadius: "12px",
          backgroundColor: alpha("#fff", 0.8),
          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
          backdropFilter: "blur(10px)",
        }}>
        <TabPanel value={value} index={0}>
          {products.length > 0 ? (
            <TableCreater
              companyId={companyId}
              type={"products"}
              data={products}
              onDataUpdate={handleProductUpdate} // This prop should be used in TableCreater
            />
          ) : (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                minHeight: "400px",
                textAlign: "center",
                color: "text.secondary",
              }}>
              <img 
                src="/noInventory.jpg" 
                alt="No inventory available" 
                style={{ maxWidth: '100%', height: 'auto', maxHeight: '200px', marginBottom: '16px' }}
              />
              <Typography variant="h5" sx={{ mb: 2 }}>
                No Products Yet
              </Typography>
              <Typography variant="body1">
                Add your first product to get started
              </Typography>
            </Box>
          )}
        </TabPanel>
        <TabPanel value={value} index={1}>
          <ReceiveInventory
            Products={products}
            handleProductUpdate={handleProductUpdate}
          />
        </TabPanel>
      </Box>
    </div>
  );
};

export default ProductCatalogue;
