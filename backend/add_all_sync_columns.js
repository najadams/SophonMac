const db = require('./data/db/db').connection;
const { v4: uuidv4 } = require('uuid');

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
  'Notification',
  'Purchases', 'PurchasesDetail'
];

console.log('Adding sync columns to tables...');

tables.forEach(table => {
  try {
    console.log(`Processing ${table}...`);
    
    // Add sync_id column
    try {
      db.prepare(`ALTER TABLE ${table} ADD COLUMN sync_id TEXT`).run();
      console.log(`  Added sync_id to ${table}`);
      
      // Populate sync_id for existing records
      const rows = db.prepare(`SELECT id FROM ${table} WHERE sync_id IS NULL`).all();
      const updateStmt = db.prepare(`UPDATE ${table} SET sync_id = ? WHERE id = ?`);
      
      let updated = 0;
      db.transaction(() => {
        for (const row of rows) {
          updateStmt.run(uuidv4(), row.id);
          updated++;
        }
      })();
      console.log(`  Populated sync_id for ${updated} records in ${table}`);
      
    } catch (err) {
      if (!err.message.includes('duplicate column name')) {
        console.error(`  Error adding sync_id to ${table}:`, err.message);
      } else {
        console.log(`  sync_id already exists in ${table}`);
      }
    }

    // Add is_synced column
    try {
      db.prepare(`ALTER TABLE ${table} ADD COLUMN is_synced INTEGER DEFAULT 0`).run();
      console.log(`  Added is_synced to ${table}`);
    } catch (err) {
      if (!err.message.includes('duplicate column name')) {
        console.error(`  Error adding is_synced to ${table}:`, err.message);
      } else {
        console.log(`  is_synced already exists in ${table}`);
      }
    }

    // Add last_synced_at column
    try {
      db.prepare(`ALTER TABLE ${table} ADD COLUMN last_synced_at TEXT`).run();
      console.log(`  Added last_synced_at to ${table}`);
    } catch (err) {
      if (!err.message.includes('duplicate column name')) {
        console.error(`  Error adding last_synced_at to ${table}:`, err.message);
      } else {
        console.log(`  last_synced_at already exists in ${table}`);
      }
    }

    // Add sync_version column
    try {
      db.prepare(`ALTER TABLE ${table} ADD COLUMN sync_version INTEGER DEFAULT 1`).run();
      console.log(`  Added sync_version to ${table}`);
    } catch (err) {
      if (!err.message.includes('duplicate column name')) {
        console.error(`  Error adding sync_version to ${table}:`, err.message);
      } else {
        console.log(`  sync_version already exists in ${table}`);
      }
    }
    
  } catch (err) {
    console.error(`Error processing ${table}:`, err.message);
  }
});

console.log('Migration complete.');
