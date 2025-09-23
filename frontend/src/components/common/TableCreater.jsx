import React, { useState, useEffect, useCallback } from "react";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell, { tableCellClasses } from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import EditButton from "../../hooks/EditButton";
import ProductForm from "../forms/ProductForm";
import CustomerForm from "../forms/CustomerForm";
import axios from "../../config";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import { useQueryClient, useMutation } from "react-query";
import { tableActions, updateValuesAfterEdit } from "../../config/Functions";
import { useMediaQuery } from "@mui/material";
import { styled } from "@mui/material/styles";
import { useQuery } from "react-query";
import SearchField from "../../hooks/SearchField";
import { useDispatch } from "react-redux";
import { ActionCreators } from "../../actions/action";
import { capitalizeFirstLetter } from "../../config/Functions";

import { alpha } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";

const StyledTableCell = styled(TableCell)(({ theme }) => ({
  [`&.${tableCellClasses.head}`]: {
    backgroundColor: alpha(theme.palette.primary.main, 0.1),
    color: theme.palette.primary.main,
    fontSize: "16px",
    fontWeight: 600,
    borderBottom: `2px solid ${alpha(theme.palette.primary.main, 0.2)}`,
  },
  [`&.${tableCellClasses.body}`]: {
    fontSize: "14px",
    transition: "all 0.2s ease-in-out",
  },
}));

const StyledTableRow = styled(TableRow)(({ theme }) => ({
  "&:nth-of-type(odd)": {
    backgroundColor: alpha(theme.palette.primary.main, 0.02),
  },
  "&:hover": {
    backgroundColor: alpha(theme.palette.primary.main, 0.05),
    transform: "scale(1.001)",
    transition: "all 0.2s ease-in-out",
  },
  "&:last-child td, &:last-child th": {
    border: 0,
  },
}));



