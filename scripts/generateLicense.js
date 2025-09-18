#!/usr/bin/env node

/**
 * License Generator Script for Software Owners
 * 
 * This script allows software owners to generate license keys for their users.
 * 
 * Usage:
 *   node scripts/generateLicense.js --company "Company Name" --users 50 --expires "2025-12-31"
 *   node scripts/generateLicense.js --company "Company Name" --users 10 --features "basic,advanced"
 *   node scripts/generateLicense.js --company "Company Name" --permanent --users 100
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

class LicenseGenerator {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    // Use the same secret key as the main application
    this.secretKey = process.env.LICENSE_SECRET || 'sophon-license-secret-key-2025';
    this.keyLength = 32;
    this.ivLength = 16;
    this.tagLength = 16;
  }

  /**
   * Generate a license key for a customer
   */
  generateLicenseKey(options = {}) {
    const {
      companyName = 'Unknown Company',
      expirationDate = null,
      maxUsers = 10,
      features = ['basic'],
      version = '1.0'
    } = options;

    const licenseData = {
      companyName,
      issuedAt: new Date().toISOString(),
      expirationDate,
      maxUsers,
      features,
      version,
      // Note: Hardware fingerprint will be generated when the license is activated
      hardwareFingerprint: null
    };

    console.log('\n📋 License Information:');
    console.log(`   Company: ${companyName}`);
    console.log(`   Max Users: ${maxUsers}`);
    console.log(`   Features: ${features.join(', ')}`);
    console.log(`   Issued: ${new Date().toLocaleDateString()}`);
    console.log(`   Expires: ${expirationDate ? new Date(expirationDate).toLocaleDateString() : 'Never'}`);
    console.log(`   Version: ${version}`);

    // Encrypt the license data
    const encrypted = this.encryptData(JSON.stringify(licenseData));
    
    // Format as license key (groups of 4 characters)
    const base64Key = Buffer.from(encrypted, 'hex').toString('base64')
      .replace(/[+/]/g, (char) => char === '+' ? '-' : '_')
      .replace(/=/g, '');
    
    return this.formatLicenseKey(base64Key);
  }

  /**
   * Format license key into readable groups
   */
  formatLicenseKey(key) {
    return key.match(/.{1,4}/g).join('-').toUpperCase();
  }

  /**
   * Encrypt data using AES-256-GCM
   */
  encryptData(text) {
    const key = crypto.scryptSync(this.secretKey, 'salt', this.keyLength);
    const iv = crypto.randomBytes(this.ivLength);
    const cipher = crypto.createCipheriv(this.algorithm, key, iv);
    cipher.setAAD(Buffer.from('license-data'));
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();
    
    return iv.toString('hex') + encrypted + tag.toString('hex');
  }

  /**
   * Save license information to a file
   */
  saveLicenseInfo(licenseKey, options, outputPath) {
    const licenseInfo = {
      licenseKey,
      generatedAt: new Date().toISOString(),
      companyName: options.companyName,
      maxUsers: options.maxUsers,
      features: options.features,
      expirationDate: options.expirationDate,
      instructions: {
        activation: 'Users should enter this license key in the application settings under License Activation.',
        support: 'For support, contact your software provider.',
        hardware: 'This license will be bound to the hardware where it is first activated.'
      }
    };

    fs.writeFileSync(outputPath, JSON.stringify(licenseInfo, null, 2));
    console.log(`\n💾 License information saved to: ${outputPath}`);
  }
}

// Command line interface
function parseArguments() {
  const args = process.argv.slice(2);
  const options = {
    companyName: 'Unknown Company',
    maxUsers: 10,
    features: ['basic'],
    expirationDate: null,
    outputFile: null
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--company':
      case '-c':
        options.companyName = args[++i];
        break;
      case '--users':
      case '-u':
        options.maxUsers = parseInt(args[++i]);
        break;
      case '--expires':
      case '-e':
        options.expirationDate = args[++i];
        break;
      case '--features':
      case '-f':
        options.features = args[++i].split(',').map(f => f.trim());
        break;
      case '--permanent':
      case '-p':
        options.expirationDate = null;
        break;
      case '--output':
      case '-o':
        options.outputFile = args[++i];
        break;
      case '--help':
      case '-h':
        showHelp();
        process.exit(0);
        break;
    }
  }

  return options;
}

function showHelp() {
  console.log(`
🔑 License Generator for POS System
`);
  console.log('Usage:');
  console.log('  node scripts/generateLicense.js [options]\n');
  console.log('Options:');
  console.log('  -c, --company <name>     Company name for the license (required)');
  console.log('  -u, --users <number>     Maximum number of users (default: 10)');
  console.log('  -e, --expires <date>     Expiration date (YYYY-MM-DD format)');
  console.log('  -f, --features <list>    Comma-separated list of features (default: basic)');
  console.log('  -p, --permanent          Create a permanent license (no expiration)');
  console.log('  -o, --output <file>      Save license info to file');
  console.log('  -h, --help               Show this help message\n');
  console.log('Examples:');
  console.log('  node scripts/generateLicense.js --company "Acme Corp" --users 50 --expires "2025-12-31"');
  console.log('  node scripts/generateLicense.js --company "Small Business" --users 5 --permanent');
  console.log('  node scripts/generateLicense.js --company "Enterprise" --users 100 --features "basic,advanced,premium"');
}

function validateOptions(options) {
  if (!options.companyName || options.companyName === 'Unknown Company') {
    console.error('❌ Error: Company name is required. Use --company "Company Name"');
    process.exit(1);
  }

  if (options.maxUsers < 1 || options.maxUsers > 10000) {
    console.error('❌ Error: Max users must be between 1 and 10000');
    process.exit(1);
  }

  if (options.expirationDate) {
    const expDate = new Date(options.expirationDate);
    if (isNaN(expDate.getTime())) {
      console.error('❌ Error: Invalid expiration date format. Use YYYY-MM-DD');
      process.exit(1);
    }
    if (expDate <= new Date()) {
      console.error('❌ Error: Expiration date must be in the future');
      process.exit(1);
    }
  }
}

// Main execution
function main() {
  console.log('🔑 POS System License Generator\n');

  const options = parseArguments();
  validateOptions(options);

  const generator = new LicenseGenerator();
  const licenseKey = generator.generateLicenseKey(options);

  console.log('\n🎉 License Generated Successfully!');
  console.log('\n📄 LICENSE KEY:');
  console.log(`\n   ${licenseKey}\n`);
  console.log('📋 Instructions:');
  console.log('   1. Provide this license key to your customer');
  console.log('   2. Customer should enter it in Settings > License Activation');
  console.log('   3. License will be bound to their hardware upon activation');
  console.log('   4. Keep a record of this license for support purposes\n');

  // Save to file if requested
  if (options.outputFile) {
    const outputPath = path.resolve(options.outputFile);
    generator.saveLicenseInfo(licenseKey, options, outputPath);
  }

  // Suggest saving to default location
  if (!options.outputFile) {
    const defaultPath = path.join(__dirname, '..', 'licenses', `license-${Date.now()}.json`);
    console.log(`💡 Tip: Save license info with --output "${defaultPath}"`);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = LicenseGenerator;