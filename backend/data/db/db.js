const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const os = require('os');
const fs = require('fs');

// Handle database path for both development and packaged environments
let dbPath;

// Use environment variable if provided (from main process)
if (process.env.DB_PATH) {
  dbPath = process.env.DB_PATH;
  
  // Ensure the directory exists
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  
  // Copy initial database from resources if it doesn't exist
  if (!fs.existsSync(dbPath) && process.resourcesPath) {
    const sourcePath = path.join(process.resourcesPath, 'app.asar.unpacked', 'backend', 'data', 'db', 'database.sqlite');
    if (fs.existsSync(sourcePath)) {
      fs.copyFileSync(sourcePath, dbPath);
      console.log('Copied initial database to user data directory');
    }
  }
} else {
  // Check if we're in a packaged environment by looking for specific indicators
  const isPackaged = process.resourcesPath && process.resourcesPath.includes('app.asar');
  
  if (isPackaged) {
    // In packaged app, store database in user data directory for write permissions
    const userDataPath = path.join(os.homedir(), 'Library', 'Application Support', 'Sophon');
    
    // Ensure the directory exists
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true });
    }
    
    dbPath = path.join(userDataPath, 'database.sqlite');
    
    // Copy initial database from resources if it doesn't exist
    const sourcePath = path.join(process.resourcesPath, 'app.asar.unpacked', 'backend', 'data', 'db', 'database.sqlite');
    if (!fs.existsSync(dbPath) && fs.existsSync(sourcePath)) {
      fs.copyFileSync(sourcePath, dbPath);
      console.log('Copied initial database to user data directory');
    }
  } else {
    // In development, use the current directory
    dbPath = path.join(__dirname, 'database.sqlite');
  }
}

console.log('Database path:', dbPath);
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Could not connect to database', err);
  } else {
    console.log('Connected to SQLite database');
  }
});

// Handle database errors
db.on('error', (err) => {
  console.error('Database error:', err);
});

// Prevent the process from exiting
process.on('SIGINT', () => {
  console.log('\nReceived SIGINT. Closing database connection...');
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err);
    } else {
      console.log('Database connection closed.');
    }
    process.exit(0);
  });
});

module.exports = db;