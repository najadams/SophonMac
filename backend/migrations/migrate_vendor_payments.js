const Database = require('better-sqlite3');
const path = require('path');
const { randomUUID } = require('crypto');

const dbPath = path.join(__dirname, '..', 'data', 'db', 'database.sqlite');
const db = new Database(dbPath);

console.log('Migrating VendorPayment and related tables to UUID...\n');

db.pragma('foreign_keys = OFF');

const idMaps = {
  purchaseOrder: new Map(),
  purchases: new Map()
};

try {
  db.exec('BEGIN TRANSACTION');
  
  // 1. Migrate PurchaseOrder first (referenced by VendorPayment)
  console.log('Migrating PurchaseOrder...');
  const purchaseOrders = db.prepare('SELECT * FROM PurchaseOrder').all();
  purchaseOrders.forEach(po => idMaps.purchaseOrder.set(po.id, randomUUID()));
  
  db.exec(`
    CREATE TABLE PurchaseOrder_new (
      id TEXT PRIMARY KEY,
      companyId TEXT NOT NULL,
      vendorId TEXT NOT NULL,
      orderNumber TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      totalAmount REAL NOT NULL,
      paymentStatus TEXT DEFAULT 'unpaid',
      amountPaid REAL DEFAULT 0,
      dueDate TEXT,
      notes TEXT,
      orderedBy TEXT NOT NULL,
      receivedBy TEXT,
      receivedAt TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (companyId) REFERENCES Company(id) ON DELETE CASCADE,
      FOREIGN KEY (vendorId) REFERENCES Vendor(id) ON DELETE CASCADE,
      FOREIGN KEY (orderedBy) REFERENCES Worker(id) ON DELETE RESTRICT,
      FOREIGN KEY (receivedBy) REFERENCES Worker(id) ON DELETE SET NULL,
      UNIQUE(companyId, orderNumber)
    )
  `);
  
  const insertPurchaseOrder = db.prepare(`
    INSERT INTO PurchaseOrder_new VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  purchaseOrders.forEach(po => {
    insertPurchaseOrder.run(
      idMaps.purchaseOrder.get(po.id), po.companyId, po.vendorId, po.orderNumber,
      po.status, po.totalAmount, po.paymentStatus, po.amountPaid, po.dueDate,
      po.notes, po.orderedBy, po.receivedBy, po.receivedAt, po.createdAt, po.updatedAt
    );
  });
  
  db.exec('DROP TABLE PurchaseOrder');
  db.exec('ALTER TABLE PurchaseOrder_new RENAME TO PurchaseOrder');
  console.log(`✓ Migrated ${purchaseOrders.length} purchase orders\n`);
  
  // 2. Migrate PurchaseOrderItem
  console.log('Migrating PurchaseOrderItem...');
  const purchaseOrderItems = db.prepare('SELECT * FROM PurchaseOrderItem').all();
  
  db.exec(`
    CREATE TABLE PurchaseOrderItem_new (
      id TEXT PRIMARY KEY,
      purchaseOrderId TEXT,
      productId TEXT NOT NULL,
      quantity REAL NOT NULL,
      unit TEXT NOT NULL,
      costPrice REAL NOT NULL,
      totalCost REAL NOT NULL,
      FOREIGN KEY (purchaseOrderId) REFERENCES PurchaseOrder(id) ON DELETE CASCADE,
      FOREIGN KEY (productId) REFERENCES Inventory(id) ON DELETE RESTRICT
    )
  `);
  
  const insertPurchaseOrderItem = db.prepare(`
    INSERT INTO PurchaseOrderItem_new VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  
  purchaseOrderItems.forEach(poi => {
    const newPurchaseOrderId = idMaps.purchaseOrder.get(poi.purchaseOrderId);
    if (newPurchaseOrderId) {
      insertPurchaseOrderItem.run(
        randomUUID(), newPurchaseOrderId, poi.productId, poi.quantity,
        poi.unit, poi.costPrice, poi.totalCost
      );
    }
  });
  
  db.exec('DROP TABLE PurchaseOrderItem');
  db.exec('ALTER TABLE PurchaseOrderItem_new RENAME TO PurchaseOrderItem');
  console.log(`✓ Migrated ${purchaseOrderItems.length} purchase order items\n`);
  
  // 3. Migrate VendorPayment
  console.log('Migrating VendorPayment...');
  const vendorPayments = db.prepare('SELECT * FROM VendorPayment').all();
  
  db.exec(`
    CREATE TABLE VendorPayment_new (
      id TEXT PRIMARY KEY,
      companyId TEXT NOT NULL,
      vendorId TEXT NOT NULL,
      purchaseOrderId TEXT,
      amount REAL NOT NULL,
      paymentDate TEXT NOT NULL,
      paymentMethod TEXT NOT NULL,
      reference TEXT,
      notes TEXT,
      processedBy TEXT NOT NULL,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (companyId) REFERENCES Company(id) ON DELETE CASCADE,
      FOREIGN KEY (vendorId) REFERENCES Vendor(id) ON DELETE CASCADE,
      FOREIGN KEY (purchaseOrderId) REFERENCES PurchaseOrder(id) ON DELETE SET NULL,
      FOREIGN KEY (processedBy) REFERENCES Worker(id) ON DELETE RESTRICT
    )
  `);
  
  const insertVendorPayment = db.prepare(`
    INSERT INTO VendorPayment_new VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  vendorPayments.forEach(vp => {
    const newPurchaseOrderId = vp.purchaseOrderId ? idMaps.purchaseOrder.get(vp.purchaseOrderId) : null;
    insertVendorPayment.run(
      randomUUID(), vp.companyId, vp.vendorId, newPurchaseOrderId, vp.amount,
      vp.paymentDate, vp.paymentMethod, vp.reference, vp.notes, vp.processedBy,
      vp.createdAt, vp.updatedAt
    );
  });
  
  db.exec('DROP TABLE VendorPayment');
  db.exec('ALTER TABLE VendorPayment_new RENAME TO VendorPayment');
  console.log(`✓ Migrated ${vendorPayments.length} vendor payments\n`);
  
  // 4. Migrate Purchases
  console.log('Migrating Purchases...');
  const purchases = db.prepare('SELECT * FROM Purchases').all();
  purchases.forEach(p => idMaps.purchases.set(p.id, randomUUID()));
  
  db.exec(`
    CREATE TABLE Purchases_new (
      id TEXT PRIMARY KEY,
      vendorId TEXT NOT NULL,
      companyId TEXT NOT NULL,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (vendorId) REFERENCES Vendor(id) ON DELETE CASCADE,
      FOREIGN KEY (companyId) REFERENCES Company(id) ON DELETE CASCADE
    )
  `);
  
  const insertPurchases = db.prepare(`
    INSERT INTO Purchases_new VALUES (?, ?, ?, ?, ?)
  `);
  
  purchases.forEach(p => {
    insertPurchases.run(
      idMaps.purchases.get(p.id), p.vendorId, p.companyId, p.createdAt, p.updatedAt
    );
  });
  
  db.exec('DROP TABLE Purchases');
  db.exec('ALTER TABLE Purchases_new RENAME TO Purchases');
  console.log(`✓ Migrated ${purchases.length} purchases\n`);
  
  // 5. Migrate PurchasesDetail
  console.log('Migrating PurchasesDetail...');
  const purchasesDetails = db.prepare('SELECT * FROM PurchasesDetail').all();
  
  db.exec(`
    CREATE TABLE PurchasesDetail_new (
      id TEXT PRIMARY KEY,
      purchasesId TEXT,
      name TEXT NOT NULL,
      quantity REAL NOT NULL,
      costPrice REAL NOT NULL,
      salesPrice REAL NOT NULL,
      FOREIGN KEY (purchasesId) REFERENCES Purchases(id) ON DELETE CASCADE
    )
  `);
  
  const insertPurchasesDetail = db.prepare(`
    INSERT INTO PurchasesDetail_new VALUES (?, ?, ?, ?, ?, ?)
  `);
  
  purchasesDetails.forEach(pd => {
    const newPurchasesId = idMaps.purchases.get(pd.purchasesId);
    if (newPurchasesId) {
      insertPurchasesDetail.run(
        randomUUID(), newPurchasesId, pd.name, pd.quantity, pd.costPrice, pd.salesPrice
      );
    }
  });
  
  db.exec('DROP TABLE PurchasesDetail');
  db.exec('ALTER TABLE PurchasesDetail_new RENAME TO PurchasesDetail');
  console.log(`✓ Migrated ${purchasesDetails.length} purchases details\n`);
  
  db.exec('COMMIT');
  console.log('✓ All vendor/purchase-related tables migrated successfully!');
  
} catch (error) {
  db.exec('ROLLBACK');
  console.error('✗ Migration failed:', error.message);
  console.error(error.stack);
  process.exit(1);
} finally {
  db.pragma('foreign_keys = ON');
  db.close();
}
