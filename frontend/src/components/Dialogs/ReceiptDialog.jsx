import React from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  Typography,
  Grid,
  Divider,
} from "@mui/material";
import { capitalizeFirstLetter } from "../../config/Functions";
import { useSelector } from "react-redux";
import { useMediaQuery } from "@mui/material";
import { format } from 'date-fns'

const ReceiptDialog = ({
  open,
  onClose,
  receiptData
}) => {
  const company = useSelector((state) => state.companyState.data);
  const primaryColor = "#00796B"; // A pleasant greenish-blue color
    const secondaryColor = "#004D40";
    const {
      customerName,
      workerName,
      date,
      detail,
      discount,
      total,
      amountPaid,
      balance,
    } = receiptData;
  const matchesMobile = useMediaQuery("(max-width:600px)");


  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        style: {
          height: "80vh", // Takes 80% of viewport height
          width: matchesMobile ? "100vw" : "80vw", // Takes 80% of viewport width
          overflowY: "auto", // Make it scrollable
          backgroundColor: "#E0F2F1",
        },
      }}>
      <DialogTitle>
        <Typography variant="h6" align="center" color={primaryColor}>
          Receipt Information
        </Typography>
      </DialogTitle>
      <DialogContent>
        <div
          style={{
            backgroundColor: "#E0F2F1",
            borderRadius: "10px",
            // margin: "0",
            scrollbarWidth: 0,
            fontFamily: "'Roboto', sans-serif",
          }}>
          {/* Company Info */}
          <Typography
            variant="h4"
            style={{
              textAlign: "center",
              color: primaryColor,
              fontWeight: "bold",
              marginBottom: "10px",
            }}>
            {capitalizeFirstLetter(company?.companyName)}
          </Typography>

          {company?.tinNumber && (
            <Typography variant="body1" align="center" color="textSecondary">
              Tin Number: {company.tinNumber.toUpperCase()}
            </Typography>
          )}

          {company?.contact && (
            <Typography variant="body1" align="center" color="textSecondary">
              Contact: {company.contact}
            </Typography>
          )}

          {company?.momo && (
            <Typography variant="body1" align="center" color="textSecondary">
              Momo: {company.momo}
            </Typography>
          )}

          <Divider
            style={{ margin: "20px 0", backgroundColor: secondaryColor }}
          />

          {/* Customer Info */}
          <Grid container spacing={2}>
            <Grid item xs={6} sm={4} md={4}>
              <Typography variant="subtitle1" color={primaryColor}>
                Customer:
              </Typography>
              <Typography variant="body1">
                {capitalizeFirstLetter(customerName)}
              </Typography>
            </Grid>
            <Grid item xs={6} sm={4} md={4}>
              <Typography variant="subtitle1" color={primaryColor}>
                Cashier:
              </Typography>
              <Typography variant="body1">
                {capitalizeFirstLetter(workerName)}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={4} md={4}>
              <Typography variant="subtitle1" color={primaryColor}>
                Date:
              </Typography>
              <Typography variant="body1">
                {date && !isNaN(new Date(date).getTime()) 
                  ? format(new Date(date), "dd/MM/yyyy")
                  : "Invalid Date"
                }
              </Typography>
            </Grid>
          </Grid>

          <Divider
            style={{ margin: "20px 0", backgroundColor: secondaryColor }}
          />

          {/* Products Info */}
          <Typography
            variant="h5"
            style={{
              textAlign: "center",
              color: primaryColor,
              marginBottom: "10px",
            }}>
            Purchased Products
          </Typography>

          <table style={{ width: "100%", marginBottom: "20px" }}>
            <thead>
              <tr style={{ backgroundColor: secondaryColor, color: "white" }}>
                <th style={{ padding: "10px" }}>Qty</th>
                <th style={{ padding: "10px" }}>Product</th>
                <th style={{ padding: "10px" }}>Price</th>
                <th style={{ padding: "10px" }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {detail?.map((product, index) => (
                <tr key={index} style={{ textAlign: "center" }}>
                  <td style={{ padding: "8px" }}>{product.quantity}</td>
                  <td style={{ padding: "8px" }}>
                    {capitalizeFirstLetter(product.name)}
                  </td>
                  <td style={{ padding: "8px" }}>
                    ₵{product.price || product.salesPrice}
                  </td>
                  <td style={{ padding: "8px" }}>
                    ₵
                    {product.price
                      ? product.price * product.quantity
                      : product.salesPrice * product.quantity}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Summary Info */}
          <Divider
            style={{ margin: "20px 0", backgroundColor: secondaryColor }}
          />

          <Grid container spacing={2}>
            {company.taxRate && (
              <Grid item xs={6}>
                <Typography variant="subtitle1" color={primaryColor}>
                  Tax (%):
                </Typography>
                <Typography variant="body1">{company.taxRate}</Typography>
              </Grid>
            )}
            {discount !== undefined && discount !== null && discount !== 0 && (
              <Grid item xs={6}>
                <Typography variant="subtitle1" color={primaryColor}>
                  Discount:
                </Typography>
                <Typography variant="body1">₵{discount}</Typography>
              </Grid>
            )}
            <Grid item xs={6}>
              <Typography variant="subtitle1" color={primaryColor}>
                Total:
              </Typography>
              <Typography variant="body1">₵{total}</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="subtitle1" color={primaryColor}>
                Paid:
              </Typography>
              <Typography variant="body1">₵{amountPaid}</Typography>
            </Grid>
            {balance !== undefined && balance !== null && balance !== 0 && (
              <Grid item xs={6}>
                <Typography variant="subtitle1" color={primaryColor}>
                  Balance:
                </Typography>
                <Typography variant="body1">₵{balance}</Typography>
              </Grid>
            )}
          </Grid>

          <Divider
            style={{ margin: "20px 0", backgroundColor: secondaryColor }}
          />

          {/* Footer Message */}
          <Typography
            variant="body2"
            style={{
              textAlign: "center",
              color: secondaryColor,
              marginTop: "10px",
            }}>
            Goods Sold Are Not Returnable
          </Typography>
          <Typography
            variant="h6"
            style={{
              textAlign: "center",
              color: primaryColor,
              fontWeight: "bold",
              marginTop: "10px",
            }}>
            Thank you for shopping with us!
          </Typography>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReceiptDialog;