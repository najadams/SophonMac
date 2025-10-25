Place the Node.js binary here as 'node' for macOS x64 (Intel).

Suggested source:
- Download official Node.js tarball for darwin-x64 (macOS Intel)
- Extract and copy the 'bin/node' file into this directory

During packaging, this folder is included in the app at Resources/node/darwin-x64/bin/node.
The app will prefer this bundled Node to spawn the backend.