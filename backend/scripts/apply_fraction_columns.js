const db = require('../data/db/db');

async function migrate() {
  console.log('Starting migration to add fraction columns...');

  const columnsToAdd = [
    { name: 'quantity_numerator', type: 'TEXT' },
    { name: 'quantity_denominator', type: 'TEXT' }
  ];

  for (const col of columnsToAdd) {
    try {
      // Check if column exists
      const checkSql = `SELECT COUNT(*) as count FROM pragma_table_info('Inventory') WHERE name = '${col.name}'`;
      const result = await new Promise((resolve, reject) => {
        db.get(checkSql, (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

      if (result.count === 0) {
        console.log(`Adding column ${col.name}...`);
        await new Promise((resolve, reject) => {
          db.run(`ALTER TABLE Inventory ADD COLUMN ${col.name} ${col.type}`, (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
        console.log(`Column ${col.name} added successfully.`);
      } else {
        console.log(`Column ${col.name} already exists.`);
      }
    } catch (error) {
      console.error(`Error processing column ${col.name}:`, error);
    }
  }

  console.log('Migration completed.');
  process.exit(0);
}

migrate();
