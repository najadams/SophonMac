import * as React from "react";
import { motion } from "framer-motion";
import { alpha } from "@mui/material";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";


const images = [
  "/shot1.png",
  "/shot2.png",
  "/shot3.png",
  "/shot4.png",
  "/shot5.png",
  "/shot6.png",
  "/shot7.png",
  "/shot8.png",
  "/shot9.png",
  "/shot10.png",
];

export default function Hero() {
  const settings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 3000,
    arrows: true,
  };


  return (
    <Box
      id="hero"
      sx={(theme) => ({
        width: "100%",
        backgroundImage:
          theme.palette.mode === "light"
            ? "linear-gradient(135deg, #E3F2FD 0%, #FFFFFF 100%)"
            : `linear-gradient(#02294F, ${alpha("#090E10", 0.0)})`,
        backgroundSize: "100%",
        overflow: "hidden",
        maxWidth: "100vw",
      })}>
      <Container
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          pt: { xs: 8, sm: 12 },
          pb: { xs: 8, sm: 0 },
        }}>
        <Stack spacing={2} useFlexGap sx={{ width: { xs: "100%", sm: "70%" } }}>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <Typography
              variant="h1"
              sx={{
                display: "flex",
                flexDirection: { xs: "column", md: "row" },
                alignSelf: "center",
                textAlign: "center",
                justifyContent: "center",
                fontSize: "clamp(2rem, 6vw, 4rem)",
                color: "primary.main",
              }}>
              The Smartest POS for Your Growing Business.
            </Typography>
          </motion.div>
          <motion.div
             initial={{ opacity: 0, y: 30 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          >
            <Typography
              textAlign="center"
              color="text.secondary"
              sx={{ alignSelf: "center", width: { sm: "100%", md: "80%" }, mx: "auto" }}>
              Manage sales, track inventory, and grow your business with Sophon. 
              The all-in-one platform designed for modern wholesalers and retailers.
            </Typography>
          </motion.div>
        </Stack>
        <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.4, ease: "easeOut" }}
            style={{ width: "100%", display: "flex", justifyContent: "center" }}
        >
        <Box
          id="image"
          sx={{
            alignSelf: "center",
            height: { xs: 200, sm: 400, md: 600 },
            width: "100%", 
            maxWidth: "1000px",
            minWidth: 0, // Allow shrinking
            mx: "auto",
            borderRadius: "10px",
            overflow: "hidden", // Restored to prevent layout blowout
            boxShadow: 20,
            mt: { xs: 4, sm: 6 },
            "& .slick-slider": {
              width: "100%",
              height: "100%",
            },
            "& .slick-list": {
              height: "100%",
              borderRadius: "10px",
            },
            "& .slick-track": {
              height: "100%",
              display: "flex",
            },
            "& .slick-slide": {
              height: "100%",
              "& > div": {
                  height: "100%",
              }
            },
            "& .slick-prev, & .slick-next": {
              zIndex: 1,
            },
            "& .slick-prev": {
              left: 10, // Adjusted to be visible
            },
            "& .slick-next": {
              right: 10, // Adjusted to be visible
            }
          }}>
            <Box
              sx={{
                width: "100%",
                height: "100%",
              }}>
              <Slider {...settings}>
                {images.map((image, index) => (
                  <Box
                    key={index}
                    sx={{
                      height: "100%",
                      width: "100%",
                      backgroundImage: `url(${image})`,
                      backgroundSize: "cover",
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "top center",
                    }}
                  />
                ))}
              </Slider>
            </Box>
        </Box>
        </motion.div>
      </Container>
    </Box>
  );
}
