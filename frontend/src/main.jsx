import React from "react";
import ReactDOM from "react-dom/client";
import { createTheme } from "@mui/material/styles";
import "./index.css";
import App from "./App";
import { Provider } from "react-redux";
import store, { persistor } from "./store/store";
import { PersistGate } from "redux-persist/integration/react";
import { ThemeProvider } from "@mui/material/styles";
import { SidebarProvider } from "./context/context";

const breakpoints = {
  values: {
    xs: 300,
    sm: 600,
    md: 960,
    lg: 1280,
    xl: 1920,
    custom: 2000,
    mymd: 1120,
  },
};

const mycolors = {
  values: {
    primary: {
      main: "#1976d2", // a nice shade of blue
    },
    secondary: {
      main: "#dc004e", // a vibrant pink/red
    },
    error: {
      main: "#f44336", // red for errors
    },
    warning: {
      main: "#ff9800", // orange for warnings
    },
    info: {
      main: "#2196f3", // a different shade of blue for general information
    },
    success: {
      main: "#4caf50", // green for success messages
    },
    text: {
      primary: "#333333", // dark grey for primary text
      secondary: "#757575", // light grey for secondary text
    },
    background: {
      default: "#f5f5f5", // light grey for backgrounds
      paper: "#ffffff", // white for paper backgrounds
    },
    tablestyle: {
      default: "#262626;",
    },
  },
};

// Create a custom theme with the updated breakpoints
const theme = createTheme({
  breakpoints: breakpoints,
  mycolors: mycolors.values,
});

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <ThemeProvider theme={theme}>
          <SidebarProvider>
            <App />
          </SidebarProvider>
        </ThemeProvider>
      </PersistGate>
    </Provider>
  </React.StrictMode>
);
