# Sophon POS Desktop Application - Distribution Guide

## 📦 Distribution Files

The following distribution files have been created for macOS:

### DMG Installers (Recommended for Distribution)
- **`Sophon-1.0.0.dmg`** - Intel x64 architecture (91.2 MB)
- **`Sophon-1.0.0-arm64.dmg`** - Apple Silicon ARM64 architecture (87.7 MB)

### App Bundles (For Development/Testing)
- **`dist/mac/Sophon.app`** - Intel x64 app bundle
- **`dist/mac-arm64/Sophon.app`** - ARM64 app bundle

## 🚀 Installation Instructions

### For End Users
1. Download the appropriate DMG file for your Mac:
   - **Intel Macs**: Use `Sophon-1.0.0.dmg`
   - **Apple Silicon Macs (M1/M2/M3)**: Use `Sophon-1.0.0-arm64.dmg`

2. Double-click the DMG file to mount it
3. Drag the Sophon app to your Applications folder
4. Launch Sophon from Applications or Spotlight

### First Launch Notes
- On first launch, macOS may show a security warning since the app is not code-signed
- To bypass this: Right-click the app → "Open" → "Open" in the security dialog
- The app will create its data directory at `~/Library/Application Support/Sophon`

## 🏗️ Build Information

### Application Details
- **Name**: Sophon POS System
- **Version**: 1.0.0
- **Platform**: macOS (Intel x64 + Apple Silicon ARM64)
- **Framework**: Electron 24.8.8
- **Frontend**: React + Vite
- **Backend**: Node.js + Express + SQLite

### Architecture
- **Frontend Server**: Runs on localhost:3002-3006 (auto-selects available port)
- **Backend API**: Runs on localhost:3003
- **Database**: SQLite (local file-based)
- **Single Instance**: Prevents multiple app instances

## 🔧 Development Commands

```bash
# Install all dependencies
npm run install:all

# Run in development mode
npm run dev

# Build for production
npm run build:mac

# Build for Windows
npm run build:win

# Start production build
npm start
```

## 📁 Project Structure

```
sophon/
├── main.js                 # Electron main process
├── package.json           # Main package configuration
├── frontend/              # React frontend application
│   ├── src/              # Frontend source code
│   ├── dist/             # Built frontend assets
│   └── package.json      # Frontend dependencies
├── backend/               # Node.js backend API
│   ├── routes/           # API route handlers
│   ├── database.db       # SQLite database
│   └── package.json      # Backend dependencies
├── dist/                  # Distribution builds
│   ├── mac/              # macOS x64 build
│   ├── mac-arm64/        # macOS ARM64 build
│   ├── Sophon-1.0.0.dmg  # x64 installer
│   └── Sophon-1.0.0-arm64.dmg # ARM64 installer
└── resources/             # App icons and assets
```

## 🛠️ Technical Features

### Core Functionality
- **Point of Sale (POS)** - Complete transaction processing
- **Inventory Management** - Stock tracking and management
- **Customer Management** - Customer database and history
- **Vendor Management** - Supplier and vendor tracking
- **Financial Reports** - Sales and financial analytics
- **Debt Tracking** - Customer debt management
- **Receipt Generation** - Automated receipt printing

### Technical Capabilities
- **Offline Operation** - Works without internet connection
- **Data Persistence** - SQLite database for reliable storage
- **Auto-Updates** - Built-in update mechanism
- **Cross-Platform** - Electron-based for multiple OS support
- **Responsive UI** - Modern React-based interface

## 🔒 Security & Data

### Data Storage
- All data stored locally in SQLite database
- Application data: `~/Library/Application Support/Sophon/`
- Logs: `~/Library/Logs/Sophon/`

### Security Features
- Single instance lock prevents data conflicts
- Local-only operation (no external data transmission)
- Automatic database migrations
- Error logging and crash reporting

## 📋 System Requirements

### Minimum Requirements
- **macOS**: 10.12 Sierra or later
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 200MB free space
- **Architecture**: Intel x64 or Apple Silicon ARM64

### Recommended
- **macOS**: 11.0 Big Sur or later
- **RAM**: 8GB or more
- **Storage**: 1GB free space for data

## 🐛 Troubleshooting

### Common Issues

1. **App won't start**
   - Check logs in `~/Library/Logs/Sophon/`
   - Ensure no other instance is running
   - Try removing `~/Library/Application Support/Sophon/` and restart

2. **Security warnings**
   - Right-click app → "Open" to bypass Gatekeeper
   - App is not code-signed (development build)

3. **Database issues**
   - Database auto-creates on first run
   - Check permissions on Application Support folder

### Log Files
- Main logs: `~/Library/Logs/Sophon/sophon-YYYY-MM-DD.log`
- Check logs for detailed error information

## 📞 Support

For technical support or issues:
1. Check the log files for error details
2. Ensure system requirements are met
3. Try a clean installation (remove app data folder)

---

**Built with ❤️ using Electron, React, and Node.js**