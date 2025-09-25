// utils/schemaInit.js
const db = require('../data/db/supabase-db');

const SchemaInit = {
  // Check if a table exists
  async tableExists(tableName) {
    try {
      const result = await db.get(
        `SELECT table_name FROM information_schema.tables 
         WHERE table_schema = 'public' AND table_name = $1`,
        [tableName]
      );
      return !!result;
    } catch (error) {
      console.error(`Error checking if table ${tableName} exists:`, error);
      return false;
    }
  },

  // Create all required tables
  async initializeSchema() {
    console.log('🔧 Initializing database schema...');
    
    const tables = [
      {
        name: 'Company',
        sql: `CREATE TABLE IF NOT EXISTS "Company" (
          id SERIAL PRIMARY KEY,
          companyName TEXT NOT NULL UNIQUE,
          email TEXT UNIQUE,
          password TEXT NOT NULL,
          isEmailVerified BOOLEAN DEFAULT FALSE,
          emailVerificationToken TEXT,
          emailVerificationExpires TIMESTAMP,
          passwordResetToken TEXT,
          passwordResetExpires TIMESTAMP,
          refreshToken TEXT,
          contact TEXT,
          location TEXT,
          taxRate DECIMAL(10,2),
          currency TEXT,
          currentPlan TEXT,
          emailNotifications BOOLEAN DEFAULT FALSE,
          momo TEXT,
          nextBillingDate TIMESTAMP,
          paymentMethod TEXT,
          paymentProvider TEXT,
          smsNotifications BOOLEAN DEFAULT FALSE,
          storeAddress TEXT,
          taxId TEXT,
          tinNumber TEXT,
          receiptTemplate TEXT DEFAULT 'template1',
          receiptHeader TEXT,
          receiptFooter TEXT,
          createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updatedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )`
      },
      {
        name: 'Customer',
        sql: `CREATE TABLE IF NOT EXISTS "Customer" (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          address TEXT,
          phone TEXT,
          email TEXT,
          companyId INTEGER,
          createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updatedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )`
      },
      {
        name: 'Vendor',
        sql: `CREATE TABLE IF NOT EXISTS "Vendor" (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          contact TEXT,
          email TEXT,
          address TEXT,
          companyId INTEGER,
          createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updatedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )`
      },
      {
        name: 'Inventory',
        sql: `CREATE TABLE IF NOT EXISTS "Inventory" (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          category TEXT,
          unit TEXT,
          quantity INTEGER DEFAULT 0,
          price DECIMAL(10,2),
          cost DECIMAL(10,2),
          barcode TEXT,
          companyId INTEGER,
          createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updatedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )`
      },
      {
        name: 'Receipt',
        sql: `CREATE TABLE IF NOT EXISTS "Receipt" (
          id SERIAL PRIMARY KEY,
          date TIMESTAMP DEFAULT NOW(),
          total_amount DECIMAL(10,2) DEFAULT 0,
          discount DECIMAL(10,2) DEFAULT 0,
          tax DECIMAL(10,2) DEFAULT 0,
          payment_method TEXT,
          customer_name TEXT,
          customer_phone TEXT,
          companyId INTEGER,
          createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updatedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )`
      },
      {
        name: 'ReceiptItem',
        sql: `CREATE TABLE IF NOT EXISTS "ReceiptItem" (
          id SERIAL PRIMARY KEY,
          receiptId INTEGER,
          inventoryId INTEGER,
          quantity INTEGER NOT NULL,
          unit_price DECIMAL(10,2) NOT NULL,
          total_price DECIMAL(10,2) NOT NULL,
          createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updatedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )`
      },
      {
        name: 'ReceiptDetail',
        sql: `CREATE TABLE IF NOT EXISTS "ReceiptDetail" (
          id SERIAL PRIMARY KEY,
          receiptId INTEGER,
          inventoryId INTEGER,
          quantity INTEGER NOT NULL,
          unit_price DECIMAL(10,2) NOT NULL,
          total_price DECIMAL(10,2) NOT NULL,
          salesUnit TEXT,
          originalQuantity DECIMAL(10,2),
          baseUnitQuantity DECIMAL(10,2),
          conversionRate DECIMAL(10,2) DEFAULT 1,
          atomicQuantity DECIMAL(10,2),
          createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updatedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )`
      },
      {
        name: 'PurchaseOrder',
        sql: `CREATE TABLE IF NOT EXISTS "PurchaseOrder" (
          id SERIAL PRIMARY KEY,
          orderDate TIMESTAMP DEFAULT NOW(),
          expectedDeliveryDate TIMESTAMP,
          status TEXT DEFAULT 'pending',
          totalAmount DECIMAL(10,2) DEFAULT 0,
          vendorId INTEGER,
          companyId INTEGER,
          createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updatedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )`
      },
      {
        name: 'VendorPayment',
        sql: `CREATE TABLE IF NOT EXISTS "VendorPayment" (
          id SERIAL PRIMARY KEY,
          vendor_id INTEGER,
          amount DECIMAL(10,2) NOT NULL,
          payment_date DATE NOT NULL,
          payment_method TEXT,
          reference_number TEXT,
          notes TEXT,
          company_id INTEGER,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          sync_id TEXT UNIQUE DEFAULT gen_random_uuid()::TEXT,
          last_synced_at TIMESTAMP WITH TIME ZONE,
          is_synced BOOLEAN DEFAULT FALSE,
          sync_version INTEGER DEFAULT 1
        )`
      },
      {
        name: 'Notification',
        sql: `CREATE TABLE IF NOT EXISTS "Notification" (
          id SERIAL PRIMARY KEY,
          title TEXT NOT NULL,
          message TEXT NOT NULL,
          type TEXT DEFAULT 'info',
          is_read BOOLEAN DEFAULT FALSE,
          company_id INTEGER,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          sync_id TEXT UNIQUE DEFAULT gen_random_uuid()::TEXT,
          last_synced_at TIMESTAMP WITH TIME ZONE,
          is_synced BOOLEAN DEFAULT FALSE,
          sync_version INTEGER DEFAULT 1
        )`
      },
      {
        name: 'Worker',
        sql: `CREATE TABLE IF NOT EXISTS "Worker" (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT UNIQUE,
          password TEXT,
          role TEXT DEFAULT 'worker',
          permissions TEXT,
          companyId INTEGER,
          createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updatedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )`
      },
      {
        name: 'Settings',
        sql: `CREATE TABLE IF NOT EXISTS "Settings" (
          id SERIAL PRIMARY KEY,
          key TEXT NOT NULL UNIQUE,
          value TEXT,
          companyId INTEGER,
          createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updatedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )`
      },
      {
        name: 'Debt',
        sql: `CREATE TABLE IF NOT EXISTS "Debt" (
          id SERIAL PRIMARY KEY,
          customer_name TEXT NOT NULL,
          customer_phone TEXT,
          amount DECIMAL(10,2) NOT NULL,
          description TEXT,
          date_created TIMESTAMP DEFAULT NOW(),
          status TEXT DEFAULT 'pending',
          companyId INTEGER,
          createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updatedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )`
      },
      {
        name: 'DebtPayment',
        sql: `CREATE TABLE IF NOT EXISTS "DebtPayment" (
          id SERIAL PRIMARY KEY,
          debt_id INTEGER,
          amount DECIMAL(10,2) NOT NULL,
          payment_date TIMESTAMP DEFAULT NOW(),
          payment_method TEXT,
          notes TEXT,
          createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updatedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )`
      },
      {
        name: 'Supplies',
        sql: `CREATE TABLE IF NOT EXISTS "Supplies" (
          id SERIAL PRIMARY KEY,
          vendor_id INTEGER,
          total_amount DECIMAL(10,2) DEFAULT 0,
          date TIMESTAMP DEFAULT NOW(),
          status TEXT DEFAULT 'pending',
          companyId INTEGER,
          createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updatedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )`
      },
      {
        name: 'SuppliesDetail',
        sql: `CREATE TABLE IF NOT EXISTS "SuppliesDetail" (
          id SERIAL PRIMARY KEY,
          supplies_id INTEGER,
          inventory_id INTEGER,
          quantity INTEGER NOT NULL,
          unit_cost DECIMAL(10,2) NOT NULL,
          total_cost DECIMAL(10,2) NOT NULL,
          createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updatedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )`
      },
      {
        name: 'CustomRoles',
        sql: `CREATE TABLE IF NOT EXISTS "CustomRoles" (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL UNIQUE,
          permissions TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`
      },
      {
        name: 'NetworkConfig',
        sql: `CREATE TABLE IF NOT EXISTS "NetworkConfig" (
          id SERIAL PRIMARY KEY,
          node_id TEXT UNIQUE NOT NULL,
          node_name TEXT NOT NULL,
          ip_address TEXT NOT NULL,
          port INTEGER DEFAULT 3003,
          is_master BOOLEAN DEFAULT FALSE,
          is_active BOOLEAN DEFAULT TRUE,
          last_seen TIMESTAMP DEFAULT NOW(),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )`
      }
    ];

    let createdCount = 0;
    let skippedCount = 0;

    for (const table of tables) {
      try {
        const exists = await this.tableExists(table.name);
        
        if (!exists) {
          console.log(`📋 Creating table: ${table.name}`);
          await db.run(table.sql);
          createdCount++;
        } else {
          console.log(`✅ Table already exists: ${table.name}`);
          skippedCount++;
        }
      } catch (error) {
        console.error(`❌ Error creating table ${table.name}:`, error.message);
        // Continue with other tables even if one fails
      }
    }

    // Create indexes for better performance
    await this.createIndexes();

    console.log(`🎉 Schema initialization complete!`);
    console.log(`   📋 Created: ${createdCount} tables`);
    console.log(`   ✅ Skipped: ${skippedCount} existing tables`);
    
    return { created: createdCount, skipped: skippedCount };
  },

  // Create database indexes
  async createIndexes() {
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_customer_company ON "Customer"(companyId)',
      'CREATE INDEX IF NOT EXISTS idx_vendor_company ON "Vendor"(companyId)',
      'CREATE INDEX IF NOT EXISTS idx_inventory_company ON "Inventory"(companyId)',
      'CREATE INDEX IF NOT EXISTS idx_receipt_company ON "Receipt"(companyId)',
      'CREATE INDEX IF NOT EXISTS idx_receipt_item_receipt ON "ReceiptItem"(receiptId)',
      'CREATE INDEX IF NOT EXISTS idx_receipt_detail_receipt ON "ReceiptDetail"(receiptId)',
      'CREATE INDEX IF NOT EXISTS idx_purchase_order_vendor ON "PurchaseOrder"(vendorId, companyId)',
      'CREATE INDEX IF NOT EXISTS idx_vendor_payment_vendor ON "VendorPayment"(vendor_id)',
      'CREATE INDEX IF NOT EXISTS idx_notification_company ON "Notification"(company_id)',
      'CREATE INDEX IF NOT EXISTS idx_worker_company ON "Worker"(companyId)',
      'CREATE INDEX IF NOT EXISTS idx_settings_company ON "Settings"(companyId)',
      'CREATE INDEX IF NOT EXISTS idx_debt_company ON "Debt"(companyId)',
      'CREATE INDEX IF NOT EXISTS idx_debt_payment_debt ON "DebtPayment"(debt_id)',
      'CREATE INDEX IF NOT EXISTS idx_supplies_company ON "Supplies"(companyId)',
      'CREATE INDEX IF NOT EXISTS idx_supplies_detail_supplies ON "SuppliesDetail"(supplies_id)'
    ];

    for (const indexSQL of indexes) {
      try {
        await db.run(indexSQL);
      } catch (error) {
        // Indexes might already exist, so we can ignore errors
        console.log(`Index creation skipped: ${error.message}`);
      }
    }
  }
};

module.exports = SchemaInit;