const fs = require('fs');
const path = require('path');
const db = require('../data/db/supabase-db');

// Check if a column exists in a table (PostgreSQL version)
const columnExists = (tableName, columnName) => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = $1 AND column_name = $2
    `;
    
    db.all(query, [tableName.toLowerCase(), columnName.toLowerCase()])
      .then(result => {
        const exists = result.length > 0;
        resolve(exists);
      })
      .catch(err => {
        reject(err);
      });
  });
};

// Convert SQLite migration SQL to PostgreSQL
const convertMigrationSQL = (sqliteSQL) => {
  let postgresSQL = sqliteSQL;
  
  // Replace SQLite-specific syntax with PostgreSQL equivalents
  postgresSQL = postgresSQL.replace(/INTEGER PRIMARY KEY AUTOINCREMENT/g, 'SERIAL PRIMARY KEY');
  postgresSQL = postgresSQL.replace(/AUTOINCREMENT/g, '');
  postgresSQL = postgresSQL.replace(/TEXT DEFAULT CURRENT_TIMESTAMP/g, 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
  postgresSQL = postgresSQL.replace(/INTEGER DEFAULT 0/g, 'INTEGER DEFAULT 0');
  postgresSQL = postgresSQL.replace(/INTEGER DEFAULT 1/g, 'INTEGER DEFAULT 1');
  postgresSQL = postgresSQL.replace(/REAL/g, 'DECIMAL');
  
  // Handle PRAGMA statements (remove them as they're SQLite-specific)
  postgresSQL = postgresSQL.replace(/PRAGMA[^;]*;/g, '');
  
  // Handle ALTER TABLE ADD COLUMN syntax
  postgresSQL = postgresSQL.replace(/ALTER TABLE (\w+) ADD COLUMN/g, 'ALTER TABLE $1 ADD COLUMN IF NOT EXISTS');
  
  return postgresSQL;
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
      
      // Convert SQLite SQL to PostgreSQL
      const postgresSQL = convertMigrationSQL(migrationSQL);
      
      // Execute the migration
      await db.query(postgresSQL);
      
      console.log('ReceiptDetail migration completed successfully!');
    } else {
      console.log('ReceiptDetail migration already applied.');
    }
  } catch (error) {
    console.error('Error running ReceiptDetail migration:', error);
    throw error;
  }
};

// Run networking migrations
const runNetworkingMigrations = async () => {
  try {
    console.log('Running networking migrations...');
    
    // Check if sync-related columns exist
    const syncedAtExists = await columnExists('Company', 'synced_at');
    
    if (!syncedAtExists) {
      console.log('Adding sync tracking columns...');
      
      // Add sync columns to all tables that need them
      const syncColumns = [
        'synced_at TIMESTAMP DEFAULT NULL',
        'sync_version INTEGER DEFAULT 1',
        'needs_sync BOOLEAN DEFAULT TRUE'
      ];
      
      const tables = [
        'Company', 'Worker', 'Inventory', 'Customer', 'Receipt', 
        'ReceiptDetail', 'Debt', 'DebtPayment', 'Vendor', 'VendorPayment',
        'PurchaseOrder', 'PurchaseOrderItem', 'Notification'
      ];
      
      for (const table of tables) {
        for (const column of syncColumns) {
          try {
            await db.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${column}`);
          } catch (err) {
            // Column might already exist, continue
            console.log(`Column might already exist in ${table}:`, err.message);
          }
        }
      }
      
      console.log('Networking migrations completed successfully!');
    } else {
      console.log('Networking migrations already applied.');
    }
  } catch (error) {
    console.error('Error running networking migrations:', error);
    throw error;
  }
};

// Run custom roles migration
const runCustomRolesMigration = async () => {
  try {
    console.log('Running custom roles migration...');
    
    // Check if CustomRole table exists
    const tableExists = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'customrole'
    `);
    
    if (tableExists.rows.length === 0) {
      console.log('Creating CustomRole table...');
      
      const createTableSQL = `
        CREATE TABLE CustomRole (
          id SERIAL PRIMARY KEY,
          company_id INTEGER NOT NULL,
          name VARCHAR(255) NOT NULL,
          permissions TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (company_id) REFERENCES Company(id) ON DELETE CASCADE,
          UNIQUE(company_id, name)
        );
        
        CREATE INDEX idx_custom_role_company ON CustomRole(company_id);
      `;
      
      await db.query(createTableSQL);
      
      console.log('Custom roles migration completed successfully!');
    } else {
      console.log('Custom roles migration already applied.');
    }
  } catch (error) {
    console.error('Error running custom roles migration:', error);
    throw error;
  }
};

const runMigrations = async () => {
  try {
    console.log('Running all migrations...');
    await runReceiptDetailMigration();
    await runNetworkingMigrations();
    await runCustomRolesMigration();
    console.log('All migrations completed successfully!');
  } catch (error) {
    console.error('Error running migrations:', error);
    throw error;
  }
};

module.exports = {
  runMigrations,
  runReceiptDetailMigration,
  runCustomRolesMigration,
  runNetworkingMigrations,
  columnExists,
  convertMigrationSQL
};