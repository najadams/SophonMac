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
  
  // If not found in provided node_modules, try pnpm store layout under srcNodeModules/.pnpm
  if (!fs.existsSync(srcPath)) {
    const pnpmStorePath = path.join(srcNodeModules, '.pnpm');
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
    console.warn(`⚠ Module ${moduleName} not found in source at ${srcNodeModules}`);
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
  
  // Source paths from the project
  const mainNodeModulesDir = path.join(process.cwd(), 'node_modules');
  const sourceBackendNodeModulesDir = path.join(process.cwd(), 'backend', 'node_modules');
  
  console.log('App resources dir:', appResourcesDir);
  console.log('App node_modules dir:', appNodeModulesDir);
  console.log('Backend dir:', backendDir);
  console.log('Backend node_modules dir:', backendNodeModulesDir);
  console.log('Main node_modules dir:', mainNodeModulesDir);
  console.log('Source backend node_modules dir:', sourceBackendNodeModulesDir);
  
  // Ensure the app node_modules directory exists
  if (!fs.existsSync(appNodeModulesDir)) {
    fs.mkdirSync(appNodeModulesDir, { recursive: true });
  }
  
  // Ensure the backend node_modules directory exists
  if (!fs.existsSync(backendNodeModulesDir)) {
    fs.mkdirSync(backendNodeModulesDir, { recursive: true });
  }
  
  // Copy critical modules to the built app (prefer backend node_modules as source)
  const criticalModules = ['cors', 'express', 'better-sqlite3', 'socket.io', 'bcrypt', 'jsonwebtoken', 'bonjour', 'node-machine-id'];
  
  for (const module of criticalModules) {
    console.log(`Copying ${module} with dependencies to built app...`);
    
    // First try from backend node_modules
    copyModuleWithDependencies(module, sourceBackendNodeModulesDir, backendNodeModulesDir);
    
    // Also mirror into main app node_modules for any shared require paths
    copyModuleWithDependencies(module, sourceBackendNodeModulesDir, appNodeModulesDir);
  }
  
  // Verify the modules are now present
  console.log('Verifying critical modules in built app...');
  for (const module of criticalModules) {
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
  
  // Special handling for better-sqlite3 native binaries
  console.log('Ensuring better-sqlite3 native binaries are properly copied...');
  const bsqlSourceCandidatePaths = [
    path.join(sourceBackendNodeModulesDir, 'better-sqlite3'),
    path.join(mainNodeModulesDir, 'better-sqlite3'),
  ];
  let bsqlSourcePath = null;
  // Prefer a candidate that actually has a built Release binary
  for (const candidate of bsqlSourceCandidatePaths) {
    const releasePath = path.join(candidate, 'build', 'Release', 'better_sqlite3.node');
    if (fs.existsSync(releasePath)) {
      bsqlSourcePath = candidate;
      break;
    }
  }
  // If none contain a Release binary, prefer main node_modules if it exists
  if (!bsqlSourcePath && fs.existsSync(bsqlSourceCandidatePaths[1])) {
    bsqlSourcePath = bsqlSourceCandidatePaths[1];
  } else if (!bsqlSourcePath && fs.existsSync(bsqlSourceCandidatePaths[0])) {
    bsqlSourcePath = bsqlSourceCandidatePaths[0];
  }

  const bsqlMainPath = path.join(appNodeModulesDir, 'better-sqlite3');
  const bsqlBackendPath = path.join(backendNodeModulesDir, 'better-sqlite3');

  const resolveModulePath = (p) => {
    try {
      const stat = fs.lstatSync(p);
      if (stat.isSymbolicLink()) {
        const linkTarget = fs.readlinkSync(p);
        const resolved = path.resolve(path.dirname(p), linkTarget);
        console.log(`Resolved symlink for ${p} -> ${resolved}`);
        return resolved;
      }
    } catch (_) {}
    return p;
  };

  const bsqlMainRealPath = resolveModulePath(bsqlMainPath);
  const bsqlBackendRealPath = resolveModulePath(bsqlBackendPath);

  if (bsqlSourcePath && fs.existsSync(bsqlSourcePath)) {
    const buildSourcePath = path.join(bsqlSourcePath, 'build');
    if (fs.existsSync(buildSourcePath)) {
      // Copy to main node_modules (resolved symlink)
      const buildMainPath = path.join(bsqlMainRealPath, 'build');
      if (!fs.existsSync(buildMainPath)) {
        console.log('Copying better-sqlite3 build directory to main node_modules (resolved)...');
        copyRecursiveSync(buildSourcePath, buildMainPath);
      }

      // Copy to backend node_modules (resolved symlink)
      const buildBackendPath = path.join(bsqlBackendRealPath, 'build');
      if (!fs.existsSync(buildBackendPath)) {
        console.log('Copying better-sqlite3 build directory to backend node_modules (resolved)...');
        copyRecursiveSync(buildSourcePath, buildBackendPath);
      }

      // Ensure Release/better_sqlite3.node is present by explicitly copying/overwriting
      const releaseSourcePath = path.join(buildSourcePath, 'Release', 'better_sqlite3.node');
      if (fs.existsSync(releaseSourcePath)) {
        const releaseMainDir = path.join(buildMainPath, 'Release');
        const releaseBackendDir = path.join(buildBackendPath, 'Release');
        fs.mkdirSync(releaseMainDir, { recursive: true });
        fs.mkdirSync(releaseBackendDir, { recursive: true });
        console.log('Copying better-sqlite3 Release binary to main and backend node_modules (resolved)...');
        fs.copyFileSync(releaseSourcePath, path.join(releaseMainDir, 'better_sqlite3.node'));
        fs.copyFileSync(releaseSourcePath, path.join(releaseBackendDir, 'better_sqlite3.node'));
      } else {
        console.warn('better-sqlite3 build/Release/better_sqlite3.node not found in source');
      }
    } else {
      console.warn('better-sqlite3 build directory not found in source path');
    }
  } else {
    console.warn('better-sqlite3 module not found in source node_modules (backend or main).');
  }
  
  console.log('After-pack script completed.');
};