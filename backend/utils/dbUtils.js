// utils/dbUtils.js
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const db = require("../data/db/supabase-db"); // Updated path to correctly point to supabase-db.js

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
      return false;
    }
  },

  // Check if a specific table exists in PostgreSQL
  async checkTableExists(tableName) {
    try {
      const result = await db.query(
        `SELECT table_name FROM information_schema.tables WHERE table_name = $1`,
        [tableName.toLowerCase()]
      );
      return result.rows.length > 0;
    } catch (error) {
      console.error('Error checking table existence:', error);
      return false;
    }
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

        db.exec(stmt, (err) => {
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
