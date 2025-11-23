const SyncEngine = require('./services/syncEngine');
const db = require('./data/db/db');
const { createSupabaseServiceClient } = require('./config/supabase.config');

// Mock dependencies
const mockWsServer = {
  on: () => {},
  broadcastToCompany: () => {},
  broadcastToPeers: () => {}
};

const mockNetworkDiscovery = {
  on: () => {},
  getInstanceId: () => 'test-instance'
};

// Initialize SyncEngine
const syncEngine = new SyncEngine(mockWsServer, mockNetworkDiscovery);

// Helper to run DB queries
function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function getQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

async function runTest() {
  console.log('Starting Conflict Resolution Test...');
  
  const testTable = 'Inventory'; // Use Inventory table for testing
  const testId = 99999;
  const syncId = 'test-sync-id-123';
  const companyId = 1;

  try {
    // 1. Setup: Create a local record with a specific timestamp
    const localTime = new Date();
    const olderTime = new Date(localTime.getTime() - 100000); // 100 seconds ago
    const newerTime = new Date(localTime.getTime() + 100000); // 100 seconds future

    console.log('Setting up test record...');
    await runQuery(`DELETE FROM ${testTable} WHERE id = ?`, [testId]);
    
    // Insert local record
    await runQuery(`
      INSERT INTO ${testTable} (id, companyId, name, salesPrice, updatedAt, sync_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [testId, companyId, 'Test Product', 100, localTime.toISOString(), syncId]);

    console.log(`Local record created with updatedAt: ${localTime.toISOString()}`);

    // 2. Test Case 1: Remote is OLDER (Should NOT update)
    console.log('\nTest Case 1: Remote record is OLDER');
    const olderRecord = {
      id: testId,
      sync_id: syncId,
      name: 'Old Remote Product',
      salesPrice: 50,
      updatedAt: olderTime.toISOString()
    };

    await syncEngine.applySupabaseChange(testTable, olderRecord);
    
    let currentRecord = await getQuery(`SELECT name, salesPrice FROM ${testTable} WHERE id = ?`, [testId]);
    
    if (currentRecord.name === 'Test Product' && currentRecord.salesPrice === 100) {
      console.log('PASS: Local record preserved (Remote was older)');
    } else {
      console.error('FAIL: Local record was overwritten by older remote record!');
      console.log('Current:', currentRecord);
    }

    // 3. Test Case 2: Remote is NEWER (Should UPDATE)
    console.log('\nTest Case 2: Remote record is NEWER');
    const newerRecord = {
      id: testId,
      sync_id: syncId,
      name: 'New Remote Product',
      salesPrice: 200,
      updatedAt: newerTime.toISOString()
    };

    await syncEngine.applySupabaseChange(testTable, newerRecord);
    
    currentRecord = await getQuery(`SELECT name, salesPrice FROM ${testTable} WHERE id = ?`, [testId]);
    
    if (currentRecord.name === 'New Remote Product' && currentRecord.salesPrice === 200) {
      console.log('PASS: Local record updated (Remote was newer)');
    } else {
      console.error('FAIL: Local record was NOT updated by newer remote record!');
      console.log('Current:', currentRecord);
    }

  } catch (error) {
    console.error('Test failed with error:', error);
  } finally {
    // Cleanup
    await runQuery(`DELETE FROM ${testTable} WHERE id = ?`, [testId]);
    console.log('\nTest complete.');
    process.exit(0);
  }
}

runTest();
