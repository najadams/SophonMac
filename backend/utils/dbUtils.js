// utils/dbUtils.js
const fs = require("fs");
const path = require("path");

// Lazy load db to prevent sqlite3 from loading at startup
let db = null;
function getDb() {
  if (!db) {
    db = require("../data/db/db");
  }
  return db;
}

const DBUtils = {
  // Initialize database (run migrations)
  async initialize() {
    console.log("Initializing database...");

    try {
      // Check if database exists and has tables
      const tableExists = await this.checkTableExists("Company");

      if (!tableExists) {
        console.log("Tables not found. Creating schema...");
        await this.createSchema();
        console.log("Schema created successfully.");
      } else {
        console.log("Database tables already exist.");
      }

      // Ensure base reference tables exist in legacy DBs
      await this.ensureCurrencyTable();
      
      // Ensure tax columns exist (Migration for Sophon Market)
      await this.ensureTaxColumns();

      // Ensure plan columns exist (Pricing Architecture)
      await this.ensurePlanColumns();

      return true;
    } catch (error) {
      console.error("Error initializing database:", error);
      // Surface the underlying error to the caller for better diagnostics
      throw error;
    }
  },

  // Check if a specific table exists
  checkTableExists(tableName) {
    return new Promise((resolve, reject) => {
      getDb().get(
        `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
        [tableName],
        (err, row) => {
          if (err) {
            console.error("Error checking table existence:", err);
            reject(err);
          } else {
            resolve(!!row); // Convert to boolean
          }
        }
      );
    });
  },

  // Create all tables from schema file
  createSchema() {
    return new Promise((resolve, reject) => {
      const schemaPath = path.join(__dirname, "..", "data", "db", "schema.sql");
      const schemaRaw = fs.readFileSync(schemaPath, "utf8");
      // Strip migration-only blocks so initial schema creation doesn't run them
      const schema = schemaRaw.replace(/-- MIGRATION ONLY BEGIN[\s\S]*?-- MIGRATION ONLY END[\s\S]*?/g, "");
      // Execute entire schema at once to support triggers and complex statements
      getDb().exec(schema, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  },

  // Ensure Currency table exists and is seeded (idempotent)
  ensureCurrencyTable() {
    return new Promise((resolve, reject) => {
      const sql = `
        CREATE TABLE IF NOT EXISTS Currency (
          code TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          symbol TEXT,
          decimals INTEGER DEFAULT 2
        );
        INSERT OR IGNORE INTO Currency (code, name, symbol, decimals) VALUES
          ('USD', 'US Dollar', '$', 2),
          ('EUR', 'Euro', '€', 2),
          ('GBP', 'British Pound', '£', 2),
          ('GHS', 'Ghanaian Cedi', '₵', 2),
          ('TZS', 'Tanzanian Shilling', 'Sh', 2);
      `;
      getDb().exec(sql, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  },

  // Ensure Company table has tax columns (Migration)
  ensureTaxColumns() {
    return new Promise((resolve, reject) => {
      const db = getDb();
      
      // Check if columns exist
      db.all("PRAGMA table_info(Company)", [], (err, rows) => {
        if (err) return reject(err);
        
        const columns = rows.map(r => r.name);
        const missingColumns = [];
        
        if (!columns.includes('taxMode')) missingColumns.push("ADD COLUMN taxMode TEXT DEFAULT 'independent'");
        if (!columns.includes('parentCompanyId')) missingColumns.push("ADD COLUMN parentCompanyId TEXT REFERENCES Company(id) ON DELETE SET NULL");
        if (!columns.includes('taxIdType')) missingColumns.push("ADD COLUMN taxIdType TEXT DEFAULT 'TIN'");
        
        if (missingColumns.length === 0) return resolve();
        
        console.log('Migrating Company table: Adding tax columns...');
        
        // SQLite only supports adding one column per ALTER TABLE statement
        const runMigration = async () => {
          try {
            for (const colSql of missingColumns) {
              await new Promise((res, rej) => {
                db.run(`ALTER TABLE Company ${colSql}`, (e) => e ? rej(e) : res());
              });
            }
            console.log('Tax columns added successfully.');
            resolve();
          } catch (e) {
            reject(e);
          }
        };
        
        runMigration();
      });
    });
  },

  // Ensure Company table has Plan columns (Pricing Architecture)
  ensurePlanColumns() {
    return new Promise((resolve, reject) => {
      const db = getDb();
      
      db.all("PRAGMA table_info(Company)", [], (err, rows) => {
        if (err) return reject(err);
        
        const columns = rows.map(r => r.name);
        const missingColumns = [];
        
        if (!columns.includes('currentPlan')) missingColumns.push("ADD COLUMN currentPlan TEXT DEFAULT 'STARTER'");
        if (!columns.includes('planLimits')) missingColumns.push("ADD COLUMN planLimits TEXT"); // JSON
        if (!columns.includes('planFeatures')) missingColumns.push("ADD COLUMN planFeatures TEXT"); // JSON
        if (!columns.includes('planExpiry')) missingColumns.push("ADD COLUMN planExpiry TEXT"); // ISO Date
        
        if (missingColumns.length === 0) return resolve();
        
        console.log('Migrating Company table: Adding Plan columns...');
        
        const runMigration = async () => {
          try {
            for (const colSql of missingColumns) {
              await new Promise((res, rej) => {
                db.run(`ALTER TABLE Company ${colSql}`, (e) => e ? rej(e) : res());
              });
            }
            console.log('Plan columns added successfully.');
            resolve();
          } catch (e) {
            reject(e);
          }
        };
        
        runMigration();
      });
    });
  },

  // Helper to generate UUIDs
  generateUUID() {
    // Use crypto.randomUUID if available (Node 14.17+), otherwise fallback to uuid package
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    // Fallback to uuid package if available, or simple random string for very old nodes (unlikely)
    try {
      return require('uuid').v4();
    } catch (e) {
      console.warn('UUID package not found and crypto.randomUUID unavailable. Using weak fallback.');
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    }
  }
};

module.exports = DBUtils;
