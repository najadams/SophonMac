// Column name conversion test
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Column conversion functions (matching syncEngine.js)
function getSupabaseColumnName(columnName) {
  return columnName
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase();
}

function convertObjectToSnakeCase(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  
  const converted = {};
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = getSupabaseColumnName(key);
    converted[snakeKey] = value;
  }
  return converted;
}

console.log('Column Name Conversion Test');
console.log('===========================\n');

// Test column conversions
const testColumns = [
  'id',
  'companyId',
  'updatedAt',
  'createdAt',
  'syncId',
  'isSynced',
  'lastSyncedAt',
  'companyName',
  'emailNotifications',
  'parentCompanyId'
];

console.log('camelCase -> snake_case Conversion:');
testColumns.forEach(col => {
  const converted = getSupabaseColumnName(col);
  console.log(`  ${col.padEnd(25)} -> ${converted}`);
});

// Test object conversion  
console.log('\n\nObject Conversion Test:');
console.log('=======================\n');

const testObject = {
  id: 'abc-123',
  companyId: 'company-456',
  companyName: 'Test Company',
  emailNotifications: true,
  createdAt: '2025-12-04T00:00:00Z',
  updatedAt: '2025-12-04T12:00:00Z',
  syncId: 'sync-789',
  isSynced: false
};

console.log('Original object (camelCase):');
console.log(testObject);

const converted = convertObjectToSnakeCase(testObject);
console.log('\nConverted object (snake_case):');
console.log(converted);

console.log('\n✓ Conversion test complete');
process.exit(0);
