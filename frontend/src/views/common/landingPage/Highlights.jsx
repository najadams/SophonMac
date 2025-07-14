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
    title: "Adaptable performance",
    description:
      "Our product effortlessly adjusts to your needs, boosting efficiency and simplifying your tasks.",
  },
  {
    icon: <ConstructionRoundedIcon />,
    title: "Built to last",
    description:
      "Experience unmatched durability that goes above and beyond with lasting investment.",
  },
  {
    icon: <ThumbUpAltRoundedIcon />,
    title: "Great user experience",
    description:
      "Integrate our product into your routine with an intuitive and easy-to-use interface.",
  },
  {
    icon: <AutoFixHighRoundedIcon />,
    title: "Innovative functionality",
    description:
      "Stay ahead with features that set new standards, addressing your evolving needs better than the rest.",
  },
  {
    icon: <SupportAgentRoundedIcon />,
    title: "Reliable support",
    description:
      "Count on our responsive customer support, offering assistance that goes beyond the purchase.",
  },
  {
    icon: <QueryStatsRoundedIcon />,
    title: "Precision in every detail",
    description:
      "Enjoy a meticulously crafted product where small touches make a significant impact on your overall experience.",
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
            backgroundColor: "#E0F2F1",
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
                  textAlign: { sm: "left", md: "center" },
                }}>
                <Typography
                  component="h2"
                  variant="h4"
                  sx={{
                    pb: { xs: 2, sm: 3, md: 5 },
                  }}>
                  Highlights
                </Typography>
                <Typography
                  variant="body1"
                  sx={{ color: "black.400", fontFamily: "Poppins" }}>
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
                        borderColor: "grey.800",
                        color: "white",
                        background: "linear-gradient(#033363, #021F3B)",
                        backgroundColor: "white.900",
                        transition: "all 0.3s ease-in-out",
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
