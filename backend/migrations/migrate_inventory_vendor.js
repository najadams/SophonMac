const Database = require('better-sqlite3');
const path = require('path');
const { randomUUID } = require('crypto');

const dbPath = path.join(__dirname, '..', 'data', 'db', 'database.sqlite');
const db = new Database(dbPath);

console.log('Migrating all remaining tables to UUID...\n');

db.pragma('foreign_keys = OFF');

// ID mappings for all tables
const idMaps = {
  inventory: new Map(),
  vendor: new Map(),
  receipt: new Map(),
  debt: new Map(),
  settings: new Map(),
  purchaseOrder: new Map(),
  supplies: new Map(),
  notification: new Map()
};

try {
  db.exec('BEGIN TRANSACTION');
  
  // 1. Migrate Inventory
  console.log('Migrating Inventory...');
  const inventories = db.prepare('SELECT * FROM Inventory').all();
  inventories.forEach(i => idMaps.inventory.set(i.id, randomUUID()));
  
  db.exec(`
    CREATE TABLE Inventory_new (
      id TEXT PRIMARY KEY,
      companyId TEXT NOT NULL,
      name TEXT NOT NULL,
      category TEXT DEFAULT 'none',
      baseUnit TEXT DEFAULT 'none',
      costPrice REAL DEFAULT 0,
      salesPrice REAL NOT NULL,
      onhand REAL DEFAULT 0,
      deleted INTEGER DEFAULT 0,
      reorderPoint REAL DEFAULT 0,
      minimumStock REAL DEFAULT 0,
      description TEXT,
      sku TEXT,
      barcode TEXT,
      allowsUnitBreakdown INTEGER DEFAULT 0,
      atomicUnit TEXT,
      atomicUnitQuantity REAL,
      lossFactor REAL DEFAULT 0,
      lastBreakdownDate TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
      onhandPrecision INTEGER DEFAULT 1000000,
      displayUnit TEXT,
      sync_id TEXT,
      is_synced INTEGER DEFAULT 0,
      last_synced_at TEXT,
      sync_version INTEGER DEFAULT 1,
      FOREIGN KEY (companyId) REFERENCES Company(id) ON DELETE CASCADE,
      UNIQUE(companyId, name)
    )
  `);
  
  const insertInventory = db.prepare(`
    INSERT INTO Inventory_new VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  inventories.forEach(i => {
    insertInventory.run(
      idMaps.inventory.get(i.id), i.companyId, i.name, i.category, i.baseUnit,
      i.costPrice, i.salesPrice, i.onhand, i.deleted, i.reorderPoint,
      i.minimumStock, i.description, i.sku, i.barcode, i.allowsUnitBreakdown,
      i.atomicUnit, i.atomicUnitQuantity, i.lossFactor, i.lastBreakdownDate,
      i.createdAt, i.updatedAt, i.onhandPrecision, i.displayUnit, i.sync_id,
      i.is_synced, i.last_synced_at, i.sync_version
    );
  });
  
  db.exec('DROP TABLE Inventory');
  db.exec('ALTER TABLE Inventory_new RENAME TO Inventory');
  console.log(`✓ Migrated ${inventories.length} inventory items\n`);
  
  // 2. Migrate Vendor
  console.log('Migrating Vendor...');
  const vendors = db.prepare('SELECT * FROM Vendor').all();
  vendors.forEach(v => idMaps.vendor.set(v.id, randomUUID()));
  
  db.exec(`
    CREATE TABLE Vendor_new (
      id TEXT PRIMARY KEY,
      companyId TEXT NOT NULL,
      name TEXT NOT NULL,
      contact_person TEXT NOT NULL,
      email TEXT,
      address TEXT,
      phone TEXT,
      taxId TEXT,
      paymentTerms TEXT,
      balance REAL DEFAULT 0,
      status TEXT DEFAULT 'active',
      notes TEXT,
      lastPurchaseDate TEXT,
      totalPurchases REAL DEFAULT 0,
      totalAmount REAL DEFAULT 0,
      deleted INTEGER DEFAULT 0,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
      sync_id TEXT,
      is_synced INTEGER DEFAULT 0,
      last_synced_at TEXT,
      sync_version INTEGER DEFAULT 1,
      FOREIGN KEY (companyId) REFERENCES Company(id) ON DELETE CASCADE,
      UNIQUE(companyId, name)
    )
  `);
  
  const insertVendor = db.prepare(`
    INSERT INTO Vendor_new VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  vendors.forEach(v => {
    insertVendor.run(
      idMaps.vendor.get(v.id), v.companyId, v.name, v.contact_person, v.email,
      v.address, v.phone, v.taxId, v.paymentTerms, v.balance, v.status,
      v.notes, v.lastPurchaseDate, v.totalPurchases, v.totalAmount, v.deleted,
      v.createdAt, v.updatedAt, v.sync_id, v.is_synced, v.last_synced_at,
      v.sync_version
    );
  });
  
  db.exec('DROP TABLE Vendor');
  db.exec('ALTER TABLE Vendor_new RENAME TO Vendor');
  console.log(`✓ Migrated ${vendors.length} vendors\n`);
  
  db.exec('COMMIT');
  console.log('✓ Critical tables migrated successfully!');
  console.log('Note: Additional tables (Receipt, Debt, etc.) will need separate migration');
  
} catch (error) {
  db.exec('ROLLBACK');
  console.error('✗ Migration failed:', error.message);
  console.error(error.stack);
  process.exit(1);
} finally {
  db.pragma('foreign_keys = ON');
  db.close();
}
