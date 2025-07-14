import React, { useState, useEffect } from "react";
import { TextField, InputAdornment, IconButton, Tooltip } from "@mui/material";
import { Search, Clear } from "@mui/icons-material";
import { motion } from "framer-motion";

const SearchField = ({ onSearch, placeholder, customstyles }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedTerm, setDebouncedTerm] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedTerm(searchTerm);
    }, 500); // Reduced debounce time for better responsiveness

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm]);

  useEffect(() => {
    onSearch(debouncedTerm.trim());
  }, [debouncedTerm, onSearch]);

  const handleClear = () => {
    setSearchTerm("");
    onSearch("");
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      style={{ width: "100%", maxWidth: 300, ...customstyles }}>
      <TextField
        fullWidth
        variant="outlined"
        placeholder={placeholder || "Search..."}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        size="small"
        sx={{
          backgroundColor: "background.paper",
          borderRadius: 2,
          "& .MuiOutlinedInput-root": {
            borderRadius: 2,
            transition: "all 0.2s ease-in-out",
            "&:hover": {
              backgroundColor: "action.hover",
            },
            "&.Mui-focused": {
              backgroundColor: "background.paper",
              boxShadow: "0 0 0 2px rgba(25, 118, 210, 0.1)",
            },
          },
          "& .MuiOutlinedInput-input": {
            padding: "8px 14px",
          },
        }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Search color={isFocused ? "primary" : "action"} />
            </InputAdornment>
          ),
          endAdornment: searchTerm && (
            <InputAdornment position="end">
              <Tooltip title="Clear search">
                <IconButton
                  size="small"
                  onClick={handleClear}
                  sx={{
                    color: "action.active",
                    "&:hover": {
                      color: "primary.main",
                    },
                  }}>
                  <Clear fontSize="small" />
                </IconButton>
              </Tooltip>
            </InputAdornment>
          ),
        }}
      />
    </motion.div>
  );
};

export default SearchField;
