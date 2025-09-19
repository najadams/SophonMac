# Windows Deployment Troubleshooting Guide

This guide helps diagnose and fix common issues when deploying the Sophon POS application on different Windows computers.

## Common Issues and Solutions

### 1. Application Won't Start or Shows Black Screen

**Symptoms:**
- Application launches but shows a black/blank window
- Application crashes immediately on startup
- No visible error messages

**Diagnosis Steps:**
1. Check the application logs in `%APPDATA%\Roaming\Sophon\logs\`
2. Look for error messages in the latest log file
3. Pay attention to system diagnostics and native dependency checks

**Common Causes & Solutions:**

#### Missing Visual C++ Redistributables
**Error indicators in logs:**
- "Failed to load sqlite3" or "Failed to load bcrypt"
- Messages containing "binding" or "dll"
- "The specified module could not be found"

**Solution:**
1. Download and install Microsoft Visual C++ Redistributable for Visual Studio 2015-2022
   - 64-bit: https://aka.ms/vs/17/release/vc_redist.x64.exe
   - 32-bit: https://aka.ms/vs/17/release/vc_redist.x86.exe
2. Restart the application after installation

#### Missing Node.js Runtime Dependencies
**Error indicators in logs:**
- "node_modules" related errors
- Module loading failures

**Solution:**
1. Ensure the application was built with all dependencies bundled
2. Check that the build process completed successfully
3. Verify critical modules (sqlite3, bcrypt) are present in the app's node_modules

### 2. Database Connection Issues

**Symptoms:**
- Application starts but can't access data
- "Database connection failed" errors

**Diagnosis Steps:**
1. Check if the database file exists in `%APPDATA%\Roaming\Sophon\`
2. Verify SQLite3 module is working (check logs for SQLite3 functionality test)
3. Check file permissions on the Sophon directory

**Solutions:**
1. Ensure the user has write permissions to `%APPDATA%\Roaming\`
2. Try running the application as administrator (temporarily)
3. Check antivirus software isn't blocking database file creation

### 3. Network/Server Issues

**Symptoms:**
- Application starts but web interface doesn't load
- "Connection refused" or network errors

**Diagnosis Steps:**
1. Check if backend server started successfully (look for port numbers in logs)
2. Verify no other applications are using the same ports
3. Check Windows Firewall settings

**Solutions:**
1. Ensure ports 3001 (backend) and 5173 (frontend) are available
2. Add firewall exceptions if needed
3. Check for conflicting software

## System Requirements

### Minimum Requirements
- Windows 10 version 1903 or later
- 4GB RAM
- 500MB free disk space
- Microsoft Visual C++ Redistributable 2015-2022

### Recommended Requirements
- Windows 11 or Windows 10 version 21H2+
- 8GB RAM
- 1GB free disk space
- Updated Windows with latest security patches

## Diagnostic Information

The application automatically logs comprehensive diagnostic information on startup, including:

- System platform and architecture
- Node.js and Electron versions
- Visual C++ runtime DLL availability
- Native module functionality tests
- Memory and system information

This information is crucial for troubleshooting deployment issues.

## Getting Help

When reporting issues, please include:

1. **System Information:**
   - Windows version
   - System architecture (32-bit/64-bit)
   - Available RAM

2. **Log Files:**
   - Complete log file from `%APPDATA%\Roaming\Sophon\logs\`
   - Focus on system diagnostics and error messages

3. **Installation Details:**
   - How the application was installed
   - Whether Visual C++ Redistributables were installed
   - Any antivirus software running

4. **Error Description:**
   - Exact steps to reproduce the issue
   - Screenshots of error messages
   - When the issue started occurring

## Advanced Troubleshooting

### Manual Dependency Check
You can manually verify critical dependencies by:

1. Opening Command Prompt as Administrator
2. Navigating to the application installation directory
3. Running dependency checking tools like `dumpbin` or `Dependency Walker`

### Registry Issues
Some deployment issues may be related to Windows registry problems:

1. Run `sfc /scannow` to check system file integrity
2. Use `DISM /Online /Cleanup-Image /RestoreHealth` for system repair
3. Consider creating a new Windows user profile for testing

### Clean Installation
If issues persist:

1. Uninstall the application completely
2. Delete `%APPDATA%\Roaming\Sophon\` directory
3. Install Visual C++ Redistributables fresh
4. Reinstall the application
5. Run as administrator on first launch

## Prevention

To avoid deployment issues:

1. **For Developers:**
   - Test builds on clean Windows VMs
   - Verify all native dependencies are properly bundled
   - Include comprehensive error logging
   - Document system requirements clearly

2. **For Deployment:**
   - Create installation packages that include VC++ Redistributables
   - Provide clear installation instructions
   - Test on target systems before wide deployment
   - Maintain updated troubleshooting documentation