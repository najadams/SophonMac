const db = require('../data/db/db');

// Export all company-scoped data into a portable JSON structure
// Includes related detail tables and metadata for forward compatibility
async function exportCompanyData(companyId) {
  if (!companyId) throw new Error('companyId is required');

  const now = new Date().toISOString();

  // Helper to run a SELECT all query with params
  const all = (sql, params = []) => new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });

  const get = (sql, params = []) => new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row || null);
    });
  });

  // Check if a table exists in the current database
  const tableExists = async (tableName) => {
    const row = await get("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?", [tableName]);
    return !!row;
  };

  // Core company info
  const company = await get('SELECT * FROM Company WHERE id = ?', [companyId]);

  // If company not found, return minimal structure
  if (!company) {
    return {
      metadata: {
        version: 1,
        createdAt: now,
        companyId,
        notes: 'Company not found in local DB',
      },
      company: null,
      tables: {},
    };
  }

  // Company-scoped tables (direct companyId or belongsTo)
  const settings = await all('SELECT * FROM Settings WHERE companyId = ?', [companyId]);
  const workers = await all('SELECT * FROM Worker WHERE companyId = ?', [companyId]);
  const customers = await all('SELECT * FROM Customer WHERE belongsTo = ?', [companyId]);
  const vendors = await all('SELECT * FROM Vendor WHERE companyId = ?', [companyId]);
  const inventory = await all('SELECT * FROM Inventory WHERE companyId = ? AND deleted = 0', [companyId]);
  const receipts = await all('SELECT * FROM Receipt WHERE companyId = ?', [companyId]);
  const debts = await all('SELECT * FROM Debt WHERE companyId = ?', [companyId]);
  const supplies = await all('SELECT * FROM Supplies WHERE companyId = ?', [companyId]);
  const purchaseOrders = await all('SELECT * FROM PurchaseOrder WHERE companyId = ?', [companyId]);
  const vendorPayments = await all('SELECT * FROM VendorPayment WHERE companyId = ?', [companyId]);
  const notifications = await all('SELECT * FROM Notification WHERE companyId = ?', [companyId]);

  // Non-companyId tables linked through parents
  const customerIds = customers.map(c => c.id);
  const receiptIds = receipts.map(r => r.id);
  const suppliesIds = supplies.map(s => s.id);
  const purchaseOrderIds = purchaseOrders.map(p => p.id);
  const inventoryIds = inventory.map(i => i.id);

  const customerPhones = customerIds.length
    ? await all(`SELECT * FROM CustomerPhone WHERE customerId IN (${customerIds.map(() => '?').join(',')})`, customerIds)
    : [];
  const customerEmails = customerIds.length
    ? await all(`SELECT * FROM CustomerEmail WHERE customerId IN (${customerIds.map(() => '?').join(',')})`, customerIds)
    : [];

  const receiptDetails = receiptIds.length
    ? await all(`SELECT * FROM ReceiptDetail WHERE receiptId IN (${receiptIds.map(() => '?').join(',')})`, receiptIds)
    : [];

  const debtPayments = debts.length
    ? await all(`SELECT * FROM DebtPayment WHERE debtId IN (${debts.map(() => '?').join(',')})`, debts.map(d => d.id))
    : [];

  const suppliesDetails = suppliesIds.length
    ? await all(`SELECT * FROM SuppliesDetail WHERE suppliesId IN (${suppliesIds.map(() => '?').join(',')})`, suppliesIds)
    : [];

  const purchaseOrderItems = purchaseOrderIds.length
    ? await all(`SELECT * FROM PurchaseOrderItem WHERE purchaseOrderId IN (${purchaseOrderIds.map(() => '?').join(',')})`, purchaseOrderIds)
    : [];

  const inventoryUnits = inventoryIds.length
    ? await all(`SELECT * FROM InventoryUnits WHERE inventoryId IN (${inventoryIds.map(() => '?').join(',')})`, inventoryIds)
    : [];

  const unitConversions = inventoryIds.length
    ? await all(`SELECT * FROM UnitConversion WHERE inventoryId IN (${inventoryIds.map(() => '?').join(',')})`, inventoryIds)
    : [];

  const priceHistory = inventoryIds.length
    ? await all(`SELECT * FROM PriceChange WHERE inventoryId IN (${inventoryIds.map(() => '?').join(',')})`, inventoryIds)
    : [];

  const stockTransactions = inventoryIds.length
    ? await all(`SELECT * FROM StockTransaction WHERE inventoryId IN (${inventoryIds.map(() => '?').join(',')})`, inventoryIds)
    : [];

  // Currency table (include full list for compatibility) - optional if table exists
  const currencies = (await tableExists('Currency')) 
    ? await all('SELECT * FROM Currency')
    : [];

  return {
    metadata: {
      version: 1,
      createdAt: now,
      companyId,
      schema: 'pos-backup-v1',
    },
    company,
    tables: {
      Settings: settings,
      Worker: workers,
      Customer: customers,
      CustomerPhone: customerPhones,
      CustomerEmail: customerEmails,
      Vendor: vendors,
      Inventory: inventory,
      InventoryUnits: inventoryUnits,
      UnitConversion: unitConversions,
      PriceChange: priceHistory,
      StockTransaction: stockTransactions,
      Receipt: receipts,
      ReceiptDetail: receiptDetails,
      Debt: debts,
      DebtPayment: debtPayments,
      Supplies: supplies,
      SuppliesDetail: suppliesDetails,
      PurchaseOrder: purchaseOrders,
      PurchaseOrderItem: purchaseOrderItems,
      VendorPayment: vendorPayments,
      Notification: notifications,
      Currency: currencies,
    },
  };
}

module.exports = {
  exportCompanyData,
};