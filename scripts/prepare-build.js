const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs-extra");

console.log("\n🚀 Preparing build...\n");

const backendDir = path.join(__dirname, "..", "backend");
const backendNodeModules = path.join(backendDir, "node_modules");

// 1. Install backend dependencies
console.log("📦 Installing backend dependencies...");
try {
  execSync("pnpm install --filter sophon-backend --prod --no-optional", {
    cwd: path.join(__dirname, ".."),
    stdio: "inherit",
  });
  console.log("✅ Backend dependencies installed\n");
} catch (error) {
  console.error("❌ Failed to install backend dependencies:", error.message);
  process.exit(1);
}

// 2. Verify critical modules
console.log("🔍 Verifying critical modules...");
const criticalModules = [
  "cors",
  "express",
  "better-sqlite3",
  "socket.io",
  "bcrypt",
  "jsonwebtoken",
  "dotenv",
  "bonjour",
  "node-machine-id",
  "ws",
];

let allPresent = true;
for (const mod of criticalModules) {
  const modPath = path.join(backendNodeModules, mod);
  if (fs.existsSync(modPath)) {
    console.log(`  ✅ ${mod}`);
  } else {
    console.error(`  ❌ ${mod} - MISSING`);
    allPresent = false;
  }
}

if (!allPresent) {
  console.error("\n❌ Some critical modules are missing!");
  console.error("Run: pnpm install --filter sophon-backend");
  process.exit(1);
}

// 3. Rebuild native modules for current platform (Electron ABI)
console.log("\n🔧 Rebuilding native modules for Electron...");
try {
  // Use electron-rebuild to align native modules with Electron's Node version
  execSync("pnpm exec electron-rebuild -f -w better-sqlite3 bcrypt", {
    cwd: backendDir,
    stdio: "inherit",
  });
  console.log("✅ Electron-native modules rebuilt\n");
} catch (error) {
  console.warn("⚠️  Warning: electron-rebuild failed for some native modules");
  console.warn("   This might cause issues on the target platform:", error.message);
  // Fallback: attempt plain rebuild from source to at least produce binaries
  try {
    execSync("pnpm rebuild better-sqlite3 --build-from-source", {
      cwd: backendDir,
      stdio: "inherit",
    });
    execSync("pnpm rebuild bcrypt --build-from-source", {
      cwd: backendDir,
      stdio: "inherit",
    });
    console.log("✅ Fallback native rebuild completed\n");
  } catch (fallbackError) {
    console.warn("⚠️  Fallback native rebuild also failed:", fallbackError.message);
  }
}

// 4. Build frontend
console.log("🎨 Building frontend...");
try {
  execSync("pnpm --filter sophon-frontend build", {
    cwd: path.join(__dirname, ".."),
    stdio: "inherit",
  });
  console.log("✅ Frontend built\n");
} catch (error) {
  console.error("❌ Failed to build frontend:", error.message);
  process.exit(1);
}

// 5. Verify frontend dist
const frontendDist = path.join(__dirname, "..", "frontend", "dist");
if (!fs.existsSync(frontendDist)) {
  console.error("❌ Frontend dist directory not found!");
  process.exit(1);
}

// 6. Stage frontend to top-level 'frontend-dist' for electron-builder files
const stagedFrontend = path.join(__dirname, "..", "frontend-dist");
console.log("📦 Staging frontend to:", stagedFrontend);
if (fs.existsSync(stagedFrontend)) {
  fs.removeSync(stagedFrontend);
}
fs.copySync(frontendDist, stagedFrontend);
console.log("✅ Frontend staged\n");

console.log("✅ Build preparation complete!\n");
