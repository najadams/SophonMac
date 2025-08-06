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
  ? path.join(os.homedir(), 'Library', 'Logs', 'Sophon')
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
  // Set proper app data path for packaged app
  const appDataPath = path.join(os.homedir(), 'Library', 'Application Support', 'Sophon');
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
      show: true, // Show window immediately
    });

    // Load the index.html file
    const loadURL =
      process.env.NODE_ENV === "development"
        ? "http://localhost:5173/" // Vite development server default port
        : "http://localhost:3002"; // Always use port 3002 for production

    logToFile("INFO", `Loading frontend from: ${loadURL}`);

    // Focus the window since it's already shown
    mainWindow.focus();

    // Handle load failures
    mainWindow.webContents.on(
      "did-fail-load",
      (event, errorCode, errorDescription, validatedURL) => {
        logToFile(
          "ERROR",
          `Failed to load ${validatedURL}: ${errorCode} - ${errorDescription}`
        );

        // Log the error - window is already shown
        logToFile('ERROR', 'Frontend failed to load, but window is visible for debugging');
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

    // Load the URL
    mainWindow.loadURL(loadURL);

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
      // Try multiple possible locations for packaged apps
      const possiblePaths = [
        path.join(process.resourcesPath, 'app', 'frontend', 'dist'),
        path.join(process.resourcesPath, 'app', 'frontend-dist'),
        path.join(app.getAppPath(), 'frontend', 'dist'),
        path.join(app.getAppPath(), 'frontend-dist')
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
        PORT: '3003',
        NODE_ENV: process.env.NODE_ENV,
        // Ensure backend has proper paths
        BACKEND_DIR: backendDir,
        // Pass database path for packaged apps
        DB_PATH: app.isPackaged ? path.join(app.getPath('userData'), 'database.sqlite') : undefined
      };
      
      // For packaged apps, set NODE_PATH to include node_modules locations
      if (app.isPackaged) {
        const possibleNodeModulesPaths = [
          path.join(backendDir, 'node_modules'),
          path.join(process.resourcesPath, 'backend', 'node_modules'),
          path.join(process.resourcesPath, 'app.asar.unpacked', 'backend', 'node_modules'),
          path.join(process.resourcesPath, 'app', 'backend', 'node_modules'),
          path.join(app.getAppPath(), 'backend', 'node_modules'),
          path.join(app.getAppPath(), '..', 'backend', 'node_modules'),
          // Windows specific paths
          path.join(process.resourcesPath, '..', 'backend', 'node_modules'),
          path.join(__dirname, 'backend', 'node_modules'),
          // Main node_modules as fallback
          path.join(process.resourcesPath, 'node_modules'),
          path.join(app.getAppPath(), 'node_modules')
        ];
        
        const validNodePaths = possibleNodeModulesPaths.filter(p => {
          const exists = fs.existsSync(p);
          logToFile('INFO', `Checking node_modules path ${p}: ${exists ? 'EXISTS' : 'NOT FOUND'}`);
          if (exists) {
            // Also check if cors module specifically exists
            const corsPath = path.join(p, 'cors');
            const corsExists = fs.existsSync(corsPath);
            logToFile('INFO', `  - cors module at ${corsPath}: ${corsExists ? 'EXISTS' : 'NOT FOUND'}`);
          }
          return exists;
        });
        
        if (backendEnv.NODE_PATH) {
          validNodePaths.push(backendEnv.NODE_PATH);
        }
        
        if (validNodePaths.length > 0) {
          backendEnv.NODE_PATH = validNodePaths.join(path.delimiter);
          logToFile('INFO', `Setting NODE_PATH to: ${backendEnv.NODE_PATH}`);
          
          // Additional debugging - try to resolve cors module
          for (const nodePath of validNodePaths) {
            const corsPath = path.join(nodePath, 'cors');
            if (fs.existsSync(corsPath)) {
              logToFile('INFO', `CORS module confirmed at: ${corsPath}`);
              const packageJsonPath = path.join(corsPath, 'package.json');
              if (fs.existsSync(packageJsonPath)) {
                try {
                  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
                  logToFile('INFO', `CORS version: ${packageJson.version}`);
                } catch (e) {
                  logToFile('WARNING', `Could not read cors package.json: ${e.message}`);
                }
              }
              break;
            }
          }
        } else {
          logToFile('WARNING', 'No valid node_modules paths found for backend');
        }
        
        // Also set NODE_MODULES_PATH for additional resolution
        if (validNodePaths.length > 0) {
          backendEnv.NODE_MODULES_PATH = validNodePaths[0];
        }
      }
      
      logToFile('INFO', `Spawning backend process with NODE_ENV: ${backendEnv.NODE_ENV}`);
      
      // Use proper Node.js executable for packaged apps
      let nodeExecutable, spawnArgs;
      if (app.isPackaged) {
        // In packaged apps, try to find system Node.js first, fallback to Electron
        const possibleNodePaths = process.platform === 'win32' ? [
          'node.exe',
          'node',
          path.join(process.env.ProgramFiles || 'C:\\Program Files', 'nodejs', 'node.exe'),
          path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'nodejs', 'node.exe')
        ] : [
          '/usr/local/bin/node',
          '/opt/homebrew/bin/node',
          '/usr/bin/node',
          'node'
        ];
        
        nodeExecutable = null;
        for (const nodePath of possibleNodePaths) {
          try {
            // Test if node executable exists and works
            require('child_process').execSync(`${nodePath} --version`, { stdio: 'ignore' });
            nodeExecutable = nodePath;
            logToFile('INFO', `Found working Node.js at: ${nodePath}`);
            break;
          } catch (e) {
            // Continue to next path
          }
        }
        
        if (!nodeExecutable) {
          // Fallback to using Electron with node arguments
          nodeExecutable = process.execPath;
          spawnArgs = ['--node-integration=false', '--', backendPath];
          logToFile('INFO', 'Using Electron executable as Node.js fallback');
        } else {
          spawnArgs = [backendPath];
        }
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
      };

      // For packaged apps using system node, add shell option
      if (app.isPackaged && nodeExecutable !== process.execPath) {
        spawnOptions.shell = true;
      }

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

    // Start frontend server first (for production builds)
    logToFile('INFO', 'Starting frontend server...');
    await startFrontendServer();
    logToFile('INFO', 'Frontend server startup completed');

    // Start backend and wait for it to be ready
    logToFile('INFO', 'Starting backend server...');
    const backendPort = await startBackend(); // This will now return the port
    logToFile('INFO', `Backend server started and is listening on port ${backendPort}`);

    logToFile('INFO', 'Creating main window...');
    createWindow();
    logToFile('INFO', 'Application startup completed successfully');
    
  } catch (error) {
    logToFile('FATAL', 'Failed to start application', error);
    
    // Show error dialog if possible
    if (app.isReady()) {
      const { dialog } = require('electron');
      dialog.showErrorBox('Startup Error', 
        `Failed to start Sophon application:\n\n${error.message}\n\nCheck logs at: ${logFile}`);
    }
    
    app.quit();
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
  cleanupAndQuit();
});

// Cleanup function
function cleanupAndQuit() {
  logToFile('INFO', 'Starting cleanup process...');
  
  // Kill the backend process when the app is quitting
  if (backendProcess && !backendProcess.killed) {
    logToFile('INFO', 'Terminating backend process...');
    try {
      backendProcess.kill('SIGTERM');
      // Force kill after 5 seconds if still running
      setTimeout(() => {
        if (backendProcess && !backendProcess.killed) {
          logToFile('WARNING', 'Force killing backend process');
          backendProcess.kill('SIGKILL');
        }
      }, 5000);
    } catch (error) {
      logToFile('ERROR', 'Error killing backend process', error);
    }
  }
  
  // Close the frontend server when the app is quitting
  if (frontendServer) {
    logToFile('INFO', 'Closing frontend server...');
    try {
      frontendServer.close((error) => {
        if (error) {
          logToFile('ERROR', 'Error closing frontend server', error);
        } else {
          logToFile('INFO', 'Frontend server closed successfully');
        }
      });
    } catch (error) {
      logToFile('ERROR', 'Error closing frontend server', error);
    }
  }
  
  logToFile('INFO', 'Cleanup completed - app will quit');
  
  if (process.platform !== "darwin") {
    app.quit();
  }
}