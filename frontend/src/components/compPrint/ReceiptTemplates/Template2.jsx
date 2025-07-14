import React from "react";
import { useSelector } from "react-redux";
import { format } from "date-fns";
import { capitalizeFirstLetter } from "../../../config/Functions";
import { QRCodeSVG as QRCode } from "qrcode.react";


const Template2 = React.forwardRef(({ data }, ref) => {
  const {
    customerName,
    products,
    amountPaid,
    total,
    balance,
    workerName,
    date,
    discount,
  } = data;
  const company = useSelector((state) => state.companyState.data);

  // Generate receipt data for QR code
  const qrData = JSON.stringify({
    company: company.companyName,
    date: date && !isNaN(new Date(date).getTime()) 
      ? format(new Date(date), "yyyy-MM-dd HH:mm")
      : "Invalid Date",
    total: total,
    receiptNo: date && !isNaN(new Date(date).getTime()) 
      ? format(new Date(date), "yyyyMMddHHmm")
      : "Invalid",
  });

  return (
    <div
      ref={ref}
      style={{
        fontFamily: "Arial, sans-serif",
        margin: 0,
        padding: "15px",
        maxWidth: "58mm", // Compact width
        margin: "0 auto",
        backgroundColor: "#ffffff",
        fontSize: "12px", // Smaller base font size
      }}>
      {/* Header Section - Compact */}
      <div
        style={{
          textAlign: "center",
          marginBottom: "15px",
          borderBottom: "1px solid #000",
          paddingBottom: "10px",
        }}>
        <h3
          style={{
            fontSize: "16px",
            fontWeight: "bold",
            margin: "0 0 5px 0",
          }}>
          {capitalizeFirstLetter(company.companyName)}
        </h3>
        {company.contact && (
          <p style={{ margin: "2px 0" }}>{company.contact}</p>
        )}
        {company.location && (
          <p style={{ margin: "2px 0" }}>{company.location}</p>
        )}
      </div>

      {/* QR Code */}
      <div style={{ textAlign: "center", marginBottom: "10px" }}>
        <QRCode value={qrData} size={100} level="L" />
      </div>

      {/* Transaction Details - Compact */}
      <div
        style={{
          fontSize: "11px",
          marginBottom: "10px",
          display: "flex",
          flexDirection: "column",
          gap: "2px",
        }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Receipt: {date && !isNaN(new Date(date).getTime()) 
            ? format(new Date(date), "yyyyMMddHHmm")
            : "Invalid"
          }</span>
          <span>{date && !isNaN(new Date(date).getTime()) 
            ? format(new Date(date), "dd/MM/yy HH:mm")
            : "Invalid Date"
          }</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Customer: {capitalizeFirstLetter(customerName)}</span>
          <span>Staff: {capitalizeFirstLetter(workerName)}</span>
        </div>
      </div>

      {/* Products List - Compact */}
      <div style={{ marginBottom: "10px", fontSize: "11px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "0.8fr 1.2fr 1fr",
            gap: "4px",
            borderBottom: "1px solid #000",
            paddingBottom: "4px",
            marginBottom: "4px",
            fontWeight: "bold",
          }}>
          <span>Qty</span>
          <span>Item</span>
          <span style={{ textAlign: "right" }}>Amount</span>
        </div>
        {products.map((product, index) => {
          // Display original quantity and sales unit if available
          const displayQuantity = product.originalQuantity || product.quantity;
          const displayUnit = product.salesUnit && product.salesUnit !== "none" ? product.salesUnit : "";
          const quantityWithUnit = displayUnit ? `${displayQuantity} ${displayUnit}` : displayQuantity;
          
          // Show unit in product name if it's not the base unit and exists
          const productNameWithUnit = displayUnit && displayUnit !== "none" 
            ? `${capitalizeFirstLetter(product.name)} (${displayUnit})`
            : capitalizeFirstLetter(product.name);
          
          return (
            <div
              key={index}
              style={{
                display: "grid",
                gridTemplateColumns: "0.8fr 1.2fr 1fr",
                gap: "4px",
                marginBottom: "2px",
              }}>
              <span>{quantityWithUnit}</span>
              <span>{productNameWithUnit}</span>
              <span style={{ textAlign: "right" }}>
                ₵
                {(product.price
                  ? product.price * displayQuantity
                  : product.salesPrice * displayQuantity
                ).toFixed(2)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Totals Section - Compact */}
      <div
        style={{
          borderTop: "1px solid #000",
          paddingTop: "5px",
          fontSize: "11px",
        }}>
        {discount > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Discount:</span>
            <span>₵{discount}</span>
          </div>
        )}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontWeight: "bold",
            fontSize: "13px",
            marginTop: "5px",
          }}>
          <span>Total:</span>
          <span>₵{total.toFixed(2)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Paid:</span>
          <span>₵{amountPaid.toFixed(2)}</span>
        </div>
        {balance !== 0 && (
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Balance:</span>
            <span>₵{balance.toFixed(2)}</span>
          </div>
        )}
      </div>

      {/* Footer - Compact */}
      <div
        style={{
          marginTop: "15px",
          textAlign: "center",
          fontSize: "10px",
          borderTop: "1px solid #000",
          paddingTop: "5px",
        }}>
        <p style={{ margin: "2px 0" }}>Thank you!</p>
        {company.receiptFooter && (
          <p style={{ margin: "2px 0", fontStyle: "italic" }}>
            {company.receiptFooter}
          </p>
        )}
      </div>
    </div>
  );
});

export default Template2;
