import { Snackbar, Alert } from "@mui/material";
import { motion, AnimatePresence } from "framer-motion";

const ErrorAlert = ({ error, onClose }) => {
  return (
    <AnimatePresence>
      {Boolean(error) && (
        <Snackbar
          open={Boolean(error)}
          autoHideDuration={3000}
          onClose={onClose}
          anchorOrigin={{ vertical: "top", horizontal: "center" }}
          sx={{ zIndex: 9999 }}>
          <motion.div
            initial={{ y: -100, scale: 0.3, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: -100, scale: 0.3, opacity: 0 }}
            transition={{
              type: "spring",
              damping: 15, // Lower damping for more bounce
              stiffness: 300, // Higher stiffness for faster initial movement
              mass: 0.8, // Slightly lower mass for lighter feel
              bounce: 0.5, // Add some bounce
              duration: 0.6, // Overall duration
              // Custom bounce animation
              y: {
                type: "spring",
                damping: 12,
                stiffness: 200,
                mass: 0.8,
              },
              // Smooth scale animation
              scale: {
                type: "spring",
                damping: 20,
                stiffness: 300,
                mass: 0.8,
              },
              // Fade in/out
              opacity: {
                type: "tween",
                duration: 0.2,
                ease: "easeInOut",
              },
            }}>
            <motion.div
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", damping: 10 }}>
              <Alert
                onClose={onClose}
                severity="error"
                variant="filled"
                sx={{
                  minWidth: "200px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                  "& .MuiAlert-message": {
                    fontSize: "0.95rem",
                  },
                }}>
                {error}
              </Alert>
            </motion.div>
          </motion.div>
        </Snackbar>
      )}
    </AnimatePresence>
  );
};

export default ErrorAlert;
