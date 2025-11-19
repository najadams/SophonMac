// utils/restoreUtils.js
const path = require("path");

// Minimal, env-toggled logging
const RESTORE_LOG = process.env.RESTORE_LOG;
const shouldLog = RESTORE_LOG === "1" || RESTORE_LOG === "true" || RESTORE_LOG === "yes";
function log(...args) {
  if (shouldLog) console.log("[restore]", ...args);
}

let db = null;
function getDb() {
  if (!db) {
    db = require("../data/db/db");
  }
  return db;
}

// Cache table existence checks to avoid repeated PRAGMA lookups
const tableExistenceCache = new Map();

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

// Check if a table exists in the current SQLite database (with caching)
async function tableExists(tableName) {
  if (tableExistenceCache.has(tableName)) return tableExistenceCache.get(tableName);
  const rows = await all(
    "SELECT name FROM sqlite_master WHERE type='table' AND name = ?",
    [tableName]
  );
  const exists = Array.isArray(rows) && rows.length > 0;
  tableExistenceCache.set(tableName, exists);
  return exists;
}

async function deleteScoped(table, sql, params) {
  if (await tableExists(table)) {
    await run(sql, params);
    log(`deleted from ${table}`);
    return true;
  } else {
    log(`skip delete: ${table} not found`);
    return false;
  }
}

async function deleteCompanyScope(companyId) {
  // Delete in dependency order: children first, then parents

  // Customer phones/emails depend on Customer
  await deleteScoped(
    "CustomerPhone",
    `DELETE FROM CustomerPhone WHERE customerId IN (SELECT id FROM Customer WHERE belongsTo = ?)`,
    [companyId]
  );
  await deleteScoped(
    "CustomerEmail",
    `DELETE FROM CustomerEmail WHERE customerId IN (SELECT id FROM Customer WHERE belongsTo = ?)`,
    [companyId]
  );

  // Inventory-dependent tables
  await deleteScoped(
    "UnitConversion",
    `DELETE FROM UnitConversion WHERE inventoryId IN (SELECT id FROM Inventory WHERE companyId = ?)`,
    [companyId]
  );
  await deleteScoped(
    "PriceChange",
    `DELETE FROM PriceChange WHERE inventoryId IN (SELECT id FROM Inventory WHERE companyId = ?)`,
    [companyId]
  );
  await deleteScoped(
    "StockTransaction",
    `DELETE FROM StockTransaction WHERE inventoryId IN (SELECT id FROM Inventory WHERE companyId = ?)`,
    [companyId]
  );
  await deleteScoped(
    "InventoryUnits",
    `DELETE FROM InventoryUnits WHERE inventoryId IN (SELECT id FROM Inventory WHERE companyId = ?)`,
    [companyId]
  );

  // Vendor contacts depend on Vendor
  await deleteScoped(
    "VendorContact",
    `DELETE FROM VendorContact WHERE vendorId IN (SELECT id FROM Vendor WHERE companyId = ?)`,
    [companyId]
  );

  // Purchase/Supplies child tables
  await deleteScoped(
    "SuppliesDetail",
    `DELETE FROM SuppliesDetail WHERE suppliesId IN (SELECT id FROM Supplies WHERE companyId = ?)`,
    [companyId]
  );
  await deleteScoped(
    "PurchaseOrderItem",
    `DELETE FROM PurchaseOrderItem WHERE purchaseOrderId IN (SELECT id FROM PurchaseOrder WHERE companyId = ?)`,
    [companyId]
  );

  // Receipt details depend on Receipt
  await deleteScoped(
    "ReceiptDetail",
    `DELETE FROM ReceiptDetail WHERE receiptId IN (SELECT id FROM Receipt WHERE companyId = ?)`,
    [companyId]
  );

  // Debt payments depend on Debt
  await deleteScoped(
    "DebtPayment",
    `DELETE FROM DebtPayment WHERE debtId IN (SELECT id FROM Debt WHERE companyId = ?)`,
    [companyId]
  );

  // Now delete parent tables with direct company scope
  const parentTables = [
    "Receipt",
    "Supplies",
    "PurchaseOrder",
    "Debt",
    "VendorPayment",
    "Notification",
    "Inventory",
    "Vendor",
    "Worker",
    "Settings",
  ];
  for (const t of parentTables) {
    if (await tableExists(t)) {
      await run(`DELETE FROM ${t} WHERE companyId = ?`, [companyId]);
      log(`deleted from ${t}`);
    } else {
      log(`skip delete: ${t} not found`);
    }
  }

  // Finally, customers (belongsTo)
  if (await tableExists("Customer")) {
    await run(`DELETE FROM Customer WHERE belongsTo = ?`, [companyId]);
    log(`deleted from Customer`);
  } else {
    log(`skip delete: Customer not found`);
  }
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
  try {
    await run(sql, values);
  } catch (err) {
    const id = row && (row.id ?? row["id"]);
    throw new Error(`Upsert failed for table ${table}${id ? ` id=${id}` : ""}: ${err.message}`);
  }
}

