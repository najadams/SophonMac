// Backend should never handle Electron single instance logic
// This is handled by the main Electron process only

// Load environment variables FIRST, before any other imports that might need them
try {
  require('dotenv').config();
} catch (error) {
  console.warn('Could not load dotenv:', error.message);
}

// Check if this is a backend process and skip Electron initialization entirely
const isBackendProcess = process.env.BACKEND_DIR || process.env.IS_BACKEND_PROCESS || process.env.SKIP_SINGLE_INSTANCE_LOCK;

if (!isBackendProcess) {
  console.log('[INFO] Not a backend process, may have Electron context');
  // Only try to access Electron if not explicitly a backend process
  try {
    const { app } = require('electron');
    if (app && app.requestSingleInstanceLock) {
      const gotTheLock = app.requestSingleInstanceLock();
      if (!gotTheLock) {
        console.log('[INFO] Another instance is already running, quitting...');
        app.quit();
        process.exit(0);
      }
    }
  } catch (error) {
    // Not in Electron context, continue normally
    console.log('[INFO] Not in Electron context, continuing normally');
  }
} else {
  console.log('[INFO] Running as backend process, skipping Electron initialization entirely');
  console.log('[INFO] Environment flags - BACKEND_DIR:', !!process.env.BACKEND_DIR, 'IS_BACKEND_PROCESS:', !!process.env.IS_BACKEND_PROCESS, 'SKIP_SINGLE_INSTANCE_LOCK:', !!process.env.SKIP_SINGLE_INSTANCE_LOCK);
}

const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
// Remove eager DB-related requires; will load lazily when available
// const dbUtils = require('./utils/dbUtils');
// const migrationUtils = require('./utils/migrationUtils');

// Defer route requires; register conditionally based on DB availability
// const companyRoutes = require('./routes/companyRoutes');
// const workerRoutes = require('./routes/workerRoutes');
// const inventoryRoutes = require('./routes/inventoryRoutes');
// const customerRoutes = require('./routes/customerRoutes');
// const vendorRoutes = require('./routes/vendorRoutes');
// const receiptRoutes = require('./routes/receiptRoutes');
// const debtRoutes = require('./routes/debtRoutes');
// const purchaseOrderRoutes = require('./routes/purchaseOrderRoutes');
// const authRoutes = require('./routes/authRoutes');
// const supplyRoutes = require('./routes/supplyRoutes');
// const transactionRoutes = require('./routes/transactionRoutes');
// const vendorPaymentRoutes = require('./routes/vendorPaymentRoutes');
// const reportRoutes = require('./routes/reportRoutes');
// const notificationRoutes = require('./routes/notificationRoutes');
// const syncRoutes = require('./routes/syncRoutes');
// Safe to load networkRoutes early; it lazy-loads DB internally
const networkRoutes = require('./routes/networkRoutes');

// Import networking services (safe; will not touch DB until initialized)
const NetworkManager = require('./services/networkManager');
const networkConfig = require('./config/network.config');

const app = express();
const PORT = networkConfig.server.port || parseInt(process.env.PORT) || 80; 

// Track DB availability to allow network-only fallback in packaged mode
let DB_AVAILABLE = true;
let LAST_DB_ERROR = null;

