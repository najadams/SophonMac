#!/usr/bin/env node

/**
 * Batch License Generator Script
 * 
 * This script allows software owners to generate multiple licenses from a CSV file.
 * 
 * Usage:
 *   node scripts/batchGenerateLicenses.js --input customers.csv --output licenses/
 * 
 * CSV Format:
 *   companyName,maxUsers,features,expirationDate
 *   "Acme Corp",25,"basic,advanced","2025-12-31"
 *   "Small Cafe",5,"basic","2025-06-30"
 */

const fs = require('fs');
const path = require('path');
const LicenseGenerator = require('./generateLicense');

class BatchLicenseGenerator {
  constructor() {
    this.generator = new LicenseGenerator();
  }

  /**
   * Parse CSV file and return customer data
   */
  parseCSV(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.trim().split('\n');
    const headers = this.parseCSVLine(lines[0]);
    const customers = [];

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      const customer = {};
      
      headers.forEach((header, index) => {
        customer[header.trim()] = values[index] ? values[index].trim() : '';
      });
      
      customers.push(customer);
    }

    return customers;
  }

  /**
   * Parse a single CSV line, handling quoted values
   */
  parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current);
    return result;
  }

  /**
   * Generate licenses for all customers
   */
  generateBatchLicenses(customers, outputDir) {
    const results = [];
    
    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    console.log(`\n🔄 Generating ${customers.length} licenses...\n`);

    customers.forEach((customer, index) => {
      try {
        const options = this.parseCustomerOptions(customer);
        const licenseKey = this.generator.generateLicenseKey(options);
        
        // Create filename from company name
        const filename = this.sanitizeFilename(customer.companyName || `customer-${index + 1}`);
        const outputPath = path.join(outputDir, `${filename}.json`);
        
        // Save license info
        this.generator.saveLicenseInfo(licenseKey, options, outputPath);
        
        results.push({
          companyName: options.companyName,
          licenseKey,
          outputPath,
          success: true
        });
        
        console.log(`✅ ${options.companyName}: ${licenseKey}`);
        
      } catch (error) {
        console.error(`❌ Error generating license for ${customer.companyName}: ${error.message}`);
        results.push({
          companyName: customer.companyName,
          error: error.message,
          success: false
        });
      }
    });

    return results;
  }

  /**
   * Parse customer data into license options
   */
  parseCustomerOptions(customer) {
    const options = {
      companyName: customer.companyName || 'Unknown Company',
      maxUsers: parseInt(customer.maxUsers) || 10,
      features: customer.features ? customer.features.split(',').map(f => f.trim()) : ['basic'],
      expirationDate: customer.expirationDate || null
    };

    // Validate expiration date
    if (options.expirationDate && options.expirationDate.toLowerCase() !== 'permanent') {
      const expDate = new Date(options.expirationDate);
      if (isNaN(expDate.getTime())) {
        throw new Error(`Invalid expiration date: ${options.expirationDate}`);
      }
      if (expDate <= new Date()) {
        throw new Error(`Expiration date must be in the future: ${options.expirationDate}`);
      }
    } else if (options.expirationDate && options.expirationDate.toLowerCase() === 'permanent') {
      options.expirationDate = null;
    }

    return options;
  }

  /**
   * Sanitize filename for safe file creation
   */
  sanitizeFilename(name) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50);
  }

  /**
   * Generate summary report
   */
  generateSummaryReport(results, outputDir) {
    const summary = {
      generatedAt: new Date().toISOString(),
      totalLicenses: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      licenses: results
    };

    const reportPath = path.join(outputDir, 'batch-generation-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(summary, null, 2));
    
    console.log(`\n📊 Summary Report:`);
    console.log(`   Total: ${summary.totalLicenses}`);
    console.log(`   Successful: ${summary.successful}`);
    console.log(`   Failed: ${summary.failed}`);
    console.log(`   Report saved: ${reportPath}\n`);

    return summary;
  }

  /**
   * Create sample CSV file
   */
  createSampleCSV(outputPath) {
    const sampleData = [
      'companyName,maxUsers,features,expirationDate',
      '"Acme Restaurant",25,"basic,advanced","2025-12-31"',
      '"Small Cafe",5,"basic","2025-06-30"',
      '"Big Chain Corp",100,"basic,advanced,premium","permanent"',
      '"Local Diner",10,"basic","2025-09-15"'
    ].join('\n');

    fs.writeFileSync(outputPath, sampleData);
    console.log(`📝 Sample CSV created: ${outputPath}`);
  }
}

// Command line interface
function parseArguments() {
  const args = process.argv.slice(2);
  const options = {
    inputFile: null,
    outputDir: './licenses',
    createSample: false
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--input':
      case '-i':
        options.inputFile = args[++i];
        break;
      case '--output':
      case '-o':
        options.outputDir = args[++i];
        break;
      case '--sample':
      case '-s':
        options.createSample = true;
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
  console.log(`\n🔑 Batch License Generator for POS System\n`);
  console.log('Usage:');
  console.log('  node scripts/batchGenerateLicenses.js [options]\n');
  console.log('Options:');
  console.log('  -i, --input <file>       Input CSV file with customer data');
  console.log('  -o, --output <dir>       Output directory for license files (default: ./licenses)');
  console.log('  -s, --sample             Create a sample CSV file');
  console.log('  -h, --help               Show this help message\n');
  console.log('CSV Format:');
  console.log('  companyName,maxUsers,features,expirationDate');
  console.log('  "Acme Corp",25,"basic,advanced","2025-12-31"');
  console.log('  "Small Cafe",5,"basic","permanent"\n');
  console.log('Examples:');
  console.log('  # Create sample CSV');
  console.log('  node scripts/batchGenerateLicenses.js --sample');
  console.log('');
  console.log('  # Generate licenses from CSV');
  console.log('  node scripts/batchGenerateLicenses.js --input customers.csv --output ./licenses');
}

// Main execution
function main() {
  console.log('🔑 POS System Batch License Generator\n');

  const options = parseArguments();
  const batchGenerator = new BatchLicenseGenerator();

  // Create sample CSV if requested
  if (options.createSample) {
    const samplePath = './sample-customers.csv';
    batchGenerator.createSampleCSV(samplePath);
    console.log('\n💡 Edit the sample CSV file and run:');
    console.log(`   node scripts/batchGenerateLicenses.js --input ${samplePath}\n`);
    return;
  }

  // Validate input file
  if (!options.inputFile) {
    console.error('❌ Error: Input CSV file is required. Use --input <file>');
    console.log('\n💡 Create a sample CSV with: --sample');
    process.exit(1);
  }

  if (!fs.existsSync(options.inputFile)) {
    console.error(`❌ Error: Input file not found: ${options.inputFile}`);
    process.exit(1);
  }

  try {
    // Parse customers from CSV
    const customers = batchGenerator.parseCSV(options.inputFile);
    
    if (customers.length === 0) {
      console.error('❌ Error: No customer data found in CSV file');
      process.exit(1);
    }

    console.log(`📋 Found ${customers.length} customers in CSV file`);

    // Generate licenses
    const results = batchGenerator.generateBatchLicenses(customers, options.outputDir);
    
    // Generate summary report
    batchGenerator.generateSummaryReport(results, options.outputDir);

    console.log('🎉 Batch license generation completed!');
    
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = BatchLicenseGenerator;