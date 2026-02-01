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
    title: "Starter",
    price: "200",
    description: [
      "Single Device",
      "Two accounts only",
      "100 Product Limit",
      "Daily Sales Summary",
      "Local Storage Only",
    ],
    buttonText: "Sign up for free",
    buttonVariant: "outlined",
  },
  {
    title: "Trader",
    price: "15",
    description: [
      "Real-time Cloud Sync",
      "Tax Invoices (GRA Compliant)",
      "Waybills & Delivery Notes",
      "5 Staff Accounts",
      "Advanced Reporting",
    ],
    buttonText: "Start free trial",
    buttonVariant: "outlined",
  },
  {
    title: "Business",
    subheader: "Most Popular",
    price: "45",
    description: [
      "Up to 5 Branches",
      "Unlimited Staff",
      "Purchase Orders & GRN",
      "Pro-forma & Commercial Invoices",
      "Accounting Exports",
    ],
    buttonText: "Start free trial",
    buttonVariant: "contained",
  },
  {
    title: "Enterprise",
    price: "Call",
    description: [
      "Unlimited Branches",
      "Full API Access",
      "Custom Workflows",
      "Dedicated Account Manager",
      "White-label Options",
    ],
    buttonText: "Contact Sales",
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
        scrollMarginTop: "100px",
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
            textAlign: "center",
          }}>
          <Typography component="h2" variant="h3" color="text.primary">
            Pricing
          </Typography>
        </Box>
      </motion.div>

      <Grid container spacing={3} alignItems="center" justifyContent="center">
        {tiers.map((tier, index) => (
          <Grid
            item
            key={tier.title}
            xs={12}
            sm={6}
            md={3}>
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
                  border: "1px solid",
                  borderColor:
                    tier.title === "Business"
                      ? "primary.main"
                      : (theme) => theme.palette.mode === 'light' ? 'grey.200' : 'grey.800',
                  background:
                    tier.title === "Business"
                      ? "linear-gradient(135deg, #0959AA 0%, #003b75 100%)" // Deep Blue Gradient
                      : (theme) => theme.palette.mode === 'light' ? '#FFFFFF' : '#1E293B',
                  boxShadow: tier.title === "Business" ? 6 : 1,
                  transition: "all 0.3s ease-in-out",
                  '&:hover': {
                      boxShadow: 8,
                      transform: "translateY(-4px)"
                  }
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
                        color: tier.title === "Business" ? "grey.100" : "",
                      }}>
                      <Typography component="h3" variant="h6">
                        {tier.title}
                      </Typography>
                      {tier.title === "Business" && (
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
                                tier.title === "Business" ? "grey.50" : undefined,
                      }}>
                      <Typography component="h3" variant="h2">
                        ${tier.price}
                      </Typography>
                      <Typography component="h3" variant="h6">
                        &nbsp; {tier.title === "Starter" ? "one time" : "per month"}
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
                                      tier.title === "Business"
                                  ? "primary.light"
                                  : "primary.main",
                            }}
                          />
                          <Typography
                            component="text"
                            variant="subtitle2"
                            sx={{
                              color:
                                      tier.title === "Business"
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
                      href={tier.title === "Enterprise" ? "mailto:najmadams1706@gmail.com" : `/register?plan=${tier.title.toUpperCase()}`}
                    >
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