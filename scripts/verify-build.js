const path = require("path");
const fs = require("fs-extra");

console.log("\n🔍 Verifying build output...\n");

// Find the output directory
const outDir = path.join(__dirname, "..", "out");

if (!fs.existsSync(outDir)) {
  console.error("❌ Output directory not found!");
  process.exit(1);
}

// Find the latest build
const makers = fs.readdirSync(outDir);
let foundApp = false;

for (const maker of makers) {
  const makerDir = path.join(outDir, maker);
  if (!fs.statSync(makerDir).isDirectory()) continue;

  console.log(`📦 Checking ${maker}...`);

  // Find app location based on platform
  let appResourcesPath;

  if (maker.includes("darwin")) {
    // macOS
    const appFiles = fs.readdirSync(makerDir).filter((f) => f.endsWith(".app"));
    if (appFiles.length > 0) {
      appResourcesPath = path.join(
        makerDir,
        appFiles[0],
        "Contents",
        "Resources",
        "app"
      );
    }
  } else {
    // Windows/Linux
    appResourcesPath = path.join(makerDir, "resources", "app");
  }

  if (appResourcesPath && fs.existsSync(appResourcesPath)) {
    foundApp = true;
    console.log(`  📁 App resources: ${appResourcesPath}`);

    // Check backend
    const backendPath = path.join(appResourcesPath, "backend");
    const backendNodeModules = path.join(backendPath, "node_modules");

    if (fs.existsSync(backendPath)) {
      console.log("  ✅ Backend directory found");

      if (fs.existsSync(backendNodeModules)) {
        console.log("  ✅ Backend node_modules found");

        // Check critical modules
        const criticalModules = [
          "cors",
          "express",
          "sqlite3",
          "socket.io",
          "bcrypt",
        ];

        let allPresent = true;
        for (const mod of criticalModules) {
          const modPath = path.join(backendNodeModules, mod);
          if (fs.existsSync(modPath)) {
            console.log(`    ✅ ${mod}`);
          } else {
            console.error(`    ❌ ${mod} - MISSING`);
            allPresent = false;
          }
        }

        if (!allPresent) {
          console.error(
            "\n⚠️  WARNING: Some critical backend modules are missing!"
          );
          console.error("The app may fail to start.");
        }
      } else {
        console.error("  ❌ Backend node_modules NOT FOUND");
      }
    } else {
      console.error("  ❌ Backend directory NOT FOUND");
    }

    // Check frontend
    const frontendDist = path.join(appResourcesPath, "frontend", "dist");
    if (fs.existsSync(frontendDist)) {
      console.log("  ✅ Frontend dist found");
    } else {
      console.error("  ❌ Frontend dist NOT FOUND");
    }

    console.log();
  }
}

if (!foundApp) {
  console.error("❌ Could not find built app!");
  process.exit(1);
}

console.log("✅ Build verification complete!\n");
