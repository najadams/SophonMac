import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Grid,
  Chip,
  CircularProgress,
  IconButton,
  Divider,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import { useSelector } from "react-redux";
import axios from "axios";

const plans = [
  {
    key: "STARTER",
    name: "Starter",
    price: "GHS 200",
    billing: "one-time",
    features: [
      "Single Device",
      "Owner account only",
      "100 Product Limit",
      "Daily Sales Summary",
      "Local Storage Only",
    ],
  },
  {
    key: "TRADER",
    name: "Trader",
    price: "GHS 15",
    billing: "per month",
    features: [
      "Real-time Cloud Sync",
      "Tax Invoices (GRA Compliant)",
      "Waybills & Delivery Notes",
      "3 Staff Accounts",
      "Expense Tracking",
    ],
  },
  {
    key: "BUSINESS",
    name: "Business",
    price: "GHS 45",
    billing: "per month",
    popular: true,
    features: [
      "Up to 5 Branches",
      "Unlimited Staff",
      "Purchase Orders & GRN",
      "Pro-forma Invoices",
      "Accounting Exports",
    ],
  },
  {
    key: "ENTERPRISE",
    name: "Enterprise",
    price: "Custom",
    billing: "",
    features: [
      "Unlimited Branches",
      "Full API Access",
      "Custom Workflows",
      "Dedicated Account Manager",
      "White-label Options",
    ],
  },
];

const UpgradePlanModal = ({ open, onClose }) => {
  const [loading, setLoading] = useState(null);
  const [error, setError] = useState(null);
  const company = useSelector((state) => state.companyState.data);
  const currentPlan = (company?.currentPlan || "STARTER").toUpperCase();

  const handleUpgrade = async (planKey) => {
    if (planKey === "ENTERPRISE") {
      window.location.href = "mailto:najmadams1706@gmail.com?subject=Enterprise Plan Inquiry";
      return;
    }

    setLoading(planKey);
    setError(null);

    try {
      const response = await axios.post("/api/billing/initialize", {
        companyId: company.id,
        plan: planKey,
      });

      if (response.data.authorization_url) {
        window.location.href = response.data.authorization_url;
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to initialize payment.");
      setLoading(null);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Typography variant="h5" fontWeight="bold">
          Upgrade Your Plan
        </Typography>
        <IconButton onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        {error && (
          <Typography color="error" sx={{ mb: 2, textAlign: "center" }}>
            {error}
          </Typography>
        )}
        <Grid container spacing={3} sx={{ mt: 0 }}>
          {plans.map((plan) => {
            const isCurrent = plan.key === currentPlan;
            const isPopular = plan.popular;

            return (
              <Grid item xs={12} sm={6} md={3} key={plan.key}>
                <Card
                  sx={{
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    border: "2px solid",
                    borderColor: isCurrent
                      ? "success.main"
                      : isPopular
                      ? "primary.main"
                      : "divider",
                    position: "relative",
                  }}
                >
                  {isCurrent && (
                    <Chip
                      label="Current Plan"
                      color="success"
                      size="small"
                      sx={{ position: "absolute", top: 8, right: 8 }}
                    />
                  )}
                  {isPopular && !isCurrent && (
                    <Chip
                      icon={<AutoAwesomeIcon />}
                      label="Most Popular"
                      color="primary"
                      size="small"
                      sx={{ position: "absolute", top: 8, right: 8 }}
                    />
                  )}
                  <CardContent sx={{ flexGrow: 1, pt: 4 }}>
                    <Typography variant="h6" fontWeight="bold">
                      {plan.name}
                    </Typography>
                    <Box sx={{ display: "flex", alignItems: "baseline", mt: 1, mb: 2 }}>
                      <Typography variant="h4" fontWeight="bold">
                        {plan.price}
                      </Typography>
                      {plan.billing && (
                        <Typography variant="body2" color="text.secondary" sx={{ ml: 0.5 }}>
                          {plan.billing}
                        </Typography>
                      )}
                    </Box>
                    <Divider sx={{ mb: 2 }} />
                    {plan.features.map((feature) => (
                      <Box key={feature} sx={{ display: "flex", alignItems: "center", gap: 1, py: 0.5 }}>
                        <CheckCircleIcon fontSize="small" color="primary" />
                        <Typography variant="body2">{feature}</Typography>
                      </Box>
                    ))}
                  </CardContent>
                  <CardActions sx={{ p: 2, pt: 0 }}>
                    <Button
                      fullWidth
                      variant={isCurrent ? "outlined" : isPopular ? "contained" : "outlined"}
                      disabled={isCurrent || loading !== null}
                      onClick={() => handleUpgrade(plan.key)}
                    >
                      {loading === plan.key ? (
                        <CircularProgress size={24} />
                      ) : isCurrent ? (
                        "Current Plan"
                      ) : plan.key === "ENTERPRISE" ? (
                        "Contact Sales"
                      ) : (
                        "Upgrade"
                      )}
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      </DialogContent>
    </Dialog>
  );
};

export default UpgradePlanModal;
