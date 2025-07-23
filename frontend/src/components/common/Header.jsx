import React, { useState, useEffect } from "react";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import MenuIcon from "@mui/icons-material/Menu";
import AccountCircle from "@mui/icons-material/AccountCircle";
import MenuItem from "@mui/material/MenuItem";
import Menu from "@mui/material/Menu";
import Tooltip from "@mui/material/Tooltip";
import ListItemIcon from "@mui/material/ListItemIcon";
import Divider from "@mui/material/Divider";
import Settings from "@mui/icons-material/Settings";
import Logout from "@mui/icons-material/Logout";
import PermIdentityIcon from "@mui/icons-material/PermIdentity";
import PersonAdd from "@mui/icons-material/PersonAdd";
import { useDispatch, useSelector } from "react-redux";
import { ActionCreators } from "../../actions/action";
import { useNavigate } from "react-router-dom";
import { getPermissionsForRole, PERMISSIONS } from "../../context/userRoles";
import {
  useMediaQuery,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
  Button,
  Alert,
} from "@mui/material";
import { useSidebar } from "../../context/context";
import bcrypt from "bcryptjs";
import axios from "../../config/index";

export default function Header() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);
  const [password, setPassword] = useState("");
  const [openPasswordDialog, setOpenPasswordDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const { isSidebarExpanded, setIsSidebarExpanded } = useSidebar();
  const user = useSelector((state) => state.userState.currentUser);
  const userRole = user?.role || user?.worker?.role;
  const userPermissions = getPermissionsForRole(userRole);

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const logout = async () => {
    try {
      await axios.post("/logout");
      dispatch(ActionCreators.logoutCompany());
      navigate("/");
    } catch (error) {
      console.error("Logout error:", error);
      // Still clear local state and redirect even if server logout fails
      dispatch(ActionCreators.logoutCompany());
      navigate("/");
    }
  };

  const toggleSidebar = () => {
    setIsSidebarExpanded(!isSidebarExpanded);
  };

  const addEmployee = () => {
    setAnchorEl(null);
    navigate("/create-user");
  };

  const myaccount = () => {
    setAnchorEl(null);
    setOpenPasswordDialog(true);
  };

  const handlePasswordSubmit = async () => {
    try {
      // Check if user and user.password exist
      if (!user || !user.password) {
        setErrorMessage("User authentication data not available. Please log in again.");
        return;
      }

      const passwordMatch = await bcrypt.compare(password, user.password);
      if (passwordMatch) {
        setOpenPasswordDialog(false);
        setPassword("");
        setErrorMessage("");
        navigate(`myaccount/${user._id}`);
      } else {
        setErrorMessage("Incorrect password. Please try again.");
      }
    } catch (error) {
      console.log(error);
      setErrorMessage("An error occurred while verifying your password. Please try again.");
    }
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const isMobile = useMediaQuery((theme) => theme.breakpoints.down("mymd"));

  useEffect(() => {
    console.log("user", user)
    return () => {
      // Reset anchorEl when component unmounts
      setAnchorEl(null);
    };
  }, [user]);

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar
        position="static"
        style={{
          color: "black",
          background: "white",
          boxShadow: "0px 3px 5px 2px rgba(0,0,0,0.2)",
        }}>
        <Toolbar>
          {isMobile && (
            <IconButton
              size="medium"
              edge="start"
              color="inherit"
              aria-label="menu"
              onClick={() => toggleSidebar()}
              sx={{ mr: 2 }}>
              <MenuIcon />
            </IconButton>
          )}
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            <span style={{ display: "flex" }}>
              <img
                src="./logo.png"
                alt=""
                style={{ width: 30, height: 30, margin: 10, marginLeft: 0 }}
              />
              <h3 className="title">Sophon</h3>
            </span>
          </Typography>
          <div>
            <Tooltip title="Profile">
              <IconButton
                size="large"
                aria-label="account of current user"
                aria-controls="menu-appbar"
                aria-haspopup="true"
                onClick={handleMenu}
                color="inherit">
                <AccountCircle />
              </IconButton>
            </Tooltip>
            <Menu
              id="menu-appbar"
              anchorEl={anchorEl}
              anchorOrigin={{
                vertical: "top",
                horizontal: "right",
              }}
              transformOrigin={{
                vertical: "top",
                horizontal: "right",
              }}
              open={Boolean(anchorEl)}
              onClose={handleClose}>
              <MenuItem
                onClick={myaccount}
                style={{
                  display: "flex",
                  gap: 15,
                }}>
                <PermIdentityIcon /> My account (
                {user ? (user.username ? user.username : user.name) : ""})
              </MenuItem>
              <Divider />
              {(userRole === 'company' || userRole === 'super_admin' || userPermissions.includes(PERMISSIONS.MANAGE_USERS)) && (
                <MenuItem onClick={addEmployee}>
                  <ListItemIcon>
                    <PersonAdd fontSize="small" />
                  </ListItemIcon>
                  Add an Employee account
                </MenuItem>
              )}
              {(userRole === 'company' || userRole === 'super_admin' || userPermissions.includes(PERMISSIONS.MANAGE_SETTINGS)) && (
                <MenuItem
                  onClick={() => {
                    navigate("/settings");
                    handleClose();
                  }}>
                  <ListItemIcon>
                    <Settings fontSize="small" />
                  </ListItemIcon>
                  Settings
                </MenuItem>
              )}
              <MenuItem onClick={() => logout()}>
                <ListItemIcon>
                  <Logout fontSize="small" />
                </ListItemIcon>
                Logout
              </MenuItem>
            </Menu>
          </div>
        </Toolbar>
      </AppBar>

      <Dialog
        open={openPasswordDialog}
        onClose={() => setOpenPasswordDialog(false)}>
        <DialogTitle>Enter Password</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Please enter your password to access your account.
          </DialogContentText>
          {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
          <TextField
            autoFocus
            margin="dense"
            label="Password"
            type="password"
            fullWidth
            variant="standard"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={!!errorMessage}
            helperText={errorMessage}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenPasswordDialog(false)}>Cancel</Button>
          <Button onClick={handlePasswordSubmit}>Submit</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
