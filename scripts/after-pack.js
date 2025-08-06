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
  console.log('Running after-pack script...');
  console.log('Context appOutDir:', context.appOutDir);
  
  // Path to the built app's resources
  const appResourcesDir = path.join(context.appOutDir, 'resources', 'app');
  const appNodeModulesDir = path.join(appResourcesDir, 'node_modules');
  
  // Source paths from the main project
  const mainNodeModulesDir = path.join(process.cwd(), 'node_modules');
  
  console.log('App resources dir:', appResourcesDir);
  console.log('App node_modules dir:', appNodeModulesDir);
  console.log('Main node_modules dir:', mainNodeModulesDir);
  
  // Ensure the app node_modules directory exists
  if (!fs.existsSync(appNodeModulesDir)) {
    fs.mkdirSync(appNodeModulesDir, { recursive: true });
  }
  
  // Copy critical modules to the built app
  const criticalModules = ['cors', 'express', 'sqlite3', 'socket.io', 'bcrypt'];
  
  for (const module of criticalModules) {
    const srcPath = path.join(mainNodeModulesDir, module);
    const destPath = path.join(appNodeModulesDir, module);
    
    if (fs.existsSync(srcPath)) {
      console.log(`Copying ${module} to built app...`);
      
      // Remove existing if present
      if (fs.existsSync(destPath)) {
        fs.rmSync(destPath, { recursive: true, force: true });
      }
      
      copyRecursiveSync(srcPath, destPath);
      console.log(`✓ ${module} copied to built app successfully`);
    } else {
      console.warn(`⚠ ${module} not found in main node_modules`);
    }
  }
  
  // Verify the modules are now present
  console.log('Verifying critical modules in built app...');
  for (const module of criticalModules) {
    const modulePath = path.join(appNodeModulesDir, module);
    if (fs.existsSync(modulePath)) {
      console.log(`✓ ${module} verified in built app`);
    } else {
      console.error(`✗ ${module} missing from built app`);
    }
  }
  
  console.log('After-pack script completed.');
};