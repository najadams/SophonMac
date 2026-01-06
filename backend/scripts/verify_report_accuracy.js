const Database = require('better-sqlite3');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const Fraction = require('../utils/fractionUtils');

// Connect to DB
const dbPath = path.resolve(__dirname, '../data/db/database.sqlite');
console.log('Opening database at:', dbPath);
const db = new Database(dbPath);

// Mock InventoryService Update Logic (Simplified for script, keeping core math)
// In a real app we would import InventoryService, but for this standalone script we'll inline the DB logic 
// to ensure we strictly test the Data -> Report flow without environmental dependencies.
// HOWEVER, to test "Making Sales", we should realistically mimic the Controller.

const runTest = () => {
  console.log('Starting Comprehensive Report Accuracy Test...');

  const companyId = 'test-accuracy-' + Date.now();
  const testDate = new Date().toISOString().split('T')[0]; // Today
  
  // 1. Setup Wrapper: Create a few products
  const products = [
    { id: uuidv4(), name: 'Test Unit Item', category: 'General', type: 'single', unit: 'pcs', costPrice: 10, salesPrice: 20, onhand: 100 },
    { id: uuidv4(), name: 'Test Box Item', category: 'General', type: 'single', unit: 'box', costPrice: 50, salesPrice: 100, onhand: 10 }, // Box of something
  ];

  const transaction = db.transaction(() => {
    // Insert Products
    for (const p of products) {
        db.prepare(`INSERT INTO Inventory (id, companyId, name, category, type, baseUnit, costPrice, salesPrice, onhand, quantity_numerator, quantity_denominator, deleted) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`).run(
            p.id, companyId, p.name, p.category, p.type, p.unit, p.costPrice, p.salesPrice, p.onhand, p.onhand, 1
        );
    }
    console.log('Inserted test products.');

    // 2. Scenario 1: Simple Cash Sale of "Test Unit Item" (5 qty)
    // Revenue: 5 * 20 = 100
    // Payment: 100 Cash
    const receipt1Id = uuidv4();
    db.prepare(`INSERT INTO Receipt (id, companyId, total, amountPaid, paymentMethod, createdAt, discount) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
        receipt1Id, companyId, 100, 100, 'cash', new Date().toISOString(), 0
    );
    db.prepare(`INSERT INTO ReceiptPayment (id, receiptId, amount, paymentMethod) VALUES (?, ?, ?, ?)`).run(
        uuidv4(), receipt1Id, 100, 'cash'
    );
    // Deduct Stock
    // New Onhand: 95
    db.prepare(`UPDATE Inventory SET onhand = 95, quantity_numerator = 95 WHERE id = ?`).run(products[0].id);

    // 3. Scenario 2: Split Payment Sale of "Test Box Item" (2 qty)
    // Revenue: 2 * 100 = 200
    // Payment: 100 Cash + 100 Momo
    const receipt2Id = uuidv4();
    db.prepare(`INSERT INTO Receipt (id, companyId, total, amountPaid, paymentMethod, createdAt, discount) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
        receipt2Id, companyId, 200, 200, 'split', new Date().toISOString(), 0
    );
    db.prepare(`INSERT INTO ReceiptPayment (id, receiptId, amount, paymentMethod) VALUES (?, ?, ?, ?)`).run(
        uuidv4(), receipt2Id, 100, 'cash'
    );
    db.prepare(`INSERT INTO ReceiptPayment (id, receiptId, amount, paymentMethod) VALUES (?, ?, ?, ?)`).run(
        uuidv4(), receipt2Id, 100, 'mobile_money'
    );
    // Deduct Stock
    // New Onhand: 8
    db.prepare(`UPDATE Inventory SET onhand = 8, quantity_numerator = 8 WHERE id = ?`).run(products[1].id);

    // 4. Scenario 3: Partial Sale / Units Change (Selling fraction)
    // "Test Unit Item" sold as 0.5 (maybe it's weight based?) or let's say we have a conversion.
    // Let's keep it simple: Selling 2.5 of "Test Unit Item"
    // Revenue: 2.5 * 20 = 50
    // Payment: 50 Card
    const receipt3Id = uuidv4();
    db.prepare(`INSERT INTO Receipt (id, companyId, total, amountPaid, paymentMethod, createdAt, discount) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
        receipt3Id, companyId, 50, 50, 'card', new Date().toISOString(), 0
    );
    db.prepare(`INSERT INTO ReceiptPayment (id, receiptId, amount, paymentMethod) VALUES (?, ?, ?, ?)`).run(
        uuidv4(), receipt3Id, 50, 'card'
    );
    // Deduct Stock (95 - 2.5 = 92.5)
    db.prepare(`UPDATE Inventory SET onhand = 92.5, quantity_numerator = 185, quantity_denominator = 2 WHERE id = ?`).run(products[0].id);

    console.log('Inserted test sales.');
  });

  transaction();

  // 5. Query the Report
  console.log('Querying Summary Report...');
  const summaryQuery = `
    SELECT 
      (SELECT COALESCE(SUM(rp.amount), 0) FROM ReceiptPayment rp JOIN Receipt r ON rp.receiptId = r.id WHERE r.companyId = ? AND rp.paymentMethod = 'cash') as salesCash,
      (SELECT COALESCE(SUM(rp.amount), 0) FROM ReceiptPayment rp JOIN Receipt r ON rp.receiptId = r.id WHERE r.companyId = ? AND rp.paymentMethod = 'mobile_money') as salesMomo,
      (SELECT COALESCE(SUM(rp.amount), 0) FROM ReceiptPayment rp JOIN Receipt r ON rp.receiptId = r.id WHERE r.companyId = ? AND rp.paymentMethod = 'card') as salesCard,
      (SELECT COALESCE(SUM(total), 0) FROM Receipt WHERE companyId = ?) as totalSales
    FROM (SELECT 1)
  `;

  // We are not filtering by date here just to keep it simple, checking by companyId is enough for isolation
  const result = db.prepare(summaryQuery).get(companyId, companyId, companyId, companyId);
  
  console.log('Report Result:', result);

  // 6. Assertions
  const expectedCash = 100 + 100; // Sale 1 + half of Sale 2
  const expectedMomo = 100;       // Half of Sale 2
  const expectedCard = 50;        // Sale 3
  const expectedTotal = 100 + 200 + 50; // 350

  let passed = true;
  if(result.salesCash !== expectedCash) { console.error(`❌ Mismatch Cash: Expected ${expectedCash}, Got ${result.salesCash}`); passed = false; }
  if(result.salesMomo !== expectedMomo) { console.error(`❌ Mismatch Momo: Expected ${expectedMomo}, Got ${result.salesMomo}`); passed = false; }
  if(result.salesCard !== expectedCard) { console.error(`❌ Mismatch Card: Expected ${expectedCard}, Got ${result.salesCard}`); passed = false; }
  if(result.totalSales !== expectedTotal) { console.error(`❌ Mismatch Total: Expected ${expectedTotal}, Got ${result.totalSales}`); passed = false; }

  if(passed) console.log('✅ ALL TEST SCENARIOS PASSED');
  else console.error('❌ SOME TESTS FAILED'); // Typo fix
};

try {
    runTest();
} catch (e) {
    console.error(e);
} finally {
    db.close();
}
