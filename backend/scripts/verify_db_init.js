
const dbUtils = require('../utils/dbUtils');
const path = require('path');

// Mock process.resourcesPath if needed by db.js
// process.resourcesPath = ...

async function verify() {
  console.log('Starting DB Verification...');
  try {
    const migrationUtils = require('../utils/migrationUtils');
    console.log('migrationUtils loaded successfully');
    
    const initialized = await dbUtils.initialize();
    if (initialized) {
      console.log('SUCCESS: Database initialized correctly.');
    } else {
      console.log('FAILURE: Database initialized returned false.');
    }
  } catch (error) {
    console.error('CRITICAL FAILURE: Database initialization threw an error:');
    console.error(error);
    if (error.code) console.error('Error Code:', error.code);
    if (error.stack) console.error('Stack:', error.stack);
  }
}

verify();
