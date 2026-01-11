import * as React from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Container from "@mui/material/Container";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import AutoFixHighRoundedIcon from "@mui/icons-material/AutoFixHighRounded";
import ConstructionRoundedIcon from "@mui/icons-material/ConstructionRounded";
import QueryStatsRoundedIcon from "@mui/icons-material/QueryStatsRounded";
import SettingsSuggestRoundedIcon from "@mui/icons-material/SettingsSuggestRounded";
import SupportAgentRoundedIcon from "@mui/icons-material/SupportAgentRounded";
import ThumbUpAltRoundedIcon from "@mui/icons-material/ThumbUpAltRounded";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";

const items = [
  {
    icon: <SettingsSuggestRoundedIcon />,
    title: "Split Payments",
    description:
      "Accept mixed payment methods (e.g., Cash + Mobile Money) in a single transaction seamlessly.",
  },
  {
    icon: <ConstructionRoundedIcon />,
    title: "Vendor Management",
    description:
      "Keep track of your suppliers, manage purchase orders, and streamline your supply chain.",
  },
  {
    icon: <ThumbUpAltRoundedIcon />,
    title: "Debt Tracking",
    description:
      "Easily manage customer debts and credit sales with dedicated reporting and tracking tools.",
  },
  {
    icon: <AutoFixHighRoundedIcon />,
    title: "Secure User Roles",
    description:
      "Control access with dedicated roles for Admins, Managers, and Staff to protect your data.",
  },
  {
    icon: <SupportAgentRoundedIcon />,
    title: "Detailed Analytics",
    description:
      "Visualize your performance with daily, weekly, and monthly sales charts and category breakdowns.",
  },
  {
    icon: <QueryStatsRoundedIcon />,
    title: "Fast Checkout",
    description:
      "Optimized point-of-sale interface designed for speed and accuracy in high-volume environments.",
  },
];

export default function Highlights() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <Box
      id="highlights"
      sx={{
        pt: { xs: 4, sm: 12 },
        scrollMarginTop: "100px",
        marginLeft: "0",
        marginRight: "0",
        color: "black",
        backgroundSize: "100%",
      }}>
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 50 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
        transition={{ duration: 0.8, ease: "easeOut" }}>
        <Card
          style={{
            paddingTop: "5%",
            paddingBottom: "10%",
            backgroundColor: "transparent", 
            boxShadow: "none",
            borderRadius: "10px",
            margin: "0 auto",
            fontSize: 32,
            fontFamily: "Montserrat, Lato, sans-serif",
          }}>
          <Container
            sx={{
              position: "relative",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: { xs: 3, sm: 6 },
            }}>
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
              transition={{ duration: 0.5, delay: 0.2 }}>
              <Box
                sx={{
                  width: { sm: "100%", md: "60%" },
                  textAlign: "center",
                  mx: "auto"
                }}>
                <Typography
                  component="h2"
                  variant="h4"
                  color="text.primary"
                  sx={{
                    pb: { xs: 2, sm: 3, md: 5 },
                  }}>
                  Highlights
                </Typography>
                <Typography
                  variant="body1"
                  sx={{ color: "text.secondary", fontFamily: "Poppins" }}>
                  Explore why our product stands out: adaptability, durability,
                  user-friendly design, and innovation. Enjoy reliable customer
                  support and precision in every detail.
                </Typography>
              </Box>
            </motion.div>

            <Grid container spacing={2.5}>
              {items.map((item, index) => (
                <Grid item xs={12} sm={6} md={4} key={index}>
                  <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={
                      isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }
                    }
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    whileHover={{ scale: 1.02, y: -5 }}
                    whileTap={{ scale: 0.98 }}>
                    <Stack
                      direction="column"
                      color="inherit"
                      component={Card}
                      spacing={1}
                      useFlexGap
                      sx={{
                        p: 3,
                        height: "100%",
                        border: "1px solid",
                        borderColor: (theme) => theme.palette.mode === 'light' ? 'primary.light' : 'primary.dark',
                        borderRadius: 2,
                        color: "text.primary",
                        background: (theme) => theme.palette.mode === 'light' 
                          ? 'linear-gradient(135deg, #FFFFFF 0%, #F5F5FA 100%)'
                          : 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
                        transition: "all 0.3s ease-in-out",
                        boxShadow: 3,
                        '&:hover': {
                           boxShadow: 6,
                           borderColor: "primary.main"
                        }
                      }}>
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={
                          isInView
                            ? { scale: 1, opacity: 1 }
                            : { scale: 0.8, opacity: 0 }
                        }
                        transition={{
                          duration: 0.3,
                          delay: index * 0.1 + 0.2,
                        }}>
                        <Box sx={{ opacity: "100%" }}>{item.icon}</Box>
                      </motion.div>
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={
                          isInView
                            ? { opacity: 1, x: 0 }
                            : { opacity: 0, x: -20 }
                        }
                        transition={{
                          duration: 0.5,
                          delay: index * 0.1 + 0.3,
                        }}>
                        <Typography fontWeight="medium" gutterBottom>
                          {item.title}
                        </Typography>
                        <Typography variant="body2" sx={{ color: "black.400" }}>
                          {item.description}
                        </Typography>
                      </motion.div>
                    </Stack>
                  </motion.div>
                </Grid>
              ))}
            </Grid>
          </Container>
        </Card>
      </motion.div>
    </Box>
  );
}
