const path = require('path');
const fs = require('fs');

let dbInstance = null;
let connection = null;

function initializeDatabase() {
  if (dbInstance) {
    return dbInstance;
  }

  let Database;
  try {
    Database = require('better-sqlite3');
  } catch (error) {
    console.error('better-sqlite3 not available:', error.message);
    throw new Error(`Database unavailable: ${error.message}`);
  }

  // Resolve database path across dev and packaged modes
  let dbPath;
  if (process.env.DB_PATH) {
    dbPath = process.env.DB_PATH;

    // Ensure directory exists
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    // Copy initial database if missing (from packaged resources)
    if (!fs.existsSync(dbPath) && process.resourcesPath && typeof process.resourcesPath === 'string') {
      const candidateSources = [
        // Non-ASAR builds
        path.join(process.resourcesPath, 'app', 'backend', 'data', 'db', 'database.sqlite'),
        path.join(process.resourcesPath, 'backend', 'data', 'db', 'database.sqlite'),
        // ASAR unpacked builds
        path.join(process.resourcesPath, 'app.asar.unpacked', 'backend', 'data', 'db', 'database.sqlite')
      ];
      const sourcePath = candidateSources.find((p) => fs.existsSync(p));
      if (sourcePath) {
        fs.copyFileSync(sourcePath, dbPath);
        console.log('Copied initial database to DB_PATH');
      }
    }
  } else {
    // Development default
    dbPath = path.join(__dirname, 'database.sqlite');
  }

  console.log('Database path:', dbPath);
  try {
    connection = new Database(dbPath);
    console.log('Connected to the SQLite database via better-sqlite3.');
  } catch (err) {
    console.error('Error opening database:', err.message);
    throw err;
  }

  // Graceful shutdown
  process.on('SIGINT', () => {
    try {
      if (connection) {
        connection.close();
        console.log('Database connection closed.');
      }
    } catch (e) {
      console.error('Error closing database:', e.message);
    } finally {
      process.exit(0);
    }
  });

  // Shim that emulates sqlite3 async callback API using better-sqlite3 sync methods
  const shim = {
    get(sql, paramsOrCb, cbMaybe) {
      const hasParams = Array.isArray(paramsOrCb);
      const params = hasParams ? paramsOrCb : [];
      const cb = hasParams ? cbMaybe : paramsOrCb;
      try {
        const row = connection.prepare(sql).get(...params);
        if (cb) cb(null, row);
      } catch (err) {
        if (cb) cb(err);
      }
    },
    all(sql, paramsOrCb, cbMaybe) {
      const hasParams = Array.isArray(paramsOrCb);
      const params = hasParams ? paramsOrCb : [];
      const cb = hasParams ? cbMaybe : paramsOrCb;
      try {
        const rows = connection.prepare(sql).all(...params);
        if (cb) cb(null, rows);
      } catch (err) {
        if (cb) cb(err);
      }
    },
    run(sql, paramsOrCb, cbMaybe) {
      const hasParams = Array.isArray(paramsOrCb);
      const params = hasParams ? paramsOrCb : [];
      const cb = hasParams ? cbMaybe : paramsOrCb;
      try {
        const info = connection.prepare(sql).run(...params);
        const ctx = { lastID: info.lastInsertRowid, changes: info.changes };
        if (cb) cb.call(ctx, null);
      } catch (err) {
        if (cb) cb.call({}, err);
      }
    },
    exec(sql, cb) {
      try {
        connection.exec(sql);
        if (cb) cb(null);
      } catch (err) {
        if (cb) cb(err);
      }
    },
    close(cb) {
      try {
        if (connection) {
          connection.close();
        }
        if (cb) cb(null);
      } catch (err) {
        if (cb) cb(err);
      }
    },
    on(event, handler) {
      // better-sqlite3 does not emit events like sqlite3; provide no-op
      // Keep API surface to avoid breaking consumers
      // Optionally, we could store handler for manual invocation if needed
    }
  };

  dbInstance = shim;
  return dbInstance;
}

module.exports = new Proxy({}, {
  get(target, prop) {
    const database = initializeDatabase();
    return database[prop];
  },
  set(target, prop, value) {
    const database = initializeDatabase();
    database[prop] = value;
    return true;
  }
});