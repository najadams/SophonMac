const fs = require('fs');
const path = require('path');
const db = require('../data/db/db');

// Check if a column exists in a table
const columnExists = (tableName, columnName) => {
  return new Promise((resolve, reject) => {
    db.all(`PRAGMA table_info(${tableName})`, (err, columns) => {
      if (err) {
        reject(err);
      } else {
        const exists = columns.some(col => col.name === columnName);
        resolve(exists);
      }
    });
  });
};

// Run migration if needed
const runReceiptDetailMigration = async () => {
  try {
    // Check if salesUnit column exists
    const salesUnitExists = await columnExists('ReceiptDetail', 'salesUnit');
    
    if (!salesUnitExists) {
      console.log('Running ReceiptDetail migration to add unit tracking fields...');
      
      // Read migration SQL file
      const migrationPath = path.join(__dirname, '../migrations/add_receipt_detail_units.sql');
      const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
      
      // Execute the entire SQL file at once to handle complex statements
      await new Promise((resolve, reject) => {
        db.exec(migrationSQL, (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      })
      
      console.log('ReceiptDetail migration completed successfully!');
    } else {
      console.log('ReceiptDetail migration already applied.');
    }
  } catch (error) {
    console.error('Error running ReceiptDetail migration:', error);
    throw error;
  }
};

// Run all migrations
// Run networking migrations
const runNetworkingMigrations = async () => {
  try {
    // Check if NetworkConfig table exists
    const tableExists = await new Promise((resolve, reject) => {
      db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='NetworkConfig'", (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(!!row);
        }
      });
    });
    
    if (!tableExists) {
      console.log('Running networking migrations...');
      
      // Read networking migration SQL file
      const migrationPath = path.join(__dirname, '../migrations/add_networking_tables.sql');
      const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
      
      // Execute the entire SQL file at once to handle complex statements
      await new Promise((resolve, reject) => {
        db.exec(migrationSQL, (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      })
      
      console.log('Networking migrations completed successfully!');
    } else {
      console.log('Networking migrations already applied.');
    }
  } catch (error) {
    console.error('Networking migration error:', error);
    throw error;
  }
};

const runMigrations = async () => {
  try {
    await runReceiptDetailMigration();
    console.log('All migrations completed successfully!');
  } catch (error) {
    console.error('Migration error:', error);
    throw error;
  }
};

module.exports = {
  runMigrations,
  runReceiptDetailMigration,
  runNetworkingMigrations,
  columnExists
};