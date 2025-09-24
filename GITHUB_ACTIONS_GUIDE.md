# GitHub Actions Guide for Windows Electron Build

This guide explains how to use GitHub Actions to automatically build the Windows version of your Electron application, solving the Wine dependency issues you encountered on macOS.

## Overview

Two GitHub Actions workflows have been created:

1. **`build-windows.yml`** - Uses `electron-builder` (recommended)
2. **`build-windows-packager.yml`** - Uses `electron-packager` (fallback option)

## Setup Instructions

### 1. Push to GitHub

First, commit and push the workflow files to your GitHub repository:

```bash
git add .github/workflows/
git commit -m "Add GitHub Actions workflows for Windows build"
git push origin main
```

### 2. Workflow Triggers

Both workflows are triggered by:
- **Push to main/master branch**
- **Pull requests to main/master branch**
- **Manual trigger** (workflow_dispatch)
- **Git tags** (for releases)

### 3. Manual Trigger

To manually trigger a build:

1. Go to your GitHub repository
2. Click on **Actions** tab
3. Select the workflow you want to run
4. Click **Run workflow** button
5. Choose the branch and click **Run workflow**

## Workflow Details

### Primary Workflow: `build-windows.yml`

**What it does:**
- Runs on Windows runner (no Wine needed!)
- Installs Node.js 18 and pnpm
- Installs all dependencies
- Builds frontend with Vite
- Creates Windows executable using `electron-builder`
- Uploads build artifacts
- Creates GitHub releases for tagged commits

**Build artifacts:**
- `.exe` installer files
- `.zip` portable versions
- Unpacked application folder

### Fallback Workflow: `build-windows-packager.yml`

**What it does:**
- Same setup as primary workflow
- Uses `electron-packager` instead of `electron-builder`
- Creates portable ZIP archive
- Useful if electron-builder has issues

## Accessing Build Results

### Download Artifacts

1. Go to **Actions** tab in your repository
2. Click on a completed workflow run
3. Scroll down to **Artifacts** section
4. Download the `windows-build` or `windows-packaged-build` artifact

### Automatic Releases

For automatic releases:

1. Create and push a git tag:
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

2. The workflow will automatically:
   - Build the Windows version
   - Create a GitHub release
   - Attach the build files to the release

## Troubleshooting

### If Build Fails

1. **Check the Actions logs:**
   - Go to Actions tab → Click on failed run → Check logs

2. **Common issues:**
   - Missing dependencies: Check `package.json` files
   - Build script errors: Verify scripts work locally
   - Node version conflicts: Workflows use Node.js 18

### If You Need Different Node Version

Edit the workflow file and change:
```yaml
- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: '20'  # Change to your preferred version
```

### If You Need Different Build Configuration

Modify the build commands in the workflow:
```yaml
- name: Build Windows app with electron-builder
  run: pnpm run build:win
  env:
    GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    # Add any environment variables you need
```

## Benefits of GitHub Actions Approach

✅ **No Wine dependencies** - Runs on actual Windows environment
✅ **Consistent builds** - Same environment every time
✅ **Automatic releases** - Tag-based release creation
✅ **Free for public repos** - GitHub provides free CI/CD minutes
✅ **Build artifacts** - Downloadable build files
✅ **Multiple triggers** - Push, PR, manual, and tag-based builds

## Next Steps

1. **Test the workflow** by pushing a commit or manually triggering it
2. **Download and test** the generated Windows build
3. **Create a release** by pushing a git tag
4. **Customize** the workflows as needed for your specific requirements

This approach completely eliminates the Wine dependency issues you were experiencing on macOS and provides a reliable, automated way to build Windows versions of your Electron application.