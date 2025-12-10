// utils/supabase-dbUtils.js
const fs = require("fs");
const path = require("path");
const db = require("../data/db/supabase-db"); // Use Supabase PostgreSQL connection

const SupabaseDBUtils = {
  // Initialize database (run migrations)
  async initialize() {
    console.log("Initializing Supabase database...");

    try {
      // Add connection timeout handling
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Database initialization timeout')), 10000);
      });

      // Check if database exists and has tables with timeout
      const tableExistsPromise = this.checkTableExists("Company");
      const tableExists = await Promise.race([tableExistsPromise, timeoutPromise]);

      if (!tableExists) {
        console.log("Tables not found. Creating schema...");
        const createSchemaPromise = this.createSchema();
        await Promise.race([createSchemaPromise, timeoutPromise]);
        console.log("Schema created successfully.");
      } else {
        console.log("Database tables already exist.");
      }

      return true;
    } catch (error) {
      if (error.message === 'Database initialization timeout') {
        console.warn("Database initialization timed out, but connection is available. Continuing...");
        return true; // Continue with startup even if initialization times out
      }
      console.error("Error initializing Supabase database:", error);
      return false;
    }
  },

  // Check if a specific table exists (PostgreSQL version)
  async checkTableExists(tableName) {
    try {
      const result = await db.get(
        `SELECT table_name FROM information_schema.tables 
         WHERE table_schema = 'public' AND table_name = $1`,
        [tableName]
      );
      return !!result; // Convert to boolean
    } catch (error) {
      console.error("Error checking table existence:", error);
      throw error;
    }
  },

  // Create all tables from schema file (PostgreSQL version)
  async createSchema() {
    try {
      const schemaPath = path.join(__dirname, "..", "data", "db", "postgres-schema.sql");
      
      if (!fs.existsSync(schemaPath)) {
        throw new Error("PostgreSQL schema file not found");
      }

      // Read PostgreSQL schema
      const postgresSchema = fs.readFileSync(schemaPath, "utf8");
      
      // Split schema into individual statements and execute them
      const statements = postgresSchema
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0);
      
      for (const statement of statements) {
        if (statement.trim()) {
          try {
            await db.run(statement);
            console.log(`Executed SQL statement successfully`);
          } catch (error) {
            console.error(`Error executing statement: ${error.message}`);
            // Continue with other statements
          }
        }
      }
      
      console.log("Schema executed successfully");
    } catch (error) {
      console.error("Error creating schema:", error);
      throw error;
    }
  },

  // Convert SQLite schema to PostgreSQL compatible schema
  convertSQLiteToPostgreSQL(sqliteSchema) {
    let postgresSchema = sqliteSchema;

    // Remove SQLite-specific PRAGMA statements
    postgresSchema = postgresSchema
      .replace(/PRAGMA.*?;/gi, '')
      .replace(/-- Enable foreign keys/gi, '')
      
      // Replace INTEGER PRIMARY KEY with SERIAL PRIMARY KEY
      .replace(/INTEGER PRIMARY KEY AUTOINCREMENT/gi, 'SERIAL PRIMARY KEY')
      .replace(/INTEGER PRIMARY KEY/gi, 'SERIAL PRIMARY KEY')
      
      // Replace DATETIME with TIMESTAMP
      .replace(/DATETIME/gi, 'TIMESTAMP')
      
      // Replace TEXT with VARCHAR or TEXT (PostgreSQL supports both)
      .replace(/TEXT/gi, 'TEXT')
      
      // Replace REAL with DECIMAL
      .replace(/REAL/gi, 'DECIMAL(10,2)')
      
      // Replace BOOLEAN (SQLite uses INTEGER for boolean)
      .replace(/INTEGER DEFAULT 0/gi, 'BOOLEAN DEFAULT FALSE')
      .replace(/INTEGER DEFAULT 1/gi, 'BOOLEAN DEFAULT TRUE')
      
      // Handle foreign key constraints (PostgreSQL syntax is similar)
      .replace(/FOREIGN KEY/gi, 'FOREIGN KEY')
      
      // Replace IF NOT EXISTS (PostgreSQL uses different syntax)
      .replace(/CREATE TABLE IF NOT EXISTS/gi, 'CREATE TABLE IF NOT EXISTS')
      
      // Add timestamps for audit trails
      .replace(/created_at TIMESTAMP/gi, 'created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()')
      .replace(/updated_at TIMESTAMP/gi, 'updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()')
      
      // Clean up extra whitespace and empty lines
      .replace(/\n\s*\n/g, '\n')
      .trim();

    return postgresSchema;
  },

  // Execute raw SQL (for migrations and custom operations)
  async executeSQL(sql, params = []) {
    try {
      const result = await db.run(sql, params);
      return result;
    } catch (error) {
      console.error("Error executing SQL:", error);
      throw error;
    }
  },

  // Get database connection for advanced operations
  getConnection() {
    return db;
  }
};

module.exports = SupabaseDBUtils;