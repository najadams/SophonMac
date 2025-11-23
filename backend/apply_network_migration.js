const db = require('./data/db/db');

const migrate = async () => {
  console.log('Starting Network Model Migration...');

  try {
    // 1. Create CompanyNetwork Table
    await new Promise((resolve, reject) => {
      db.run(`
        CREATE TABLE IF NOT EXISTS CompanyNetwork (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          sourceCompanyId INTEGER NOT NULL,
          targetCompanyId INTEGER NOT NULL,
          relationshipType TEXT CHECK(relationshipType IN ('subsidiary', 'partner', 'supplier')) DEFAULT 'partner',
          status TEXT CHECK(status IN ('active', 'pending', 'inactive')) DEFAULT 'active',
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (sourceCompanyId) REFERENCES Company(id),
          FOREIGN KEY (targetCompanyId) REFERENCES Company(id),
          UNIQUE(sourceCompanyId, targetCompanyId)
        )
      `, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    console.log('✅ CompanyNetwork table created.');

    // 2. Migrate Existing Data (Parent-Child)
    const companies = await new Promise((resolve, reject) => {
      db.all('SELECT id, parentCompanyId FROM Company WHERE parentCompanyId IS NOT NULL', (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });

    console.log(`Found ${companies.length} existing relationships to migrate.`);

    for (const company of companies) {
      await new Promise((resolve, reject) => {
        // Source = Child (company.id), Target = Parent (company.parentCompanyId)
        // Relationship = 'subsidiary' (since it was a parent-child link)
        db.run(`
          INSERT INTO CompanyNetwork (sourceCompanyId, targetCompanyId, relationshipType, status)
          VALUES (?, ?, 'subsidiary', 'active')
          ON CONFLICT(sourceCompanyId, targetCompanyId) DO NOTHING
        `, [company.id, company.parentCompanyId], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }
    console.log('✅ Data migration complete.');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
};

migrate();
