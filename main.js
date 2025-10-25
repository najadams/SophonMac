const { app, BrowserWindow } = require("electron");
const path = require("path");
const url = require("url");
const { spawn } = require("child_process");
const express = require("express");
const http = require("http");
const fs = require("fs");
const os = require("os");

// Set up crash logging
const logDir = app.isPackaged 
  ? (() => {
      // Use platform-specific log directories
      switch (process.platform) {
        case 'win32':
          return path.join(os.homedir(), 'AppData', 'Roaming', 'Sophon', 'logs');
        case 'darwin':
          return path.join(os.homedir(), 'Library', 'Logs', 'Sophon');
        case 'linux':
          return path.join(os.homedir(), '.local', 'share', 'Sophon', 'logs');
        default:
          return path.join(os.homedir(), '.sophon', 'logs');
      }
    })()
  : path.join(__dirname, 'logs');

// Ensure log directory exists
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const logFile = path.join(logDir, `sophon-${new Date().toISOString().split('T')[0]}.log`);

// Enhanced logging function with EPIPE protection
function logToFile(level, message, error = null) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] [${level}] ${message}${error ? '\n' + error.stack : ''}\n`;
  
  // Safely write to console with EPIPE protection
  try {
    if (process.stdout && !process.stdout.destroyed) {
      process.stdout.write(`[${level}] ${message}
`);
    }
    if (error && process.stderr && !process.stderr.destroyed) {
      process.stderr.write(`${error.stack}
