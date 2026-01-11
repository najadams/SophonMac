const db = require('../data/db/db');
const UmbrellaSyncService = require('../services/umbrellaSyncService');
const { v4: uuidv4 } = require('uuid');

async function verify() {
  console.log('Starting verification...');
  let errors = 0;

  // 1. Verify Schema
  try {
    console.log('Verifying Schema...');
    const numCol = await new Promise((resolve) => db.get("SELECT COUNT(*) as c FROM pragma_table_info('Inventory') WHERE name = 'quantity_numerator'", (e, r) => resolve(r)));
    const denCol = await new Promise((resolve) => db.get("SELECT COUNT(*) as c FROM pragma_table_info('Inventory') WHERE name = 'quantity_denominator'", (e, r) => resolve(r)));

    if (numCol.c === 1 && denCol.c === 1) {
      console.log('✅ Schema check passed: Columns exist.');
    } else {
      console.error('❌ Schema check failed: Columns missing.');
      errors++;
    }
  } catch (e) {
    console.error('❌ Schema check error:', e);
    errors++;
  }

  // 2. Verify Product Update Mock
  try {
    console.log('Verifying Product Update (Mock)...');
        // Create a dummy company
    const companyId = uuidv4();
    await new Promise((resolve) => db.run("INSERT INTO Company (id, companyName, password) VALUES (?, ?, ?)", [companyId, 'Test Company ' + companyId, 'pass'], resolve));

    const productId = uuidv4();
    await new Promise((resolve) => {
        db.run(`INSERT INTO Inventory (id, companyId, name, salesPrice, onhand) VALUES (?, ?, ?, ?, ?)`, 
        [productId, companyId, 'Test Product', 10, 5], resolve);
    });

    // Try to update with new columns
    await new Promise((resolve, reject) => {
        db.run(`UPDATE Inventory SET quantity_numerator = ?, quantity_denominator = ? WHERE id = ?`, 
        ['5', '1', productId], (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
    console.log('✅ Product update with new columns passed.');

    // Cleanup
    await new Promise((resolve) => db.run("DELETE FROM Inventory WHERE id = ?", [productId], resolve));
    await new Promise((resolve) => db.run("DELETE FROM Company WHERE id = ?", [companyId], resolve));

  } catch (e) {
    console.error('❌ Product update verification failed:', e);
    errors++;
  }

  // 3. Verify Sync Logic
  try {
    console.log('Verifying Sync Logic...');
    const companyId = uuidv4();
    // Insert initial company
    await new Promise((resolve) => db.run("INSERT INTO Company (id, companyName, password) VALUES (?, ?, ?)", [companyId, 'Sync Test Company', 'pass'], resolve));

    // Simulate partial update (NO NAME)
    const partialUpdate = {
        id: companyId,
        email: 'updated@test.com'
    };

    await UmbrellaSyncService.applyCompanyUpdate(partialUpdate);
    
    // Verify update happened
    const updatedCompany = await new Promise((resolve) => db.get("SELECT * FROM Company WHERE id = ?", [companyId], (e, r) => resolve(r)));
    
    if (updatedCompany.email === 'updated@test.com' && updatedCompany.companyName === 'Sync Test Company') {
        console.log('✅ Sync logic passed: Partial update successful.');
    } else {
        console.error('❌ Sync logic failed: Update not reflected correctly.', updatedCompany);
        errors++;
    }

    // Cleanup
    await new Promise((resolve) => db.run("DELETE FROM Company WHERE id = ?", [companyId], resolve));

  } catch (e) {
    console.error('❌ Sync logic verification failed:', e);
    errors++;
  }

  if (errors === 0) {
    console.log('\n✨ ALL VERIFICATION CHECKS PASSED ✨');
    process.exit(0);
  } else {
    console.error(`\n⚠️ ${errors} verification checks failed.`);
    process.exit(1);
  }
}

verify();
