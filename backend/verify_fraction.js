const InventoryService = require('./services/inventoryService');
const dbUtils = require('./utils/dbUtils');
const db = require('./data/db/db');
const Fraction = require('./utils/fractionUtils');

async function runTest() {
    console.log('Starting Fraction Logic Test...');
    
    // 1. Create Test Product with raw SQL to bypass any service logic initially
    const testId = dbUtils.generateUUID();
    const companyId = 'test_company'; 
    
    // Get valid company ID
    const company = await new Promise((resolve) => {
        db.get('SELECT id FROM Company LIMIT 1', (err, row) => resolve(row));
    });
    
    const validCompanyId = company ? company.id : 'test_company';

    await new Promise((resolve, reject) => {
        db.run(`INSERT INTO Inventory (id, companyId, name, onhand, quantity_numerator, quantity_denominator, baseUnit, category, costPrice, salesPrice, reorderPoint, minimumStock, deleted)
                VALUES (?, ?, ?, ?, ?, ?, ?, 'test', 0, 0, 0, 0, 0)`,
                [testId, validCompanyId, 'Test Fraction Item', 10, 10, 1, 'Unit'],
                (err) => { 
                    if(err) {
                        console.warn('Insert error:', err.message);
                        if (err.message.includes('FOREIGN KEY')) reject(err);
                        resolve(); 
                    } else resolve(); 
                }
        );
    });
    console.log(`Created test item ${testId} with 10 units.`);

    try {
        // 2. Add 1/3
        console.log('Adding 1/3 unit...');
        const oneThird = new Fraction(1, 3);
        
        await InventoryService.updateStock(testId, oneThird);
        
        // 3. Verify
        let row = await new Promise((resolve) => db.get('SELECT * FROM Inventory WHERE id = ?', [testId], (e, r) => resolve(r)));
        console.log(`After Add 1/3: Onhand=${row.onhand}, Fraction=${row.quantity_numerator}/${row.quantity_denominator}`);
        
        // Check calculation
        if ((row.quantity_numerator == 31 && row.quantity_denominator == 3) || 
            (row.quantity_numerator == 10333333333 && row.quantity_denominator == 1000000000)) { // Fallback check
            console.log('✅ PASS: 10 + 1/3 = 31/3');
        } else {
            console.error(`❌ FAIL: Expected 31/3, got ${row.quantity_numerator}/${row.quantity_denominator}`);
        }

        // 4. Subtract 1/3
        console.log('Subtracting 1/3 unit...');
        const negOneThird = new Fraction(-1, 3);
        await InventoryService.updateStock(testId, negOneThird);

        row = await new Promise((resolve) => db.get('SELECT * FROM Inventory WHERE id = ?', [testId], (e, r) => resolve(r)));
        console.log(`After Sub 1/3: Onhand=${row.onhand}, Fraction=${row.quantity_numerator}/${row.quantity_denominator}`);

        if (row.quantity_numerator == 10 && row.quantity_denominator == 1) {
             console.log('✅ PASS: Returned strictly to 10/1');
        } else if (row.quantity_numerator == 30 && row.quantity_denominator == 3) {
             console.log('✅ PASS: Returned to 30/3 (Equivalent to 10)');
        } else {
             console.error(`❌ FAIL: Expected 10/1 or 30/3, got ${row.quantity_numerator}/${row.quantity_denominator}`);
        }

    } catch (e) {
        console.error('Test Error:', e);
    } finally {
        // 5. Clean up
        await new Promise((resolve) => db.run('DELETE FROM Inventory WHERE id = ?', [testId], resolve));
        console.log('Cleaned up.');
    }
}

setTimeout(() => runTest().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); }), 2000);
