import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { Box, Typography, CircularProgress, Button, Paper, Container } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import axios from "axios";
import ActionModule from "../store/index";

const { ActionCreators } = ActionModule;

const BillingCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const company = useSelector((state) => state.companyState.data);
  const [status, setStatus] = useState("loading"); // loading | success | error
  const [billingInfo, setBillingInfo] = useState(null);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await axios.get(`/api/billing/status/${company.id}`);
        setBillingInfo(response.data);

        // Refresh company data in Redux
        const companyResponse = await axios.get(`/api/companies/${company.id}`);
        if (companyResponse.data) {
          dispatch(ActionCreators.fetchCompanySuccess(companyResponse.data));
        }

        setStatus("success");
      } catch (err) {
        console.error("Billing status check failed:", err);
        setStatus("error");
      }
    };

    // Small delay to allow webhook to process
    const timer = setTimeout(checkStatus, 2000);
    return () => clearTimeout(timer);
  }, [company.id, dispatch]);

  return (
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <Paper sx={{ p: 4, textAlign: "center" }}>
        {status === "loading" && (
          <>
            <CircularProgress size={48} sx={{ mb: 2 }} />
            <Typography variant="h6">Confirming your payment...</Typography>
            <Typography variant="body2" color="text.secondary">
              This may take a moment.
            </Typography>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircleIcon sx={{ fontSize: 64, color: "success.main", mb: 2 }} />
            <Typography variant="h5" fontWeight="bold" gutterBottom>
              Payment Successful
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
              Your plan has been upgraded to{" "}
              <strong>{billingInfo?.currentPlan || "your new plan"}</strong>.
            </Typography>
            {billingInfo?.nextBillingDate && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Next billing date: {new Date(billingInfo.nextBillingDate).toLocaleDateString()}
              </Typography>
            )}
            <Button variant="contained" onClick={() => navigate("/settings")}>
              Go to Settings
            </Button>
          </>
        )}

        {status === "error" && (
          <>
            <ErrorIcon sx={{ fontSize: 64, color: "error.main", mb: 2 }} />
            <Typography variant="h5" fontWeight="bold" gutterBottom>
              Something went wrong
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              We could not confirm your payment. If you were charged, your plan will be updated
              shortly. Please check your settings page.
            </Typography>
            <Box sx={{ display: "flex", gap: 2, justifyContent: "center" }}>
              <Button variant="outlined" onClick={() => navigate("/settings")}>
                Go to Settings
              </Button>
              <Button variant="contained" onClick={() => window.location.reload()}>
                Retry
              </Button>
            </Box>
          </>
        )}
      </Paper>
    </Container>
  );
};

export default BillingCallback;
