const { v4: uuidv4 } = require('uuid');

const BASE_URL = 'http://localhost:80/api';

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
    console.log('--- Starting Umbrella Core Verification ---');

    // 1. Create a Company (Triggers Event)
    console.log('\n1. Creating Company...');
    const companyName = `Umbrella Test Corp ${uuidv4().substring(0, 8)}`;
    const companyRes = await post(`${BASE_URL}/companies`, {
      name: companyName,
      email: `test-${uuidv4()}@example.com`,
      address: '123 Test St',
      phone: '555-0101'
    });
    const companyId = companyRes.id;
    console.log('✅ Company Created:', companyId);

    // 2. Register Device
    console.log('\n2. Registering Device...');
    const deviceId = uuidv4();
    const deviceRes = await post(`${BASE_URL}/devices/register`, {
      companyId,
      name: 'Test POS 01',
      deviceId
    });
    console.log('✅ Device Registered:', deviceRes);

    // 3. Send Heartbeat
    console.log('\n3. Sending Heartbeat...');
    const heartbeatRes = await post(`${BASE_URL}/devices/heartbeat`, {
      companyId,
      deviceId,
      softwareVersion: '1.0.0',
      lastSyncedEventId: 0
    });
    console.log('✅ Heartbeat Success. Latest Event ID:', heartbeatRes.latestServerEventId);

    // 4. Fetch Events (Replay)
    console.log('\n4. Fetching Events...');
    const eventsRes = await get(`${BASE_URL}/sync/events`, {
      companyId, 
      sinceId: 0 
    });
    console.log(`✅ Fetched ${eventsRes.data.length} events.`);
    
    const createdEvent = eventsRes.data.find(e => e.eventType === 'COMPANY_CREATED');
    if (createdEvent) {
      console.log('✅ Found COMPANY_CREATED event:', createdEvent.payload);
    } else {
      console.error('❌ COMPANY_CREATED event missing!');
    }

    console.log('\n--- Verification Complete ---');

  } catch (error) {
    console.error('❌ Test Failed:', error.message);
  }
}

runTest();
