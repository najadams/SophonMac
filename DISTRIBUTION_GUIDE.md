# Sophon Distribution Guide

## Overview

Sophon is now configured as a **standalone application** that can be distributed and run on target machines without requiring any development tools or Node.js installation.

## Standalone Features

### ✅ Bundled Node.js Runtime
- **macOS arm64**: Node.js v20.19.3 bundled
- **macOS x64**: Node.js v20.19.3 bundled  
- **Windows x64**: Node.js v20.19.3 bundled
- **Linux x64**: Node.js v20.19.3 bundled

### ✅ Self-Contained Backend
- All backend dependencies included in package
- Native modules (better-sqlite3, bcrypt) rebuilt for bundled Node.js
- SQLite database created automatically on first run
- No external database dependencies

### ✅ Integrated Frontend
- React frontend built and bundled with application
- Express server serves frontend from packaged resources
- No external web server required

## Building for Distribution

### Prerequisites (Development Machine Only)
```bash
# Install dependencies
npm install
cd frontend && npm install && cd ..
cd backend && npm install && cd ..

# Build frontend
npm run build:frontend
```

### Build Commands

#### macOS (Universal - both arm64 and x64)
```bash
npm run build:mac-arm64
```

#### Windows x64
```bash
npm run build:win
```

#### Linux x64
```bash
npm run build:linux
```

### Output Locations
- **macOS**: `dist/mac/Sophon.app` and `dist/mac-arm64/Sophon.app`
- **Windows**: `dist/win-unpacked/Sophon.exe`
- **Linux**: `dist/linux-unpacked/sophon`

## Distribution Package Contents

Each distribution package includes:

1. **Electron Application**
   - Main application executable
   - Electron runtime and dependencies

2. **Bundled Node.js Runtime**
   - Platform-specific Node.js v20.19.3 binary
   - Located in `Resources/node/` (macOS) or equivalent

3. **Backend Server**
   - Complete Express.js backend with all dependencies
   - SQLite database engine (better-sqlite3)
   - Authentication and business logic

4. **Frontend Application**
   - Built React application
   - All assets and static files

## First Run Behavior

When a user runs Sophon for the first time:

1. **Database Initialization**
   - Creates SQLite database in user data directory
   - Runs initial schema migrations
   - Sets up default configuration

2. **User Data Locations**
   - **macOS**: `~/Library/Application Support/Sophon/`
   - **Windows**: `%APPDATA%/Sophon/`
   - **Linux**: `~/.config/Sophon/`

3. **Log Files**
   - Application logs stored in user data directory
   - Format: `sophon-YYYY-MM-DD.log`

## System Requirements

### Minimum Requirements
- **macOS**: macOS 10.15 (Catalina) or later
- **Windows**: Windows 10 (64-bit) or later
- **Linux**: Ubuntu 18.04 LTS or equivalent (64-bit)
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 500MB free space

### No Additional Software Required
- ❌ Node.js installation not required
- ❌ Database server not required
- ❌ Web browser not required (uses built-in Electron)
- ❌ Development tools not required

## Installation Instructions for End Users

### macOS
1. Download `Sophon.app` from distribution package
2. Move to `/Applications/` folder
3. Right-click and select "Open" (first time only, due to Gatekeeper)
4. Application will start and initialize automatically

### Windows
1. Download and extract the Windows distribution package
2. Run `Sophon.exe` from the extracted folder
3. Windows may show security warning - click "More info" → "Run anyway"
4. Application will start and initialize automatically

### Linux
1. Download and extract the Linux distribution package
2. Make the binary executable: `chmod +x sophon`
3. Run: `./sophon`
4. Application will start and initialize automatically

## Troubleshooting

### Application Won't Start
- Check system requirements
- Ensure sufficient disk space
- Check application logs in user data directory

### Database Issues
- Delete database file to reset: `database.sqlite` in user data directory
- Application will recreate database on next startup

### Performance Issues
- Ensure minimum RAM requirements are met
- Close other resource-intensive applications

## Security Considerations

- Application runs locally - no external network dependencies for core functionality
- Database is stored locally in user data directory
- All communication between frontend and backend is local (localhost)
- No sensitive data transmitted over network by default

## Support

For technical support or issues:
1. Check application logs in user data directory
2. Verify system requirements
3. Try resetting database (delete `database.sqlite`)
4. Contact support with log files if issues persist

---

**Note**: This distribution package is completely self-contained and does not require any additional software installation on the target machine.