const db = require('./data/db/db');

const updates = [
  {
    description: "Add parentCompanyId to Company",
    sql: "ALTER TABLE Company ADD COLUMN parentCompanyId INTEGER REFERENCES Company(id) ON DELETE SET NULL"
  },
  {
    description: "Add taxMode to Company",
    sql: "ALTER TABLE Company ADD COLUMN taxMode TEXT DEFAULT 'independent'"
  },
  {
    description: "Add taxIdType to Company",
    sql: "ALTER TABLE Company ADD COLUMN taxIdType TEXT DEFAULT 'TIN'"
  },
  {
    description: "Add index on parentCompanyId",
    sql: "CREATE INDEX IF NOT EXISTS idx_company_parent_id ON Company(parentCompanyId)"
  }
];

function applyUpdates() {
  console.log('Applying SQLite schema updates...');
  
  updates.forEach(update => {
    try {
      db.exec(update.sql);
      console.log(`Success: ${update.description}`);
    } catch (err) {
      if (err.message.includes('duplicate column name')) {
        console.log(`Skipped: ${update.description} (Column already exists)`);
      } else {
        console.error(`Error: ${update.description} - ${err.message}`);
      }
    }
  });
  
  console.log('Schema updates completed.');
}

applyUpdates();
