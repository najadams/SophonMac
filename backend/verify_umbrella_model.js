const db = require('./data/db/db');

async function verifyUmbrellaModel() {
  console.log('Starting Umbrella Model Verification...');

  try {
    // 1. Setup Test Companies
    const parentId = await createCompany('Umbrella Parent', 'umbrella_parent');
    const child1Id = await createCompany('Child Store A', 'umbrella_child', parentId);
    const child2Id = await createCompany('Child Store B', 'umbrella_child', parentId);

    console.log(`Created Companies: Parent(${parentId}), Child1(${child1Id}), Child2(${child2Id})`);

    // 2. Setup Inventory
    const prod1Id = await createProduct(child1Id, 'Widget A', 'SKU001', 100, 10.00); // 100 units @ $10
    const prod2Id = await createProduct(child2Id, 'Widget A', 'SKU001', 0, 10.00);   // 0 units @ $10

    console.log(`Created Inventory: Child1 has 100 units, Child2 has 0 units`);

    // 3. Simulate Sales (Tax Liability Test)
    await createSale(child1Id, 500.00); // $500 sales
    await createSale(child2Id, 300.00); // $300 sales

    // 4. Verify Aggregation Logic
    const totalSales = await getAggregatedSales(parentId);
    console.log(`Aggregated Sales for Parent: ${totalSales} (Expected: 800.00)`);

    if (totalSales === 800) {
      console.log('✅ Tax Aggregation Verified');
    } else {
      console.error('❌ Tax Aggregation Failed');
    }

    // 5. Verify Internal Transfer Logic
    console.log('Testing Internal Transfer...');
    // Move 10 units from Child1 to Child2
    await transferStock(child1Id, child2Id, prod1Id, prod2Id, 10);

    const stock1 = await getStock(prod1Id);
    const stock2 = await getStock(prod2Id);

    console.log(`Post-Transfer Stock: Child1(${stock1}), Child2(${stock2}) (Expected: 90, 10)`);

    if (stock1 === 90 && stock2 === 10) {
      console.log('✅ Internal Transfer Verified');
    } else {
      console.error('❌ Internal Transfer Failed');
    }

  } catch (error) {
    console.error('Verification Error:', error);
  }
}

// Helpers using the shim (callback-based)
function createCompany(name, mode, parentId = null) {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO Company (companyName, password, email, taxMode, parentCompanyId) VALUES (?, ?, ?, ?, ?)',
      [name, 'pass', `test_${Date.now()}_${Math.random()}@test.com`, mode, parentId],
      function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
  });
}

function createProduct(companyId, name, sku, qty, price) {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO Inventory (companyId, name, sku, onhand, salesPrice) VALUES (?, ?, ?, ?, ?)',
      [companyId, name, sku, qty, price],
      function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
  });
}

function createSale(companyId, total) {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO Receipt (companyId, total, amountPaid, profit) VALUES (?, ?, ?, ?)',
      [companyId, total, total, total * 0.2],
      function(err) {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

function getAggregatedSales(parentId) {
  return new Promise((resolve, reject) => {
    db.all('SELECT id FROM Company WHERE parentCompanyId = ?', [parentId], (err, rows) => {
      if (err) return reject(err);
      
      const ids = [parentId, ...rows.map(c => c.id)];
      const placeholders = ids.map(() => '?').join(',');
      
      db.get(
        `SELECT SUM(total) as total FROM Receipt WHERE companyId IN (${placeholders})`,
        ids,
        (err, row) => {
          if (err) reject(err);
          else resolve(row.total || 0);
        }
      );
    });
  });
}

function transferStock(sourceComp, targetComp, sourceProd, targetProd, qty) {
  return new Promise((resolve, reject) => {
    db.run('UPDATE Inventory SET onhand = onhand - ? WHERE id = ?', [qty, sourceProd], (err) => {
      if (err) return reject(err);
      db.run('UPDATE Inventory SET onhand = onhand + ? WHERE id = ?', [qty, targetProd], (err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  });
}

function getStock(prodId) {
  return new Promise((resolve, reject) => {
    db.get('SELECT onhand FROM Inventory WHERE id = ?', [prodId], (err, row) => {
      if (err) reject(err);
      else resolve(row.onhand);
    });
  });
}

// Run
if (require.main === module) {
  // db is already required at the top
}

verifyUmbrellaModel();
