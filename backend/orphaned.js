const Database = require("better-sqlite3");

// Change this to your database file:
const db = new Database("./data/db/database.sqlite");

function findOrphans(childTable, parentTable, fkColumn) {
  const stmt = db.prepare(`
    SELECT *
    FROM ${childTable}
    WHERE ${fkColumn} NOT IN (SELECT id FROM ${parentTable})
  `);

  const rows = stmt.all();

  if (rows.length === 0) {
    console.log(`✓ No orphaned records in ${childTable}`);
  } else {
    console.log(`❗ Orphaned ${childTable} records (${rows.length} found):`);
    rows.forEach(r => console.log(r));
  }
}

console.log("Checking for orphaned detail records...\n");

// ReceiptDetail → Receipt
findOrphans("ReceiptDetail", "Receipt", "receiptId");

// DebtPayment → Debt
findOrphans("DebtPayment", "Debt", "debtId");

// SuppliesDetail → Supplies
findOrphans("SuppliesDetail", "Supplies", "suppliesId");

// PurchaseOrderItem → PurchaseOrder
findOrphans("PurchaseOrderItem", "PurchaseOrder", "purchaseOrderId");

console.log("\nDone.");
