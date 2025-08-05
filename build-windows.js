const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function copyDir(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (let entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

console.log('Building Windows Electron app...');

try {
  // Build frontend first
  console.log('Building frontend...');
  execSync('pnpm --filter sophon-frontend run build', { stdio: 'inherit' });
  
  // Ensure frontend/dist directory exists and copy to main directory
  const frontendDistPath = path.join(__dirname, 'frontend', 'dist');
  const mainFrontendDistPath = path.join(__dirname, 'frontend-dist');
  
  if (fs.existsSync(frontendDistPath)) {
    console.log('Copying frontend build files...');
    if (fs.existsSync(mainFrontendDistPath)) {
      fs.rmSync(mainFrontendDistPath, { recursive: true, force: true });
    }
    copyDir(frontendDistPath, mainFrontendDistPath);
  } else {
    throw new Error('Frontend build failed - dist directory not found');
  }
  
  // Install backend dependencies properly
  console.log('Installing backend dependencies...');
  const backendDir = path.join(__dirname, 'backend');
  process.chdir(backendDir);
  
  // Clean install for production
  if (fs.existsSync('node_modules')) {
    fs.rmSync('node_modules', { recursive: true, force: true });
  }
  execSync('npm install --production --no-package-lock', { stdio: 'inherit' });
  
  // Return to main directory
  process.chdir(__dirname);
  
  // Create dist directory
  const distDir = path.join(__dirname, 'dist', 'win-complete');
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }
  
  // Use electron-builder for better cross-platform support
  console.log('Packaging for Windows...');
  
  // Set environment variables to skip Wine-dependent operations
  const buildEnv = {
    ...process.env,
    ELECTRON_BUILDER_ALLOW_UNRESOLVED_DEPENDENCIES: 'true',
    SKIP_RCEDIT: 'true'
  };
  
  execSync(`npx electron-builder --win --dir --publish=never`, { 
    stdio: 'inherit',
    env: buildEnv
  });
  
  // Clean up temporary frontend-dist directory
  if (fs.existsSync(mainFrontendDistPath)) {
    fs.rmSync(mainFrontendDistPath, { recursive: true, force: true });
  }
  
  console.log('Windows build completed successfully!');
  console.log('Build location: dist/win-complete/');
  
} catch (error) {
  console.error('Build failed:', error.message);
  process.exit(1);
}