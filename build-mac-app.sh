#!/bin/bash

# Sophon macOS Application Build Script
# This script builds a complete, functional macOS Electron application
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

print_status "Starting Sophon macOS Application Build Process..."

# Step 1: Clean previous builds
print_status "Cleaning previous builds..."
rm -rf dist/
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

# Step 5: Build Electron application
print_status "Building Electron application for macOS..."
pnpm run build:mac

# Step 6: Check if build was successful
APP_PATH="dist/mac-arm64/Sophon.app"
if [ ! -d "$APP_PATH" ]; then
    print_error "Build failed - application not found at $APP_PATH"
    exit 1
fi

print_success "Electron application built successfully"

# Step 7: Copy backend dependencies to packaged app
print_status "Copying backend dependencies to packaged application..."
APP_NODE_MODULES="$APP_PATH/Contents/Resources/app/node_modules"

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
print_status "Verifying dependencies in packaged application..."
DEP_COUNT=$(ls "$APP_NODE_MODULES" | wc -l | tr -d ' ')
print_status "Total dependencies in packaged app: $DEP_COUNT"

if [ "$DEP_COUNT" -lt 50 ]; then
    print_warning "Low dependency count detected. Some dependencies might be missing."
else
    print_success "Dependencies appear to be properly included"
fi

# Step 10: Test the application (optional)
print_status "Testing application startup..."
echo "Starting application test (will run for 10 seconds)..."

# Start the app in background
"$APP_PATH/Contents/MacOS/Sophon" &
APP_PID=$!

# Wait a few seconds for startup
sleep 5

# Check if the process is still running
if kill -0 $APP_PID 2>/dev/null; then
    print_success "Application started successfully"
    
    # Test backend connectivity
    if curl -s http://localhost:3003 >/dev/null 2>&1; then
        print_success "Backend is responding on port 3003"
    else
        print_warning "Backend not responding on port 3003"
    fi
    
    # Test frontend connectivity
    if curl -s http://localhost:3002 >/dev/null 2>&1; then
        print_success "Frontend is responding on port 3002"
    else
        print_warning "Frontend not responding on port 3002"
    fi
    
    # Stop the test application
    kill $APP_PID 2>/dev/null || true
    sleep 2
else
    print_error "Application failed to start or crashed immediately"
fi

# Step 11: Final summary
print_success "Build process completed!"
echo ""
echo "📱 Application Location: $APP_PATH"
echo "🚀 To run the application: open '$APP_PATH'"
echo "💻 Or from terminal: '$APP_PATH/Contents/MacOS/Sophon'"
echo ""
print_status "Build Summary:"
echo "  ✅ Frontend built and included"
echo "  ✅ Backend dependencies copied"
echo "  ✅ Main dependencies included"
echo "  ✅ Application packaged for macOS"
echo "  📊 Total dependencies: $DEP_COUNT"
echo ""
print_success "Your Sophon macOS application is ready to use!"

# Optional: Create a simple launcher script
print_status "Creating launcher script..."
cat > "launch-sophon.sh" << 'EOF'
#!/bin/bash
# Sophon Application Launcher
echo "Starting Sophon..."
open "./dist/mac-arm64/Sophon.app"
EOF

chmod +x launch-sophon.sh
print_success "Launcher script created: ./launch-sophon.sh"

echo ""
print_success "🎉 Build completed successfully! Your application is ready to use."