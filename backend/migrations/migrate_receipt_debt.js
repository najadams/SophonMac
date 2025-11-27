const Database = require('better-sqlite3');
const path = require('path');
const { randomUUID } = require('crypto');

const dbPath = path.join(__dirname, '..', 'data', 'db', 'database.sqlite');
const db = new Database(dbPath);

console.log('Migrating Receipt and related tables to UUID...\n');

db.pragma('foreign_keys = OFF');

const idMaps = {
  receipt: new Map(),
  debt: new Map()
};

try {
  db.exec('BEGIN TRANSACTION');
  
  // 1. Migrate Receipt
  console.log('Migrating Receipt...');
  const receipts = db.prepare('SELECT * FROM Receipt').all();
  receipts.forEach(r => idMaps.receipt.set(r.id, randomUUID()));
  
  db.exec(`
    CREATE TABLE Receipt_new (
      id TEXT PRIMARY KEY,
      companyId TEXT NOT NULL,
      workerId TEXT,
      customerId TEXT,
      debtId TEXT,
      total REAL NOT NULL,
      amountPaid REAL NOT NULL,
      discount REAL DEFAULT 0,
      balance REAL DEFAULT 0,
      profit REAL NOT NULL,
      paymentMethod TEXT DEFAULT 'cash',
      flagged INTEGER DEFAULT 0,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
      sync_id TEXT,
      is_synced INTEGER DEFAULT 0,
      last_synced_at TEXT,
      sync_version INTEGER DEFAULT 1,
      FOREIGN KEY (companyId) REFERENCES Company(id) ON DELETE CASCADE,
      FOREIGN KEY (workerId) REFERENCES Worker(id) ON DELETE SET NULL,
      FOREIGN KEY (customerId) REFERENCES Customer(id) ON DELETE SET NULL,
      FOREIGN KEY (debtId) REFERENCES Debt(id) ON DELETE SET NULL
    )
  `);
  
  const insertReceipt = db.prepare(`
    INSERT INTO Receipt_new VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  receipts.forEach(r => {
    insertReceipt.run(
      idMaps.receipt.get(r.id), r.companyId, r.workerId, r.customerId, r.debtId,
      r.total, r.amountPaid, r.discount, r.balance, r.profit, r.paymentMethod,
      r.flagged, r.createdAt, r.updatedAt, r.sync_id, r.is_synced,
      r.last_synced_at, r.sync_version
    );
  });
  
  db.exec('DROP TABLE Receipt');
  db.exec('ALTER TABLE Receipt_new RENAME TO Receipt');
  console.log(`✓ Migrated ${receipts.length} receipts\n`);
  
  // 2. Migrate ReceiptDetail
  console.log('Migrating ReceiptDetail...');
  const receiptDetails = db.prepare('SELECT * FROM ReceiptDetail').all();
  
  db.exec(`
    CREATE TABLE ReceiptDetail_new (
      id TEXT PRIMARY KEY,
      receiptId TEXT,
      name TEXT NOT NULL,
      quantity REAL NOT NULL,
      costPrice REAL NOT NULL,
      salesPrice REAL NOT NULL,
      salesUnit TEXT,
      originalQuantity REAL,
      baseUnitQuantity REAL,
      conversionRate REAL DEFAULT 1,
      atomicQuantity REAL,
      totalPrice REAL,
      FOREIGN KEY (receiptId) REFERENCES Receipt(id) ON DELETE CASCADE
    )
  `);
  
  const insertReceiptDetail = db.prepare(`
    INSERT INTO ReceiptDetail_new VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  receiptDetails.forEach(rd => {
    const newReceiptId = idMaps.receipt.get(rd.receiptId);
    if (newReceiptId) {
      insertReceiptDetail.run(
        randomUUID(), newReceiptId, rd.name, rd.quantity, rd.costPrice,
        rd.salesPrice, rd.salesUnit, rd.originalQuantity, rd.baseUnitQuantity,
        rd.conversionRate, rd.atomicQuantity, rd.totalPrice
      );
    }
  });
  
  db.exec('DROP TABLE ReceiptDetail');
  db.exec('ALTER TABLE ReceiptDetail_new RENAME TO ReceiptDetail');
  console.log(`✓ Migrated ${receiptDetails.length} receipt details\n`);
  
  // 3. Migrate Debt
  console.log('Migrating Debt...');
  const debts = db.prepare('SELECT * FROM Debt').all();
  debts.forEach(d => idMaps.debt.set(d.id, randomUUID()));
  
  db.exec(`
    CREATE TABLE Debt_new (
      id TEXT PRIMARY KEY,
      companyId TEXT,
      workerId TEXT,
      customerId TEXT NOT NULL,
      receiptId TEXT,
      amount REAL NOT NULL,
      status TEXT DEFAULT 'pending',
      dueDate TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
      sync_id TEXT,
      is_synced INTEGER DEFAULT 0,
      last_synced_at TEXT,
      sync_version INTEGER DEFAULT 1,
      FOREIGN KEY (companyId) REFERENCES Company(id) ON DELETE CASCADE,
      FOREIGN KEY (workerId) REFERENCES Worker(id) ON DELETE SET NULL,
      FOREIGN KEY (customerId) REFERENCES Customer(id) ON DELETE CASCADE,
      FOREIGN KEY (receiptId) REFERENCES Receipt(id) ON DELETE SET NULL,
      UNIQUE(receiptId)
    )
  `);
  
  const insertDebt = db.prepare(`
    INSERT INTO Debt_new VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  debts.forEach(d => {
    const newReceiptId = idMaps.receipt.get(d.receiptId);
    insertDebt.run(
      idMaps.debt.get(d.id), d.companyId, d.workerId, d.customerId,
      newReceiptId, d.amount, d.status, d.dueDate, d.createdAt, d.updatedAt,
      d.sync_id, d.is_synced, d.last_synced_at, d.sync_version
    );
  });
  
  db.exec('DROP TABLE Debt');
  db.exec('ALTER TABLE Debt_new RENAME TO Debt');
  console.log(`✓ Migrated ${debts.length} debts\n`);
  
  // 4. Update Receipt table to reference new Debt IDs
  console.log('Updating Receipt.debtId references...');
  const updateReceiptDebt = db.prepare('UPDATE Receipt SET debtId = ? WHERE id = ?');
  receipts.forEach(r => {
    if (r.debtId) {
      const newDebtId = idMaps.debt.get(r.debtId);
      const newReceiptId = idMaps.receipt.get(r.id);
      if (newDebtId && newReceiptId) {
        updateReceiptDebt.run(newDebtId, newReceiptId);
      }
    }
  });
  console.log('✓ Updated Receipt.debtId references\n');
  
  // 5. Migrate DebtPayment
  console.log('Migrating DebtPayment...');
  const debtPayments = db.prepare('SELECT * FROM DebtPayment').all();
  
  db.exec(`
    CREATE TABLE DebtPayment_new (
      id TEXT PRIMARY KEY,
      debtId TEXT,
      date TEXT DEFAULT CURRENT_TIMESTAMP,
      amountPaid REAL NOT NULL,
      workerId TEXT,
      paymentMethod TEXT DEFAULT 'cash',
      FOREIGN KEY (debtId) REFERENCES Debt(id) ON DELETE CASCADE,
      FOREIGN KEY (workerId) REFERENCES Worker(id) ON DELETE SET NULL
    )
  `);
  
  const insertDebtPayment = db.prepare(`
    INSERT INTO DebtPayment_new VALUES (?, ?, ?, ?, ?, ?)
  `);
  
  debtPayments.forEach(dp => {
    const newDebtId = idMaps.debt.get(dp.debtId);
    if (newDebtId) {
      insertDebtPayment.run(
        randomUUID(), newDebtId, dp.date, dp.amountPaid, dp.workerId, dp.paymentMethod
      );
    }
  });
  
  db.exec('DROP TABLE DebtPayment');
  db.exec('ALTER TABLE DebtPayment_new RENAME TO DebtPayment');
  console.log(`✓ Migrated ${debtPayments.length} debt payments\n`);
  
  db.exec('COMMIT');
  console.log('✓ All receipt-related tables migrated successfully!');
  
} catch (error) {
  db.exec('ROLLBACK');
  console.error('✗ Migration failed:', error.message);
  console.error(error.stack);
  process.exit(1);
} finally {
  db.pragma('foreign_keys = ON');
  db.close();
}
