import React from "react";
import { useNavigate } from "react-router-dom";
import { 
  Container, 
  Typography, 
  Button, 
  Box, 
  Paper 
} from "@mui/material";
import { 
  Home as HomeIcon, 
  ArrowBack as ArrowBackIcon 
} from "@mui/icons-material";

const NoPage = () => {
  const navigate = useNavigate();

  const handleGoHome = () => {
    navigate("/dashboard");
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <Container 
      maxWidth="md" 
      sx={{ 
        minHeight: "100vh", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center" 
      }}
    >
      <Paper 
        elevation={3} 
        sx={{ 
          p: 6, 
          textAlign: "center", 
          borderRadius: 4,
          background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)"
        }}
      >
        <Typography 
          variant="h1" 
          sx={{ 
            fontSize: { xs: "4rem", md: "6rem" }, 
            fontWeight: "bold", 
            color: "primary.main",
            mb: 2 
          }}
        >
          404
        </Typography>
        
        <Typography 
          variant="h4" 
          sx={{ 
            mb: 2, 
            color: "text.primary",
            fontWeight: 500 
          }}
        >
          Page Not Found
        </Typography>
        
        <Typography 
          variant="body1" 
          sx={{ 
            mb: 4, 
            color: "text.secondary",
            maxWidth: 400,
            mx: "auto"
          }}
        >
          The page you're looking for doesn't exist or has been moved. 
          Let's get you back on track.
        </Typography>
        
        <Box sx={{ display: "flex", gap: 2, justifyContent: "center", flexWrap: "wrap" }}>
          <Button
            variant="contained"
            startIcon={<HomeIcon />}
            onClick={handleGoHome}
            sx={{ 
              px: 3, 
              py: 1.5,
              borderRadius: 2,
              textTransform: "none",
              fontSize: "1rem"
            }}
          >
            Go to Dashboard
          </Button>
          
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={handleGoBack}
            sx={{ 
              px: 3, 
              py: 1.5,
              borderRadius: 2,
              textTransform: "none",
              fontSize: "1rem"
            }}
          >
            Go Back
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default NoPage;
