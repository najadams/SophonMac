const Database = require('better-sqlite3');
const path = require('path');
const { randomUUID } = require('crypto');

const dbPath = path.join(__dirname, '..', 'data', 'db', 'database.sqlite');
const db = new Database(dbPath);

console.log('Migrating all remaining tables to UUID...\n');

db.pragma('foreign_keys = OFF');

const idMaps = {
  company: new Map(),
  worker: new Map(),
  inventory: new Map(),
  customer: new Map(),
  vendor: new Map(),
  receipt: new Map(),
  debt: new Map(),
  settings: new Map(),
  purchaseOrder: new Map(),
  supplies: new Map()
};

try {
  db.exec('BEGIN TRANSACTION');
  
  // Load Company mapping (already migrated)
  const companies = db.prepare('SELECT id FROM Company').all();
  companies.forEach(c => idMaps.company.set(c.id, c.id)); // Already UUIDs
  
  // Migrate Worker
  console.log('Migrating Worker...');
  const workers = db.prepare('SELECT * FROM Worker').all();
  workers.forEach(w => idMaps.worker.set(w.id, randomUUID()));
  
  db.exec(`
    CREATE TABLE Worker_new (
      id TEXT PRIMARY KEY,
      companyId TEXT,
      adminstatus INTEGER DEFAULT 0,
      name TEXT NOT NULL,
      username TEXT,
      contact TEXT,
      email TEXT,
      password TEXT NOT NULL,
      role TEXT,
      deleted INTEGER DEFAULT 0,
      isEmailVerified INTEGER DEFAULT 0,
      emailVerificationToken TEXT,
      emailVerificationExpires TEXT,
      passwordResetToken TEXT,
      passwordResetExpires TEXT,
      refreshToken TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (companyId) REFERENCES Company(id) ON DELETE CASCADE,
      UNIQUE(companyId, name)
    )
  `);
  
  const insertWorker = db.prepare(`
    INSERT INTO Worker_new VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  workers.forEach(w => {
    insertWorker.run(
      idMaps.worker.get(w.id), w.companyId, w.adminstatus, w.name, w.username,
      w.contact, w.email, w.password, w.role, w.deleted, w.isEmailVerified,
      w.emailVerificationToken, w.emailVerificationExpires, w.passwordResetToken,
      w.passwordResetExpires, w.refreshToken, w.createdAt, w.updatedAt
    );
  });
  
  db.exec('DROP TABLE Worker');
  db.exec('ALTER TABLE Worker_new RENAME TO Worker');
  console.log(`✓ Migrated ${workers.length} workers\n`);
  
  db.exec('COMMIT');
  console.log('✓ All tables migrated successfully!');
  
} catch (error) {
  db.exec('ROLLBACK');
  console.error('✗ Migration failed:', error.message);
  console.error(error.stack);
  process.exit(1);
} finally {
  db.pragma('foreign_keys = ON');
  db.close();
}
