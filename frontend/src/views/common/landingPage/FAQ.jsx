import * as React from "react";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { motion, useInView } from "framer-motion";

const faqList = [
  {
    id: "panel1",
    question: "How do I contact customer support if I have a question or issue?",
    answer: (
      <>
        You can reach our customer support team by emailing
        <Link href="mailto:support@example.com"> support@example.com </Link>
        or calling our toll-free number. We&apos;re here to assist you
        promptly.
      </>
    ),
  },
  {
    id: "panel2",
    question: "Can I return the product if it doesn't meet my expectations?",
    answer:
      "Absolutely! We offer a hassle-free return policy. If you're not completely satisfied, you can return the product within 30 days for a full refund or exchange.",
  },
  {
    id: "panel3",
    question: "What makes your product stand out from others in the market?",
    answer:
      "Our product distinguishes itself through its adaptability, durability, and innovative features. We prioritize user satisfaction and continually strive to exceed expectations in every aspect.",
  },
  {
    id: "panel4",
    question: "Is there a warranty on the product, and what does it cover?",
    answer:
      "Yes, our product comes with a 1 year warranty. It covers defects in materials and workmanship. If you encounter any issues covered by the warranty, please contact our customer support for assistance.",
  },
];

export default function FAQ() {
  const [expanded, setExpanded] = React.useState(false);
  const ref = React.useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const handleChange = (panel) => (event, isExpanded) => {
    setExpanded(isExpanded ? panel : false);
  };

  return (
    <Container
      id="faq"
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
        transition={{ duration: 0.8, ease: "easeOut" }}
        style={{ width: "100%", textAlign: "center" }}>
        <Typography
          component="h2"
          variant="h4"
          color="text.primary"
          sx={{
            width: { sm: "100%", md: "60%" },
            textAlign: { sm: "left", md: "center" },
            mx: "auto",
          }}>
          Frequently asked questions
        </Typography>
      </motion.div>
      <Box sx={{ width: "100%" }}>
        {faqList.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.5, delay: index * 0.1 + 0.2 }}>
            <Accordion
              expanded={expanded === item.id}
              onChange={handleChange(item.id)}>
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                aria-controls={`${item.id}d-content`}
                id={`${item.id}d-header`}>
                <Typography component="h3" variant="subtitle2">
                  {item.question}
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography
                  variant="body2"
                  gutterBottom
                  sx={{ maxWidth: { sm: "100%", md: "70%" } }}>
                  {item.answer}
                </Typography>
              </AccordionDetails>
            </Accordion>
          </motion.div>
        ))}
      </Box>
    </Container>
  );
}
