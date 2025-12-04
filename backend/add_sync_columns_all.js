const db = require('./data/db/db').connection;
const { v4: uuidv4 } = require('uuid');

// Get all tables from the database
const tables = db.prepare(`
  SELECT name FROM sqlite_master 
  WHERE type='table' 
  AND name NOT LIKE 'sqlite_%'
  AND name NOT IN ('Currency', 'SyncState', 'EventLog', 'SyncLog', 'SyncOutbox')
  ORDER BY name
`).all().map(row => row.name);

console.log(`Found ${tables.length} tables to process`);
console.log('Adding sync columns to all tables...\n');

tables.forEach(table => {
  try {
    console.log(`Processing ${table}...`);
    
    // Check if table already has sync columns
    const tableInfo = db.prepare(`PRAGMA table_info(${table})`).all();
    const columnNames = tableInfo.map(col => col.name);
    
    // Add sync_id column
    if (!columnNames.includes('sync_id')) {
      try {
        db.prepare(`ALTER TABLE ${table} ADD COLUMN sync_id TEXT`).run();
        console.log(`  Added sync_id to ${table}`);
        
        // Populate sync_id for existing records
        const rows = db.prepare(`SELECT id FROM ${table} WHERE sync_id IS NULL`).all();
        if (rows.length > 0) {
          const updateStmt = db.prepare(`UPDATE ${table} SET sync_id = ? WHERE id = ?`);
          let updated = 0;
          for (const row of rows) {
            updateStmt.run(uuidv4(), row.id);
            updated++;
          }
          console.log(`  Populated sync_id for ${updated} records in ${table}`);
        }
      } catch (err) {
        if (!err.message.includes('duplicate column name')) {
          console.error(`  Error adding sync_id to ${table}:`, err.message);
        } else {
          console.log(`  sync_id already exists in ${table}`);
        }
      }
    } else {
      console.log(`  sync_id already exists in ${table}`);
    }

    // Add is_synced column
    if (!columnNames.includes('is_synced')) {
      try {
        db.prepare(`ALTER TABLE ${table} ADD COLUMN is_synced INTEGER DEFAULT 0`).run();
        console.log(`  Added is_synced to ${table}`);
      } catch (err) {
        if (!err.message.includes('duplicate column name')) {
          console.error(`  Error adding is_synced to ${table}:`, err.message);
        } else {
          console.log(`  is_synced already exists in ${table}`);
        }
      }
    } else {
      console.log(`  is_synced already exists in ${table}`);
    }

    // Add last_synced_at column
    if (!columnNames.includes('last_synced_at')) {
      try {
        db.prepare(`ALTER TABLE ${table} ADD COLUMN last_synced_at TEXT`).run();
        console.log(`  Added last_synced_at to ${table}`);
      } catch (err) {
        if (!err.message.includes('duplicate column name')) {
          console.error(`  Error adding last_synced_at to ${table}:`, err.message);
        } else {
          console.log(`  last_synced_at already exists in ${table}`);
        }
      }
    } else {
      console.log(`  last_synced_at already exists in ${table}`);
    }

    // Add sync_version column
    if (!columnNames.includes('sync_version')) {
      try {
        db.prepare(`ALTER TABLE ${table} ADD COLUMN sync_version INTEGER DEFAULT 1`).run();
        console.log(`  Added sync_version to ${table}`);
      } catch (err) {
        if (!err.message.includes('duplicate column name')) {
          console.error(`  Error adding sync_version to ${table}:`, err.message);
        } else {
          console.log(`  sync_version already exists in ${table}`);
        }
      }
    } else {
      console.log(`  sync_version already exists in ${table}`);
    }
    
  } catch (err) {
    console.error(`Error processing ${table}:`, err.message);
  }
});

console.log('\nMigration complete.');
