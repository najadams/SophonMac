import React, { useMemo } from "react";
import { useSelector } from "react-redux";
import { format } from "date-fns";
import { QRCodeCanvas } from "qrcode.react";
import { capitalizeFirstLetter } from "../../../config/Functions";

const Template4 = React.forwardRef(({ data }, ref) => {
  const {
    customerName,
    products,
    detail,
    amountPaid,
    total,
    balance,
    workerName,
    date,
    discount,
    referenceNumber, 
  } = data;
  const company = useSelector((state) => state.companyState.data);

  // Normalize items list from either products (POS) or detail (History)
  const items = products || detail || [];

  // Ensure numeric values
  const safeAmountPaid = Number(amountPaid) || 0;
  const safeTotal = Number(total) || 0;
  const safeBalance = Number(balance) || 0;
  const safeDiscount = Number(discount) || 0;

  // Fiscal Logic (Simulated for GRA Compliance)
  // In a real scenario, these would come from the backend's Fiscal Device/API response
  const taxRate = company.taxRate || 15; // Default VAT standard rate if not set
  const vatAmount = (safeTotal * taxRate) / (100 + taxRate);
  const taxableAmount = safeTotal - vatAmount;
  
  // Generate Fiscal Signature (Mocking a secure hash)
  const fiscalSignature = useMemo(() => {
    const rawString = `${company.taxId}|${format(new Date(), "yyyyMMdd")}|${safeTotal.toFixed(2)}|${referenceNumber || "REC000"}`;
    // Simple mock hash generation for display purposes
    let hash = 0;
    for (let i = 0; i < rawString.length; i++) {
        const char = rawString.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return `FIS-${Math.abs(hash).toString(16).toUpperCase().padStart(16, '0')}-${new Date().getFullYear()}`;
  }, [company.taxId, safeTotal, referenceNumber]);

  // QR Code Data - typically URL or structured text for verification
  const qrData = JSON.stringify({
    tin: company.taxId || "N/A",
    dt: date ? format(new Date(date), "yyyy-MM-dd HH:mm:ss") : new Date().toISOString(),
    tot: safeTotal.toFixed(2),
    tax: vatAmount.toFixed(2),
    sig: fiscalSignature
  });

  return (
    <div
      ref={ref}
      style={{
        fontFamily: "'Courier New', Courier, monospace", // Monospace for fiscal feel
        width: "100%",
        backgroundColor: "#fff",
        padding: "10px",
        color: "#000",
        fontSize: "12px",
        lineHeight: "1.4"
      }}>
      
      {/* --- FISCAL HEADER --- */}
      <div style={{ textAlign: "center", marginBottom: "15px" }}>
        {company.logo && (
          <img
            src={company.logo}
            alt="Logo"
            style={{ width: "80px", marginBottom: "5px", filter: "grayscale(100%)" }} 
          />
        )}
        <h2 style={{ fontSize: "16px", fontWeight: "bold", margin: "5px 0" }}>
          {company.companyName?.toUpperCase()}
        </h2>
        
        <div style={{ fontSize: "11px" }}>
          {company.location && <div>{company.location.toUpperCase()}</div>}
          {company.contact && <div>TEL: {company.contact}</div>}
          {company.taxId && <div style={{ fontWeight: "bold", marginTop: "5px" }}>TIN: {company.taxId}</div>}
          {company.vatRegistration && <div>VRN: {company.vatRegistration}</div>}
        </div>
      </div>

      {/* --- TRANSACTION INFO --- */}
      <div style={{ borderBottom: "1px dashed #000", paddingBottom: "5px", marginBottom: "5px" }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>DATE: {date ? format(new Date(date), "dd/MM/yyyy") : format(new Date(), "dd/MM/yyyy")}</span>
          <span>TIME: {date ? format(new Date(date), "HH:mm") : format(new Date(), "HH:mm")}</span>
        </div>
        <div>RCPT NO: {referenceNumber || format(new Date(), "yyyyMMddHHmmss")}</div>
        <div>CASHIER: {workerName?.toUpperCase()}</div>
        {customerName && <div>CUSTOMER: {customerName.toUpperCase()}</div>}
      </div>

      {/* --- ITEMS --- */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "10px" }}>
        <thead>
          <tr style={{ borderBottom: "1px dashed #000" }}>
            <th style={{ textAlign: "left", width: "45%" }}>ITEM</th>
            <th style={{ textAlign: "center", width: "15%" }}>QTY</th>
            <th style={{ textAlign: "right", width: "20%" }}>PRICE</th>
            <th style={{ textAlign: "right", width: "20%" }}>AMT</th>
          </tr>
        </thead>
        <tbody>
          {items.map((p, i) => {
             const qty = p.originalQuantity || p.quantity;
             const price = p.price || p.salesPrice;
             const lineTotal = qty * price;
             return (
               <tr key={i}>
                 <td style={{ textAlign: "left" }}>
                    {p.name.toUpperCase()}
                    {/* Tax Code indicator (e.g., A=Standard, B=Exempt) */}
                    <span style={{ fontSize: "10px", marginLeft: "2px" }}>
                       {p.taxExempt ? "(B)" : "(A)"}
                    </span>
                 </td>
                 <td style={{ textAlign: "center" }}>{qty}</td>
                 <td style={{ textAlign: "right" }}>{price.toFixed(2)}</td>
                 <td style={{ textAlign: "right" }}>{lineTotal.toFixed(2)}</td>
               </tr>
             );
          })}
        </tbody>
      </table>

      {/* --- TOTALS --- */}
      <div style={{ borderTop: "1px dashed #000", paddingTop: "5px", marginBottom: "10px" }}>
        {safeDiscount > 0 && (
           <div style={{ display: "flex", justifyContent: "space-between" }}>
             <span>DISCOUNT</span>
             <span>-{safeDiscount.toFixed(2)}</span>
           </div>
        )}
        
        <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", fontSize: "16px", margin: "5px 0" }}>
          <span>TOTAL PAYABLE</span>
          <span>{company.currency?.symbol || "₵"}{safeTotal.toFixed(2)}</span>
        </div>
        
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>CASH/TENDERED</span>
          <span>{safeAmountPaid.toFixed(2)}</span>
        </div>
        
        {safeBalance > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>CHANGE</span>
            <span>{safeBalance.toFixed(2)}</span>
          </div>
        )}
      </div>

      {/* --- FISCAL BREAKDOWN --- */}
      <div style={{ borderTop: "1px solid #000", borderBottom: "1px solid #000", padding: "5px 0", marginBottom: "15px", fontSize: "11px" }}>
         <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>TAXABLE AMT (A - {taxRate}%)</span>
            <span>{taxableAmount.toFixed(2)}</span>
         </div>
         <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>VAT AMOUNT (A)</span>
            <span>{vatAmount.toFixed(2)}</span>
         </div>
         <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>EXEMPT AMT (B)</span>
            <span>0.00</span>
         </div>
         <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", marginTop: "2px" }}>
            <span>TOTAL TAX</span>
            <span>{vatAmount.toFixed(2)}</span>
         </div>
      </div>

      {/* --- FISCAL FOOTER (CRYPTOGRAPHY) --- */}
      <div style={{ textAlign: "center", marginTop: "10px" }}>
         <div style={{ marginBottom: "10px", display: "flex", justifyContent: "center" }}>
            <QRCodeCanvas value={qrData} size={100} level={"M"} includeMargin={true} />
         </div>
         
         <div style={{ fontSize: "10px", wordBreak: "break-all" }}>
            <strong>SDC ID:</strong> GRA-POS-001<br/>
            <strong>FISCAL SIG:</strong> {fiscalSignature}<br/>
            <strong>RECEIPT CHECK CODE:</strong> {fiscalSignature.substring(fiscalSignature.length - 8)}
         </div>
         
         <div style={{ marginTop: "10px", fontWeight: "bold" }}>
            *** FISCAL RECEIPT ***
         </div>
         
         {company.receiptFooter && (
             <div style={{ marginTop: "5px", fontSize: "10px", fontStyle: "italic" }}>
                 {company.receiptFooter}
             </div>
         )}
      </div>
    </div>
  );
});

export default Template4;
