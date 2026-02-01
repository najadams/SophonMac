import React from "react";
import { Box, Typography } from "@mui/material";

const Footer = () => {
  return (
    <Box
      sx={{
        p: 2,
        backgroundColor: "primary.body",
        color: "white",
        // mt: "auto",
      }}>
      <Typography variant="body1" align="center">
        &copy; 2026 All Rights Reserved.
      </Typography>
    </Box>
  );
};

export default Footer;
