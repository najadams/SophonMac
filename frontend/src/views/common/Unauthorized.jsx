import React from "react";
import { Container, Typography } from "@mui/material";

const Unauthorized = () => {
  return (
    <Container>
      <Typography variant="h4" component="h1" gutterBottom>
        Unauthorized
      </Typography>
      <Typography variant="body1">
        You do not have permission to view this page.
      </Typography>
    </Container>
  );
};

export default Unauthorized;