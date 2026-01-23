import React from "react";
import Slider from "react-slick";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import { useTheme } from "@mui/material/styles";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

const images = [
  "/warehouse_inventory2.jpg",
  "/warehouse_inventory3.jpg",
  "/warehouse_inventory4.jpg",
  "/inventory.jpg",
];

export default function Showcase() {
  const theme = useTheme();

  const settings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 3,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 3000,
    responsive: [
      {
        breakpoint: 1024,
        settings: {
          slidesToShow: 2,
          slidesToScroll: 1,
          infinite: true,
          dots: true,
        },
      },
      {
        breakpoint: 600,
        settings: {
          slidesToShow: 1,
          slidesToScroll: 1,
        },
      },
    ],
  };

  return (
    <Box
      id="showcase"
      sx={{
        pt: { xs: 4, sm: 8 },
        pb: { xs: 8, sm: 12 },
        color: "text.primary",
        bgcolor: "background.default",
        width: "100%",
        maxWidth: "100vw",
        overflow: "hidden" // Aggressive clipping
      }}
    >
      <Container
        sx={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: { xs: 3, sm: 6 },
        }}
      >
        <Box
          sx={{
            width: { sm: "100%", md: "60%" },
            textAlign: { sm: "left", md: "center" },
          }}
        >
          <Typography component="h2" variant="h4" color="text.primary">
            See Sophon in Action
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Experience the power of efficient inventory management in real-world scenarios.
            From small shops to large warehouses, Sophon adapts to your needs.
          </Typography>
        </Box>

        <Box sx={{ width: "100%", maxWidth: "1200px", overflow: "hidden", minWidth: 0 }}>
           <Slider {...settings}>
            {images.map((img, index) => (
              <Box key={index} sx={{ p: 2, outline: "none" }}>
                <Box
                  component="img"
                  src={img}
                  alt={`Showcase ${index + 1}`}
                  sx={{
                    width: "100%",
                    height: "300px",
                    objectFit: "cover",
                    borderRadius: "16px",
                    boxShadow: theme.shadows[4],
                    transition: "transform 0.3s ease-in-out",
                    "&:hover": {
                      transform: "scale(1.02)",
                      boxShadow: theme.shadows[8],
                    },
                  }}
                />
              </Box>
            ))}
          </Slider>
        </Box>
      </Container>
    </Box>
  );
}
