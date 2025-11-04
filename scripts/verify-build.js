const path = require("path");
const fs = require("fs");

console.log("\n🔍 Verifying build output...\n");

// Resolve output directory with fallbacks
const envOut =
  process.env.BUILD_OUTPUT_DIR ||
  process.env.OUTPUT_DIR ||
  process.env.OUT_DIR;

const candidates = [
  envOut ? path.resolve(envOut) : null,
  path.join(__dirname, "..", "dist"),
  path.join(__dirname, "..", "out"),
].filter(Boolean);

const outDir = candidates.find((p) => fs.existsSync(p));

if (!outDir) {
  console.error("❌ Output directory not found!");
  console.error(
    `Checked: ${candidates
      .map((p) => path.relative(path.join(__dirname, ".."), p))
      .join(", ")}`
  );
  process.exit(1);
}

console.log(`📂 Using output directory: ${outDir}`);

// Find the latest build
const makers = fs.readdirSync(outDir);
let foundApp = false;

for (const maker of makers) {
  const makerDir = path.join(outDir, maker);
  if (!fs.statSync(makerDir).isDirectory()) continue;

  console.log(`📦 Checking ${maker}...`);

  // Find app location based on platform
  let appResourcesPath;
  let resourcesRoot;

  if (maker.includes("darwin") || maker === "mac" || maker.includes("mac")) {
    // macOS
    const appFiles = fs.readdirSync(makerDir).filter((f) => f.endsWith(".app"));
    if (appFiles.length > 0) {
      resourcesRoot = path.join(makerDir, appFiles[0], "Contents", "Resources");
      appResourcesPath = path.join(resourcesRoot, "app");
    } else {
      // directory target (unpacked)
      resourcesRoot = path.join(makerDir, "resources");
      appResourcesPath = path.join(resourcesRoot, "app");
    }
  } else {
    // Windows/Linux
    resourcesRoot = path.join(makerDir, "resources");
    appResourcesPath = path.join(resourcesRoot, "app");
  }

  if (resourcesRoot && fs.existsSync(resourcesRoot)) {
    foundApp = true;

    const appAsarPath = path.join(resourcesRoot, "app.asar");
    const appAsarUnpacked = path.join(resourcesRoot, "app.asar.unpacked");

    // If appResourcesPath doesn't exist (packaged .app), try dir fallback
    if (!fs.existsSync(appResourcesPath)) {
      const fallbackResourcesRoot = path.join(makerDir, "resources");
      const fallbackAppResources = path.join(fallbackResourcesRoot, "app");
      if (fs.existsSync(fallbackAppResources)) {
        console.log(`  ℹ️ Using unpacked resources: ${fallbackAppResources}`);
        resourcesRoot = fallbackResourcesRoot;
        appResourcesPath = fallbackAppResources;
      }
    }

    console.log(`  📁 App resources: ${appResourcesPath}`);
    if (fs.existsSync(appAsarPath)) {
      console.log(`  📦 Found app.asar: ${appAsarPath}`);
    }
    if (fs.existsSync(appAsarUnpacked)) {
      console.log(`  📂 Found app.asar.unpacked: ${appAsarUnpacked}`);
    }

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
          "socket.io",
          "bcrypt",
          "better-sqlite3",
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

    // Check frontend in multiple standard locations
    const frontendCandidates = [
      // Electron Forge extraResource location
      path.join(resourcesRoot, "frontend", "dist"),
      // If frontend was bundled into the app folder
      path.join(appResourcesPath, "frontend", "dist"),
      // Electron Builder custom folder included via files
      path.join(resourcesRoot, "frontend-dist"),
      path.join(appResourcesPath, "frontend-dist"),
      // Additional generic locations requested
      path.join(resourcesRoot, "dist"),
      path.join(resourcesRoot, "app", "dist"),
      path.join(appResourcesPath, "dist"),
      // ASAR unpacked locations (when using asarUnpack)
      path.join(appAsarUnpacked, "frontend", "dist"),
      path.join(appAsarUnpacked, "frontend-dist"),
      path.join(appAsarUnpacked, "dist"),
    ].filter(Boolean);

    const frontendPath = frontendCandidates.find((p) => p && fs.existsSync(p));

    if (frontendPath) {
      console.log(`  ✅ Frontend found at: ${frontendPath}`);
    } else {
      console.error("  ❌ Frontend dist NOT FOUND");
      console.error(
        `    Checked: ${frontendCandidates
          .map((p) => (p ? p.replace(resourcesRoot + path.sep, "") : ""))
          .filter(Boolean)
          .join(", ")}`
      );
      if (fs.existsSync(appAsarPath)) {
        console.error(
          "    Note: app.asar is present; frontend may be inside the ASAR archive."
        );
        console.error(
          "    Consider adding 'frontend-dist/**' to asarUnpack or update verifier to read ASAR."
        );
      }
    }

    console.log();
  }
}

if (!foundApp) {
  console.error("❌ Could not find built app!");
  process.exit(1);
}

console.log("✅ Build verification complete!\n");
