// utils/supabase-dbUtils.js
const fs = require("fs");
const path = require("path");
const db = require("../data/db/supabase-db"); // Use Supabase PostgreSQL connection

const SupabaseDBUtils = {
  // Initialize database (run migrations)
  async initialize() {
    console.log("Initializing Supabase database...");

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
      const schemaPath = path.join(__dirname, "..", "create_schema.js");
      
      if (!fs.existsSync(schemaPath)) {
        throw new Error("Schema file not found");
      }

      // Read and convert SQLite schema to PostgreSQL
      const sqliteSchema = fs.readFileSync(schemaPath, "utf8");
      const postgresSchema = this.convertSQLiteToPostgreSQL(sqliteSchema);
      
      // Execute the converted schema
      await db.run(postgresSchema);
      
      console.log("Schema executed successfully");
    } catch (error) {
      console.error("Error creating schema:", error);
      throw error;
    }
  },

  // Convert SQLite schema to PostgreSQL compatible schema
  convertSQLiteToPostgreSQL(sqliteSchema) {
    let postgresSchema = sqliteSchema;

    // Replace SQLite-specific syntax with PostgreSQL equivalents
    postgresSchema = postgresSchema
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
      .replace(/updated_at TIMESTAMP/gi, 'updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()');

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