async function importRows(table, rows, overrides = {}) {
  const list = Array.isArray(rows) ? rows : [];
  if (list.length === 0) return { imported: 0, skipped: false };
  if (!(await tableExists(table))) {
    log(`skip import: ${table} not found`);
    return { imported: 0, skipped: true };
  }
  log(`import ${list.length} rows into ${table}`);
  for (const row of list) {
    await upsertRow(table, row, overrides);
  }
  return { imported: list.length, skipped: false };
}

async function importCompanyData(backupJson, options = {}) {
  const { overwrite = false, targetCompanyId = null } = options;

  if (!backupJson || !backupJson.metadata || !backupJson.company) {
    throw new Error("Invalid backup JSON: missing required metadata/company section");
  }

  const sourceCompanyId = backupJson.metadata.companyId;
  // Support both backup formats:
  // - New: backupJson.company is a single Company row; tables in backupJson.tables
  // - Legacy: backupJson.company.Company is an array and other tables are under backupJson.company
  const companyRow = (backupJson.company && backupJson.company.Company && backupJson.company.Company[0])
    || backupJson.company;
  const companyId = targetCompanyId ?? sourceCompanyId ?? (companyRow && companyRow.id);
  if (!companyId) throw new Error("Cannot determine target companyId for import");

  // Wrap overwrite + import in a transaction for atomicity
  await run("BEGIN TRANSACTION");
  try {
    log(`begin import`, { overwrite, companyId });
    if (overwrite) {
      await deleteCompanyScope(companyId);
    }

  // Import Company
  if (companyRow) {
    await upsertRow("Company", companyRow);
    log(`upsert Company id=${companyRow.id}`);
  }

  const scoped = backupJson.tables || backupJson.company || {};
  const importCounts = {};
  const skippedTables = [];

    // Settings
    {
      const r = await importRows("Settings", scoped.Settings || [], { companyId });
      importCounts.Settings = r.imported; if (r.skipped) skippedTables.push("Settings");
    }

    // Workers
    {
      const r = await importRows("Worker", scoped.Worker || [], { companyId });
      importCounts.Worker = r.imported; if (r.skipped) skippedTables.push("Worker");
    }

    // Inventory
    {
      const r = await importRows("Inventory", scoped.Inventory || [], { companyId });
      importCounts.Inventory = r.imported; if (r.skipped) skippedTables.push("Inventory");
    }

    // Customers and phones/emails
    {
      const r1 = await importRows("Customer", scoped.Customer || [], { belongsTo: companyId });
      importCounts.Customer = r1.imported; if (r1.skipped) skippedTables.push("Customer");
      const r2 = await importRows("CustomerPhone", scoped.CustomerPhone || []);
      importCounts.CustomerPhone = r2.imported; if (r2.skipped) skippedTables.push("CustomerPhone");
      const r3 = await importRows("CustomerEmail", scoped.CustomerEmail || []);
      importCounts.CustomerEmail = r3.imported; if (r3.skipped) skippedTables.push("CustomerEmail");
    }

    // Vendors and contacts
    {
      const r1 = await importRows("Vendor", scoped.Vendor || [], { companyId });
      importCounts.Vendor = r1.imported; if (r1.skipped) skippedTables.push("Vendor");
      const r2 = await importRows("VendorContact", scoped.VendorContact || []);
      importCounts.VendorContact = r2.imported; if (r2.skipped) skippedTables.push("VendorContact");
    }

    // Supplies and details
    {
      const r1 = await importRows("Supplies", scoped.Supplies || [], { companyId });
      importCounts.Supplies = r1.imported; if (r1.skipped) skippedTables.push("Supplies");
      const r2 = await importRows("SuppliesDetail", scoped.SuppliesDetail || []);
      importCounts.SuppliesDetail = r2.imported; if (r2.skipped) skippedTables.push("SuppliesDetail");
    }

    // Purchase Orders and items
    {
      const r1 = await importRows("PurchaseOrder", scoped.PurchaseOrder || [], { companyId });
      importCounts.PurchaseOrder = r1.imported; if (r1.skipped) skippedTables.push("PurchaseOrder");
      const r2 = await importRows("PurchaseOrderItem", scoped.PurchaseOrderItem || []);
      importCounts.PurchaseOrderItem = r2.imported; if (r2.skipped) skippedTables.push("PurchaseOrderItem");
    }

    // Receipts FIRST (with debtId nulled to break circular FK), then Debts, then reattach debtId
    const receiptRows = scoped.Receipt || [];
    if (receiptRows.length && (await tableExists("Receipt"))) {
      log(`import ${receiptRows.length} rows into Receipt (debtId nulled)`);
      for (const row of receiptRows) {
        await upsertRow("Receipt", row, { companyId, debtId: null });
      }
      importCounts.Receipt = receiptRows.length;
    } else if (receiptRows.length) {
      skippedTables.push("Receipt");
      log("skip import: Receipt not found");
    }

    {
      const r1 = await importRows("Debt", scoped.Debt || [], { companyId });
      importCounts.Debt = r1.imported; if (r1.skipped) skippedTables.push("Debt");
      const r2 = await importRows("DebtPayment", scoped.DebtPayment || []);
      importCounts.DebtPayment = r2.imported; if (r2.skipped) skippedTables.push("DebtPayment");
    }

    // Now update receipts with correct debtId values
    if (receiptRows.length && (await tableExists("Receipt"))) {
      log(`reattach debtId for ${receiptRows.length} receipts`);
      for (const row of receiptRows) {
        await upsertRow("Receipt", row, { companyId });
      }
    }

    // Receipt details after receipts exist
    {
      const r = await importRows("ReceiptDetail", scoped.ReceiptDetail || []);
      importCounts.ReceiptDetail = r.imported; if (r.skipped) skippedTables.push("ReceiptDetail");
    }

    // Stock transactions and price history (already independent once inventory is present)
    {
      const r1 = await importRows("StockTransaction", scoped.StockTransaction || []);
      importCounts.StockTransaction = r1.imported; if (r1.skipped) skippedTables.push("StockTransaction");
      const r2 = await importRows("PriceChange", scoped.PriceChange || []);
      importCounts.PriceChange = r2.imported; if (r2.skipped) skippedTables.push("PriceChange");
      const r3 = await importRows("UnitConversion", scoped.UnitConversion || []);
      importCounts.UnitConversion = r3.imported; if (r3.skipped) skippedTables.push("UnitConversion");
      const r4 = await importRows("InventoryUnits", scoped.InventoryUnits || []);
      importCounts.InventoryUnits = r4.imported; if (r4.skipped) skippedTables.push("InventoryUnits");
    }

    // Vendor Payments
    {
      const r = await importRows("VendorPayment", scoped.VendorPayment || [], { companyId });
      importCounts.VendorPayment = r.imported; if (r.skipped) skippedTables.push("VendorPayment");
    }

    // Notifications
    {
      const r = await importRows("Notification", scoped.Notification || [], { companyId });
      importCounts.Notification = r.imported; if (r.skipped) skippedTables.push("Notification");
    }

    log("import summary", { importCounts, skippedTables });
    await run("COMMIT");
    return { companyId };
  } catch (err) {
    await run("ROLLBACK");
    throw err;
  }
}

module.exports = {
  importCompanyData,
};