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
};

module.exports = DBUtils;
