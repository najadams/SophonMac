// utils/restoreUtils.js
const path = require("path");

let db = null;
function getDb() {
  if (!db) {
    db = require("../data/db/db");
  }
  return db;
}

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDb().run(sql, params, function (err) {
      if (err) return reject(err);
      resolve(this);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDb().all(sql, params, function (err, rows) {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

async function deleteCompanyScope(companyId) {
  // Direct companyId columns
  const directCompanyTables = [
    "Settings",
    "Worker",
    "Inventory",
    "Vendor",
    "Supplies",
    "PurchaseOrder",
    "Receipt",
    "Debt",
    "VendorPayment",
    "Notification",
  ];
  for (const t of directCompanyTables) {
    await run(`DELETE FROM ${t} WHERE companyId = ?`, [companyId]);
  }

  // Customer uses belongsTo
  await run(`DELETE FROM Customer WHERE belongsTo = ?`, [companyId]);
  // CustomerPhone depends on Customer
  await run(
    `DELETE FROM CustomerPhone WHERE customerId IN (SELECT id FROM Customer WHERE belongsTo = ?)`,
    [companyId]
  );
  // ReceiptDetail depends on Receipt
  await run(
    `DELETE FROM ReceiptDetail WHERE receiptId IN (SELECT id FROM Receipt WHERE companyId = ?)`,
    [companyId]
  );
  // SuppliesDetail depends on Supplies
  await run(
    `DELETE FROM SuppliesDetail WHERE suppliesId IN (SELECT id FROM Supplies WHERE companyId = ?)`,
    [companyId]
  );
  // PurchaseOrderItem depends on PurchaseOrder
  await run(
    `DELETE FROM PurchaseOrderItem WHERE purchaseOrderId IN (SELECT id FROM PurchaseOrder WHERE companyId = ?)`,
    [companyId]
  );
  // DebtPayment depends on Debt
  await run(
    `DELETE FROM DebtPayment WHERE debtId IN (SELECT id FROM Debt WHERE companyId = ?)`,
    [companyId]
  );
}

async function getTableColumns(table) {
  const cols = await all(`PRAGMA table_info(${table})`);
  return cols.map((c) => c.name);
}

async function upsertRow(table, row, overrides = {}) {
  const tableCols = await getTableColumns(table);
  const data = { ...row, ...overrides };
  const keys = Object.keys(data).filter((k) => tableCols.includes(k));
  if (keys.length === 0) return; // nothing to insert
  const placeholders = keys.map(() => "?").join(",");
  const values = keys.map((k) => data[k]);
  const sql = `INSERT OR REPLACE INTO ${table} (${keys.join(",")}) VALUES (${placeholders})`;
  await run(sql, values);
}

async function importCompanyData(backupJson, options = {}) {
  const { overwrite = false, targetCompanyId = null } = options;

  if (!backupJson || !backupJson.metadata || !backupJson.company) {
    throw new Error("Invalid backup JSON: missing required metadata/company section");
  }

  const sourceCompanyId = backupJson.metadata.companyId;
  const companyRow = backupJson.company.Company && backupJson.company.Company[0];
  const companyId = targetCompanyId ?? sourceCompanyId ?? (companyRow && companyRow.id);
  if (!companyId) throw new Error("Cannot determine target companyId for import");

  if (overwrite) {
    await deleteCompanyScope(companyId);
  }

  // Import Company
  if (companyRow) {
    await upsertRow("Company", companyRow);
  }

  const scoped = backupJson.company;

  // Settings
  for (const row of scoped.Settings || []) {
    await upsertRow("Settings", row, { companyId });
  }

  // Workers
  for (const row of scoped.Worker || []) {
    await upsertRow("Worker", row, { companyId });
  }

  // Inventory
  for (const row of scoped.Inventory || []) {
    await upsertRow("Inventory", row, { companyId });
  }

  // Customers and phones
  for (const row of scoped.Customer || []) {
    await upsertRow("Customer", row, { belongsTo: companyId });
  }
  for (const row of scoped.CustomerPhone || []) {
    await upsertRow("CustomerPhone", row);
  }

  // Vendors and contacts
  for (const row of scoped.Vendor || []) {
    await upsertRow("Vendor", row, { companyId });
  }
  for (const row of scoped.VendorContact || []) {
    await upsertRow("VendorContact", row);
  }

  // Supplies and details
  for (const row of scoped.Supplies || []) {
    await upsertRow("Supplies", row, { companyId });
  }
  for (const row of scoped.SuppliesDetail || []) {
    await upsertRow("SuppliesDetail", row);
  }

  // Purchase Orders
  for (const row of scoped.PurchaseOrder || []) {
    await upsertRow("PurchaseOrder", row, { companyId });
  }

  // Receipts and details
  for (const row of scoped.Receipt || []) {
    await upsertRow("Receipt", row, { companyId });
  }
  for (const row of scoped.ReceiptDetail || []) {
    await upsertRow("ReceiptDetail", row);
  }

  // Debts and payments
  for (const row of scoped.Debt || []) {
    await upsertRow("Debt", row, { companyId });
  }
  for (const row of scoped.DebtPayment || []) {
    await upsertRow("DebtPayment", row);
  }

  // Vendor Payments
  for (const row of scoped.VendorPayment || []) {
    await upsertRow("VendorPayment", row, { companyId });
  }

  // Notifications
  for (const row of scoped.Notification || []) {
    await upsertRow("Notification", row, { companyId });
  }

  return { companyId };
}

module.exports = {
  importCompanyData,
};