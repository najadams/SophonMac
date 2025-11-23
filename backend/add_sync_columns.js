const db = require('./data/db/db');

async function addColumnIfNotExists(tableName, columnName, columnDef) {
  return new Promise((resolve, reject) => {
    db.all(`PRAGMA table_info(${tableName})`, (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      
      const exists = rows.some(row => row.name === columnName);
      if (exists) {
        console.log(`Column ${columnName} already exists in ${tableName}`);
        resolve();
      } else {
        console.log(`Adding column ${columnName} to ${tableName}...`);
        db.run(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDef}`, (err) => {
          if (err) reject(err);
          else resolve();
        });
      }
    });
  });
}

async function migrate() {
  console.log('Starting migration...');
  
  try {
    const tables = ['Inventory']; // Add other tables if needed
    
    for (const table of tables) {
      await addColumnIfNotExists(table, 'sync_id', 'TEXT');
      await addColumnIfNotExists(table, 'is_synced', 'INTEGER DEFAULT 0');
      await addColumnIfNotExists(table, 'last_synced_at', 'TEXT');
    }
    
    console.log('Migration complete.');
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

migrate();
