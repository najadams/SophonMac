import * as React from "react";
import PropTypes from "prop-types";
import { ThemeProvider, createTheme } from "@mui/material/styles";

import CssBaseline from "@mui/material/CssBaseline";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import AppAppBar from "./AppAppBar";
import Hero from "./Hero";
import Highlights from "./Highlights";
import Pricing from "./Pricing";
import Features from "./Features";
import Footer from "./Footer";
// import getLPTheme from "./getLPTheme";

function ToggleCustomTheme({ showCustomTheme, toggleCustomTheme }) {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: "100dvw",
        position: "fixed",
        bottom: 24,
      }}>
      <ToggleButtonGroup
        color="primary"
        exclusive
        value={showCustomTheme}
        onChange={toggleCustomTheme}
        aria-label="Platform"
        sx={{
          backgroundColor: "background.default",
          "& .Mui-selected": {
            pointerEvents: "none",
          },
        }}></ToggleButtonGroup>
    </Box>
  );
}

ToggleCustomTheme.propTypes = {
  showCustomTheme: PropTypes.shape({
    valueOf: PropTypes.func.isRequired,
  }).isRequired,
  toggleCustomTheme: PropTypes.func.isRequired,
};

export default function LandingPage() {
  const [mode, setMode] = React.useState("light");
  const [showCustomTheme, setShowCustomTheme] = React.useState(true);
  const LPtheme = createTheme({
    palette: {
      mode,
      primary: {
        main: "#0959AA", // Deep Tech Blue
        light: "#42a5f5",
        dark: "#003b75",
        contrastText: "#ffffff",
      },
      secondary: {
        main: "#00BFA5", // Teal Accent
        light: "#5df2d6",
        dark: "#008e76",
        contrastText: "#000000",
      },
      background: {
        default: mode === "light" ? "#F4F6F8" : "#0B1120", // Off-white / Deep Slate
        paper: mode === "light" ? "#FFFFFF" : "#161C24",
      },
    },
    typography: {
      fontFamily: '"Montserrat", "Inter", sans-serif',
      h1: { fontWeight: 700 },
      h2: { fontWeight: 600 },
      h3: { fontWeight: 600 },
      button: { fontWeight: 600, textTransform: "none" },
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            boxShadow: mode === "light"
              ? "0 4px 20px 0 rgba(0,0,0,0.05)"
              : "0 4px 20px 0 rgba(0,0,0,0.4)",
          },
        },
      },
    },
  });

  const defaultTheme = LPtheme; // Use the custom theme as default

  React.useEffect(() => {
    
  });

  const toggleColorMode = () => {
    setMode((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const toggleCustomTheme = () => {
    setShowCustomTheme((prev) => !prev);
  };

  return (
    // <ThemeProvider theme={showCustomTheme ? LPtheme : defaultTheme}>
    <div
      style={{
        height: "100%",
        width: "100%",
        overflowY: "auto",
        padding: 0,
        margin: 0,
        backgroundColor: "inherit",
      }}>
      <ThemeProvider theme={defaultTheme}>
        <CssBaseline />
        <AppAppBar mode={mode} toggleColorMode={toggleColorMode} />
        <Hero />

        <Box
          sx={{
            bgcolor: "background.default",
          }}>
          {/* <LogoCollection /> */}
          <Features />
          {/* <Divider /> */}
          {/* <Testimonials /> */}
          {/* <Divider /> */}
          <Highlights />
          {/* <Divider /> */}
          <Pricing />
          {/* <Divider /> */}
          {/* <FAQ /> */}
          <Divider />
          <Footer />
        </Box>
        <ToggleCustomTheme
          showCustomTheme={showCustomTheme}
          toggleCustomTheme={toggleCustomTheme}
        />
      </ThemeProvider>
    </div>
  );
}
