const Database = require('better-sqlite3');
const path = require('path');
const { randomUUID } = require('crypto');
const fs = require('fs');

const dbPath = path.join(__dirname, '..', 'data', 'db', 'database.sqlite');
const db = new Database(dbPath);

console.log('Starting UUID migration...');
console.log('Database:', dbPath);

db.pragma('foreign_keys = OFF');

try {
  db.exec('BEGIN TRANSACTION');
  
  // Get existing companies
  const companies = db.prepare('SELECT * FROM Company').all();
  console.log(`Found ${companies.length} companies to migrate`);
  
  // Create UUID mapping
  const companyMap = new Map();
  companies.forEach(c => companyMap.set(c.id, randomUUID()));
  
  // Create new Company table with TEXT id
  db.exec(`
    CREATE TABLE Company_new (
      id TEXT PRIMARY KEY,
      companyName TEXT NOT NULL UNIQUE,
      email TEXT UNIQUE,
      password TEXT NOT NULL,
      isEmailVerified INTEGER DEFAULT 0,
      emailVerificationToken TEXT,
      emailVerificationExpires TEXT,
      passwordResetToken TEXT,
      passwordResetExpires TEXT,
      refreshToken TEXT,
      contact TEXT,
      location TEXT,
      taxRate REAL,
      currencyCode TEXT REFERENCES Currency(code) DEFAULT 'GHS',
      currentPlan TEXT,
      emailNotifications INTEGER DEFAULT 0,
      momo TEXT,
      nextBillingDate TEXT,
      paymentMethod TEXT,
      paymentProvider TEXT,
      smsNotifications INTEGER DEFAULT 0,
      storeAddress TEXT,
      taxId TEXT,
      tinNumber TEXT,
      taxMode TEXT DEFAULT 'independent',
      parentCompanyId TEXT REFERENCES Company_new(id) ON DELETE SET NULL,
      taxIdType TEXT DEFAULT 'TIN',
      receiptTemplate TEXT DEFAULT 'template1',
      receiptHeader TEXT,
      receiptFooter TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
      sync_id TEXT UNIQUE,
      is_synced INTEGER DEFAULT 0,
      last_synced_at TEXT,
      sync_version INTEGER DEFAULT 1
    )
  `);
  
  // Insert companies with new UUIDs
  const insert = db.prepare(`
    INSERT INTO Company_new (
      id, companyName, email, password, isEmailVerified, emailVerificationToken,
      emailVerificationExpires, passwordResetToken, passwordResetExpires, refreshToken,
      contact, location, taxRate, currencyCode, currentPlan, emailNotifications,
      momo, nextBillingDate, paymentMethod, paymentProvider, smsNotifications,
      storeAddress, taxId, tinNumber, taxMode, parentCompanyId, taxIdType,
      receiptTemplate, receiptHeader, receiptFooter, createdAt, updatedAt,
      sync_id, is_synced, last_synced_at, sync_version
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  companies.forEach(c => {
    const newId = companyMap.get(c.id);
    const parentId = c.parentCompanyId ? companyMap.get(c.parentCompanyId) : null;
    insert.run(
      newId, c.companyName, c.email, c.password, c.isEmailVerified, c.emailVerificationToken,
      c.emailVerificationExpires, c.passwordResetToken, c.passwordResetExpires, c.refreshToken,
      c.contact, c.location, c.taxRate, c.currencyCode, c.currentPlan, c.emailNotifications,
      c.momo, c.nextBillingDate, c.paymentMethod, c.paymentProvider, c.smsNotifications,
      c.storeAddress, c.taxId, c.tinNumber, c.taxMode, parentId, c.taxIdType,
      c.receiptTemplate, c.receiptHeader, c.receiptFooter, c.createdAt, c.updatedAt,
      c.sync_id, c.is_synced, c.last_synced_at, c.sync_version
    );
  });
  
  // Drop old table and rename
  db.exec('DROP TABLE Company');
  db.exec('ALTER TABLE Company_new RENAME TO Company');
  
  console.log(`✓ Migrated ${companies.length} companies`);
  
  db.exec('COMMIT');
  console.log('✓ Migration completed successfully!');
  
} catch (error) {
  db.exec('ROLLBACK');
  console.error('✗ Migration failed:', error.message);
  process.exit(1);
} finally {
  db.pragma('foreign_keys = ON');
  db.close();
}
