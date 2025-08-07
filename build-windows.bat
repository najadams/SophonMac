@echo off
echo ========================================
echo Sophon Windows Build Script
echo ========================================
echo.

echo Checking Node.js installation...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo Checking npm installation...
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: npm is not installed or not in PATH
    pause
    exit /b 1
)

echo.
echo Installing pnpm globally...
npm install -g pnpm
if %errorlevel% neq 0 (
    echo ERROR: Failed to install pnpm
    pause
    exit /b 1
)

echo.
echo Installing root dependencies...
pnpm install
if %errorlevel% neq 0 (
    echo ERROR: Failed to install root dependencies
    pause
    exit /b 1
)

echo.
echo Installing frontend dependencies...
cd frontend
npm install
if %errorlevel% neq 0 (
    echo ERROR: Failed to install frontend dependencies
    pause
    exit /b 1
)
cd ..

echo.
echo Installing backend dependencies...
cd backend
npm install
if %errorlevel% neq 0 (
    echo ERROR: Failed to install backend dependencies
    pause
    exit /b 1
)
cd ..

echo.
echo Building frontend...
pnpm run build:frontend
if %errorlevel% neq 0 (
    echo ERROR: Failed to build frontend
    pause
    exit /b 1
)

echo.
echo Installing backend production dependencies...
pnpm run install:backend
if %errorlevel% neq 0 (
    echo ERROR: Failed to install backend production dependencies
    pause
    exit /b 1
)

echo.
echo Installing electron-builder...
npm install -g electron-builder
if %errorlevel% neq 0 (
    echo ERROR: Failed to install electron-builder
    pause
    exit /b 1
)

echo.
echo Building Windows application...
npx electron-builder --win --config.win.target=dir --publish=never
if %errorlevel% neq 0 (
    echo.
    echo Primary build failed, trying alternative method...
    npx electron-packager . Sophon --platform=win32 --arch=x64 --out=dist/win --overwrite --ignore=node_modules --ignore=frontend/node_modules --ignore=backend/node_modules
    if %errorlevel% neq 0 (
        echo ERROR: All build methods failed
        pause
        exit /b 1
    )
)

echo.
echo ========================================
echo BUILD COMPLETED SUCCESSFULLY!
echo ========================================
echo.
echo Your application is ready in the dist/win directory
echo You can now run Sophon.exe from that directory
echo.
pause