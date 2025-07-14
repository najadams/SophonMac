import * as React from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import CardActions from "@mui/material/CardActions";
import CardContent from "@mui/material/CardContent";
import Container from "@mui/material/Container";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";

const tiers = [
  {
    title: "Free",
    price: "0",
    description: [
      "10 users included",
      "2 GB of storage",
      "Help center access",
      "Email support",
    ],
    buttonText: "Sign up for free",
    buttonVariant: "outlined",
  },
  {
    title: "Professional",
    subheader: "Recommended",
    price: "15",
    description: [
      "20 users included",
      "10 GB of storage",
      "Help center access",
      "Priority email support",
      "Dedicated team",
      "Best deals",
    ],
    buttonText: "Start now",
    buttonVariant: "contained",
  },
  {
    title: "Enterprise",
    price: "30",
    description: [
      "50 users included",
      "30 GB of storage",
      "Help center access",
      "Phone & email support",
    ],
    buttonText: "Contact us",
    buttonVariant: "outlined",
  },
];

export default function Pricing() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <Container
      id="pricing"
      sx={{
        pt: { xs: 4, sm: 12 },
        pb: { xs: 8, sm: 16 },
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: { xs: 3, sm: 6 },
      }}>
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 50 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
        transition={{ duration: 0.8, ease: "easeOut" }}>
        <Box
          sx={{
            width: { sm: "100%", md: "60%" },
            textAlign: { sm: "left", md: "center" },
          }}>
          <Typography component="h2" variant="h3" color="text.primary">
            Pricing
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Quickly build an effective pricing table for your potential
            customers with this layout. <br />
            It&apos;s built with default Material UI components with little
            customization.
          </Typography>
        </Box>
      </motion.div>

      <Grid container spacing={3} alignItems="center" justifyContent="center">
        {tiers.map((tier, index) => (
          <Grid
            item
            key={tier.title}
            xs={12}
            sm={tier.title === "Enterprise" ? 12 : 6}
            md={4}>
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ scale: 1.02, y: -5 }}
              whileTap={{ scale: 0.98 }}>
              <Card
                sx={{
                  p: 2,
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                  border:
                    tier.title === "Professional" ? "1px solid" : undefined,
                  borderColor:
                    tier.title === "Professional" ? "primary.main" : undefined,
                  background:
                    tier.title === "Professional"
                      ? "linear-gradient(#033363, #021F3B)"
                      : "#E0F2F1",
                  transition: "all 0.3s ease-in-out",
                }}>
                <CardContent>
                  <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={
                      isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: -20 }
                    }
                    transition={{ duration: 0.5, delay: index * 0.1 + 0.2 }}>
                    <Box
                      sx={{
                        mb: 1,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        color: tier.title === "Professional" ? "grey.100" : "",
                      }}>
                      <Typography component="h3" variant="h6">
                        {tier.title}
                      </Typography>
                      {tier.title === "Professional" && (
                        <Chip
                          icon={<AutoAwesomeIcon />}
                          label={tier.subheader}
                          size="small"
                          sx={{
                            background: (theme) =>
                              theme.palette.mode === "light" ? "" : "none",
                            backgroundColor: "primary.contrastText",
                            "& .MuiChip-label": {
                              color: "primary.dark",
                            },
                            "& .MuiChip-icon": {
                              color: "primary.dark",
                            },
                          }}
                        />
                      )}
                    </Box>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={
                      isInView
                        ? { opacity: 1, scale: 1 }
                        : { opacity: 0, scale: 0.9 }
                    }
                    transition={{ duration: 0.5, delay: index * 0.1 + 0.3 }}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "baseline",
                        color:
                          tier.title === "Professional" ? "grey.50" : undefined,
                      }}>
                      <Typography component="h3" variant="h2">
                        ${tier.price}
                      </Typography>
                      <Typography component="h3" variant="h6">
                        &nbsp; per month
                      </Typography>
                    </Box>
                  </motion.div>

                  <Divider
                    sx={{
                      my: 2,
                      opacity: 0.2,
                      borderColor: "grey.500",
                    }}
                  />

                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={isInView ? { opacity: 1 } : { opacity: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 + 0.4 }}>
                    {tier.description.map((line, lineIndex) => (
                      <motion.div
                        key={line}
                        initial={{ opacity: 0, x: -20 }}
                        animate={
                          isInView
                            ? { opacity: 1, x: 0 }
                            : { opacity: 0, x: -20 }
                        }
                        transition={{
                          duration: 0.3,
                          delay: index * 0.1 + 0.5 + lineIndex * 0.1,
                        }}>
                        <Box
                          sx={{
                            py: 1,
                            display: "flex",
                            gap: 1.5,
                            alignItems: "center",
                          }}>
                          <CheckCircleRoundedIcon
                            sx={{
                              width: 20,
                              color:
                                tier.title === "Professional"
                                  ? "primary.light"
                                  : "primary.main",
                            }}
                          />
                          <Typography
                            component="text"
                            variant="subtitle2"
                            sx={{
                              color:
                                tier.title === "Professional"
                                  ? "grey.200"
                                  : undefined,
                            }}>
                            {line}
                          </Typography>
                        </Box>
                      </motion.div>
                    ))}
                  </motion.div>
                </CardContent>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={
                    isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }
                  }
                  transition={{ duration: 0.5, delay: index * 0.1 + 0.6 }}>
                  <CardActions>
                    <Button
                      fullWidth
                      variant={tier.buttonVariant}
                      component="a"
                      href="/login"
                      target="_blank">
                      {tier.buttonText}
                    </Button>
                  </CardActions>
                </motion.div>
              </Card>
            </motion.div>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
}
