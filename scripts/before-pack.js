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

module.exports = async function (context) {
  console.log("📦 Running before-pack script...");

  const backendDir = path.join(process.cwd(), "backend");
  const nodeModulesDir = path.join(backendDir, "node_modules");
  const mainNodeModulesDir = path.join(process.cwd(), "node_modules");

  console.log("➡ Backend directory:", backendDir);
  console.log("➡ Backend node_modules:", nodeModulesDir);
  console.log("➡ Main node_modules:", mainNodeModulesDir);

  // Remove existing backend node_modules to avoid symlink issues
  if (fs.existsSync(nodeModulesDir)) {
    console.log("🧹 Removing existing backend node_modules...");
    fs.rmSync(nodeModulesDir, { recursive: true, force: true });
  }

  try {
    console.log("📥 Installing backend dependencies with pnpm...");
    execSync("pnpm install --filter sophon-backend --prod --no-optional", {
      cwd: process.cwd(),
      stdio: "inherit",
    });

    console.log("✅ Backend dependencies installed successfully");

    const criticalModules = [
      "cors",
      "express",
      "sqlite3",
      "socket.io",
      "bcrypt",
      "uuid",
      "@supabase/supabase-js",
      "jsonwebtoken",
      "dotenv",
      "object-assign",
      "vary",
      "bonjour",
      "node-machine-id",
      "ws",
    ];

    console.log("🔍 Verifying backend modules...");
    for (const mod of criticalModules) {
      const modPath = path.join(nodeModulesDir, mod);
      if (fs.existsSync(modPath)) {
        console.log(`   ✓ ${mod} installed`);
      } else {
        console.warn(`   ⚠ ${mod} missing — may cause runtime issues`);
      }
    }

    console.log("📦 Backend node_modules will be included directly in package");
    console.log("✅ Backend dependencies are ready for packaging");

    // Stage frontend to top-level frontend-dist for electron-builder 'files'
    const frontendSrc = path.join(process.cwd(), "frontend", "dist");
    const frontendDest = path.join(process.cwd(), "frontend-dist");

    console.log("🎨 Staging frontend build...");
    if (!fs.existsSync(frontendSrc)) {
      console.error("❌ Frontend build not found at", frontendSrc);
      console.error("   Ensure 'pnpm --filter sophon-frontend build' ran successfully.");
      throw new Error("Missing frontend/dist");
    }

    if (fs.existsSync(frontendDest)) {
      console.log("🧹 Cleaning existing frontend-dist...");
      fs.rmSync(frontendDest, { recursive: true, force: true });
    }

    copyRecursiveSync(frontendSrc, frontendDest);
    console.log("✅ Frontend staged to:", frontendDest);

    console.log("🎯 before-pack script completed successfully!");
  } catch (error) {
    console.error("❌ Failed to prepare dependencies:", error);
    throw error;
  }
};