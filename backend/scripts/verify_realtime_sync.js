const db = require('../data/db/db');
const UmbrellaSyncService = require('../services/umbrellaSyncService');
const { v4: uuidv4 } = require('uuid');

async function verify() {
  console.log('Starting real-time sync verification...');
  
  // Mock WebSocket Server
  const mockWsServer = {
    broadcastToCompany: (companyId, event, payload) => {
      console.log(`✅ WebSocket Broadcast detected: Event=${event}, Company=${companyId}`);
      console.log('Payload:', JSON.stringify(payload, null, 2));
      mockWsServer.called = true;
      mockWsServer.lastPayload = payload;
    },
    called: false,
    lastPayload: null
  };

  UmbrellaSyncService.setWebSocketServer(mockWsServer);

  // Setup Test Data
  const companyId = uuidv4();
  await new Promise((resolve) => db.run("INSERT INTO Company (id, companyName, password) VALUES (?, ?, ?)", [companyId, 'Realtime Test Company', 'pass'], resolve));
  
  try {
    const updatePayload = {
        id: companyId,
        companyName: 'Realtime Updated Company',
        allowedUnits: ['kg', 'g', 'lb'],
        allowedCategories: ['Food', 'Drinks']
    };

    console.log('Applying update with units and categories...');
    await UmbrellaSyncService.applyCompanyUpdate(updatePayload);

    // Verify DB Updates
    const company = await new Promise((resolve) => db.get("SELECT * FROM Company WHERE id = ?", [companyId], (e, r) => resolve(r)));
    const units = await new Promise((resolve) => db.all("SELECT unit FROM CompanyAllowedUnits WHERE companyId = ?", [companyId], (e, r) => resolve(r)));
    const categories = await new Promise((resolve) => db.all("SELECT category FROM CompanyAllowedCategories WHERE companyId = ?", [companyId], (e, r) => resolve(r)));

    let errors = 0;
    
    if (company.companyName === 'Realtime Updated Company') {
        console.log('✅ DB Company Name updated');
    } else {
        console.error('❌ DB Company Name failed');
        errors++;
    }

    if (units.length === 3 && units.some(u => u.unit === 'kg')) {
        console.log('✅ DB Units updated');
    } else {
        console.error('❌ DB Units failed', units);
        errors++;
    }

    if (categories.length === 2 && categories.some(c => c.category === 'Food')) {
        console.log('✅ DB Categories updated');
    } else {
        console.error('❌ DB Categories failed', categories);
        errors++;
    }

    // Verify Broadcast
    if (mockWsServer.called) {
        if (mockWsServer.lastPayload.settings.allowedUnits.length === 3) {
             console.log('✅ WebSocket payload contains correct data');
        } else {
             console.error('❌ WebSocket payload missing data');
             errors++;
        }
    } else {
        console.error('❌ WebSocket Broadcast NOT called');
        errors++;
    }

    if (errors === 0) {
        console.log('\n✨ ALL REAL-TIME CHECKS PASSED ✨');
        process.exit(0);
    } else {
        process.exit(1);
    }

  } catch (e) {
      console.error('Verification failed:', e);
      process.exit(1);
  } finally {
      // Cleanup
      await new Promise((resolve) => db.run("DELETE FROM Company WHERE id = ?", [companyId], resolve));
  }
}

verify();
