import React, { useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import { DialogContext } from "../context/context";

const EditButton = ({ children, title   }) => {
  const [open, setOpen] = useState(false);

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <div>
      <Button variant="text" fullWidth onClick={handleClickOpen}>
        Edit
      </Button>
      <DialogContext.Provider value={handleClose}>
        <Dialog
          open={open}
          onClose={handleClose}
          PaperProps={{
            style: {
              width: "80%",
              height: "80%",
              margin: "auto",
              maxWidth: "none",
              maxHeight: "none",
            },
          }}>
          <DialogTitle>{title ? title : `Add New Item`}</DialogTitle>
          <DialogContent>{children}</DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>Cancel</Button>
          </DialogActions>
        </Dialog>
      </DialogContext.Provider>
    </div>
  );
};

export default EditButton;
