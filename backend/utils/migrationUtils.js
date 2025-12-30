const fs = require('fs');
const path = require('path');

// Lazy load db to prevent sqlite3 from loading at startup
let db = null;
function getDb() {
  if (!db) {
    db = require('../data/db/db');
  }
  return db;
}

// Check if a column exists in a table
const columnExists = (tableName, columnName) => {
  return new Promise((resolve, reject) => {
    getDb().all(`PRAGMA table_info(${tableName})`, (err, columns) => {
      if (err) {
        reject(err);
      } else {
        const exists = columns.some(col => col.name === columnName);
        resolve(exists);
      }
    });
  });
};

// Read a named block from consolidated schema.sql using begin/end markers
function readSchemaBlock(beginMarker, endMarker) {
  const schemaPath = path.join(__dirname, '../data/db/schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  const beginIndex = schema.indexOf(beginMarker);
  const endIndex = schema.indexOf(endMarker, beginIndex + beginMarker.length);
  if (beginIndex === -1 || endIndex === -1) {
    throw new Error(`Schema block not found for markers: ${beginMarker} ... ${endMarker}`);
  }
  return schema.substring(beginIndex + beginMarker.length, endIndex);
}

// Run migration if needed
const runReceiptDetailMigration = async () => {
  try {
    // Check if salesUnit column exists
    const salesUnitExists = await columnExists('ReceiptDetail', 'salesUnit');
    
    if (!salesUnitExists) {
      console.log('Running ReceiptDetail migration to add unit tracking fields...');
      // Read migration-only block from consolidated schema
      const migrationSQL = readSchemaBlock(
        '-- MIGRATION ONLY BEGIN ReceiptDetail Units',
        '-- MIGRATION ONLY END ReceiptDetail Units'
      );
      
      // Execute the entire SQL file at once to handle complex statements
      await new Promise((resolve, reject) => {
        getDb().exec(migrationSQL, (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      })
      
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
// Run networking migrations
const runNetworkingMigrations = async () => {
  try {
    // Check if NetworkConfig table exists
    const tableExists = await new Promise((resolve, reject) => {
      getDb().get("SELECT name FROM sqlite_master WHERE type='table' AND name='NetworkConfig'", (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(!!row);
        }
      });
    });
    
    if (!tableExists) {
      console.log('Running networking migrations...');
      // Read networking schema block from consolidated schema
      const migrationSQL = readSchemaBlock(
        '-- BEGIN Networking Schema',
        '-- END Networking Schema'
      );
      
      // Execute the entire SQL file at once to handle complex statements
      await new Promise((resolve, reject) => {
        getDb().exec(migrationSQL, (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
      
      console.log('Networking migrations completed successfully!');
    } else {
      console.log('Networking migrations already applied.');
    }
  } catch (error) {
    console.error('Networking migration error:', error);
    throw error;
  }
};

// Run CustomRoles table migration
const runCustomRolesMigration = async () => {
  try {
    // Check if CustomRoles table exists
    const tableExists = await new Promise((resolve, reject) => {
      getDb().get("SELECT name FROM sqlite_master WHERE type='table' AND name='CustomRoles'", (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(!!row);
        }
      });
    });
    
    if (!tableExists) {
      console.log('Running CustomRoles table migration...');
      // Prefer consolidated schema block; fallback to dedicated migrations file if markers missing
      let migrationSQL = '';
      try {
        migrationSQL = readSchemaBlock(
          '-- BEGIN CustomRoles Schema',
          '-- END CustomRoles Schema'
        );
        console.log('Using CustomRoles schema block from consolidated schema.sql');
      } catch (blockErr) {
        const filePath = path.join(__dirname, '../migrations/add_custom_roles_table.sql');
        migrationSQL = fs.readFileSync(filePath, 'utf8');
        console.log('CustomRoles block not found; using migrations/add_custom_roles_table.sql');
      }

      // Execute the SQL
      await new Promise((resolve, reject) => {
        getDb().exec(migrationSQL, (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });

      console.log('CustomRoles table migration completed successfully!');
    } else {
      console.log('CustomRoles table migration already applied.');
    }
  } catch (error) {
    console.error('Error running CustomRoles migration:', error);
    throw error;
  }
};

const runMigrations = async () => {
  try {
    await runReceiptDetailMigration();
    await runCustomRolesMigration();
    await runCurrencyNormalizationMigration();
    console.log('All migrations completed successfully!');
  } catch (error) {
    console.error('Migration error:', error);
    throw error;
  }
};

module.exports = {
  runMigrations,
  runReceiptDetailMigration,
  runCustomRolesMigration,
  runNetworkingMigrations,
  columnExists,
  runCurrencyNormalizationMigration,
  runGovernanceMigration,
  runGRAMigration,
  runTaxIntelligenceMigration,
  runTaxConfigHistoryMigration
};

// Run GRA Integration table migration
async function runGRAMigration() {
  try {
    const tableExists = await new Promise((resolve, reject) => {
        getDb().get("SELECT name FROM sqlite_master WHERE type='table' AND name='TaxSubmissionQueue'", (err, row) => {
          if (err) reject(err); else resolve(!!row);
        });
      });

    if (!tableExists) {
      console.log('Running GRA migration...');
      const filePath = path.join(__dirname, '../migrations/add_gra_tables.sql');
      const migrationSQL = fs.readFileSync(filePath, 'utf8');

      await new Promise((resolve, reject) => {
        getDb().exec(migrationSQL, (err) => {
          if (err) reject(err); else resolve();
        });
      });
      console.log('GRA migration completed successfully!');
    } else {
        console.log('GRA migration already applied.');
    }
  } catch (error) {
    console.error('Error running GRA migration:', error);
    throw error;
  }
}

// Run Tax Intelligence migration (Phase 4)
async function runTaxIntelligenceMigration() {
    try {
      const db = getDb();
      // Check for TaxConfig table
      const tableExists = await new Promise((resolve, reject) => {
          db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='TaxConfig'", (err, row) => {
            if (err) reject(err); else resolve(!!row);
          });
        });
  
      if (!tableExists) {
        console.log('Running Tax Intelligence migration...');
        const filePath = path.join(__dirname, '../migrations/add_vat_intelligence.sql');
        const migrationSQL = fs.readFileSync(filePath, 'utf8');
  
        // Split by semicolon to handle multiple statements (CREATE + ALTER)
        const statements = migrationSQL.split(';').filter(s => s.trim());

        for (const stmt of statements) {
            await new Promise((resolve, reject) => {
                db.exec(stmt, (err) => {
                    // Ignore "duplicate column" errors for idempotency on ALTER TABLE
                    if (err && !err.message.includes('duplicate column')) reject(err); 
                    else resolve();
                });
            });
        }
        console.log('Tax Intelligence migration completed successfully!');
      } else {
        console.log('Tax Intelligence migration already applied.');
      }
    } catch (error) {
      console.error('Error running Tax Intelligence migration:', error);
      throw error;
    }
}

// Run Tax Config History Migration (Phase 4 Hardening)
async function runTaxConfigHistoryMigration() {
    try {
        const db = getDb();
        // Check if effectiveFrom column exists
        const colExists = await new Promise((resolve, reject) => {
            db.all("PRAGMA table_info(TaxConfig)", (err, rows) => {
                if (err) reject(err);
                else {
                    const hasCol = rows.some(r => r.name === 'effectiveFrom');
                    resolve(hasCol);
                }
            });
        });

        if (!colExists) {
            console.log('Running Tax Config History migration...');
            const filePath = path.join(__dirname, '../migrations/update_tax_config_history.sql');
            const migrationSQL = fs.readFileSync(filePath, 'utf8');

             // Split by semicolon to handle multiple statements
            const statements = migrationSQL.split(';').filter(s => s.trim());

            for (const stmt of statements) {
                await new Promise((resolve, reject) => {
                    db.exec(stmt, (err) => {
                        if (err) reject(err); else resolve();
                    });
                });
            }
            console.log('Tax Config History migration applied.');
        }
    } catch (error) {
        console.warn('Tax Config History migration failed:', error.message);
    }
}      } else {
        console.log('Tax Intelligence migration already applied.');
      }
    } catch (error) {
      console.error('Error running Tax Intelligence migration:', error);
      throw error;
    }
  }

// Run Governance table migration
async function runGovernanceMigration() {
  try {
    // Check if RootKeyHistory table exists
    const tableExists = await new Promise((resolve, reject) => {
        getDb().get("SELECT name FROM sqlite_master WHERE type='table' AND name='RootKeyHistory'", (err, row) => {
          if (err) reject(err); else resolve(!!row);
        });
      });

    if (!tableExists) {
      console.log('Running Governance migration...');
      const filePath = path.join(__dirname, '../migrations/add_governance_tables.sql');
      const migrationSQL = fs.readFileSync(filePath, 'utf8');

      await new Promise((resolve, reject) => {
        getDb().exec(migrationSQL, (err) => {
          if (err) reject(err); else resolve();
        });
      });
      console.log('Governance migration completed successfully!');
    } else {
        console.log('Governance migration already applied.');
    }
  } catch (error) {
    console.error('Error running Governance migration:', error);
    throw error;
  }
}

// Normalize currency handling: reference table and FK columns
async function runCurrencyNormalizationMigration() {
  try {
    // Determine if migration is needed
    const currencyTableExists = await new Promise((resolve, reject) => {
      getDb().get("SELECT name FROM sqlite_master WHERE type='table' AND name='Currency'", (err, row) => {
        if (err) reject(err); else resolve(!!row);
      });
    });

    const companyHasCurrencyCode = await columnExists('Company', 'currencyCode').catch(() => false);
    const settingsHasCurrencyCode = await columnExists('Settings', 'currencyCode').catch(() => false);

    const needsMigration = !currencyTableExists || !companyHasCurrencyCode || !settingsHasCurrencyCode;

    if (!needsMigration) {
      console.log('Currency normalization already applied.');
      return;
    }

    console.log('Running Currency normalization migration...');
    const migrationSQL = readSchemaBlock(
      '-- MIGRATION ONLY BEGIN Currency Normalization',
      '-- MIGRATION ONLY END Currency Normalization'
    );

    await new Promise((resolve, reject) => {
      getDb().exec(migrationSQL, (err) => {
        if (err) reject(err); else resolve();
      });
    });

    console.log('Currency normalization migration completed successfully!');
  } catch (error) {
    console.error('Error running Currency normalization migration:', error);
    throw error;
  }
}