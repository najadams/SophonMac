import React, { useState, useRef, useEffect } from "react";
import { useSelector } from "react-redux";
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "react-query";
import axios from "../config";
import Loader from "../components/common/Loader";
import { Widgets } from "./Dashboard";
import UsersCard from "../components/UsersCard";
import SearchField from "../hooks/SearchField";
import {
  useMediaQuery,
  Button,
  Snackbar,
  TextField,
  Typography,
  CircularProgress,
} from "@mui/material";
import PaymentDialog from "../components/Dialogs/PaymentDialog";

const Debt = () => {
  const queryClient = useQueryClient();
  const companyId = useSelector((state) => state.companyState.data.id);
  const worker = useSelector((state) => state.userState.currentUser);
  const workerId = worker?.id;
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState("");
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showAllDebtors, setShowAllDebtors] = useState(false);
  const [compressCards, setCompressCards] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const matchesTablet = useMediaQuery("(max-width:600px)");
  const filterRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setShowFilters(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const fetchDebts = async () => {
    const formattedDate = selectedDate.toISOString().split("T")[0];
    const url = showAllDebtors
      ? `/api/debts/${companyId}/all`
      : `/api/debts/${companyId}?date=${formattedDate}`;
    const response = await axios.get(url);
    return response.data;
  };

  const {
    data: debts = [],
    isLoading,
    isError,
    error,
  } = useQuery(["debts", companyId, selectedDate, showAllDebtors], fetchDebts, {
    refetchOnWindowFocus: true,
    enabled: !!companyId,
  });

  const paymentMutation = useMutation(
    async ({ debtId, amount, paymentMethod }) => {
      return await axios.post(`/api/debts/${debtId}/pay`, { amount, workerId, paymentMethod });
    },
    {
      onSuccess: () => {
        // Refetch debts to reflect the updated payment
        queryClient.invalidateQueries("debts");
      },
      onError: (error) => {
        console.error("Payment failed: ", error);
        alert("Error processing the payment, please try again.");
      },
    }
  );

  const toggleCompressCards = () => {
    setCompressCards((prev) => !prev);
  };

  const handleDateChange = (e) => {
    setSelectedDate(new Date(e.target.value));
  };

  const handleSearch = (term) => {
    setSearchTerm(term);
  };

  const toggleFilters = () => {
    setShowFilters((prev) => !prev);
  };

  const handleShowAllChange = (e) => {
    setShowAllDebtors(e.target.checked);
  };

  const handleCardClick = (debt) => {
    setSelectedDebt(debt);
    setPaymentAmount("");
    setPaymentDialogOpen(true);
  };

  const handlePayment = async (paymentAmount, paymentMethod = 'cash') => {
    try {
      if (!selectedDebt?.id || !paymentAmount) {
        alert("Please select a debt and enter a valid payment amount.");
        return;
      }
      
      if (!workerId) {
        alert("Worker ID is required. Please ensure you are logged in.");
        return;
      }
      
      // Trigger the mutation to make the payment
      setSubmitting(true);
      const response = await paymentMutation.mutateAsync({
        debtId: selectedDebt.id,
        amount: paymentAmount,
        paymentMethod: paymentMethod,
      });
      
      // Show success message
      if (response.data.message) {
        alert(response.data.message);
      }
      const updatedDebts = debts.map((debt) => {
        if (debt.id === selectedDebt.id) {
          return {
            ...debt,
            amount: response.data.newAmount,
            status: response.data.newStatus
          };
        }
        return debt;
      }).filter(debt => debt.amount > 0); // Remove fully paid debts from the list

      // Update the state with the new debts list
      queryClient.setQueryData(
        ["debts", companyId, selectedDate, showAllDebtors],
        updatedDebts
      );

      // Close the payment dialog and reset the payment amount
      setPaymentDialogOpen(false);
      setPaymentAmount("");
      setSubmitting(false);

      setOpen(true);
    } catch (error) {
      console.error("Error during payment: ", error);
      setSubmitting(false);
    }
  };

  const groupDebtsByCustomerOrCompany = (debts) => {
    const grouped = debts.reduce((acc, debt) => {
      const key = debt.companyName || debt.customerName;

      if (!acc[key]) {
        acc[key] = {
          ...debt,
          receiptIds: [debt.receiptId], // Use receiptId instead of debt.id
        };
      } else {
        acc[key].amount += debt.amount; // Add to the existing amount
        acc[key].receiptIds.push(debt.receiptId); // Use receiptId instead of debt.id
      }
      return acc;
    }, {});

    return Object.values(grouped);
  };

  const filteredDebts =
    debts?.filter(
      (debt) =>
        debt.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        debt.customerCompany?.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

  const displayedDebts = compressCards
    ? groupDebtsByCustomerOrCompany(filteredDebts || []) // Fallback to empty array
    : filteredDebts || [];

  if (isLoading) return <Loader />;
  
  if (isError) {
    return (
      <div className="page">
        <div className="content" style={{ textAlign: 'center', padding: '2rem' }}>
          <h2>Error Loading Debts</h2>
          <p>{error?.response?.data?.error || error?.message || 'An unexpected error occurred'}</p>
          <Button 
            variant="contained" 
            onClick={() => window.location.reload()}
            style={{ marginTop: '1rem' }}
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
      <div className="page">
        <div className="heading" style={{ padding: 10 }}>
          <div>
            <h1 style={{ fontWeight: 200 }}>Debt Acquired</h1>
          </div>
        </div>

        <div className="content">
          <div className="widgets">
            <Widgets title={"Customers"} count={displayedDebts?.length || 0} />
            <Widgets
              title={"Total Amount"}
              count={`₵${
                displayedDebts?.reduce(
                  (total, debt) => total + debt.amount,
                  0
                ) || 0
              }`}
            />
          </div>
          <Snackbar
            open={open}
            autoHideDuration={3000} // Set the time in milliseconds (e.g., 3000 = 3 seconds)
            onClose={() => setOpen(false)} // Handle closing the Snackbar
            message="Payment Successfully made!"
            anchorOrigin={{ vertical: "top", horizontal: "center" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                backgroundColor: "green", // Custom background color
                color: "#fff", // Custom text color
                padding: "10px",
                borderRadius: "4px",
                fontFamily: "Arial, sans-serif", // Custom font
              }}>
              <Typography variant="body1" style={{ fontFamily: "cursive" }}>
                Payment made Successfully!
              </Typography>
            </div>
          </Snackbar>
          <div
            style={{
              width: "100%",
              alignItems: "flex-end",
              justifyContent: "space-between",
              display: "flex",
              gap: "1rem",
              padding: "0.5rem",
              position: "relative",
            }}>
            <div
              ref={filterRef}
              className="filter-icon-container"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                position: "relative",
              }}>
              <button
                onClick={toggleFilters}
                style={{
                  background: "none",
                  border: "none",
                  padding: "0.5rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  color: "#00796B",
                  borderRadius: "8px",
                  transition: "all 0.2s ease",
                  "&:hover": {
                    backgroundColor: "rgba(0, 121, 107, 0.04)",
                  },
                }}
                className="filter-button">
                <i
                  className="bx bx-filter-alt"
                  style={{ fontSize: "1.2rem" }}></i>
                <span style={{ fontSize: "0.9rem", fontWeight: "500" }}>
                  Filters
                </span>
              </button>
              <div
                className={`filter-options ${showFilters ? "visible" : ""}`}
                style={{
                  position: "absolute",
                  top: "100%",
                  left: "0",
                  background: "white",
                  padding: "1.5rem",
                  borderRadius: "12px",
                  boxShadow: "0 4px 20px rgba(0, 0, 0, 0.1)",
                  zIndex: 1000,
                  display: showFilters ? "flex" : "none",
                  flexDirection: "column",
                  gap: "1rem",
                  minWidth: "250px",
                  marginTop: "0.5rem",
                  opacity: showFilters ? 1 : 0,
                  transform: showFilters
                    ? "translateY(0)"
                    : "translateY(-10px)",
                  transition: "all 0.3s ease",
                }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "0.5rem",
                    backgroundColor: "#f8f9fa",
                    borderRadius: "8px",
                  }}>
                  <label
                    htmlFor="All"
                    style={{
                      fontSize: "0.9rem",
                      fontWeight: "500",
                      color: "#2c3e50",
                    }}>
                    Show All Debtors
                  </label>
                  <input
                    className="checkbox"
                    id="All"
                    type="checkbox"
                    checked={showAllDebtors}
                    onChange={handleShowAllChange}
                    style={{
                      width: "16px",
                      height: "16px",
                      cursor: "pointer",
                    }}
                  />
                </div>
                <div
                  style={{
                    padding: "0.5rem",
                    backgroundColor: "#f8f9fa",
                    borderRadius: "8px",
                  }}>
                  <SearchField
                    placeholder="Search Debtor"
                    onSearch={handleSearch}
                  />
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.5rem",
                    padding: "0.5rem",
                    backgroundColor: "#f8f9fa",
                    borderRadius: "8px",
                  }}>
                  <label
                    htmlFor="dateInput"
                    style={{
                      fontSize: "0.9rem",
                      fontWeight: "500",
                      color: "#2c3e50",
                    }}>
                    Select Date
                  </label>
                  <input
                    className="date-input"
                    type="date"
                    id="dateInput"
                    value={selectedDate.toISOString().split("T")[0]}
                    onChange={handleDateChange}
                    style={{
                      padding: "0.5rem",
                      borderRadius: "6px",
                      border: "1px solid #e9ecef",
                      fontSize: "0.9rem",
                      outline: "none",
                      "&:focus": {
                        borderColor: "#00796B",
                      },
                    }}
                  />
                </div>
              </div>
            </div>
            {debts.length > 0 ? (
              <button
                onClick={toggleCompressCards}
                style={{
                  background: "none",
                  border: "none",
                  padding: "0.5rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  color: "#00796B",
                  borderRadius: "8px",
                  transition: "all 0.2s ease",
                  "&:hover": {
                    backgroundColor: "rgba(0, 121, 107, 0.04)",
                  },
                }}
                className="compress-button">
                <i
                  className={`bx ${
                    compressCards ? "bx-expand" : "bx-compress"
                  }`}
                  style={{ fontSize: "1.2rem" }}></i>
                <span style={{ fontSize: "0.9rem", fontWeight: "500" }}>
                  {compressCards ? "Expand" : "Compress"}
                </span>
              </button>
            ) : null}
          </div>
        </div>
        {!isLoading &&
        !isError &&
        displayedDebts &&
        displayedDebts.length > 0 ? (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "1rem",
              justifyContent: "center",
              padding: "1rem",
            }}>
            {displayedDebts.map((debt, index) => (
              <div
                key={debt.id || debt.data}
                style={{
                  animation: `fadeInUp 0.5s ease forwards ${index * 0.1}s`,
                  opacity: 0,
                  transform: "translateY(20px)",
                }}>
                {compressCards ? (
                  <UsersCard
                    main={`₵${debt.amount}`}
                    sub={
                      debt.customerCompany !== "NoCompany"
                        ? debt.customerCompany
                        : debt.customerName
                    }
                    contact={debt.contact}
                    onClick={() => handleCardClick(debt)}
                    additionalInfo={`Debt Date: ${new Date(
                      debt.date
                    ).toLocaleDateString()}`}
                  />
                ) : (
                  <UsersCard
                    top={debt.date && !isNaN(new Date(debt.date).getTime()) 
                      ? new Date(debt.date).toLocaleDateString()
                      : "Invalid Date"
                    }
                    main={`₵${debt.amount}`}
                    sub={
                      debt.customerCompany !== "NoCompany"
                        ? debt.customerCompany
                        : debt.customerName
                    }
                    contact={debt.contact}
                    onClick={() => handleCardClick(debt)}
                    additionalInfo={`Debt Date: ${new Date(
                      debt.date
                    ).toLocaleDateString()}`}
                  />
                )}
              </div>
            ))}
          </div>
        ) : (
          <div
            className="content"
            style={{
              animation: "fadeIn 0.5s ease forwards",
              opacity: 0,
            }}>
            {selectedDate.toISOString().split("T")[0] ===
            new Date().toISOString().split("T")[0] ? (
              <h2 style={{ paddingTop: "100px" }}>No Debts Acquired Today</h2>
            ) : (
              <h2 style={{ paddingTop: "100px" }}>
                No Debts Acquired from{" "}
                {selectedDate.toISOString().split("T")[0]} to today
              </h2>
            )}
          </div>
        )}

        <style>
          {`
            @keyframes fadeInUp {
              from {
                opacity: 0;
                transform: translateY(20px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }

            @keyframes fadeIn {
              from {
                opacity: 0;
              }
              to {
                opacity: 1;
              }
            }

            .filter-options {
              transition: all 0.3s ease;
            }

            .filter-options.visible {
              display: flex !important;
            }
          `}
        </style>

        <PaymentDialog
          open={paymentDialogOpen}
          onClose={() => setPaymentDialogOpen(false)}
          selectedDebt={selectedDebt}
          onSubmit={handlePayment}
        />
      </div>
  );
};

export default Debt;
