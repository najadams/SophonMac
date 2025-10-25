Place the Node.js binary here as 'node' for macOS arm64.

Suggested source:
- Download official Node.js tarball for darwin-arm64 (macOS Apple Silicon)
- Extract and copy the 'bin/node' file into this directory

During packaging, this folder is included in the app at Resources/node/darwin-arm64/bin/node.
The app will prefer this bundled Node to spawn the backend.