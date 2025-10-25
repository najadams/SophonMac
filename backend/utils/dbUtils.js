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
      const schema = fs.readFileSync(schemaPath, "utf8");
      const statements = schema.split(";").filter(Boolean);

      // Use a recursive function to execute statements sequentially
      const executeStatements = (index) => {
        if (index >= statements.length) {
          resolve();
          return;
        }

        const stmt = statements[index].trim();
        if (!stmt) {
          executeStatements(index + 1);
          return;
        }

        getDb().exec(stmt, (err) => {
          if (err) {
            console.error(`Error executing SQL statement: ${stmt}`, err);
            reject(err);
          } else {
            executeStatements(index + 1);
          }
        });
      };

      executeStatements(0);
    });
  },
};

module.exports = DBUtils;
