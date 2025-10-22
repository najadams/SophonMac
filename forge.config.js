const path = require("path");
const fs = require("fs-extra");
const { FusesPlugin } = require("@electron-forge/plugin-fuses");
const { FuseV1Options, FuseVersion } = require("@electron/fuses");

module.exports = {
  packagerConfig: {
    asar: {
      unpack: "**/*.node", // Unpack all native modules
    },
    icon: "./resources/icon",
    executableName: "Sophon",

    // More precise ignore patterns
    ignore: [
      /^\/frontend\/node_modules/,
      /^\/node_modules\/\.pnpm/,
      /^\/\.git/,
      /^\/logs/,
      /^\/\.vscode/,
      /^\/\.DS_Store/,
      /^\/dist/,
      /^\/out/,
      // Don't ignore backend or its node_modules!
    ],

    // Include frontend dist as extra resource
    extraResource: ["./frontend/dist"],

    // CRITICAL: Use afterCopy hook to ensure backend is properly included
    afterCopy: [
      async (buildPath, electronVersion, platform, arch) => {
        console.log("\n🔧 Running afterCopy hook...");
        console.log("Build path:", buildPath);

        try {
          // Ensure backend directory exists in build
          const backendDest = path.join(buildPath, "backend");
          const backendSrc = path.join(__dirname, "backend");

          console.log("Backend source:", backendSrc);
          console.log("Backend destination:", backendDest);

          // Copy entire backend directory if it doesn't exist
          if (!fs.existsSync(backendDest)) {
            console.log("📁 Copying backend directory...");
            await fs.copy(backendSrc, backendDest, {
              filter: (src) => {
                // Exclude certain files from backend
                const basename = path.basename(src);
                return !basename.startsWith(".") && basename !== "node_modules"; // We'll handle node_modules separately
              },
            });
          }

          // Ensure backend node_modules exists
          const backendNodeModulesDest = path.join(backendDest, "node_modules");
          const backendNodeModulesSrc = path.join(backendSrc, "node_modules");

          if (
            !fs.existsSync(backendNodeModulesDest) &&
            fs.existsSync(backendNodeModulesSrc)
          ) {
            console.log("📦 Copying backend node_modules...");
            await fs.copy(backendNodeModulesSrc, backendNodeModulesDest);
            console.log("✅ Backend node_modules copied");
          }

          // Special handling for native modules
          const nativeModules = ["sqlite3", "bcrypt"];
          for (const moduleName of nativeModules) {
            const moduleSrc = path.join(backendNodeModulesSrc, moduleName);
            const moduleDest = path.join(backendNodeModulesDest, moduleName);

            if (fs.existsSync(moduleSrc)) {
              console.log(`🔧 Ensuring ${moduleName} native bindings...`);
              await fs.copy(moduleSrc, moduleDest, { overwrite: true });
              console.log(`✅ ${moduleName} copied`);
            }
          }

          console.log("✅ afterCopy hook completed successfully\n");
        } catch (error) {
          console.error("❌ Error in afterCopy hook:", error);
          throw error;
        }
      },
    ],
  },

  rebuildConfig: {},

  makers: [
    {
      name: "@electron-forge/maker-squirrel",
      config: {
        name: "Sophon",
      },
    },
    {
      name: "@electron-forge/maker-zip",
      platforms: ["darwin"],
    },
    {
      name: "@electron-forge/maker-deb",
      config: {},
    },
    {
      name: "@electron-forge/maker-rpm",
      config: {},
    },
    {
      name: "@electron-forge/maker-dmg",
      config: {
        format: "ULFO",
        name: "Sophon",
      },
    },
  ],

  // Add hooks at the config level (not packagerConfig)
  hooks: {
    // Before packaging starts
    generateAssets: async () => {
      console.log("\n🎯 Running generateAssets hook...");

      try {
        // Ensure backend dependencies are installed
        const backendDir = path.join(__dirname, "backend");
        const backendNodeModules = path.join(backendDir, "node_modules");

        if (!fs.existsSync(backendNodeModules)) {
          console.log("⚠️  Backend node_modules not found, installing...");
          const { execSync } = require("child_process");
          execSync("pnpm install --filter sophon-backend --prod", {
            cwd: __dirname,
            stdio: "inherit",
          });
        }

        console.log("✅ Backend dependencies verified\n");
      } catch (error) {
        console.error("❌ Error in generateAssets hook:", error);
        throw error;
      }
    },

    // After packaging is complete
    postPackage: async (forgeConfig, options) => {
      console.log("\n🎁 Running postPackage hook...");

      try {
        const { outputPaths } = options;

        for (const outputPath of outputPaths) {
          console.log("Checking output:", outputPath);

          // Find the app directory in the output
          const appPath = path.join(
            outputPath,
            process.platform === "darwin"
              ? "Sophon.app/Contents/Resources/app"
              : "resources/app"
          );

          if (fs.existsSync(appPath)) {
            const backendPath = path.join(appPath, "backend");
            const backendNodeModules = path.join(backendPath, "node_modules");

            console.log("App path:", appPath);
            console.log("Backend path:", backendPath);

            // Verify critical modules
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
              const exists = fs.existsSync(modPath);
              console.log(`  ${exists ? "✅" : "❌"} ${mod}`);
              if (!exists) allPresent = false;
            }

            if (!allPresent) {
              console.warn("⚠️  Some critical modules are missing!");
            }
          }
        }

        console.log("✅ postPackage hook completed\n");
      } catch (error) {
        console.error("❌ Error in postPackage hook:", error);
      }
    },
  },

  plugins: [
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: false,
      [FuseV1Options.OnlyLoadAppFromAsar]: false, // Critical: allow loading from unpacked
    }),
  ],
};
