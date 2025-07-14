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
      
      // Split SQL statements and execute them
      const statements = migrationSQL.split(';').filter(stmt => stmt.trim());
      
      for (const statement of statements) {
        await new Promise((resolve, reject) => {
          db.exec(statement, (err) => {
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          });
        });
      }
      
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
const runMigrations = async () => {
  try {
    await runReceiptDetailMigration();
    console.log('All migrations completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
};

module.exports = {
  runMigrations,
  runReceiptDetailMigration,
  columnExists
};