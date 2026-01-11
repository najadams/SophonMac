// Test script for Supabase table name conversion
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Table name conversion function (same as in syncEngine.js)
function getSupabaseTableName(tableName) {
  return tableName
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '');
}

console.log('Table Name Conversion Test');
console.log('==========================\n');

// Test conversions
const testTables = [
  'Company',
  'Settings',
  'Worker',
  'Customer',
  'Vendor',
  'Inventory',
  'Receipt',
  'ReceiptDetail',
  'Debt',
  'DebtPayment',
  'Supplies',
  'SuppliesDetail',
  'PurchaseOrder',
  'PurchaseOrderItem',
  'VendorPayment',
  'Notification'
];

console.log('PascalCase -> snake_case Conversion:');
testTables.forEach(table => {
  const converted = getSupabaseTableName(table);
  console.log(`  ${table.padEnd(20)} -> ${converted}`);
});

// Test actual connection
async function testConnection() {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.log('\n❌ Missing Supabase credentials');
    return;
  }

  console.log('\n\nTesting Supabase Connection:');
  console.log('============================\n');

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

  // Test a few key tables
  const tablesToTest = ['Company', 'Settings', 'Receipt', 'ReceiptDetail'];

  for (const table of tablesToTest) {
    const supabaseTable = getSupabaseTableName(table);
    try {
      const { data, error } = await supabase
        .from(supabaseTable)
        .select('*')
        .limit(1);

      if (error) {
        console.log(`❌  ${table.padEnd(20)} (${supabaseTable}) - ${error.message}`);
      } else {
        console.log(`✓ ${table.padEnd(20)} (${supabaseTable}) - Connected successfully`);
      }
    } catch (err) {
      console.log(`❌ ${table.padEnd(20)} (${supabaseTable}) - ${err.message}`);
    }
  }

  console.log('\n✓ Connection test complete');
}

testConnection().then(() => {
  process.exit(0);
}).catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