`);
    }
  } catch (consoleError) {
    // Ignore console write errors to prevent cascading failures
  }
  
  // Write to log file
  try {
    fs.appendFileSync(logFile, logEntry);
  } catch (writeError) {
    // Only try to write to console if streams are available
    try {
      if (process.stderr && !process.stderr.destroyed) {
        process.stderr.write(`Failed to write to log file: ${writeError.message}\n`);
      }
    } catch {
      // Ignore if we can't even write the error
    }
  }
}

// Set up global error handlers
process.on('uncaughtException', (error) => {
  logToFile('FATAL', 'Uncaught Exception:', error);
  // Don't quit immediately on uncaught exceptions to prevent cascading failures
  // app.quit();
});

process.on('unhandledRejection', (reason, promise) => {
  logToFile('ERROR', `Unhandled Rejection at: ${promise}, reason: ${reason}`);
});

// Set up app paths and environment
if (app.isPackaged) {
  // Set proper app data path for packaged app with platform-specific directories
  const appDataPath = (() => {
    switch (process.platform) {
      case 'win32':
        return path.join(os.homedir(), 'AppData', 'Roaming', 'Sophon');
      case 'darwin':
        return path.join(os.homedir(), 'Library', 'Application Support', 'Sophon');
      case 'linux':
        return path.join(os.homedir(), '.local', 'share', 'Sophon');
      default:
        return path.join(os.homedir(), '.sophon');
    }
  })();
  app.setPath('userData', appDataPath);
  app.setPath('logs', logDir);
}

// Force set NODE_ENV early
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = app.isPackaged ? 'production' : 'development';
}

logToFile('INFO', `Starting Sophon app in ${process.env.NODE_ENV} mode`);
logToFile('INFO', `App is packaged: ${app.isPackaged}`);
logToFile('INFO', `Current working directory: ${process.cwd()}`);
logToFile('INFO', `App path: ${app.getAppPath()}`);
logToFile('INFO', `Resources path: ${app.isPackaged ? process.resourcesPath : 'N/A'}`);

// Keep a global reference of the window object
let mainWindow;
let backendProcess;
let frontendServer;
let backendReady = false;
let frontendReady = false;
let frontendPort = 3002; // Track the actual frontend port
let isCleaningUp = false; // Flag to prevent recursive cleanup

function createWindow() {
  try {
    logToFile("INFO", "Creating browser window...");

    // Create the browser window
    mainWindow = new BrowserWindow({
      width: 1200,
      height: 1000,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        enableRemoteModule: true,
      },
      show: false, // Don't show immediately to prevent flashing
      icon: process.platform === 'win32' ? path.join(__dirname, 'resources', 'icon.ico') : undefined,
    });

    // Load the index.html file
    let loadURL;
    if (process.env.NODE_ENV === "development") {
      loadURL = "http://localhost:5173/"; // Vite development server default port
    } else {
      // In production, wait for frontend server to be ready
      if (frontendReady) {
        loadURL = `http://localhost:${frontendPort}`;
      } else {
        // Fallback to file:// protocol if frontend server isn't ready
        let frontendPath;
        if (app.isPackaged) {
          const possiblePaths = [
            path.join(process.resourcesPath, 'app.asar.unpacked', 'frontend-dist'),
            path.join(process.resourcesPath, 'frontend-dist'),
            path.join(process.resourcesPath, 'app.asar.unpacked', 'frontend', 'dist'),
            path.join(app.getAppPath(), 'frontend', 'dist')
          ];
          for (const p of possiblePaths) {
            if (fs.existsSync(p)) {
              frontendPath = p;
              break;
            }
          }
        } else {
          frontendPath = path.join(__dirname, 'frontend', 'dist');
        }
        loadURL = `file://${path.join(frontendPath, 'index.html')}`;
      }
    }

    logToFile("INFO", `Loading frontend from: ${loadURL}`);
    logToFile("INFO", `Frontend ready status: ${frontendReady}`);

    // Load the URL first
    mainWindow.loadURL(loadURL);

    // Show window after content is ready
    mainWindow.webContents.once('ready-to-show', () => {
      logToFile("INFO", "Window content ready, showing window");
      mainWindow.show();
      mainWindow.focus();
    });

    // Handle load failures
    mainWindow.webContents.on(
      "did-fail-load",
      (event, errorCode, errorDescription, validatedURL) => {
        logToFile(
          "ERROR",
          `Failed to load ${validatedURL}: ${errorCode} - ${errorDescription}`
        );

        // Show window even on failure for debugging
        if (!mainWindow.isVisible()) {
          mainWindow.show();
          logToFile('ERROR', 'Frontend failed to load, showing window for debugging');
        }
      }
    );

    // Handle crashes
    mainWindow.webContents.on("crashed", (event, killed) => {
      logToFile("FATAL", `Renderer process crashed. Killed: ${killed}`);
    });

    // Handle unresponsive
    mainWindow.on("unresponsive", () => {
      logToFile("WARNING", "Main window became unresponsive");
    });

    // Handle responsive again
    mainWindow.on("responsive", () => {
      logToFile("INFO", "Main window became responsive again");
    });

    // Open DevTools in development mode
    if (process.env.NODE_ENV === "development") {
      mainWindow.webContents.openDevTools();
      logToFile("INFO", "DevTools opened for development mode");
    }

    // Emitted when the window is closed
    mainWindow.on("closed", function () {
      logToFile("INFO", "Main window closed");
      mainWindow = null;
    });

    logToFile("INFO", "Browser window created successfully");
  } catch (error) {
    logToFile("FATAL", "Failed to create browser window", error);
    throw error;
  }
}

