import { createTheme, ThemeProvider } from "@mui/material/styles";
import { useState } from "react";
import Avatar from "@mui/material/Avatar";
import Button from "@mui/material/Button";
import CssBaseline from "@mui/material/CssBaseline";
import TextField from "@mui/material/TextField";
import Link from "@mui/material/Link";
import Paper from "@mui/material/Paper";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import Typography from "@mui/material/Typography";
import axios from "../../config";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CircularProgress, Card, CardContent, CardActions, Chip, Divider, IconButton } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { motion } from "framer-motion";

function Copyright(props) {
  return (
    <Typography
      variant="body2"
      color="text.secondary"
      align="center"
      {...props}>
      {"Copyright © "}
      <Link color="inherit" href="https://sofon.netlify.app/">
        Sophon
      </Link>{" "}
      {new Date().getFullYear()}
      {"."}
    </Typography>
  );
}

const defaultTheme = createTheme({
  palette: {
    primary: {
      main: "#2196f3",
    },
    secondary: {
      main: "#f50057",
    },
    background: {
      default: "#f5f5f5",
    },
  },
  typography: {
    fontFamily: '"Poppins", "Roboto", "Helvetica", "Arial", sans-serif',
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: "none",
          fontWeight: 600,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-root": {
            borderRadius: 8,
          },
        },
      },
    },
  },
});

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

