/**
 * Apply VAT Token Tables Migration
 * 
 * Run with: node backend/apply_vat_token_migration.js
 */

const fs = require('fs');
const path = require('path');

// Load db lazily to prevent issues
let db;
try {
  db = require('./data/db/db');
} catch (error) {
  console.error('Failed to load database:', error.message);
  process.exit(1);
}

const migrationPath = path.join(__dirname, 'migrations', 'add_vat_token_tables.sql');

async function runMigration() {
  console.log('🔐 Applying VAT Token Tables Migration...\n');

  try {
    // Read migration SQL
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // For better-sqlite3, we can use exec() for multiple statements
    // But we need to handle it properly based on the db type
    if (typeof db.exec === 'function') {
      // better-sqlite3 synchronous API
      try {
        db.exec(migrationSQL);
        console.log('✅ Migration executed successfully via exec()');
      } catch (execErr) {
        console.error('Migration exec error:', execErr.message);
        
        // Fall back to statement-by-statement execution
        console.log('Falling back to statement-by-statement execution...\n');
        executeStatements(migrationSQL);
      }
    } else if (typeof db.run === 'function') {
      // sqlite3 async API - execute statements one by one
      await executeStatementsAsync(migrationSQL);
    } else {
      throw new Error('Unknown database driver');
    }

    // Verify tables were created
    console.log('\n📋 Verifying tables...');
    await verifyTables();

    console.log('\n🎉 VAT Token infrastructure ready!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

function executeStatements(sql) {
  // Split by semicolon but be careful with statements
  const statements = sql
    .split(/;[\s]*\n/)
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  let completed = 0;
  let failed = 0;

  for (const statement of statements) {
    try {
      db.exec(statement);
      completed++;
    } catch (err) {
      if (err.message.includes('already exists') || err.message.includes('duplicate')) {
        console.log(`  ⏭️  Skipped (already exists): ${statement.substring(0, 40)}...`);
      } else {
        console.error(`  ❌ Error: ${err.message}`);
        console.error(`     Statement: ${statement.substring(0, 60)}...`);
        failed++;
      }
    }
  }

  console.log(`\n✅ Migration completed:`);
  console.log(`   - Statements executed: ${completed}`);
  console.log(`   - Failed: ${failed}`);
}

async function executeStatementsAsync(sql) {
  const statements = sql
    .split(/;[\s]*\n/)
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  let completed = 0;
  let failed = 0;

  for (const statement of statements) {
    await new Promise((resolve) => {
      db.run(statement, (err) => {
        if (err) {
          if (err.message.includes('already exists') || err.message.includes('duplicate')) {
            console.log(`  ⏭️  Skipped (already exists)`);
          } else {
            console.error(`  ❌ Error: ${err.message}`);
            failed++;
          }
        } else {
          completed++;
        }
        resolve();
      });
    });
  }

  console.log(`\n✅ Migration completed:`);
  console.log(`   - Statements executed: ${completed}`);
  console.log(`   - Failed: ${failed}`);
}

async function verifyTables() {
  const tables = ['VATKeyPair', 'VATToken', 'VATTokenReference', 'TrustedPublicKey', 'VATTokenVerification'];
  
  for (const table of tables) {
    try {
      // Try better-sqlite3 sync API first
      if (typeof db.prepare === 'function') {
        const stmt = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`);
        const row = stmt.get(table);
        if (row) {
          console.log(`   ✅ ${table}: Created`);
        } else {
          console.log(`   ⚠️  ${table}: Not found`);
        }
      } else {
        // Async API fallback
        await new Promise((resolve) => {
          db.get(
            `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
            [table],
            (err, row) => {
              if (err) {
                console.log(`   ❌ ${table}: Error checking`);
              } else if (row) {
                console.log(`   ✅ ${table}: Created`);
              } else {
                console.log(`   ⚠️  ${table}: Not found`);
              }
              resolve();
            }
          );
        });
      }
    } catch (e) {
      console.log(`   ❌ ${table}: ${e.message}`);
    }
  }
}

runMigration();
