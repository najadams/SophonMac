import React, { useState } from "react";
import Fab from "@mui/material/Fab";
import AddIcon from "@mui/icons-material/Add";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import useMediaQuery from "@mui/material/useMediaQuery";

const AddItem = ({ children, title }) => {
  const [open, setOpen] = useState(false);
  const matchesMobile = useMediaQuery("(max-width:600px)");

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <div>
      <Fab
        color="primary"
        aria-label="add"
        sx={{ bgcolor: "green" }}
        onClick={handleClickOpen}>
        <AddIcon />
      </Fab>
      <Dialog
        open={open}
        onClose={handleClose}
        PaperProps={{
          style: {
            width: matchesMobile ? "100%" : "80%", // Set width based on screen size
            height: matchesMobile ? "100%" : "80%", // Set height based on screen size
            margin: "auto",
            maxWidth: "none",
            maxHeight: "none",
          },
        }}>
        <DialogTitle>{title || `Add New Item`}</DialogTitle>
        <DialogContent>
          {React.cloneElement(children, { handleClose })}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default AddItem;