const TableCreater = ({ companyId, data, type, onDataUpdate }) => {
  const [Headers, setHeaders] = useState([]);
  const [Data, setData] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteRow, setDeleteRow] = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);
  const [fullCustomerData, setFullCustomerData] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const isSmallScreen = useMediaQuery("(max-width:1120px)");
  const isMobile = useMediaQuery((theme) => theme.breakpoints.down("mymd"));
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const fetchData = useCallback(async () => {
    try {
      let fetchedData;
      if (data) {
        fetchedData = data;
      } else {
        if (type === "customers") {
          fetchedData = await tableActions.fetchCustomers(companyId);
        } else if (type === "products") {
          fetchedData = await tableActions.fetchProducts(companyId);
        }
      }

      if (fetchedData && fetchedData.length > 0) {
        // Ensure only one phone and email are displayed
        if (type === "customers") {
          const processedData = fetchedData.map((item) => ({
            ...item,
            phone: Array.isArray(item.phone) ? item.phone[0] : item.phone, // Take the first phone
            email: Array.isArray(item.email) ? item.email[0] : item.email, // Take the first email
          }));
        } else {
          processedData = fetchedData;
        }

        setHeaders(
          Object.keys(processedData[0]).filter(
            (key) =>
              key !== "id" &&
              key !== "unitConversions" &&
              key !== "reorderPoint" &&
              key !== "sku" &&
              key !== "barcode" &&
              key !== "minimumStock"
          )
        );
        setData(processedData);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    }
  }, [companyId, type, data]);

  const deleteRowConfirmed = () => {
    if (type === "products") {
      deleteProductMutation.mutate(deleteRow.id);
    } else {
      deleteCustomerMutation.mutate(deleteRow.id);
    }
    setData((prevData) => prevData.filter((row) => row.id !== deleteRow.id));
    setDeleteRow(null); // Reset delete row state after deletion
  };

  const handleDelete = (row) => {
    setDeleteRow(row);
  };

  const handleMenuClick = async (event, row) => {
    setAnchorEl(event.currentTarget);
    console.log(row)
    setSelectedRow(row);
    
    // If this is a customer, fetch full data for potential editing
    if (type === 'customers') {
      const fullData = await fetchFullCustomerData(row.id);
      setFullCustomerData(fullData);
    }
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleEditOpen = () => {
    // setEditOpen = true;
    handleMenuClose();
  };

  const handleViewDetails = () => {
    if (selectedRow) {
      if (type === "products") {
        navigate(`/products/${selectedRow.id}`, { state: { product: selectedRow } });
      } else if (type === "customers") {
        navigate(`/customers/${selectedRow.id}`, { state: { customer: selectedRow } });
      }
    }
    handleMenuClose();
  };

  const {
    data: fetchedData,
    isError,
    error,
  } = useQuery(
    [`api/${type}`, companyId], // Dynamic key based on type
    async () => {
      if (type === "customers") {
        return await tableActions.fetchCustomers(companyId);
      } else if (type === "products") {
        return await tableActions.fetchProducts(companyId);
      }
    },
    {
      staleTime: 1000 * 30,
      cacheTime: 1000 * 60 * 30,
      retry: 1,
      enabled: !data, // Only fetch if no data prop is provided
    }
  );

  // Use data prop if provided, otherwise use fetched data
  const currentData = data || fetchedData;

  useEffect(() => {
    if (currentData && currentData.length > 0) {
      setHeaders(
        Object.keys(currentData[0]).filter(
          (key) =>
            key !== "id" &&
            key !== "unitConversions" &&
            key !== "reorderPoint" &&
            key !== "sku" &&
            key !== "barcode" &&
            key !== "minimumStock"
        )
      );
      const transformedData = currentData.map(({ phone, email, ...rest }) => ({
        ...rest,
        phone:
          Array.isArray(phone) && phone.length > 0 && phone[0] !== ""
            ? phone[0]
            : phone || null,
        email: Array.isArray(email) && email.length > 0 ? email[0] : email || null,
      }));

      setData(transformedData);
    }
  }, [currentData]); // Add currentData as dependency

  const queryClient = useQueryClient();

  // const deleteProductMutation = useMutation(
  //   (id) => axios.delete(`/api/inventory/${id}`), // Changed from /api/product/ to /api/inventory/
  //   {
  //     onSuccess: () => {
  //       queryClient.invalidateQueries(["api/products"]);
  //       fetchData();
  //       dispatch(ActionCreators.removeProduct());
  //     },
  //     onError: (error) => {
  //       console.error("Failed to delete product:", error);
  //     },
  //   }
  // );

  const deleteCustomerMutation = useMutation(
    (id) => axios.delete(`/api/customers/${id}`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries([`api/${type}`, companyId]);
        fetchData();
        dispatch(ActionCreators.removeCustomer());
      },
      onError: (error) => {
        console.error("Failed to delete customer:", error);
      },
    }
  );

  const editProductMutation = useMutation(
    (values) => axios.patch(`/api/products/${values.id}`, values),
    {
      onSuccess: (data) => {
        queryClient.invalidateQueries([`api/${type}`, companyId]);
        const values = data.data.product;
        const newData = updateValuesAfterEdit(Data, values);
        setData(newData);
        
        // Notify parent component about the update
        if (onDataUpdate) {
          onDataUpdate(values);
        }
      },
      onError: (error) => {
        console.error("Failed to edit product:", error);
      },
    }
  );

  const deleteProductMutation = useMutation(
    (id) => axios.delete(`/api/products/${id}`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries([`api/${type}`, companyId]); // Add companyId for consistency
        
        // Notify parent component about the update
        if (onDataUpdate) {
          onDataUpdate();
        }
        
        dispatch(ActionCreators.removeProduct());
      },
      onError: (error) => {
        console.error("Failed to delete product:", error);
      },
    }
  );

  const editCustomerMutation = useMutation(
    (values) => {
      return axios.patch(`/api/customers/${values.id}`, values);
    },
    {
      onSuccess: (data) => {
        queryClient.invalidateQueries([`api/${type}`, companyId]);
        fetchData();
      },
      onError: (error) => {
        console.error(
          "Failed to edit customer:",
          error.response?.data || error.message
        );
      },
    }
  );

  // Function to fetch full customer data for editing
  const fetchFullCustomerData = async (customerId) => {
    try {
      const response = await axios.get(`/api/customers/${companyId}`);
      const customer = response.data.customers.find(c => c.id === customerId);
      return customer;
    } catch (error) {
      console.error('Failed to fetch full customer data:', error);
      return selectedRow; // Fallback to selected row data
    }
  };

  if (isError) {
    return { error };
  }

  // Filter data based on search term
  const filteredData = Data.filter(
    (item) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.company?.toLowerCase().includes(searchTerm.toLocaleLowerCase())
  );

  return (
    <Paper
      sx={{
        width: "100%",
        overflowX: "hidden",
        overflowY: "hidden",
        borderRadius: "12px",
        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
      }}>
      <TableContainer
        component={Paper}
        style={{
          overflowX: isMobile && "hidden",
          maxHeight: isSmallScreen ? "70vh" : "75vh",
          overflowY: isSmallScreen ? "auto" : "auto",
          borderRadius: "12px",
        }}>
        <SearchField onSearch={setSearchTerm} />
        <Table
          sx={{ minWidth: 650 }}
          size={isSmallScreen ? "small" : "medium"}
          stickyHeader
          aria-label="sticky table">
          <TableHead>
            <TableRow>
              {Headers.map((header, index) => (
                <StyledTableCell key={index} align="left">
                  {header.toUpperCase()}
                </StyledTableCell>
              ))}
              <StyledTableCell align="center">Actions</StyledTableCell>
            </TableRow>
          </TableHead>
          <TableBody className="table__body">
            {filteredData.map((row, index) => (
              <StyledTableRow key={row.id}>
                  {Headers.map((header) => (
                    <TableCell align="left" key={header}>
                      {capitalizeFirstLetter(row[header])}
                    </TableCell>
                  ))}
                  <TableCell align="center">
                    <IconButton
                      aria-controls="simple-menu"
                      aria-haspopup="true"
                      onClick={(event) => handleMenuClick(event, row)}
                      sx={{
                        transition: "transform 0.2s ease-in-out",
                        "&:hover": {
                          transform: "scale(1.1)",
                        },
                      }}>
                      <MoreVertIcon />
                    </IconButton>
                  </TableCell>
                </StyledTableRow>
              ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Menu
        anchorEl={anchorEl}
        keepMounted
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: {
            borderRadius: "8px",
            boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
          },
        }}>
        <MenuItem
          onClick={() => {
            handleEditOpen();
            handleMenuClose();
          }}
          sx={{
            transition: "background-color 0.2s ease-in-out",
            "&:hover": {
              backgroundColor: alpha(
                anchorEl?.getAttribute("data-color") || "#1976d2",
                0.1
              ),
            },
          }}>
          <EditButton
            title={type === "products" ? "Edit Product" : "Edit Customer"}>
            {type === "products" ? (
              <ProductForm
                editMutation={editProductMutation}
                data={selectedRow}
                onProductUpdate={onDataUpdate} // Pass the callback to ProductForm
              />
            ) : (
              <CustomerForm
                editMutation={editCustomerMutation}
                data={fullCustomerData || selectedRow}
              />
            )}
          </EditButton>
        </MenuItem>

        <MenuItem
          onClick={handleViewDetails}
          sx={{
            transition: "background-color 0.2s ease-in-out",
            "&:hover": {
              backgroundColor: alpha("#1976d2", 0.1),
            },
          }}>
          View
        </MenuItem>
        <MenuItem
            onClick={() => {
              handleMenuClose();
              handleDelete(selectedRow);
            }}
            sx={{
              color: "error.main",
              transition: "background-color 0.2s ease-in-out",
              "&:hover": {
                backgroundColor: alpha("#d32f2f", 0.1),
              },
            }}>
            Delete
          </MenuItem>
      </Menu>

      <Dialog
        open={Boolean(deleteRow)}
        onClose={() => setDeleteRow(null)}
        PaperProps={{
          sx: {
            borderRadius: "12px",
            boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
          },
        }}>
        <DialogTitle>
          {`Delete ${
            type === "products" ? "Product" : "Customer"
          } Confirmation`}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {`Are you sure you want to delete this ${
              type === "products" ? "product" : "customer"
            }?`}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setDeleteRow(null)}
            color="primary"
            sx={{
              transition: "all 0.2s ease-in-out",
              "&:hover": {
                transform: "scale(1.05)",
              },
            }}>
            Cancel
          </Button>
          <Button
            onClick={deleteRowConfirmed}
            color="error"
            sx={{
              transition: "all 0.2s ease-in-out",
              "&:hover": {
                transform: "scale(1.05)",
              },
            }}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default TableCreater;
