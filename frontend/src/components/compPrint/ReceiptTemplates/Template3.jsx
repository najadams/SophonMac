import React from "react";
import { useSelector } from "react-redux";
import { format } from "date-fns";
import { capitalizeFirstLetter } from "../../../config/Functions";

const Template3 = React.forwardRef(({ data }, ref) => {
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

  // Calculate tax amounts
  const taxRate = company.taxRate || 0;
  const subtotal = safeTotal - safeDiscount;
  const taxAmount = (subtotal * (taxRate / 100)).toFixed(2);
  const totalWithTax = (parseFloat(subtotal) + parseFloat(taxAmount)).toFixed(
    2
  );

  return (
    <div
      ref={ref}
      style={{
        fontFamily: "Arial, sans-serif",
        margin: 0,
        padding: "20px",
        maxWidth: "112mm", // Wider format for detailed view
        margin: "0 auto",
        backgroundColor: "#ffffff",
      }}>
      {/* Header Section */}
      <div
        style={{
          textAlign: "center",
          marginBottom: "20px",
          padding: "15px",
          border: "2px solid #000",
          borderRadius: "5px",
        }}>
        <h2
          style={{
            fontSize: "24px",
            fontWeight: "bold",
            margin: "0 0 10px 0",
            color: "#000",
          }}>
          {capitalizeFirstLetter(company.companyName)}
        </h2>
        {company.tinNumber && (
          <p style={{ margin: "5px 0", fontSize: "14px" }}>
            TIN: {company.tinNumber.toUpperCase()}
          </p>
        )}
        {company.contact && (
          <p style={{ margin: "5px 0", fontSize: "14px" }}>
            Tel: {company.contact}
          </p>
        )}
        {company.momo && (
          <p style={{ margin: "5px 0", fontSize: "14px" }}>
            Mobile Money: {company.momo}
          </p>
        )}
        {company.location && (
          <p style={{ margin: "5px 0", fontSize: "14px" }}>
            {company.location}
          </p>
        )}
        {company.email && (
          <p style={{ margin: "5px 0", fontSize: "14px" }}>
            Email: {company.email}
          </p>
        )}
      </div>

      {/* Receipt Information */}
      <div
        style={{
          marginBottom: "20px",
          padding: "10px",
          backgroundColor: "#f8f9fa",
          borderRadius: "5px",
        }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <div>
            <p style={{ margin: "5px 0", fontSize: "14px" }}>
              <strong>Receipt No:</strong>{" "}
              {date && !isNaN(new Date(date).getTime()) 
                ? format(new Date(date), "yyyyMMddHHmm")
                : "Invalid"
              }
            </p>
            <p style={{ margin: "5px 0", fontSize: "14px" }}>
              <strong>Date:</strong>{" "}
              {date && !isNaN(new Date(date).getTime()) 
                ? format(new Date(date), "dd/MM/yyyy HH:mm")
                : "Invalid Date"
              }
            </p>
          </div>
          <div>
            <p style={{ margin: "5px 0", fontSize: "14px" }}>
              <strong>Customer:</strong> {capitalizeFirstLetter(customerName)}
            </p>
            <p style={{ margin: "5px 0", fontSize: "14px" }}>
              <strong>Served By:</strong> {capitalizeFirstLetter(workerName)}
            </p>
          </div>
        </div>
      </div>

      {/* Detailed Products Table */}
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          marginBottom: "20px",
          fontSize: "14px",
        }}>
        <thead>
          <tr style={{ backgroundColor: "#f8f9fa" }}>
            <th
              style={{
                padding: "10px",
                textAlign: "left",
                borderBottom: "2px solid #000",
              }}>
              Item Description
            </th>
            <th
              style={{
                padding: "10px",
                textAlign: "center",
                borderBottom: "2px solid #000",
              }}>
              Qty
            </th>
            <th
              style={{
                padding: "10px",
                textAlign: "right",
                borderBottom: "2px solid #000",
              }}>
              Unit Price
            </th>
            <th
              style={{
                padding: "10px",
                textAlign: "right",
                borderBottom: "2px solid #000",
              }}>
              Amount
            </th>
          </tr>
        </thead>
        <tbody>
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
              <tr key={index}>
                <td
                  style={{
                    padding: "8px",
                    textAlign: "left",
                    borderBottom: "1px solid #ddd",
                  }}>
                  {productNameWithUnit}
                </td>
                <td
                  style={{
                    padding: "8px",
                    textAlign: "center",
                    borderBottom: "1px solid #ddd",
                  }}>
                  {quantityWithUnit}
                </td>
                <td
                  style={{
                    padding: "8px",
                    textAlign: "right",
                    borderBottom: "1px solid #ddd",
                  }}>
                  ₵{(product.price || product.salesPrice).toFixed(2)}
                </td>
                <td
                  style={{
                    padding: "8px",
                    textAlign: "right",
                    borderBottom: "1px solid #ddd",
                  }}>
                  ₵
                  {(
                    (product.price || product.salesPrice) * displayQuantity
                  ).toFixed(2)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Detailed Calculation Section */}
      <div
        style={{
          marginLeft: "auto",
          width: "60%",
          fontSize: "14px",
        }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "5px 0",
            borderBottom: "1px solid #ddd",
          }}>
          <span>Subtotal:</span>
          <span>₵{subtotal.toFixed(2)}</span>
        </div>
        {safeDiscount > 0 && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "5px 0",
              borderBottom: "1px solid #ddd",
              color: "#dc3545",
            }}>
            <span>Discount:</span>
            <span>-₵{safeDiscount.toFixed(2)}</span>
          </div>
        )}
        {taxRate > 0 && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "5px 0",
              borderBottom: "1px solid #ddd",
            }}>
            <span>VAT ({taxRate}%):</span>
            <span>₵{taxAmount}</span>
          </div>
        )}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "10px 0",
            borderBottom: "2px solid #000",
            fontWeight: "bold",
            fontSize: "16px",
          }}>
          <span>Total:</span>
          <span>₵{totalWithTax}</span>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "5px 0",
          }}>
          <span>Amount Paid:</span>
          <span>₵{safeAmountPaid.toFixed(2)}</span>
        </div>
        {safeBalance !== 0 && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "5px 0",
              color: safeBalance > 0 ? "#dc3545" : "#28a745",
            }}>
            <span>Balance:</span>
            <span>₵{safeBalance.toFixed(2)}</span>
          </div>
        )}
      </div>

      {/* Footer Section */}
      <div
        style={{
          marginTop: "30px",
          textAlign: "center",
          fontSize: "14px",
          borderTop: "2px solid #000",
          paddingTop: "15px",
        }}>
        {company.receiptFooter ? (
          <p style={{ margin: "5px 0" }}>{company.receiptFooter}</p>
        ) : (
          <>
            <p style={{ margin: "5px 0" }}>Thank you for your business!</p>
            <p style={{ margin: "5px 0" }}>
              For returns and warranty claims, please present this receipt.
            </p>
            <p style={{ margin: "5px 0" }}>
              Returns accepted within 7 days of purchase.
            </p>
          </>
        )}
        {company.tinNumber && (
          <p style={{ margin: "10px 0", fontStyle: "italic" }}>
            This is an official VAT receipt
          </p>
        )}
      </div>
    </div>
  );
});

export default Template3;
