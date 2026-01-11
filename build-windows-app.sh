#!/bin/bash

# Sophon Windows Application Build Script
# This script builds a complete, functional Windows Electron application
# with all dependencies properly included

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "frontend" ] || [ ! -d "backend" ]; then
    print_error "This script must be run from the project root directory containing package.json, frontend/, and backend/ folders"
    exit 1
fi

print_status "Starting Sophon Windows Application Build Process..."

# Step 1: Clean previous builds
print_status "Cleaning previous Windows builds..."
rm -rf dist/win*
rm -rf dist/*win*
rm -rf frontend-dist/

# Step 2: Install dependencies
print_status "Installing root dependencies..."
pnpm install

print_status "Installing backend dependencies..."
pnpm --filter sophon-backend install --production

print_status "Installing frontend dependencies..."
pnpm --filter sophon-frontend install

# Step 3: Build frontend
print_status "Building frontend..."
cd frontend
npm run build
cd ..

# Step 4: Copy frontend build to root
print_status "Copying frontend build to root directory..."
cp -r frontend/dist frontend-dist

# Step 5: Build Electron application for Windows
print_status "Building Electron application for Windows using electron-packager..."
# Use the existing package:win script from package.json
pnpm run package:win

# Step 6: Check if build was successful
APP_DIR="dist/win"
APP_PATH="$APP_DIR/Sophon-win32-x64"

# Check if the Windows build directory exists
if [ ! -d "$APP_PATH" ]; then
    # Try alternative paths
    for possible_path in "$APP_DIR"/*; do
        if [ -d "$possible_path" ] && [[ "$possible_path" == *"Sophon"* ]]; then
            APP_PATH="$possible_path"
            break
        fi
    done
fi

if [ -z "$APP_PATH" ]; then
    print_error "Build failed - Windows application directory not found in $APP_DIR"
    print_status "Available directories:"
    ls -la "$APP_DIR/" 2>/dev/null || echo "No dist directory found"
    exit 1
fi

print_success "Windows Electron application built successfully at $APP_PATH"

# Step 7: Copy backend dependencies to packaged app
print_status "Copying backend dependencies to packaged Windows application..."
APP_NODE_MODULES="$APP_PATH/resources/app/node_modules"

# Ensure the node_modules directory exists
mkdir -p "$APP_NODE_MODULES"

# Copy all backend dependencies
if [ -d "backend/node_modules" ]; then
    print_status "Copying backend node_modules..."
    cp -r backend/node_modules/* "$APP_NODE_MODULES/"
else
    print_warning "Backend node_modules not found, installing backend dependencies first..."
    cd backend
    npm install --production
    cd ..
    cp -r backend/node_modules/* "$APP_NODE_MODULES/"
fi

# Step 8: Copy main project dependencies
print_status "Copying main project dependencies..."
if [ -d "node_modules/express" ]; then
    cp -r node_modules/express "$APP_NODE_MODULES/"
fi
if [ -d "node_modules/chromium-pickle-js" ]; then
    cp -r node_modules/chromium-pickle-js "$APP_NODE_MODULES/"
fi

# Step 9: Verify dependencies
print_status "Verifying dependencies in packaged Windows application..."
DEP_COUNT=$(ls "$APP_NODE_MODULES" | wc -l | tr -d ' ')
print_status "Total dependencies in packaged app: $DEP_COUNT"

if [ "$DEP_COUNT" -lt 50 ]; then
    print_warning "Low dependency count detected. Some dependencies might be missing."
else
    print_success "Dependencies appear to be properly included"
fi

# Step 10: Create portable launcher script for Windows
print_status "Creating Windows launcher script..."
cat > "$APP_PATH/launch-sophon.bat" << 'EOF'
@echo off
echo Starting Sophon...
echo Backend will start on port 3003
echo Frontend will be available on port 3002
echo.
echo Close this window to stop the application
echo.
start "" "Sophon.exe"
EOF

print_success "Windows launcher script created: $APP_PATH/launch-sophon.bat"

# Step 11: Create installation instructions
print_status "Creating installation instructions..."
cat > "WINDOWS_INSTALL_INSTRUCTIONS.txt" << EOF
# Sophon Windows Installation Instructions

## Installation
1. Extract the application to your desired location (e.g., C:\\Program Files\\Sophon)
2. Run 'Sophon.exe' to start the application
3. Or use 'launch-sophon.bat' for a more user-friendly startup

## Application Details
- Application Location: $APP_PATH
- Executable: $APP_PATH/Sophon.exe
- Backend Port: 3003
- Frontend Port: 3002
- Dependencies Included: $DEP_COUNT modules

## System Requirements
- Windows 10 or later
- 4GB RAM minimum
- 500MB free disk space

## Troubleshooting
- If the application doesn't start, check Windows Defender/Antivirus settings
- Ensure ports 3002 and 3003 are not blocked by firewall
- Run as Administrator if you encounter permission issues

## Features
✅ Point of Sale System
✅ Inventory Management
✅ Customer Management
✅ Sales Reporting
✅ Network Synchronization
✅ Multi-user Support

Built on: $(date)
EOF

print_success "Installation instructions created: WINDOWS_INSTALL_INSTRUCTIONS.txt"

# Step 12: Check for installer files
print_status "Checking for Windows installer files..."
INSTALLER_FILES=("$APP_DIR"/*.exe)
if [ -f "${INSTALLER_FILES[0]}" ] && [ "${INSTALLER_FILES[0]}" != "$APP_DIR/*.exe" ]; then
    print_success "Windows installer created: ${INSTALLER_FILES[0]}"
    INSTALLER_SIZE=$(du -h "${INSTALLER_FILES[0]}" | cut -f1)
    print_status "Installer size: $INSTALLER_SIZE"
else
    print_warning "No Windows installer (.exe) found. Only portable version available."
fi

# Step 13: Final summary
print_success "Windows build process completed!"
echo ""
echo "🖥️  Application Location: $APP_PATH"
echo "🚀 To run the application: $APP_PATH/Sophon.exe"
echo "📋 Or use the launcher: $APP_PATH/launch-sophon.bat"
if [ -f "${INSTALLER_FILES[0]}" ] && [ "${INSTALLER_FILES[0]}" != "$APP_DIR/*.exe" ]; then
    echo "💿 Installer available: ${INSTALLER_FILES[0]}"
fi
echo ""
print_status "Build Summary:"
echo "  ✅ Frontend built and included"
echo "  ✅ Backend dependencies copied"
echo "  ✅ Main dependencies included"
echo "  ✅ Application packaged for Windows"
echo "  ✅ Launcher script created"
echo "  ✅ Installation instructions provided"
echo "  📊 Total dependencies: $DEP_COUNT"
echo ""
print_success "Your Sophon Windows application is ready!"

# Step 14: Create a distribution package script
print_status "Creating distribution package script..."
cat > "package-for-distribution.sh" << 'EOF'
#!/bin/bash
# Package Sophon for distribution

echo "Creating distribution package..."

# Find the Windows build directory
APP_DIR="dist"
WIN_DIRS=("win-unpacked" "win-ia32-unpacked" "win-x64-unpacked")
APP_PATH=""

for dir in "${WIN_DIRS[@]}"; do
    if [ -d "$APP_DIR/$dir" ]; then
        APP_PATH="$APP_DIR/$dir"
        break
    fi
done

if [ -n "$APP_PATH" ]; then
    # Create a zip package
    PACKAGE_NAME="Sophon-Windows-$(date +%Y%m%d).zip"
    echo "Creating package: $PACKAGE_NAME"
    
    cd "$(dirname "$APP_PATH")"
    zip -r "../$PACKAGE_NAME" "$(basename "$APP_PATH")" -x "*.log" "*.tmp"
    cd ..
    
    echo "✅ Distribution package created: $PACKAGE_NAME"
    echo "📦 Package size: $(du -h "$PACKAGE_NAME" | cut -f1)"
else
    echo "❌ No Windows build found to package"
fi
EOF

chmod +x package-for-distribution.sh
print_success "Distribution packaging script created: ./package-for-distribution.sh"

echo ""
print_success "🎉 Windows build completed successfully! Your application is ready for distribution."
print_status "Next steps:"
echo "  1. Test the application: $APP_PATH/Sophon.exe"
echo "  2. Create distribution package: ./package-for-distribution.sh"
echo "  3. Read installation instructions: WINDOWS_INSTALL_INSTRUCTIONS.txt"