// Start the frontend server for production builds
async function startFrontendServer() {
  if (process.env.NODE_ENV === "development") {
    frontendReady = true;
    logToFile('INFO', 'Development mode: skipping frontend server startup');
    return;
  }

  logToFile('INFO', 'Starting frontend server...');

  try {
    const expressApp = express();
    
    // Use absolute paths based on app packaging status
    let frontendPath;
    
    if (app.isPackaged) {
      // Standard locations for packaged apps
      const possiblePaths = [
        // Non-ASAR: app directory contains frontend-dist
        path.join(process.resourcesPath, 'app', 'frontend-dist'),
        // Preferred: extraResources mapped to resources/frontend-dist
        path.join(process.resourcesPath, 'frontend-dist'),
        // Also check ASAR unpacked location
        path.join(process.resourcesPath, 'app.asar.unpacked', 'frontend-dist'),
        path.join(process.resourcesPath, 'app.asar.unpacked', 'frontend', 'dist'),
        // Fallback: frontend/dist inside app asar bundle
        path.join(app.getAppPath(), 'frontend', 'dist')
      ];
      
      for (const possiblePath of possiblePaths) {
        if (fs.existsSync(possiblePath)) {
          frontendPath = possiblePath;
          break;
        }
      }
      
      if (!frontendPath) {
        const error = new Error(`Frontend dist directory not found in any of these locations: ${possiblePaths.join(', ')}`);
        logToFile('ERROR', 'Frontend dist directory missing', error);
        throw error;
      }
    } else {
      // Development mode - try multiple locations
      const devPaths = [
        path.resolve(__dirname, 'frontend', 'dist'),
        path.resolve(__dirname, 'frontend-dist')
      ];
      
      for (const devPath of devPaths) {
        if (fs.existsSync(devPath)) {
          frontendPath = devPath;
          break;
        }
      }
      
      if (!frontendPath) {
        const error = new Error(`Frontend dist directory not found in development paths: ${devPaths.join(', ')}`);
        logToFile('ERROR', 'Frontend dist directory missing', error);
        throw error;
      }
    }
    
    logToFile('INFO', `Frontend path: ${frontendPath}`);

    // Serve static files from the dist directory
    expressApp.use(express.static(frontendPath));

    // Handle client-side routing - serve index.html for all routes
    expressApp.get("*", (req, res) => {
      const indexPath = path.join(frontendPath, "index.html");
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        logToFile('ERROR', `index.html not found at: ${indexPath}`);
        res.status(404).send('Frontend not found');
      }
    });

    frontendServer = http.createServer(expressApp);

    const tryPort = (port) => {
      return new Promise((portResolve, portReject) => {
        const server = frontendServer.listen(port, "0.0.0.0", (error) => {
          if (error) {
            logToFile('ERROR', `Failed to start frontend server on port ${port}`, error);
            portReject(error);
          } else {
            frontendReady = true;
            frontendPort = port; // Store the successful port
            logToFile('INFO', `Frontend server started on http://0.0.0.0:${port}`);
            portResolve(port);
          }
        });
        
        server.on("error", (error) => {
          if (error.code === 'EADDRINUSE') {
            logToFile('WARNING', `Port ${port} is busy, trying next port`);
            portReject(error);
          } else {
            logToFile('ERROR', 'Frontend server error', error);
            portReject(error);
          }
        });
      });
    };
    
    // Try ports 3004-3007 for frontend to avoid conflicts
    const portsToTry = [3004, 3005, 3006, 3007];
    
    for (const port of portsToTry) {
      try {
        await tryPort(port);
        logToFile('INFO', `Frontend server successfully started on port ${port}`);
        return;
      } catch (error) {
        if (error.code === 'EADDRINUSE') {
          logToFile('WARNING', `Port ${port} is busy, trying next port`);
          continue;
        } else {
          logToFile('ERROR', 'Failed to start frontend server', error);
          throw error;
        }
      }
    }
    
    throw new Error('No available ports found for frontend server (tried 3004-3007)');
  } catch (error) {
    logToFile('ERROR', 'Error setting up frontend server', error);
    throw error;
  }
}

