const { Pool } = require('pg');
require('dotenv').config();

// Create PostgreSQL connection pool using Supabase database URL
const pool = new Pool({
  connectionString: process.env.SUPABASE_DB_URL,
  ssl: {
    rejectUnauthorized: false
  },
  // Connection pool settings - reduced for better stability
  max: 5, // Maximum number of clients in the pool (reduced from 20)
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 5000, // Return an error after 5 seconds if connection could not be established
});

// Test the connection - only log once per actual connection
let connectionLogged = false;
pool.on('connect', () => {
  if (!connectionLogged) {
    console.log('Connected to Supabase PostgreSQL database');
    connectionLogged = true;
  }
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Closing database connection pool...');
  await pool.end();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Closing database connection pool...');
  await pool.end();
  process.exit(0);
});

// Helper function to execute queries with SQLite-like interface
const db = {
  // Execute a query (similar to SQLite's run method)
  run: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      pool.query(sql, params, (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve({
            changes: result.rowCount,
            lastID: result.rows[0]?.id || null
          });
        }
      });
    });
  },

  // Get a single row (similar to SQLite's get method)
  get: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      pool.query(sql, params, (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result.rows[0] || null);
        }
      });
    });
  },

  // Get all rows (similar to SQLite's all method)
  all: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      pool.query(sql, params, (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result.rows);
        }
      });
    });
  },

  // Execute query with callback (for backward compatibility)
  query: (sql, params, callback) => {
    if (typeof params === 'function') {
      callback = params;
      params = [];
    }
    
    pool.query(sql, params, (err, result) => {
      if (callback) {
        if (err) {
          callback(err);
        } else {
          // Mimic SQLite callback format
          callback.call({ changes: result.rowCount, lastID: result.rows[0]?.id }, null);
        }
      }
    });
  },

  // Direct access to the pool for advanced operations
  pool: pool
};

module.exports = db;