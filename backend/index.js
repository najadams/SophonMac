// Handle dotenv loading - only load in development mode
if (process.env.NODE_ENV !== 'production') {
  try {
    require('dotenv').config();
  } catch (error) {
    console.warn('Could not load dotenv in development mode:', error.message);
  }
} else {
  console.log('Running in production mode, skipping dotenv');
}
const express = require('express');
const cors = require('cors');
const path = require('path');
const dbUtils = require('./utils/dbUtils');
const migrationUtils = require('./utils/migrationUtils');

// Import routes
const companyRoutes = require('./routes/companyRoutes');
const workerRoutes = require('./routes/workerRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const customerRoutes = require('./routes/customerRoutes');
const vendorRoutes = require('./routes/vendorRoutes');
const receiptRoutes = require('./routes/receiptRoutes');
const debtRoutes = require('./routes/debtRoutes');
const purchaseOrderRoutes = require('./routes/purchaseOrderRoutes');
const authRoutes = require('./routes/authRoutes');
const supplyRoutes = require('./routes/supplyRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const vendorPaymentRoutes = require('./routes/vendorPaymentRoutes');
const reportRoutes = require('./routes/reportRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const networkRoutes = require('./routes/networkRoutes');

// Import networking services
const NetworkManager = require('./services/networkManager');
const http = require('http');
const db = require('./data/db/db');

const app = express();
const PORT = parseInt(process.env.PORT) || 3001; 

// Debug: Log the PORT value
console.log('Backend starting with PORT:', PORT);
console.log('process.env.PORT:', process.env.PORT);

// Middleware
app.use(cors({
  origin: true, // Allow all origins for network access
  credentials: true,
  methods: ['GET', 'POST','PATCH', 'PUT', 'DELETE', 'OPTIONS'],
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

// Routes
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
app.use('/api/network', networkRoutes);

// Default route
app.get('/', (req, res) => {
  res.send('POS API is running');
});

// Initialize database and start server
(async () => {
  const initialized = await dbUtils.initialize();
  if (initialized) {
    console.log('Database initialized successfully');
    
    // Run migrations
    try {
      await migrationUtils.runMigrations();
      
      // Run networking migrations
      await migrationUtils.runNetworkingMigrations();
      
      // Initialize networking system
      const networkManager = new NetworkManager();
      app.set('networkManager', networkManager);
      
      // Start server after successful initialization
      const startServer = async (port) => {
        const server = http.createServer(app);
        
        server.listen(port, '0.0.0.0', async () => {
          console.log(`Server running on http://localhost:${port}`);
          
          // Initialize networking after server starts
          try {
            // Get company info for networking
            const companyInfo = await getFirstCompanyInfo();
            if (companyInfo) {
              const success = await networkManager.initialize(
                server, 
                port, 
                companyInfo.id, 
                companyInfo.companyName
              );
              
              if (success) {
                console.log('Networking system initialized successfully');
              } else {
                console.warn('Failed to initialize networking system');
              }
            } else {
              console.log('No company found, networking will be initialized after company registration');
            }
          } catch (networkError) {
            console.error('Networking initialization error:', networkError);
          }
          
          // This is the ready signal for the main process
          console.log(`Backend ready on port ${port}`);
        });

        server.on('error', (err) => {
          if (err.code === 'EADDRINUSE') {
            const nextPort = parseInt(port) + 1;
            console.log(`Port ${port} is busy, trying port ${nextPort}`);
            startServer(nextPort); // Recursively try the next port
          } else {
            console.error('Server error:', err);
            process.exit(1);
          }
        });
        
        // Graceful shutdown
        process.on('SIGTERM', async () => {
          console.log('SIGTERM received, shutting down gracefully');
          if (networkManager) {
            await networkManager.shutdown();
          }
          server.close(() => {
            console.log('Server closed');
            process.exit(0);
          });
        });
        
        process.on('SIGINT', async () => {
          console.log('SIGINT received, shutting down gracefully');
          if (networkManager) {
            await networkManager.shutdown();
          }
          server.close(() => {
            console.log('Server closed');
            process.exit(0);
          });
        });
      };

      startServer(PORT);
    } catch (error) {
      console.error('Migration failed:', error);
      process.exit(1);
    }
  } else {
    console.log('Failed to initialize database');
    process.exit(1);
  }
})();

// Helper function to get first company info
function getFirstCompanyInfo() {
  return new Promise((resolve, reject) => {
    db.get('SELECT id, companyName FROM Company LIMIT 1', (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
}