// Start the backend server
// Start the backend server
// Start the backend server
function startBackend() {
  logToFile('INFO', 'Starting backend server...');

  return new Promise((resolve, reject) => {
    try {
      // Use absolute paths based on app packaging status
      let backendPath, backendDir;
      
      if (app.isPackaged) {
        // Try multiple possible locations for the backend
        const possiblePaths = [
          path.join(process.resourcesPath, 'app.asar.unpacked', 'backend', 'index.js'),
          path.join(process.resourcesPath, 'app', 'backend', 'index.js'),
          path.join(process.resourcesPath, 'backend', 'index.js'),
          path.join(app.getAppPath(), '..', 'backend', 'index.js'),
          path.join(__dirname, 'backend', 'index.js'),
          // Windows specific paths
          path.join(process.resourcesPath, '..', 'backend', 'index.js'),
          path.join(app.getAppPath(), 'backend', 'index.js')
        ];
        
        logToFile('INFO', `Looking for backend in possible locations...`);
        for (const possiblePath of possiblePaths) {
          logToFile('INFO', `Checking: ${possiblePath}`);
          if (fs.existsSync(possiblePath)) {
            backendPath = possiblePath;
            backendDir = path.dirname(possiblePath);
            logToFile('INFO', `Found backend at: ${backendPath}`);
            break;
          }
        }
        
        if (!backendPath) {
          // List contents of common directories to debug
          const debugDirs = [
            path.join(process.resourcesPath, 'app.asar.unpacked'),
            path.join(process.resourcesPath),
            path.join(app.getAppPath(), '..')
          ];
          
          for (const debugDir of debugDirs) {
            if (fs.existsSync(debugDir)) {
              try {
                const contents = fs.readdirSync(debugDir);
                logToFile('INFO', `Contents of ${debugDir}: ${contents.join(', ')}`);
              } catch (e) {
                logToFile('INFO', `Could not read ${debugDir}: ${e.message}`);
              }
            }
          }
        }
      } else {
        backendPath = path.resolve(__dirname, 'backend', 'index.js');
        backendDir = path.resolve(__dirname, 'backend');
      }

      logToFile('INFO', `Backend path: ${backendPath}`);
      logToFile('INFO', `Backend directory: ${backendDir}`);
      
      // Verify backend files exist
      if (!backendPath || !fs.existsSync(backendPath)) {
        const error = new Error(`Backend index.js not found: ${backendPath || 'undefined'}`);
        logToFile('ERROR', 'Backend file missing', error);
        reject(error);
        return;
      }
      
      if (!fs.existsSync(backendDir)) {
        const error = new Error(`Backend directory not found: ${backendDir}`);
        logToFile('ERROR', 'Backend directory missing', error);
        reject(error);
        return;
      }
      
      // Verify package.json exists in backend
      const backendPackageJson = path.join(backendDir, 'package.json');
      if (fs.existsSync(backendPackageJson)) {
        try {
          const packageData = JSON.parse(fs.readFileSync(backendPackageJson, 'utf8'));
          logToFile('INFO', `Backend package: ${packageData.name} v${packageData.version}`);
          if (packageData.dependencies && packageData.dependencies.cors) {
            logToFile('INFO', `CORS dependency listed: ${packageData.dependencies.cors}`);
          }
        } catch (e) {
          logToFile('WARNING', `Could not read backend package.json: ${e.message}`);
        }
      }

      // Environment variables for backend
      const backendEnv = {
        ...process.env,
        PORT: '3021',
        NODE_ENV: process.env.NODE_ENV,
        // Ensure backend has proper paths
        BACKEND_DIR: backendDir,
        // Pass database path for packaged apps
        DB_PATH: app.isPackaged ? path.join(app.getPath('userData'), 'database.sqlite') : undefined,
        // Mark this as a backend process to prevent single instance lock
        IS_BACKEND_PROCESS: 'true'
      };
      
      // Ensure Electron executable runs in pure Node mode for backend
      if (app.isPackaged) {
        backendEnv.ELECTRON_RUN_AS_NODE = '1';
      }
      
      // For packaged apps, set NODE_PATH to backend node_modules
      if (app.isPackaged) {
        // Primary path: backend/node_modules in unpacked asar
        const backendNodeModules = path.join(backendDir, 'node_modules');
        
        if (fs.existsSync(backendNodeModules)) {
          backendEnv.NODE_PATH = backendNodeModules;
          logToFile('INFO', `Setting NODE_PATH to backend node_modules: ${backendNodeModules}`);
          
          // Verify critical modules exist
          const criticalModules = ['cors', 'express', 'sqlite3'];
          for (const mod of criticalModules) {
            const modPath = path.join(backendNodeModules, mod);
            const exists = fs.existsSync(modPath);
            logToFile('INFO', `  - ${mod}: ${exists ? 'EXISTS' : 'MISSING'}`);
          }
        } else {
          logToFile('WARNING', `Backend node_modules not found at: ${backendNodeModules}`);
        }
      }
      
      logToFile('INFO', `Spawning backend process with NODE_ENV: ${backendEnv.NODE_ENV}`);
      
      // Use proper Node.js executable for packaged apps
      let nodeExecutable, spawnArgs;
      if (app.isPackaged) {
        // For packaged apps, use Electron executable but with proper isolation
        // This ensures native modules work correctly while still isolating the backend
        
        // Create a completely standalone backend script that doesn't require backend/index.js
        const standaloneScript = `
// Standalone backend script - completely isolated from Electron
// This script runs the backend server independently without any Electron dependencies

console.log('[STANDALONE] Starting completely isolated backend process');
console.log('[STANDALONE] Process versions:', JSON.stringify(process.versions, null, 2));

// Completely remove any Electron context and prevent access
delete process.versions.electron;
delete process.versions.chrome;
delete process.resourcesPath;
if (global.process) {
  delete global.process.versions.electron;
  delete global.process.versions.chrome;
  delete global.process.resourcesPath;
}

// Override require to prevent any Electron module loading
const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function(id) {
  if (id === 'electron') {
    throw new Error('Electron not available in standalone backend process');
  }
  return originalRequire.apply(this, arguments);
};

// Set up the backend environment variables
process.env.NODE_ENV = 'production';
process.env.BACKEND_DIR = '${backendDir}';
process.env.IS_BACKEND_PROCESS = 'true';
process.env.SKIP_SINGLE_INSTANCE_LOCK = 'true';
process.env.PORT = '3021';
process.env.DB_PATH = require('path').join(require('os').homedir(), 'Library', 'Application Support', 'Sophon', 'database.sqlite');

// Change to backend directory
process.chdir('${backendDir}');

console.log('[STANDALONE] Backend directory:', process.env.BACKEND_DIR);
console.log('[STANDALONE] Database path:', process.env.DB_PATH);
console.log('[STANDALONE] Port:', process.env.PORT);

// Load required modules
const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');

// Load backend utilities and routes
const dbUtils = require('./utils/dbUtils');
const migrationUtils = require('./utils/migrationUtils');

// Import all routes
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
const syncRoutes = require('./routes/syncRoutes');

// Import services
const NetworkManager = require('./services/networkManager');
const db = require('./data/db/db');
const networkConfig = require('./config/network.config');

// Create Express app
const app = express();
const PORT = parseInt(process.env.PORT) || 80;

console.log('[STANDALONE] Configuring Express server on port:', PORT);

// Configure middleware
app.use(cors({
  origin: true, // Allow all origins for network access
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Configure static files
const publicPath = path.join(process.env.BACKEND_DIR, 'public');
app.use(express.static(publicPath));

console.log('[STANDALONE] Setting up API routes');

// Configure all API routes
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
app.use('/api/sync', syncRoutes);

// Health check route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Sophon Backend API is running', 
    version: '1.0.0',
    mode: 'standalone',
    timestamp: new Date().toISOString()
  });
});

// Start the standalone backend server
(async () => {
  try {
    console.log('[STANDALONE] Initializing database...');
    await dbUtils.initializeDatabase();
    console.log('[STANDALONE] Database initialized successfully');

    console.log('[STANDALONE] Running database migrations...');
    await migrationUtils.runMigrations();
    console.log('[STANDALONE] Database migrations completed');

    console.log('[STANDALONE] Creating HTTP server...');
    const server = http.createServer(app);
    
    server.listen(PORT, '0.0.0.0', () => {
      console.log(\`[STANDALONE] Backend server is running on port \${PORT}\`);
      console.log(\`[STANDALONE] Server accessible at http://localhost:\${PORT}\`);
      console.log(\`Backend ready on port \${PORT}\`); // Signal for main process
      
      // Initialize network manager for discovery
      try {
        const networkManager = new NetworkManager();
        networkManager.startDiscovery();
        console.log('[STANDALONE] Network manager initialized');
      } catch (networkError) {
        console.warn('[STANDALONE] Network manager initialization failed:', networkError.message);
      }
      
      console.log('[STANDALONE] Backend initialization complete');
    });

    server.on('error', (error) => {
      console.error('[STANDALONE] Server error:', error);
      if (error.code === 'EADDRINUSE') {
        console.error(\`[STANDALONE] Port \${PORT} is already in use. Please choose a different port.\`);
      }
      process.exit(1);
    });

    // Handle graceful shutdown
    process.on('SIGTERM', () => {
      console.log('[STANDALONE] Received SIGTERM, shutting down gracefully');
      server.close(() => {
        console.log('[STANDALONE] Server closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      console.log('[STANDALONE] Received SIGINT, shutting down gracefully');
      server.close(() => {
        console.log('[STANDALONE] Server closed');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('[STANDALONE] Failed to start backend server:', error);
    process.exit(1);
  }
})();
`;
      
      const standaloneScriptPath = path.join(backendDir, 'standalone-backend.js');
      fs.writeFileSync(standaloneScriptPath, standaloneScript);
      
      // Load backend directly in main process using Electron's Node to avoid second instance and bindings issues
      try {
        // Apply backend environment to current process
        Object.assign(process.env, backendEnv);
        logToFile('INFO', 'Loading backend directly in main process');
        require(backendPath);
      } catch (e) {
        logToFile('ERROR', 'Failed to load backend directly', e);
        reject(e);
        return;
      }

      // Poll backend port until it is ready
      const expectedPort = parseInt(backendEnv.PORT, 10) || 3021;
      const deadline = Date.now() + 30000; // 30s
      const tryPing = () => {
        try {
          http.get(`http://localhost:${expectedPort}/`, (res) => {
            if (res.statusCode === 200) {
              backendReady = true;
              logToFile('INFO', `Backend is ready and listening on port ${expectedPort}`);
              resolve(expectedPort);
            } else {
              if (Date.now() < deadline) setTimeout(tryPing, 500); else {
                logToFile('ERROR', 'Backend readiness check timed out');
                reject(new Error('Backend startup timeout'));
              }
            }
          }).on('error', () => {
            if (Date.now() < deadline) setTimeout(tryPing, 500); else {
              logToFile('ERROR', 'Backend readiness check timed out (connection refused)');
              reject(new Error('Backend startup timeout'));
            }
          });
        } catch (err) {
          if (Date.now() < deadline) setTimeout(tryPing, 500); else {
            logToFile('ERROR', 'Backend readiness check failed', err);
            reject(new Error('Backend startup timeout'));
          }
        }
      };
      tryPing();
      return;
      } else {
        nodeExecutable = process.execPath;
        spawnArgs = [backendPath];
      }
      
      logToFile('INFO', `Using Node.js executable: ${nodeExecutable}`);
      logToFile('INFO', `Spawn arguments: ${JSON.stringify(spawnArgs)}`);

      // Spawn options
      const spawnOptions = {
        stdio: ['inherit', 'pipe', 'pipe'],
        cwd: backendDir,
        env: backendEnv,
        windowsHide: true, // Hide console window on Windows
      };

      // No need for shell option since we're using Electron's bundled Node.js

      backendProcess = spawn(nodeExecutable, spawnArgs, spawnOptions);

      // Timeout for backend startup
      const startupTimeout = setTimeout(() => {
        if (!backendReady) {
          logToFile('ERROR', 'Backend startup timeout - killing process');
          if (backendProcess && !backendProcess.killed) {
            backendProcess.kill();
          }
          reject(new Error('Backend startup timeout'));
        }
      }, 30000); // 30 second timeout

      // Log backend stdout
      if (backendProcess.stdout) {
        backendProcess.stdout.on('data', (data) => {
          const output = data.toString().trim();
          logToFile('BACKEND', output);
          
          // Check for the ready signal
          const match = output.match(/Backend ready on port (\d+)/);
          if (match) {
            const backendPort = parseInt(match[1], 10);
            backendReady = true;
            clearTimeout(startupTimeout);
            logToFile('INFO', `Backend is ready and listening on port ${backendPort}`);
            resolve(backendPort);
          }
        });
      }
      
      // Log backend stderr
      if (backendProcess.stderr) {
        backendProcess.stderr.on('data', (data) => {
          const errorOutput = data.toString().trim();
          logToFile('BACKEND_ERROR', errorOutput);
          
          // Check for common errors that should cause immediate failure
          if (errorOutput.includes('EADDRINUSE') || 
              errorOutput.includes('Cannot find module') ||
              errorOutput.includes('Error: Cannot find module')) {
            clearTimeout(startupTimeout);
            reject(new Error(`Backend startup failed: ${errorOutput}`));
          }
        });
      }

      backendProcess.on('error', (error) => {
        clearTimeout(startupTimeout);
        logToFile('ERROR', 'Failed to start backend process', error);
        reject(error);
      });

      backendProcess.on('spawn', () => {
        logToFile('INFO', `Backend process spawned with PID: ${backendProcess.pid}`);
      });

      backendProcess.on('close', (code, signal) => {
        clearTimeout(startupTimeout);
        const message = `Backend process exited with code ${code} and signal ${signal}`;
        logToFile('INFO', message);
        
        if (code !== 0 && !backendReady) {
          reject(new Error(`Backend process exited with code ${code}`));
        }
        
        if (code !== 0 && mainWindow) {
          const errorMessage = `Backend server stopped unexpectedly with code ${code}`;
          logToFile('ERROR', errorMessage);
          mainWindow.webContents.send('backend-error', errorMessage);
        }
        
        backendReady = false;
      });
      
    } catch (error) {
      logToFile('ERROR', 'Error setting up backend process', error);
      reject(error);
    }
  });
}

