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

const app = express();
const PORT = process.env.PORT || 3003; // Changed to 3003 to match frontend production config

// Debug: Log the PORT value
console.log('Backend starting with PORT:', PORT);
console.log('process.env.PORT:', process.env.PORT);

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3002', 'http://localhost:3003'], // Dev and production frontend URLs
  credentials: true,
  methods: ['GET', 'POST','PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

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
      
      // Start server after successful initialization
      const startServer = (port) => {
        const server = app.listen(port, 'localhost', () => {
          console.log(`Server running on http://localhost:${port}`);
          // This is the ready signal for the main process
          console.log(`Backend ready on port ${port}`);
        });

        server.on('error', (err) => {
          if (err.code === 'EADDRINUSE') {
            console.log(`Port ${port} is busy, trying port ${port + 1}`);
            // The error event is emitted before the 'listening' event, so no need to close the server.
            startServer(port + 1); // Recursively try the next port
          } else {
            console.error('Server error:', err);
            process.exit(1);
          }
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
