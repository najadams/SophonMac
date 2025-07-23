import React, { useEffect, useState } from "react";
import {
  createTheme,
  ThemeProvider,
  Avatar,
  Button,
  CssBaseline,
  TextField,
  Link,
  Paper,
  Box,
  Grid,
  Typography,
  CircularProgress,
} from "@mui/material";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import axios from "../../config";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { ActionCreators } from "../../actions/action";
import { useUser } from "../../context/UserContext";
import { rolePermissions } from "../../context/userRoles";
import { motion } from "framer-motion";

function Copyright(props) {
  return (
    <Typography
      variant="body2"
      color="text.secondary"
      align="center"
      {...props}>
      {"Copyright © "}
      <Link color="inherit" href="https://mannos.netlify.app/">
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

const WorkerEntry = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const dispatch = useDispatch();
  const companyId = useSelector((state) => state.companyState.data?.id);
  useEffect(() => console.log(companyId, 'from worker entry'))
  const { setUser } = useUser();

  const accountSignin = async (companyId, name, password) => {
    try {
      const response = await axios.post(`/api/auth/account`, {
        companyId,
        name,
        password,
      });

      return response.data;
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Failed to sign in. Please try again later."
      );

      throw new Error(error.response?.data);
    }
  };

  const handleSubmit = async (event) => {
    setLoading(true);
    event.preventDefault();
    setError(null);
    const data = new FormData(event.currentTarget);
    const name = data.get("name");
    const password = data.get("password");
    if (!name || !password) {
      setError("Please fill all fields");
      setLoading(false);
      return;
    }
    try {
      const user = await accountSignin(
        companyId,
        name.toLowerCase().trim(),
        password
      );

      const role = user.worker.role;
      const permissions = rolePermissions[role] || [];

      const userData = {
        ...user.worker,
        permissions: permissions,
        password: user.worker.password, // Include password for frontend validation
      };

      console.log(userData, "userdata");
      dispatch(ActionCreators.setCurrentUser(userData));
      setUser(userData);
      navigate("/dashboard");
    } catch (error) {
      // Handle error appropriately, e.g., display error message
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="notlogin">
      <ThemeProvider theme={defaultTheme}>
        <Grid container component="main" sx={{ height: "100vh" }}>
          <CssBaseline />
          <Grid
            item
            xs={false}
            sm={4}
            md={7}
            sx={{
              backgroundImage: "url(/logo.png)",
              backgroundRepeat: "no-repeat",
              backgroundColor: (t) =>
                t.palette.mode === "light"
                  ? t.palette.grey[50]
                  : t.palette.grey[900],
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
                background:
                  "linear-gradient(45deg, rgba(33,150,243,0.3), rgba(245,0,87,0.3))",
              }}
            />
          </Grid>
          <Grid
            item
            xs={12}
            sm={8}
            md={5}
            component={Paper}
            elevation={6}
            square>
            <Box
              sx={{
                my: 8,
                mx: 4,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}>
              <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5 }}>
                <Avatar
                  sx={{
                    m: 1,
                    bgcolor: "secondary.main",
                    width: 56,
                    height: 56,
                  }}>
                  <LockOutlinedIcon />
                </Avatar>
              </motion.div>
              <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}>
                <Typography
                  component="h1"
                  variant="h4"
                  sx={{ fontWeight: 600, mb: 3 }}>
                  Welcome Back
                </Typography>
                <Typography
                  variant="body1"
                  color="text.secondary"
                  sx={{ mb: 4 }}>
                  Sign in to your worker account
                </Typography>
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
                    id="name"
                    label="Name or Username"
                    name="name"
                    onChange={() => setError(null)}
                    autoComplete="name"
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
                    name="password"
                    label="Password"
                    type="password"
                    id="password"
                    autoComplete="current-password"
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
                    {loading ? <CircularProgress size={24} /> : "Sign In"}
                  </Button>
                </motion.div>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}>
                    <Typography
                      variant="body2"
                      color="error"
                      align="center"
                      sx={{ mt: 2 }}>
                      {error}
                    </Typography>
                  </motion.div>
                )}
                <Copyright sx={{ mt: 5 }} />
              </Box>
            </Box>
          </Grid>
        </Grid>
      </ThemeProvider>
    </div>
  );
};

export default WorkerEntry;
