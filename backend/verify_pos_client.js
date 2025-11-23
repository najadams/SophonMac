const { v4: uuidv4 } = require('uuid');

const BASE_URL = 'http://localhost:3021/api';

async function post(url, data) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`POST ${url} failed: ${res.status} ${text}`);
  }
  return res.json();
}

async function get(url, params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${url}?${query}`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GET ${url} failed: ${res.status} ${text}`);
  }
  return res.json();
}

async function runTest() {
  try {
    console.log('--- Starting POS Client Verification ---');

    // 1. Create Parent Company
    console.log('\n1. Creating Parent Company...');
    const parentName = `Parent Corp ${uuidv4().substring(0, 8)}`;
    const parentRes = await post(`${BASE_URL}/companies`, {
      name: parentName,
      email: `parent-${uuidv4()}@example.com`,
      address: 'Parent HQ',
      phone: '555-0001',
      password: 'password123'
    });
    const parentId = parentRes.id;
    console.log('✅ Parent Created:', parentId);

    // 2. Create Child Company (linked to Parent)
    console.log('\n2. Creating Child Company...');
    const childName = `Child Store ${uuidv4().substring(0, 8)}`;
    const childRes = await post(`${BASE_URL}/companies`, {
      name: childName,
      email: `child-${uuidv4()}@example.com`,
      address: 'Child Branch',
      phone: '555-0002',
      password: 'password123',
      parentCompanyId: parentId // Link to Parent
    });
    const childId = childRes.id;
    console.log('✅ Child Created:', childId);

    // 3. Create Customer (Parent) in Child Company
    console.log('\n3. Creating Customer (Parent) in Child Company...');
    const customerRes = await post(`${BASE_URL}/customers`, {
      belongsTo: childId, // Correct field
      name: 'Parent Buyer',
      phone: `555-${uuidv4().substring(0, 8)}`,
      company: parentName // Matches Parent Company Name
    });
    const customerId = customerRes.customer.id; // Response structure is { message, customer: {...} }
    console.log('✅ Customer Created:', customerId);

    // 4. Create Inventory Item
    console.log('\n4. Creating Inventory Item...');
    const productRes = await post(`${BASE_URL}/products`, {
      companyId: childId,
      name: 'Test Widget',
      category: 'General',
      costPrice: 10,
      salesPrice: 20,
      onhand: 100,
      baseUnit: 'pcs'
    });
    const productId = productRes.data.id; // Response structure is { message, data: {...} }
    console.log('✅ Product Created:', productId);

    // 5. Create Receipt (Transfer to Parent)
    console.log('\n5. Creating Receipt (Transfer)...');
    const receiptRes = await post(`${BASE_URL}/receipts/add`, {
      companyId: childId,
      customerName: `${parentName} - Parent Buyer`, 
      products: [{ name: 'Test Widget', quantity: 5, price: 20 }],
      amountPaid: 100,
      paymentMethod: 'cash',
      total: 100
    });
    console.log('✅ Transfer Receipt Created:', receiptRes);

    // 5b. Create Normal Receipt (Taxable Sale)
    console.log('\n5b. Creating Normal Receipt (Taxable)...');
    // Create normal customer
    await post(`${BASE_URL}/customers`, {
      belongsTo: childId,
      name: 'Normal Customer',
      company: '', // Explicitly empty to match receipt lookup
      phone: `555-${uuidv4().substring(0, 8)}`
    });
    
    const normalReceiptRes = await post(`${BASE_URL}/receipts/add`, {
      companyId: childId,
      customerName: `nocompany - Normal Customer`, 
      products: [{ name: 'Test Widget', quantity: 2, price: 20 }],
      amountPaid: 40,
      paymentMethod: 'cash',
      total: 40
    });
    console.log('✅ Normal Receipt Created:', normalReceiptRes);

    // 6. Checking Tax Summary
    console.log('\n6. Checking Tax Summary...');
    const today = new Date().toISOString().split('T')[0];
    const taxSummaryRes = await get(`${BASE_URL}/tax/summary`, {companyId: childId, startDate: today, endDate: today});
    // taxSummaryRes structure is { period, settings, summary: { totalSales, ... } }
    console.log(`Tax Summary Total Sales: ${taxSummaryRes.summary.totalSales}`);
    
    if (taxSummaryRes.summary.totalSales === 40) {
      console.log('✅ SUCCESS: Transfer excluded from Taxable Sales.');
    } else {
      console.error(`❌ FAILURE: Expected 40, got ${taxSummaryRes.summary.totalSales}`);
    }

    // 7. Verify Network Model (Many-to-Many)
    console.log('\n7. Verifying Network Model...');
    
    // Create a Third Company (Partner)
    console.log('Creating Third Company (Partner)...');
    const partnerName = `Partner Corp ${uuidv4().substring(0, 8)}`;
    const partnerRes = await post(`${BASE_URL}/companies`, {
      name: partnerName,
      email: `partner-${uuidv4()}@example.com`,
      address: 'Partner HQ',
      phone: '555-0003',
      password: 'password123'
    });
    const partnerId = partnerRes.id;
    console.log('✅ Partner Created:', partnerId);

    // Link Child -> Partner (Child buys from Partner)
    console.log('Linking Child -> Partner...');
    await post(`${BASE_URL}/companies/${childId}/network`, {
      targetCompanyId: partnerId,
      relationshipType: 'partner'
    });
    console.log('✅ Link Created.');

    // Create Customer (Partner) in Child Company
    console.log('Creating Customer (Partner) in Child Company...');
    await post(`${BASE_URL}/customers`, {
      belongsTo: childId,
      name: 'Partner Buyer',
      phone: `555-${uuidv4().substring(0, 8)}`,
      company: partnerName
    });
    console.log('✅ Partner Customer Created.');

    // Create Receipt (Transfer to Partner)
    console.log('Creating Receipt (Transfer to Partner)...');
    const transferRes = await post(`${BASE_URL}/receipts/add`, {
      companyId: childId,
      customerName: `${partnerName} - Partner Buyer`, 
      products: [{ name: 'Test Widget', quantity: 5, price: 20 }],
      amountPaid: 100,
      paymentMethod: 'cash',
      total: 100
    });
    console.log('✅ Transfer Receipt Created:', transferRes);

    // Verify Tax Summary (Should still be 40, excluding BOTH transfers)
    console.log('Checking Tax Summary (Should exclude Partner Transfer)...');
    const taxSummaryRes2 = await get(`${BASE_URL}/tax/summary`, { 
      companyId: childId, 
      startDate: today, 
      endDate: today 
    });
    console.log(`Tax Summary Total Sales: ${taxSummaryRes2.summary.totalSales}`);
    
    if (taxSummaryRes2.summary.totalSales === 40) {
      console.log('✅ SUCCESS: Partner Transfer excluded from Taxable Sales.');
    } else {
      console.error(`❌ FAILURE: Expected 40, got ${taxSummaryRes2.summary.totalSales}`);
    }

    // Verify Network Status
    console.log('Verifying Network Status...');
    const syncStatusRes = await get(`${BASE_URL}/sync/umbrella/status`, { companyId: childId });
    console.log('Network Members:', syncStatusRes.network.length);
    
    // Should have 2 members: Parent (migrated) and Partner (new)
    if (syncStatusRes.network.length >= 2) {
       console.log('✅ Network Status shows multiple partners.');
    } else {
       console.error('❌ Network Status check failed.');
    }

    console.log('\n--- Verification Complete ---');
  } catch (error) {
    console.error('❌ Test Failed:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

runTest();
