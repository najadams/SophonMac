const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach(function(childItemName) {
      copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

module.exports = async function(context) {
  console.log('Running before-pack script...');
  
  // The context contains the source directory, not the output directory
  // We need to work with the source backend directory
  const backendDir = path.join(process.cwd(), 'backend');
  const nodeModulesDir = path.join(backendDir, 'node_modules');
  const mainNodeModulesDir = path.join(process.cwd(), 'node_modules');
  
  console.log('Backend directory:', backendDir);
  console.log('Node modules directory:', nodeModulesDir);
  
  // Remove existing node_modules to avoid symlink issues
  if (fs.existsSync(nodeModulesDir)) {
    console.log('Removing existing backend node_modules...');
    fs.rmSync(nodeModulesDir, { recursive: true, force: true });
  }
  
  // Install dependencies with npm to avoid pnpm symlinks
  console.log('Installing backend dependencies with npm...');
  try {
    execSync('npm install --production --no-package-lock', {
      cwd: backendDir,
      stdio: 'inherit'
    });
    console.log('Backend dependencies installed successfully');
    
    // Copy all backend node_modules to main node_modules
    console.log('Copying all backend node_modules to main node_modules...');
    
    if (fs.existsSync(nodeModulesDir)) {
      const backendModules = fs.readdirSync(nodeModulesDir);
      
      for (const module of backendModules) {
        if (module.startsWith('.')) continue; // Skip hidden files
        
        const srcPath = path.join(nodeModulesDir, module);
        const destPath = path.join(mainNodeModulesDir, module);
        
        if (fs.existsSync(srcPath) && !fs.existsSync(destPath)) {
          console.log(`Copying ${module}...`);
          copyRecursiveSync(srcPath, destPath);
        }
      }
    }
    
    console.log('All backend dependencies copied to main node_modules');
    
    // Ensure main dependencies like express are available
    console.log('Verifying main dependencies are available...');
    const mainDeps = ['express', 'chromium-pickle-js'];
    for (const dep of mainDeps) {
      const depPath = path.join(mainNodeModulesDir, dep);
      if (fs.existsSync(depPath)) {
        console.log(`✓ ${dep} is available`);
      } else {
        console.log(`✗ ${dep} is missing`);
      }
    }
  } catch (error) {
    console.error('Failed to install backend dependencies:', error);
    throw error;
  }
};