// Reset is_synced flag for all records to force Supabase sync
const path = require('path');
const Database = require('better-sqlite3');

const dbPath = path.join(__dirname, 'data', 'db', 'database.sqlite');
const db = new Database(dbPath);

console.log('Resetting is_synced flags...\n');

const tables = [
  'Company',
  'Settings',
  'Worker',
  'Customer',
  'Vendor',
  'Inventory',
  'Receipt',
  'ReceiptDetail',
  'Debt',
  'DebtPayment',
  'Supplies',
  'SuppliesDetail',
  'PurchaseOrder',
  'PurchaseOrderItem',
  'VendorPayment',
  'Notification'
];

let totalReset = 0;

for (const table of tables) {
  try {
    const result = db.prepare(`UPDATE ${table} SET is_synced = 0 WHERE is_synced = 1`).run();
    console.log(`✓ ${table.padEnd(20)} - Reset ${result.changes} records`);
    totalReset += result.changes;
  } catch (error) {
    console.log(`⚠ ${table.padEnd(20)} - ${error.message}`);
  }
}

console.log(`\n✓ Total records reset: ${totalReset}`);
console.log('\nNow run your sync operation to upload to Supabase.');

db.close();
