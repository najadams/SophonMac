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
import {useMediaQuery} from "@mui/material";

const images = [
  "/shot1.png",
  "/shot2.png",
  "/shot3.png",
  "/shot4.png",
  // Add more image paths as needed
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

  const isMobile = useMediaQuery((theme) => theme.breakpoints.down("sm"));
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
      })}>
      <Container
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          pt: { xs: 14, sm: 10 },
          pb: { xs: 8, sm: 12 },
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
            width: "90%", // Adjust as needed
            maxWidth: "1000px",
            borderRadius: "10px",
            overflow: "hidden",
            boxShadow: 20,
            mt: { xs: 4, sm: 6 },
          }}>
          {isMobile ? (
            <Box
              id="image"
              sx={(theme) => ({
                // mt: { xs: 8, sm: 10 },
                alignSelf: "center",
                height: { xs: 200, sm: 700 },
                width: "100%",
                backgroundImage: "url('/shot1.png')",
                backgroundSize: "cover",
                borderRadius: "10px",
                outline: "1px solid",
                outlineColor:
                  theme.palette.mode === "light"
                    ? alpha("#BFCCD9", 0.5)
                    : alpha("#9CCCFC", 0.1),
                boxShadow:
                  theme.palette.mode === "light"
                    ? `0 0 12px 8px ${alpha("#9CCCFC", 0.2)}`
                    : `0 0 24px 12px ${alpha("#033363", 0.2)}`,
              })}
            />
          ) : (
            <Box
              sx={{
                width: { sx: 100, sm: 500, md: "100%" },
                m: "auto",
                background: "greden",
              }}>
              <Slider {...settings} style={{ background: "bluffe" }}>
                {images.map((image, index) => (
                  <Box
                    key={index}
                    sx={{
                      height: { xs: 150, sm: 400, md: 600 },
                      width: "100%",
                      backgroundImage: `url(${image})`,
                      backgroundSize: "contain",
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "center",
                    }}
                  />
                ))}
              </Slider>
            </Box>
          )}
        </Box>
        </motion.div>
      </Container>
    </Box>
  );
}
