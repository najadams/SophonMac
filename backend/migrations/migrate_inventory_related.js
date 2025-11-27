const Database = require('better-sqlite3');
const path = require('path');
const { randomUUID } = require('crypto');

const dbPath = path.join(__dirname, '..', 'data', 'db', 'database.sqlite');
const db = new Database(dbPath);

console.log('Migrating inventory-related tables to UUID...\n');

db.pragma('foreign_keys = OFF');

try {
  db.exec('BEGIN TRANSACTION');
  
  // Get existing inventory IDs (already migrated to UUID)
  const inventories = db.prepare('SELECT id FROM Inventory').all();
  console.log(`Found ${inventories.length} inventory items (already using UUID)\n`);
  
  // 1. Migrate StockTransaction
  console.log('Migrating StockTransaction...');
  const stockTransactions = db.prepare('SELECT * FROM StockTransaction').all();
  
  db.exec(`
    CREATE TABLE StockTransaction_new (
      id TEXT PRIMARY KEY,
      inventoryId TEXT,
      type TEXT NOT NULL,
      quantity REAL NOT NULL,
      costPrice REAL NOT NULL,
      salesPrice REAL,
      expirationDate TEXT,
      transactionDate TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (inventoryId) REFERENCES Inventory(id) ON DELETE CASCADE
    )
  `);
  
  const insertStockTransaction = db.prepare(`
    INSERT INTO StockTransaction_new VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  stockTransactions.forEach(st => {
    insertStockTransaction.run(
      randomUUID(), st.inventoryId, st.type, st.quantity, st.costPrice,
      st.salesPrice, st.expirationDate, st.transactionDate
    );
  });
  
  db.exec('DROP TABLE StockTransaction');
  db.exec('ALTER TABLE StockTransaction_new RENAME TO StockTransaction');
  console.log(`✓ Migrated ${stockTransactions.length} stock transactions\n`);
  
  // 2. Migrate other inventory-related tables
  const tables = [
    { name: 'InventoryUnits', columns: 'id TEXT PRIMARY KEY, inventoryId TEXT, unit TEXT' },
    { name: 'UnitConversion', columns: 'id TEXT PRIMARY KEY, inventoryId TEXT, fromUnit TEXT NOT NULL, toUnit TEXT NOT NULL, conversionRate REAL NOT NULL, unitPrice REAL NOT NULL' },
    { name: 'PriceChange', columns: 'id TEXT PRIMARY KEY, inventoryId TEXT, date TEXT DEFAULT CURRENT_TIMESTAMP, costPrice REAL, salesPrice REAL' },
    { name: 'BreakdownHistory', columns: 'id TEXT PRIMARY KEY, inventoryId TEXT, date TEXT DEFAULT CURRENT_TIMESTAMP, fromUnit TEXT, toUnit TEXT, quantity REAL, loss REAL, notes TEXT' },
    { name: 'InventoryCalculations', columns: 'id TEXT PRIMARY KEY, productId TEXT NOT NULL, avgDailyDemands REAL NOT NULL, eoq REAL NOT NULL, reorderPoint REAL NOT NULL, safetyStock REAL NOT NULL, averageDailySales REAL NOT NULL, leadTimeDays REAL DEFAULT 7 NOT NULL, demandStdDev REAL NOT NULL, leadTimeStdDev REAL NOT NULL, createdAt TEXT DEFAULT CURRENT_TIMESTAMP, updatedAt TEXT DEFAULT CURRENT_TIMESTAMP' }
  ];
  
  for (const table of tables) {
    console.log(`Migrating ${table.name}...`);
    const records = db.prepare(`SELECT * FROM ${table.name}`).all();
    
    db.exec(`CREATE TABLE ${table.name}_new (${table.columns}, FOREIGN KEY (${table.name === 'InventoryCalculations' ? 'productId' : 'inventoryId'}) REFERENCES Inventory(id) ON DELETE CASCADE)`);
    
    if (records.length > 0) {
      const cols = Object.keys(records[0]);
      const placeholders = cols.map(() => '?').join(', ');
      const insert = db.prepare(`INSERT INTO ${table.name}_new VALUES (${placeholders})`);
      
      records.forEach(r => {
        const values = cols.map(col => col === 'id' ? randomUUID() : r[col]);
        insert.run(...values);
      });
    }
    
    db.exec(`DROP TABLE ${table.name}`);
    db.exec(`ALTER TABLE ${table.name}_new RENAME TO ${table.name}`);
    console.log(`✓ Migrated ${records.length} ${table.name} records\n`);
  }
  
  db.exec('COMMIT');
  console.log('✓ All inventory-related tables migrated successfully!');
  
} catch (error) {
  db.exec('ROLLBACK');
  console.error('✗ Migration failed:', error.message);
  console.error(error.stack);
  process.exit(1);
} finally {
  db.pragma('foreign_keys = ON');
  db.close();
}
