import React from "react";
import { useSelector } from "react-redux";
import { format } from "date-fns";
import { capitalizeFirstLetter } from "../../../config/Functions";

const Template1 = React.forwardRef(({ data }, ref) => {
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

  return (
    <div
      ref={ref}
      style={{
        fontFamily: "Arial, sans-serif",
        margin: 0,
        padding: "20px",
        maxWidth: "80mm",
        margin: "0 auto",
        backgroundColor: "#ffffff",
      }}>
      {/* Header Section with Logo */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          width: "100%",
          marginBottom: "20px",
          borderBottom: "2px solid #000",
          paddingBottom: "15px",
        }}>
        {company.logo && (
          <img
            src={company.logo}
            alt="Company Logo"
            style={{ width: "100px", marginBottom: "10px" }}
          />
        )}
        <h2
          style={{
            fontSize: "24px",
            fontWeight: "bold",
            margin: "0 0 10px 0",
            color: "#000",
          }}>
          {capitalizeFirstLetter(company.companyName)}
        </h2>
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
        {company.receiptHeader && (
          <p
            style={{ margin: "10px 0", fontSize: "14px", fontStyle: "italic" }}>
            {company.receiptHeader}
          </p>
        )}
      </div>

      {/* Transaction Details */}
      <div style={{ marginBottom: "20px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "10px",
            fontSize: "14px",
          }}>
          <span>
            <strong>Receipt No:</strong>{" "}
            {date && !isNaN(new Date(date).getTime()) 
              ? format(new Date(date), "yyyyMMddHHmm")
              : "Invalid"
            }
          </span>
          <span>
            <strong>Date:</strong> {date && !isNaN(new Date(date).getTime()) 
              ? format(new Date(date), "dd/MM/yyyy")
              : "Invalid Date"
            }
          </span>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "10px",
            fontSize: "14px",
          }}>
          <span>
            <strong>Customer:</strong> {capitalizeFirstLetter(customerName)}
          </span>
          <span>
            <strong>Cashier:</strong> {capitalizeFirstLetter(workerName)}
          </span>
        </div>
      </div>

      {/* Products Table */}
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          marginBottom: "20px",
          fontSize: "14px",
        }}>
        <thead>
          <tr style={{ backgroundColor: "#f5f5f5" }}>
            <th
              style={{
                padding: "8px",
                textAlign: "left",
                borderBottom: "2px solid #000",
                fontWeight: "bold",
              }}>
              Qty
            </th>
            <th
              style={{
                padding: "8px",
                textAlign: "left",
                borderBottom: "2px solid #000",
                fontWeight: "bold",
              }}>
              Product
            </th>
            <th
              style={{
                padding: "8px",
                textAlign: "right",
                borderBottom: "2px solid #000",
                fontWeight: "bold",
              }}>
              Price
            </th>
            <th
              style={{
                padding: "8px",
                textAlign: "right",
                borderBottom: "2px solid #000",
                fontWeight: "bold",
              }}>
              Total
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
                  {quantityWithUnit}
                </td>
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
                    textAlign: "right",
                    borderBottom: "1px solid #ddd",
                  }}>
                  ₵
                  {product.price
                    ? product.price.toFixed(2)
                    : product.salesPrice.toFixed(2)}
                </td>
                <td
                  style={{
                    padding: "8px",
                    textAlign: "right",
                    borderBottom: "1px solid #ddd",
                  }}>
                  ₵
                  {(product.price
                    ? product.price * displayQuantity
                    : product.salesPrice * displayQuantity
                  ).toFixed(2)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Totals Section */}
      <div
        style={{
          marginTop: "20px",
          borderTop: "2px solid #000",
          paddingTop: "15px",
          fontSize: "14px",
        }}>
        {discount !== undefined && discount !== null && discount !== 0 && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "5px",
            }}>
            <span>
              <strong>Discount:</strong>
            </span>
            <span>₵{discount}</span>
          </div>
        )}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "5px",
            fontSize: "16px",
            fontWeight: "bold",
          }}>
          <span>Total Amount:</span>
          <span>₵{total.toFixed(2)}</span>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "5px",
          }}>
          <span>
            <strong>Amount Paid:</strong>
          </span>
          <span>₵{amountPaid.toFixed(2)}</span>
        </div>
        {balance !== undefined && balance !== null && balance !== 0 && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "5px",
            }}>
            <span>
              <strong>Balance:</strong>
            </span>
            <span>₵{balance.toFixed(2)}</span>
          </div>
        )}
      </div>

      {/* Footer Section */}
      <div
        style={{
          marginTop: "30px",
          textAlign: "center",
          fontSize: "12px",
          color: "#666",
          borderTop: "2px solid #000",
          paddingTop: "15px",
        }}>
        {company.receiptFooter ? (
          <p style={{ margin: "5px 0" }}>{company.receiptFooter}</p>
        ) : (
          <>
            <p style={{ margin: "5px 0" }}>Thank you for your business!</p>
            <p style={{ margin: "5px 0" }}>Goods sold are not returnable</p>
            <p style={{ margin: "5px 0" }}>
              Please keep this receipt for warranty purposes
            </p>
          </>
        )}
      </div>
    </div>
  );
});

export default Template1;
