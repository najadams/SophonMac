const Database = require('better-sqlite3');
const path = require('path');
const { randomUUID } = require('crypto');

const dbPath = path.join(__dirname, '..', 'data', 'db', 'database.sqlite');
const db = new Database(dbPath);

console.log('Migrating remaining tables to UUID...\n');

db.pragma('foreign_keys = OFF');

const idMaps = {
  customer: new Map(),
  vendor: new Map(),
  inventory: new Map(),
  receipt: new Map(),
  debt: new Map(),
  settings: new Map(),
  purchaseOrder: new Map(),
  supplies: new Map()
};

try {
  db.exec('BEGIN TRANSACTION');
  
  // Migrate Customer
  console.log('Migrating Customer...');
  const customers = db.prepare('SELECT * FROM Customer').all();
  customers.forEach(c => idMaps.customer.set(c.id, randomUUID()));
  
  db.exec(`
    CREATE TABLE Customer_new (
      id TEXT PRIMARY KEY,
      belongsTo TEXT NOT NULL,
      company TEXT DEFAULT 'nocompany',
      name TEXT NOT NULL,
      address TEXT,
      city TEXT,
      loyaltyPoints REAL DEFAULT 0,
      totalSpent REAL DEFAULT 0,
      lastPurchaseDate TEXT,
      notes TEXT,
      deleted INTEGER DEFAULT 0,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
      sync_id TEXT,
      is_synced INTEGER DEFAULT 0,
      last_synced_at TEXT,
      sync_version INTEGER DEFAULT 1,
      FOREIGN KEY (belongsTo) REFERENCES Company(id) ON DELETE CASCADE,
      UNIQUE(belongsTo, name, company)
    )
  `);
  
  const insertCustomer = db.prepare(`
    INSERT INTO Customer_new VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  customers.forEach(c => {
    insertCustomer.run(
      idMaps.customer.get(c.id), c.belongsTo, c.company, c.name, c.address,
      c.city, c.loyaltyPoints, c.totalSpent, c.lastPurchaseDate, c.notes,
      c.deleted, c.createdAt, c.updatedAt, c.sync_id, c.is_synced,
      c.last_synced_at, c.sync_version
    );
  });
  
  db.exec('DROP TABLE Customer');
  db.exec('ALTER TABLE Customer_new RENAME TO Customer');
  console.log(`✓ Migrated ${customers.length} customers\n`);
  
  // Migrate CustomerPhone
  console.log('Migrating CustomerPhone...');
  const customerPhones = db.prepare('SELECT * FROM CustomerPhone').all();
  
  db.exec(`
    CREATE TABLE CustomerPhone_new (
      id TEXT PRIMARY KEY,
      customerId TEXT,
      phone TEXT,
      FOREIGN KEY (customerId) REFERENCES Customer(id) ON DELETE CASCADE
    )
  `);
  
  const insertCustomerPhone = db.prepare(`
    INSERT INTO CustomerPhone_new VALUES (?, ?, ?)
  `);
  
  customerPhones.forEach(cp => {
    const newCustomerId = idMaps.customer.get(cp.customerId);
    if (newCustomerId) {
      insertCustomerPhone.run(randomUUID(), newCustomerId, cp.phone);
    }
  });
  
  db.exec('DROP TABLE CustomerPhone');
  db.exec('ALTER TABLE CustomerPhone_new RENAME TO CustomerPhone');
  console.log(`✓ Migrated ${customerPhones.length} customer phones\n`);
  
  // Migrate CustomerEmail
  console.log('Migrating CustomerEmail...');
  const customerEmails = db.prepare('SELECT * FROM CustomerEmail').all();
  
  db.exec(`
    CREATE TABLE CustomerEmail_new (
      id TEXT PRIMARY KEY,
      customerId TEXT,
      email TEXT,
      FOREIGN KEY (customerId) REFERENCES Customer(id) ON DELETE CASCADE
    )
  `);
  
  const insertCustomerEmail = db.prepare(`
    INSERT INTO CustomerEmail_new VALUES (?, ?, ?)
  `);
  
  customerEmails.forEach(ce => {
    const newCustomerId = idMaps.customer.get(ce.customerId);
    if (newCustomerId) {
      insertCustomerEmail.run(randomUUID(), newCustomerId, ce.email);
    }
  });
  
  db.exec('DROP TABLE CustomerEmail');
  db.exec('ALTER TABLE CustomerEmail_new RENAME TO CustomerEmail');
  console.log(`✓ Migrated ${customerEmails.length} customer emails\n`);
  
  db.exec('COMMIT');
  console.log('✓ All tables migrated successfully!');
  
} catch (error) {
  db.exec('ROLLBACK');
  console.error('✗ Migration failed:', error.message);
  console.error(error.stack);
  process.exit(1);
} finally {
  db.pragma('foreign_keys = ON');
  db.close();
}
