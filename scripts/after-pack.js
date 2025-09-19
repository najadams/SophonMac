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

function copyModuleWithDependencies(moduleName, srcNodeModules, destNodeModules, copiedModules = new Set()) {
  // Avoid infinite loops
  if (copiedModules.has(moduleName)) {
    return;
  }
  copiedModules.add(moduleName);
  
  let srcPath = path.join(srcNodeModules, moduleName);
  const destPath = path.join(destNodeModules, moduleName);
  
  // If not found in regular node_modules, try pnpm store
  if (!fs.existsSync(srcPath)) {
    const pnpmStorePath = path.join(process.cwd(), 'node_modules', '.pnpm');
    if (fs.existsSync(pnpmStorePath)) {
      try {
        const pnpmDirs = fs.readdirSync(pnpmStorePath);
        const modulePattern = moduleName.replace('/', '+').replace('@', '');
        const matchingDir = pnpmDirs.find(dir => dir.startsWith(modulePattern) || dir.includes(modulePattern));
        if (matchingDir) {
          const pnpmModulePath = path.join(pnpmStorePath, matchingDir, 'node_modules', moduleName);
          if (fs.existsSync(pnpmModulePath)) {
            srcPath = pnpmModulePath;
            console.log(`Found ${moduleName} in pnpm store: ${srcPath}`);
          }
        }
      } catch (error) {
        console.warn(`Error searching pnpm store for ${moduleName}:`, error.message);
      }
    }
  }
  
  if (!fs.existsSync(srcPath)) {
    console.warn(`⚠ Module ${moduleName} not found in source`);
    return;
  }
  
  // Copy the module itself
  if (fs.existsSync(destPath)) {
    fs.rmSync(destPath, { recursive: true, force: true });
  }
  copyRecursiveSync(srcPath, destPath);
  console.log(`✓ ${moduleName} copied successfully`);
  
  // Read package.json to find dependencies
  const packageJsonPath = path.join(srcPath, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      const dependencies = {
        ...packageJson.dependencies,
        ...packageJson.peerDependencies
      };
      
      // Recursively copy dependencies
      for (const depName of Object.keys(dependencies || {})) {
        copyModuleWithDependencies(depName, srcNodeModules, destNodeModules, copiedModules);
      }
    } catch (error) {
      console.warn(`⚠ Could not read package.json for ${moduleName}:`, error.message);
    }
  }
}

module.exports = async function(context) {
  console.log('Running after-pack script...');
  console.log('Context appOutDir:', context.appOutDir);
  
  // Path to the built app's resources
  const appResourcesDir = path.join(context.appOutDir, 'resources', 'app');
  const appNodeModulesDir = path.join(appResourcesDir, 'node_modules');
  const backendDir = path.join(appResourcesDir, 'backend');
  const backendNodeModulesDir = path.join(backendDir, 'node_modules');
  
  // Source paths from the main project
  const mainNodeModulesDir = path.join(process.cwd(), 'node_modules');
  
  console.log('App resources dir:', appResourcesDir);
  console.log('App node_modules dir:', appNodeModulesDir);
  console.log('Backend dir:', backendDir);
  console.log('Backend node_modules dir:', backendNodeModulesDir);
  console.log('Main node_modules dir:', mainNodeModulesDir);
  
  // Ensure the app node_modules directory exists
  if (!fs.existsSync(appNodeModulesDir)) {
    fs.mkdirSync(appNodeModulesDir, { recursive: true });
  }
  
  // Ensure the backend node_modules directory exists
  if (!fs.existsSync(backendNodeModulesDir)) {
    fs.mkdirSync(backendNodeModulesDir, { recursive: true });
  }
  
  // Copy critical modules to the built app
  const criticalModules = ['cors', 'express', 'sqlite3', 'socket.io', 'bcrypt', 'jsonwebtoken', 'bonjour', 'node-machine-id'];
  
  // Also copy native module bindings and dependencies
  const nativeModuleDependencies = [
    'node-pre-gyp',
    'node-addon-api', 
    'node-gyp-build',
    '@mapbox/node-pre-gyp',
    'prebuild-install',
    'detect-libc'
  ];
  
  const allModulesToCopy = [...criticalModules, ...nativeModuleDependencies];
  
  for (const module of allModulesToCopy) {
    console.log(`Copying ${module} with dependencies to built app...`);
    
    // Copy to main node_modules with dependencies
    copyModuleWithDependencies(module, mainNodeModulesDir, appNodeModulesDir);
    
    // Copy to backend node_modules with dependencies
    copyModuleWithDependencies(module, mainNodeModulesDir, backendNodeModulesDir);
  }
  
  // Verify the modules are now present
  console.log('Verifying critical modules in built app...');
  for (const module of allModulesToCopy) {
    const mainModulePath = path.join(appNodeModulesDir, module);
    const backendModulePath = path.join(backendNodeModulesDir, module);
    
    if (fs.existsSync(mainModulePath)) {
      console.log(`✓ ${module} verified in main node_modules`);
    } else {
      console.error(`✗ ${module} missing from main node_modules`);
    }
    
    if (fs.existsSync(backendModulePath)) {
      console.log(`✓ ${module} verified in backend node_modules`);
    } else {
      console.error(`✗ ${module} missing from backend node_modules`);
    }
  }
  
  console.log('After-pack script completed.');
};