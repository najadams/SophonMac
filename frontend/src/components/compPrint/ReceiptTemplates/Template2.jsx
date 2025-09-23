import React from "react";
import { useSelector } from "react-redux";
import { format } from "date-fns";
import { capitalizeFirstLetter } from "../../../config/Functions";


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

  // Ensure numeric values are properly converted
  const safeAmountPaid = Number(amountPaid) || 0;
  const safeTotal = Number(total) || 0;
  const safeBalance = Number(balance) || 0;
  const safeDiscount = Number(discount) || 0;

  return (
    <div
      ref={ref}
      style={{
        fontFamily: "Arial, sans-serif",
        margin: 0,
        padding: "2px",
        maxWidth: "80mm", // Increased width for more space
        margin: "0 auto",
        backgroundColor: "#ffffff",
        fontSize: "12px", // Smaller base font size
      }}>
      {/* Header Section - Compact */}
      <div
        style={{
          textAlign: "center",
          marginBottom: "3px",
          borderBottom: "1px solid #000",
          paddingBottom: "4px",
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

      {/* Transaction Details - Compact with borders */}
      <div
        style={{
          fontSize: "11px",
          marginBottom: "6px",
          border: "1px solid #000",
        }}>
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between",
          padding: "2px 4px",
          borderBottom: "1px solid #000"
        }}>
          <span>Receipt: {date && !isNaN(new Date(date).getTime()) 
            ? format(new Date(date), "yyyyMMddHHmm")
            : "Invalid"
          }</span>
          <span>{date && !isNaN(new Date(date).getTime()) 
            ? format(new Date(date), "dd/MM/yy HH:mm")
            : "Invalid Date"
          }</span>
        </div>
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between",
          padding: "2px 4px"
        }}>
          <span>Customer: {capitalizeFirstLetter(customerName)}</span>
          <span>Staff: {capitalizeFirstLetter(workerName)}</span>
        </div>
      </div>

      {/* Products List - Compact with borders */}
      <div style={{ marginBottom: "6px", fontSize: "11px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "0.5fr 2fr 0.7fr 0.8fr",
            border: "1px solid #000",
            fontWeight: "bold",
          }}>
          <span style={{ 
            padding: "2px 4px", 
            borderRight: "1px solid #000",
            textAlign: "center"
          }}>Qty</span>
          <span style={{ 
            padding: "2px 4px", 
            borderRight: "1px solid #000",
            textAlign: "center"
          }}>Item</span>
          <span style={{ 
            padding: "2px 4px", 
            borderRight: "1px solid #000",
            textAlign: "center"
          }}>Price</span>
          <span style={{ 
            padding: "2px 4px", 
            textAlign: "center"
          }}>Amount</span>
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
          
          // Get unit price
          const unitPrice = product.price || product.salesPrice;
          
          return (
            <div
              key={index}
              style={{
                display: "grid",
                gridTemplateColumns: "0.5fr 2fr 0.7fr 0.8fr",
                borderLeft: "1px solid #000",
                borderRight: "1px solid #000",
                borderBottom: "1px solid #000",
              }}>
              <span style={{ 
                padding: "2px 4px", 
                borderRight: "1px solid #000",
                textAlign: "center"
              }}>{quantityWithUnit}</span>
              <span style={{ 
                padding: "2px 4px", 
                borderRight: "1px solid #000"
              }}>{productNameWithUnit}</span>
              <span style={{ 
                padding: "2px 4px", 
                borderRight: "1px solid #000",
                textAlign: "right"
              }}>
                ₵{unitPrice.toFixed(2)}
              </span>
              <span style={{ 
                padding: "2px 4px", 
                textAlign: "right"
              }}>
                ₵
                {(unitPrice * displayQuantity).toFixed(2)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Totals Section - Compact with borders */}
      <div
        style={{
          border: "1px solid #000",
          fontSize: "11px",
        }}>
        {safeDiscount > 0 && (
          <div style={{ 
            display: "flex", 
            justifyContent: "space-between",
            padding: "2px 4px",
            borderBottom: "1px solid #000"
          }}>
            <span>Discount:</span>
            <span>₵{safeDiscount.toFixed(2)}</span>
          </div>
        )}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontWeight: "bold",
            fontSize: "13px",
            padding: "2px 4px",
            borderBottom: safeBalance !== 0 || safeAmountPaid !== safeTotal ? "1px solid #000" : "none",
          }}>
          <span>Total:</span>
          <span>₵{safeTotal.toFixed(2)}</span>
        </div>
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between",
          padding: "2px 4px",
          borderBottom: safeBalance !== 0 ? "1px solid #000" : "none"
        }}>
          <span>Paid:</span>
          <span>₵{safeAmountPaid.toFixed(2)}</span>
        </div>
        {safeBalance !== 0 && (
          <div style={{ 
            display: "flex", 
            justifyContent: "space-between",
            padding: "2px 4px"
          }}>
            <span>Balance:</span>
            <span>₵{safeBalance.toFixed(2)}</span>
          </div>
        )}
      </div>

      {/* Footer - Compact with border */}
      <div
        style={{
          marginTop: "6px",
          textAlign: "center",
          fontSize: "10px",
          border: "1px solid #000",
          padding: "3px",
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