// Single instance lock - prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  logToFile('INFO', 'Another instance is already running, quitting...');
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    logToFile('INFO', 'Second instance detected, focusing existing window');
    // Someone tried to run a second instance, focus our window instead
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

// This method will be called when Electron has finished initialization
app.on("ready", async () => {
  try {
    logToFile('INFO', 'Electron app ready event triggered');
    
    // Log system information
    logToFile('INFO', `Platform: ${process.platform}`);
    logToFile('INFO', `Architecture: ${process.arch}`);
    logToFile('INFO', `Electron version: ${process.versions.electron}`);
    logToFile('INFO', `Node version: ${process.versions.node}`);
    
    logToFile('INFO', `Running in ${process.env.NODE_ENV} mode`);

    if (process.env.NODE_ENV === "development") {
      // In development, create window immediately and let it handle the dev server connection
      logToFile('INFO', 'Development mode: creating window immediately');
      createWindow();
      
      // Start backend in parallel
      try {
        logToFile('INFO', 'Starting backend server...');
        const backendPort = await startBackend();
        logToFile('INFO', `Backend server started and is listening on port ${backendPort}`);
      } catch (backendError) {
        logToFile('ERROR', 'Backend startup failed in development mode', backendError);
      }
    } else {
      // In production, start frontend first, then create window regardless of backend status
      logToFile('INFO', 'Starting frontend server...');
      await startFrontendServer();
      logToFile('INFO', 'Frontend server startup completed');

      // Always create the window after frontend is ready
      logToFile('INFO', 'Creating main window...');
      createWindow();

      // Start backend in parallel - don't block window creation
      try {
        logToFile('INFO', 'Starting backend server...');
        const backendPort = await startBackend();
        logToFile('INFO', `Backend server started and is listening on port ${backendPort}`);
      } catch (backendError) {
        logToFile('ERROR', 'Backend startup failed, but window will still be shown', backendError);
        // Don't quit the app if backend fails - user can still see the frontend
      }
    }
    
    logToFile('INFO', 'Application startup completed successfully');
    
  } catch (error) {
    logToFile('FATAL', 'Failed to start application', error);
    
    // Even if there's an error, try to create the window for debugging
    if (!mainWindow) {
      try {
        logToFile('INFO', 'Attempting to create window despite startup error');
        createWindow();
      } catch (windowError) {
        logToFile('FATAL', 'Failed to create window', windowError);
      }
    }
    
    // Show error dialog if possible
    if (app.isReady()) {
      const { dialog } = require('electron');
      dialog.showErrorBox('Startup Error', 
        `Failed to start Sophon application:\n\n${error.message}\n\nCheck logs at: ${logFile}`);
    }
  }
});

