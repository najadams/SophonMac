# Sophon - Windows Build Instructions

## Prerequisites

Before building on Windows, ensure you have the following installed:

1. **Node.js** (version 16 or higher)
   - Download from: https://nodejs.org/
   - Verify installation: `node --version`

2. **npm** (comes with Node.js)
   - Verify installation: `npm --version`

3. **pnpm** (recommended package manager)
   - Install globally: `npm install -g pnpm`
   - Verify installation: `pnpm --version`

4. **Git** (optional, for version control)
   - Download from: https://git-scm.com/

## Build Instructions

### Step 1: Extract the Package
1. Extract the `sophon-source-package.tar.gz` file to your desired directory
2. Open Command Prompt or PowerShell as Administrator
3. Navigate to the extracted directory: `cd path\to\sophon`

### Step 2: Install Dependencies
```bash
# Install root dependencies
pnpm install

# Install frontend dependencies
cd frontend
npm install
cd ..

# Install backend dependencies
cd backend
npm install
cd ..
```

### Step 3: Build the Application
```bash
# Build frontend
pnpm run build:frontend

# Install backend production dependencies
pnpm run install:backend

# Build Windows executable
npx electron-builder --win --publish=never
```

### Alternative Build Methods

If the above fails, try these alternatives:

#### Method 1: Simple Directory Build
```bash
npx electron-builder --win --config.win.target=dir --publish=never
```

#### Method 2: Using electron-packager
```bash
npm install -g electron-packager
pnpm run package:win
```

### Step 4: Locate Built Application

After successful build, find your application in:
- `dist/win/` directory (for electron-builder)
- `dist/win/Sophon-win32-x64/` directory (for electron-packager)

## Troubleshooting

### Common Issues

1. **"vite: command not found"**
   - Solution: Install frontend dependencies first: `cd frontend && npm install`

2. **Build fails with Wine errors**
   - This package is configured to avoid Wine dependencies
   - Use the directory target: `--config.win.target=dir`

3. **Permission errors**
   - Run Command Prompt as Administrator
   - Ensure antivirus is not blocking the build process

4. **Out of memory errors**
   - Close other applications
   - Increase Node.js memory: `node --max-old-space-size=4096`

### Build Configuration

The application includes these fixes for port conflicts:
- Frontend server tries ports 3004-3007 sequentially
- Backend server tries ports 3001-3003 sequentially
- WebSocket server includes CORS for all frontend ports
- Dynamic port detection prevents conflicts

## Running the Application

After building:
1. Navigate to the build output directory
2. Run `Sophon.exe` (or the main executable)
3. The application will start with automatic port detection

## Development Mode

For development on Windows:
```bash
# Start development server
pnpm run dev
```

This will start both frontend and backend in development mode with hot reload.

## Support

If you encounter issues:
1. Check that all prerequisites are installed
2. Ensure you're running as Administrator
3. Try the alternative build methods
4. Check Windows Defender/antivirus settings

---

**Note**: This package includes all the latest fixes for port conflicts and backend timeout issues. The application will automatically handle port selection to avoid conflicts with other services.