const Register = () => {
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState(null);
  const [step, setStep] = useState(1); // 1 = plan selection, 2 = account details
  const [selectedPlan, setSelectedPlan] = useState(searchParams.get("plan")?.toUpperCase() || "STARTER");

  const handlePlanSelect = (planKey) => {
    if (planKey === "ENTERPRISE") {
      window.location.href = "mailto:najmadams1706@gmail.com?subject=Enterprise Plan Inquiry";
      return;
    }
    setSelectedPlan(planKey);
    setStep(2);
  };

  // Register function
  const registration = async (companyName, email, password) => {
    try {
      const response = await axios.post(`/api/auth/register`, {
        companyName,
        email,
        password,
        plan: selectedPlan,
      });

      if (response.status !== 201) {
        throw new Error("Something went wrong. Try again later");
      }

      // For paid plans, redirect to Paystack payment
      if (selectedPlan !== "STARTER" && response.data.authorization_url) {
        setSuccessMessage("Account created! Redirecting to payment...");
        setTimeout(() => {
          window.location.href = response.data.authorization_url;
        }, 1500);
        return response.data;
      }

      setSuccessMessage("Registration successful! Redirecting to login...");
      setTimeout(() => {
        navigate("/login");
      }, 2000);

      return response.data;
    } catch (error) {
      console.error(error.message);
      if (error.response && error.response.data) {
        setError(error.response.data.message);
      } else {
        setError(error.message);
      }
    }
  };

  const handleSubmit = async (event) => {
    setLoading(true);
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);
    const data = new FormData(event.currentTarget);
    const companyName = data.get("companyName");
    const email = data.get("email");
    const password = data.get("password");

    if (!companyName || !email || !password) {
      setError("Please fill all fields");
      setLoading(false);
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      setLoading(false);
      return;
    }

    await registration(
      companyName.toLowerCase().trim(),
      email.trim(),
      password
    );
    setLoading(false);
  };

  return (
    <div className="notlogin">
      <ThemeProvider theme={defaultTheme}>
        <CssBaseline />
        {step === 1 ? (
          <Box sx={{ minHeight: "100vh", bgcolor: "background.default", py: 6, px: 2 }}>
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5 }}>
              <Typography variant="h4" fontWeight={600} align="center" sx={{ mb: 1 }}>
                Choose Your Plan
              </Typography>
              <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 4 }}>
                Start free and upgrade anytime
              </Typography>
            </motion.div>
            <Grid container spacing={3} justifyContent="center" sx={{ maxWidth: 1100, mx: "auto" }}>
              {plans.map((plan, idx) => {
                const isSelected = plan.key === selectedPlan;
                const isPopular = plan.popular;
                return (
                  <Grid item xs={12} sm={6} md={3} key={plan.key}>
                    <motion.div
                      initial={{ y: 30, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ duration: 0.4, delay: idx * 0.1 }}>
                      <Card
                        sx={{
                          height: "100%",
                          display: "flex",
                          flexDirection: "column",
                          border: "2px solid",
                          borderColor: isSelected ? "primary.main" : isPopular ? "primary.light" : "divider",
                          position: "relative",
                          cursor: "pointer",
                          "&:hover": { borderColor: "primary.main", boxShadow: 4 },
                        }}
                        onClick={() => handlePlanSelect(plan.key)}>
                        {isPopular && (
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
                            variant={isPopular ? "contained" : "outlined"}
                            onClick={(e) => { e.stopPropagation(); handlePlanSelect(plan.key); }}>
                            {plan.key === "ENTERPRISE" ? "Contact Sales" : "Select"}
                          </Button>
                        </CardActions>
                      </Card>
                    </motion.div>
                  </Grid>
                );
              })}
            </Grid>
            <Box sx={{ textAlign: "center", mt: 4 }}>
              <Link href="/login" variant="body2" sx={{ textDecoration: "none" }}>
                Already have an account? Sign In
              </Link>
            </Box>
          </Box>
        ) : (
          <Grid container component="main" sx={{ height: "100vh" }}>
            <Grid
              item
              xs={false}
              sm={4}
              md={7}
              sx={{
                backgroundImage: "url(/logo.png)",
                backgroundRepeat: "no-repeat",
                backgroundColor: (t) =>
                  t.palette.mode === "light" ? t.palette.grey[50] : t.palette.grey[900],
                backgroundSize: "cover",
                backgroundPosition: "center",
                position: "relative",
                overflow: "hidden",
              }}>
              <motion.div
                initial={{ opacity: 0, scale: 1.1 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1 }}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: "linear-gradient(45deg, rgba(33,150,243,0.3), rgba(245,0,87,0.3))",
                }}
              />
            </Grid>
            <Grid item xs={12} sm={8} md={5} component={Paper} elevation={6} square>
              <Box
                sx={{
                  my: 8,
                  mx: 4,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                }}>
                <Box sx={{ alignSelf: "flex-start", mb: 1 }}>
                  <IconButton onClick={() => setStep(1)} size="small">
                    <ArrowBackIcon />
                  </IconButton>
                </Box>
                <motion.div
                  initial={{ y: -20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.5 }}>
                  <Avatar
                    sx={{ m: 1, bgcolor: "secondary.main", width: 56, height: 56 }}>
                    <LockOutlinedIcon />
                  </Avatar>
                </motion.div>
                <motion.div
                  initial={{ y: -20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.2 }}>
                  <Typography component="h1" variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
                    Create Account
                  </Typography>
                  <Chip
                    label={`${plans.find((p) => p.key === selectedPlan)?.name} Plan`}
                    color="primary"
                    variant="outlined"
                    sx={{ mb: 3 }}
                  />
                </motion.div>
                <Box
                  component="form"
                  noValidate
                  onSubmit={handleSubmit}
                  sx={{ mt: 1, width: "100%" }}>
                  <motion.div
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.4 }}>
                    <TextField
                      margin="normal"
                      required
                      fullWidth
                      id="companyName"
                      label="Company Name"
                      name="companyName"
                      onChange={() => setError(null)}
                      autoFocus
                    />
                  </motion.div>
                  <motion.div
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.6 }}>
                    <TextField
                      margin="normal"
                      required
                      fullWidth
                      id="email"
                      label="Email Address"
                      name="email"
                      autoComplete="email"
                      onChange={() => setError(null)}
                    />
                  </motion.div>
                  <motion.div
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.8 }}>
                    <TextField
                      margin="normal"
                      required
                      fullWidth
                      name="password"
                      label="Password"
                      type="password"
                      id="password"
                      autoComplete="new-password"
                      onChange={() => setError(null)}
                    />
                  </motion.div>
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.5, delay: 1 }}>
                    <Button
                      type="submit"
                      fullWidth
                      variant="contained"
                      sx={{ mt: 3, mb: 2, py: 1.5 }}
                      disabled={loading}>
                      {loading ? (
                        <CircularProgress size={24} />
                      ) : (
                        "Create Account & Pay"
                      )}
                    </Button>
                  </motion.div>
                  <Grid container>
                    <Grid item xs={12} sx={{ textAlign: "center" }}>
                      <Link href="/login" variant="body2" sx={{ textDecoration: "none" }}>
                        Already have an account? Sign In
                      </Link>
                    </Grid>
                  </Grid>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}>
                      <Typography variant="body2" color="error" align="center" sx={{ mt: 2 }}>
                        {error}
                      </Typography>
                    </motion.div>
                  )}
                  {successMessage && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}>
                      <Typography variant="body2" color="success.main" align="center" sx={{ mt: 2 }}>
                        {successMessage}
                      </Typography>
                    </motion.div>
                  )}
                  <Copyright sx={{ mt: 5 }} />
                </Box>
              </Box>
            </Grid>
          </Grid>
        )}
      </ThemeProvider>
    </div>
  );
};

export default Register;