// Quit when all windows are closed
app.on("window-all-closed", function () {
  logToFile('INFO', 'All windows closed');
  
  if (process.platform !== "darwin") {
    logToFile('INFO', 'Non-macOS platform - quitting app');
    cleanupAndQuit();
  }
});

app.on("activate", function () {
  logToFile('INFO', 'App activated');
  
  if (mainWindow === null) {
    logToFile('INFO', 'No main window - creating new one');
    createWindow();
  }
});

// Handle app will quit
app.on('will-quit', (event) => {
  logToFile('INFO', 'App will quit event triggered');
});

// Clean up backend process when app is quitting
app.on("before-quit", (event) => {
  logToFile('INFO', 'App before-quit event triggered');
  if (!isCleaningUp) {
    event.preventDefault(); // Prevent the quit until cleanup is done
    cleanupAndQuit();
  }
});

// Cleanup function
function cleanupAndQuit() {
  if (isCleaningUp) {
    logToFile('INFO', 'Cleanup already in progress, skipping...');
    return;
  }
  
  isCleaningUp = true;
  logToFile('INFO', 'Starting cleanup process...');
  
  let cleanupTasks = 0;
  let completedTasks = 0;
  
  function checkCleanupComplete() {
    completedTasks++;
    if (completedTasks >= cleanupTasks) {
      logToFile('INFO', 'All cleanup tasks completed - allowing app to quit');
      // Remove the before-quit listener to prevent infinite loop
      app.removeAllListeners('before-quit');
      app.quit();
    }
  }
  
  // Kill the backend process when the app is quitting
  if (backendProcess && !backendProcess.killed) {
    cleanupTasks++;
    logToFile('INFO', 'Terminating backend process...');
    try {
      backendProcess.kill('SIGTERM');
      // Force kill after 2 seconds if still running
      setTimeout(() => {
        if (backendProcess && !backendProcess.killed) {
          logToFile('WARNING', 'Force killing backend process');
          backendProcess.kill('SIGKILL');
        }
        checkCleanupComplete();
      }, 2000);
    } catch (error) {
      logToFile('ERROR', 'Error killing backend process', error);
      checkCleanupComplete();
    }
  }
  
  // Close the frontend server when the app is quitting
  if (frontendServer) {
    cleanupTasks++;
    logToFile('INFO', 'Closing frontend server...');
    try {
      frontendServer.close((error) => {
        if (error) {
          logToFile('ERROR', 'Error closing frontend server', error);
        } else {
          logToFile('INFO', 'Frontend server closed successfully');
        }
        checkCleanupComplete();
      });
    } catch (error) {
      logToFile('ERROR', 'Error closing frontend server', error);
      checkCleanupComplete();
    }
  }
  
  // If no cleanup tasks, quit immediately
  if (cleanupTasks === 0) {
    logToFile('INFO', 'No cleanup tasks needed - allowing app to quit');
    app.removeAllListeners('before-quit');
    app.quit();
  }
  
  // Fallback timeout to force quit after 10 seconds
  setTimeout(() => {
    logToFile('WARNING', 'Cleanup timeout reached - forcing app to quit');
    app.removeAllListeners('before-quit');
    app.quit();
  }, 10000);
}