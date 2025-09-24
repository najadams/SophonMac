import React from "react";
import { useQuery } from "react-query";
import TableCreater from "../components/common/TableCreater";
import AddItem from "../hooks/AddItem";
import { useSelector } from "react-redux";
import CustomerForm from "../components/forms/CustomerForm";
import { tableActions } from "../config/Functions";
import Loader from "../components/common/Loader";

import { Box, Typography, Paper } from "@mui/material";
import { alpha } from "@mui/material/styles";

const Customers = () => {
  const companyId = useSelector((state) => state.companyState.data.id);
  const {
    data: customers,
    isLoading,
    isError,
  } = useQuery(["api/customers", companyId], () =>
    tableActions.fetchCustomers(companyId)
  );

  if (isLoading) return <Loader />;
  if (isError) return <div>Error fetching data</div>;

  return (
    <div
      className="page">
      <Box
        className="heading"
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 4,
          p: 3,
          borderRadius: "12px",
          backgroundColor: alpha("#fff", 0.8),
          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
          backdropFilter: "blur(10px)",
        }}>
        <Typography
          variant="h4"
          sx={{
            fontWeight: 300,
            color: "primary.main",
            letterSpacing: "0.5px",
          }}>
          Customers
        </Typography>
        <AddItem>
          <CustomerForm />
        </AddItem>
      </Box>

      <Box
        className="content"
        sx={{
          p: 3,
          borderRadius: "12px",
          backgroundColor: alpha("#fff", 0.8),
          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
          backdropFilter: "blur(10px)",
        }}>
        {customers.length > 0 ? (
          <TableCreater companyId={companyId} type="customers" />
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
              src="/noCustomers.jpg" 
              alt="No customers available" 
              style={{ maxWidth: '100%', height: 'auto', maxHeight: '200px', marginBottom: '16px' }}
            />
            <Typography variant="h5" sx={{ mb: 2 }}>
              No Customers Yet
            </Typography>
            <Typography variant="body1">
              Add your first customer to get started
            </Typography>
          </Box>
        )}
      </Box>
    </div>
  );
};

export default Customers;
