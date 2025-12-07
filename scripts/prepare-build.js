const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach((child) => {
      copyRecursiveSync(path.join(src, child), path.join(dest, child));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

console.log("\n🚀 Preparing build...\n");

const backendDir = path.join(__dirname, "..", "backend");
const backendNodeModules = path.join(backendDir, "node_modules");

// 1. Install backend dependencies
console.log("📦 Installing backend dependencies...");
try {
  execSync("npm install --production --no-audit --no-fund", {
    cwd: backendDir,
    stdio: "inherit",
  });
  console.log("✅ Backend dependencies installed\n");
} catch (error) {
  console.error("❌ Failed to install backend dependencies:", error.message);
  process.exit(1);
}

// 1.5 Generate .env file for backend
console.log("📝 Generating backend .env file...");
// We pull from VITE_ prefixed vars (common in this stack) or standard vars
const envContent = `
SUPABASE_URL=${process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || ''}
SUPABASE_ANON_KEY=${process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''}
`;
try {
  fs.writeFileSync(path.join(backendDir, ".env"), envContent.trim());
  console.log("✅ .env file created");
} catch (error) {
  console.error("❌ Failed to create .env file:", error.message);
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
  console.error("Run: npm install --production in backend directory");
  process.exit(1);
}

// 3. Skip Electron ABI rebuild for native modules; backend runs under external Node.
console.log("\n🔧 Checking native modules (no Electron rebuild)...");
try {
  const bsqlRelease = path.join(
    backendNodeModules,
    "better-sqlite3",
    "build",
    "Release"
  );
  if (fs.existsSync(bsqlRelease)) {
    console.log("✅ better-sqlite3 binary present:", bsqlRelease);
  } else {
    console.warn(
      "⚠️ better-sqlite3 binary missing; npm may need to build from source"
    );
  }

  const bcryptBinding = path.join(
    backendNodeModules,
    "bcrypt",
    "lib",
    "binding",
    process.platform === "darwin"
      ? `napi-v3-darwin-${process.arch}`
      : `napi-v3-${process.platform}-${process.arch}`,
    process.platform === "win32" ? "bcrypt_lib.node" : "bcrypt_lib.node"
  );
  if (fs.existsSync(bcryptBinding)) {
    console.log("✅ bcrypt native binding present:", bcryptBinding);
  } else {
    console.warn("⚠️ bcrypt native binding not found; relying on prebuilt binaries");
  }
} catch (error) {
  console.warn("⚠️ Native module check skipped:", error.message);
}

// Rebuild better-sqlite3 for bundled/target Node runtime to avoid ABI mismatch
console.log("\n🔁 Rebuilding better-sqlite3 for bundled Node runtime...");
try {
  // Default to Node 20 to use prebuilt better-sqlite3 binaries (ABI 115)
  const targetNodeVersion = process.env.BUNDLED_NODE_VERSION || "20.18.1";
  console.log(`   → Target Node version: ${targetNodeVersion}`);
  execSync(
    `npm rebuild better-sqlite3 --update-binary --runtime=node --target=${targetNodeVersion}`,
    { cwd: backendDir, stdio: "inherit" }
  );
  console.log("✅ better-sqlite3 rebuilt for Node", targetNodeVersion);
} catch (error) {
  console.warn("⚠️ better-sqlite3 rebuild failed; backend may rely on system Node:", error.message);
}

// 4. Build frontend
console.log("🎨 Building frontend...");
try {
  execSync("pnpm --dir frontend build", {
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
  fs.rmSync(stagedFrontend, { recursive: true, force: true });
}
copyRecursiveSync(frontendDist, stagedFrontend);
console.log("✅ Frontend staged\n");

console.log("✅ Build preparation complete!\n");