// Middleware
app.use(cors({
  // origin: ['http://localhost:5174', 'http://localhost:5173', 'http://192.168.0.102:5174'],
  origin: true,
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
if (typeof __dirname !== 'undefined') {
  app.use(express.static(path.join(__dirname, 'public')));
} else {
  // In packaged apps, __dirname might not be available
  const publicPath = process.env.BACKEND_DIR ? path.join(process.env.BACKEND_DIR, 'public') : './public';
  app.use(express.static(publicPath));
}

// Register minimal network route early to allow health checks even if DB fails
app.use('/api/network', networkRoutes);

// Health check endpoint
app.get('/', (req, res) => {
  res.send('POS API is running');
});

// Initialize database and start server
(async () => {
  try {
    console.log('Backend starting with PORT:', PORT);
    console.log('process.env.PORT:', process.env.PORT);

    // Attempt to require and initialize DB; fallback to network-only if it fails
    let dbUtils = null;
    let migrationUtils = null;
    try {
      dbUtils = require('./utils/dbUtils');
      migrationUtils = require('./utils/migrationUtils');
      const initialized = await dbUtils.initialize();
      if (!initialized) {
        throw new Error('DB initialize returned false');
      }
      console.log('Database initialized successfully');
    } catch (dbErr) {
      DB_AVAILABLE = false;
      LAST_DB_ERROR = dbErr && (dbErr.stack || dbErr.message || String(dbErr));
      console.warn('Database unavailable; starting in network-only mode:', dbErr.message);
    }

    // Run networking migrations only if DB is available
    if (DB_AVAILABLE && migrationUtils && migrationUtils.runNetworkingMigrations) {
      try {
        await migrationUtils.runNetworkingMigrations();
      } catch (migErr) {
        console.warn('Networking migrations failed:', migErr.message);
      }
    }

    // Ensure CustomRoles table exists in production builds
    if (DB_AVAILABLE && migrationUtils && migrationUtils.runCustomRolesMigration) {
      try {
        await migrationUtils.runCustomRolesMigration();
      } catch (migErr) {
        console.warn('CustomRoles migration failed:', migErr.message);
      }
    }

    // Initialize networking system
    const networkManager = new NetworkManager();
    app.set('networkManager', networkManager);

    // Register routes now that we know DB availability
    registerRoutes(DB_AVAILABLE);

    // Start server after initialization
    const startServer = async (port) => {
      const server = http.createServer(app);
      server.listen(port, networkConfig.server.host || '0.0.0.0', async () => {
        console.log(`Backend server running on http://${networkConfig.server.host || '0.0.0.0'}:${port}`);
        console.log(`Backend ready on port ${port}`); // Signal to main process that backend is ready

        try {
          const companyInfo = await getFirstCompanyInfo();
          if (companyInfo && DB_AVAILABLE) {
            const success = await networkManager.initialize(
              server,
              port,
              companyInfo.id,
              companyInfo.companyName
            );
            if (success) {
              console.log('Networking system initialized successfully');

              // Initialize Umbrella Sync Service
              try {
                const UmbrellaSyncService = require('./services/umbrellaSyncService');
                await UmbrellaSyncService.initialize(companyInfo.id);
              } catch (syncErr) {
                console.warn('Failed to initialize Umbrella Sync:', syncErr.message);
              }
            } else {
              console.warn('Failed to initialize networking system');
            }
          } else {
            // Fallback: start discovery without DB
            // Initialize with defaults to ensure instanceId is generated
            await networkManager.networkDiscovery.initialize(port, 'offline', 'Offline');
            networkManager.startNetworkDiscovery(true);
            console.log('Networking discovery started (DB unavailable)');
          }
        } catch (networkError) {
          console.warn('Networking initialization error:', networkError.message);
        }
      });
    };

    await startServer(PORT);
  } catch (error) {
    console.error('Error during backend startup:', error);
  }
})();

// Helper function to get first company info
function getFirstCompanyInfo() {
  try {
    // Lazy load db only when needed
    const db = require('./data/db/db');
    return new Promise((resolve, reject) => {
      db.get('SELECT id, companyName FROM Company LIMIT 1', (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  } catch (error) {
    console.error('Error accessing database:', error);
    return Promise.resolve(null);
  }
}

// Helper to register routes based on DB availability
function registerRoutes(withDb) {
  try {
    if (withDb) {
      const authRoutes = require('./routes/authRoutes');
      const companyRoutes = require('./routes/companyRoutes');
      const workerRoutes = require('./routes/workerRoutes');
      const inventoryRoutes = require('./routes/inventoryRoutes');
      const customerRoutes = require('./routes/customerRoutes');
      const vendorRoutes = require('./routes/vendorRoutes');
      const receiptRoutes = require('./routes/receiptRoutes');
      const debtRoutes = require('./routes/debtRoutes');
      const supplyRoutes = require('./routes/supplyRoutes');
      const purchaseOrderRoutes = require('./routes/purchaseOrderRoutes');
      const transactionRoutes = require('./routes/transactionRoutes');
      const vendorPaymentRoutes = require('./routes/vendorPaymentRoutes');
      const reportRoutes = require('./routes/reportRoutes');
      const notificationRoutes = require('./routes/notificationRoutes');
      const syncRoutes = require('./routes/syncRoutes');
      const currencyRoutes = require('./routes/currencyRoutes');
      const backupRoutes = require('./routes/backupRoutes');

      app.use('/api/auth', authRoutes);
      app.use('/api/companies', companyRoutes);
      app.use('/api/workers', workerRoutes);
      app.use('/api/products', inventoryRoutes);
      app.use('/api/customers', customerRoutes);
      app.use('/api/vendors', vendorRoutes);
      app.use('/api/receipts', receiptRoutes);
      app.use('/api/debts', debtRoutes);
      app.use('/api/supplies', supplyRoutes);
      app.use('/api/purchase-orders', purchaseOrderRoutes);
      app.use('/api/transactions', transactionRoutes);
      app.use('/api/vendor-payments', vendorPaymentRoutes);
      app.use('/api/notifications', notificationRoutes);
      app.use('/api/reports', reportRoutes);
      app.use('/api/sync', syncRoutes);
      app.use('/api/conflicts', require('./routes/conflictRoutes'));
      app.use('/api/currencies', currencyRoutes);
      app.use('/api/backup', backupRoutes);
      app.use('/api/tax', require('./routes/taxRoutes'));
      app.use('/api/transfers', require('./routes/transferRoutes'));
      app.use('/api/devices', require('./routes/deviceRoutes'));
      app.use('/api/vat-tokens', require('./routes/vatTokenRoutes'));
      console.log('Registered full route set with DB');
    } else {
      // Minimal route set without DB already includes /api/network above
      console.log('Registered minimal network routes (DB unavailable)');
    }
    
    // Catch-all for API routes to ensure JSON 404 response
    app.all('/api/*', (req, res) => {
      res.status(404).json({ error: `API endpoint not found: ${req.method} ${req.originalUrl}` });
    });
  } catch (routeErr) {
    console.warn('Route registration error:', routeErr.message);
  }
}

app.get('/api/debug/db', (req, res) => {
  res.json({ dbAvailable: DB_AVAILABLE, error: LAST_DB_ERROR });
});
