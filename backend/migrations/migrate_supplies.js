const Database = require('better-sqlite3');
const path = require('path');
const { randomUUID } = require('crypto');

const dbPath = path.join(__dirname, '..', 'data', 'db', 'database.sqlite');
const db = new Database(dbPath);

console.log('Migrating Supplies tables to UUID...\n');

db.pragma('foreign_keys = OFF');

const idMaps = {
  supplies: new Map()
};

try {
  db.exec('BEGIN TRANSACTION');
  
  // 1. Migrate Supplies
  console.log('Migrating Supplies...');
  const supplies = db.prepare('SELECT * FROM Supplies').all();
  supplies.forEach(s => idMaps.supplies.set(s.id, randomUUID()));
  
  db.exec(`
    CREATE TABLE Supplies_new (
      id TEXT PRIMARY KEY,
      companyId TEXT,
      supplierId TEXT,
      totalCost REAL,
      totalQuantity REAL,
      amountPaid REAL DEFAULT 0,
      discount REAL DEFAULT 0,
      balance REAL DEFAULT 0,
      status TEXT DEFAULT 'pending',
      restockDate TEXT DEFAULT CURRENT_TIMESTAMP,
      restockedBy TEXT NOT NULL,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (companyId) REFERENCES Company(id) ON DELETE CASCADE,
      FOREIGN KEY (supplierId) REFERENCES Vendor(id) ON DELETE SET NULL,
      FOREIGN KEY (restockedBy) REFERENCES Worker(id) ON DELETE RESTRICT
    )
  `);
  
  const insertSupplies = db.prepare(`
    INSERT INTO Supplies_new VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  supplies.forEach(s => {
    insertSupplies.run(
      idMaps.supplies.get(s.id), s.companyId, s.supplierId, s.totalCost,
      s.totalQuantity, s.amountPaid, s.discount, s.balance, s.status,
      s.restockDate, s.restockedBy, s.createdAt, s.updatedAt
    );
  });
  
  db.exec('DROP TABLE Supplies');
  db.exec('ALTER TABLE Supplies_new RENAME TO Supplies');
  console.log(`✓ Migrated ${supplies.length} supplies\n`);
  
  // 2. Migrate SuppliesDetail
  console.log('Migrating SuppliesDetail...');
  const suppliesDetails = db.prepare('SELECT * FROM SuppliesDetail').all();
  
  db.exec(`
    CREATE TABLE SuppliesDetail_new (
      id TEXT PRIMARY KEY,
      suppliesId TEXT,
      name TEXT NOT NULL,
      quantity REAL NOT NULL,
      costPrice REAL NOT NULL,
      salesPrice REAL NOT NULL,
      totalPrice REAL NOT NULL,
      FOREIGN KEY (suppliesId) REFERENCES Supplies(id) ON DELETE CASCADE
    )
  `);
  
  const insertSuppliesDetail = db.prepare(`
    INSERT INTO SuppliesDetail_new VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  
  suppliesDetails.forEach(sd => {
    const newSuppliesId = idMaps.supplies.get(sd.suppliesId);
    if (newSuppliesId) {
      insertSuppliesDetail.run(
        randomUUID(), newSuppliesId, sd.name, sd.quantity, sd.costPrice,
        sd.salesPrice, sd.totalPrice
      );
    }
  });
  
  db.exec('DROP TABLE SuppliesDetail');
  db.exec('ALTER TABLE SuppliesDetail_new RENAME TO SuppliesDetail');
  console.log(`✓ Migrated ${suppliesDetails.length} supplies details\n`);
  
  db.exec('COMMIT');
  console.log('✓ Supplies tables migrated successfully!');
  
} catch (error) {
  db.exec('ROLLBACK');
  console.error('✗ Migration failed:', error.message);
  console.error(error.stack);
  process.exit(1);
} finally {
  db.pragma('foreign_keys = ON');
  db.close();
}
