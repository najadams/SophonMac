const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createTables() {
  console.log('Creating tables in Supabase...');
  
  // Create VendorPayment table first (we have data for this)
  const vendorPaymentSQL = `
    CREATE TABLE IF NOT EXISTS "VendorPayment" (
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
    );
  `;

  // Create Notification table (we have data for this)
  const notificationSQL = `
    CREATE TABLE IF NOT EXISTS "Notification" (
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
    );
  `;

  // Create Company table (needed for foreign keys)
  const companySQL = `
    CREATE TABLE IF NOT EXISTS "Company" (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      address TEXT,
      phone TEXT,
      email TEXT UNIQUE NOT NULL,
      tax_id TEXT,
      password TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      sync_id TEXT UNIQUE DEFAULT gen_random_uuid()::TEXT,
      last_synced_at TIMESTAMP WITH TIME ZONE,
      is_synced BOOLEAN DEFAULT FALSE,
      sync_version INTEGER DEFAULT 1
    );
  `;

  try {
    // Execute each SQL statement using raw SQL
    console.log('Creating Company table...');
    const { error: companyError } = await supabase.rpc('exec_sql', { sql: companySQL });
    if (companyError) {
      console.log('Company table creation error:', companyError.message);
    } else {
      console.log('Company table created successfully');
    }

    console.log('Creating VendorPayment table...');
    const { error: vendorError } = await supabase.rpc('exec_sql', { sql: vendorPaymentSQL });
    if (vendorError) {
      console.log('VendorPayment table creation error:', vendorError.message);
    } else {
      console.log('VendorPayment table created successfully');
    }

    console.log('Creating Notification table...');
    const { error: notificationError } = await supabase.rpc('exec_sql', { sql: notificationSQL });
    if (notificationError) {
      console.log('Notification table creation error:', notificationError.message);
    } else {
      console.log('Notification table created successfully');
    }

  } catch (error) {
    console.error('Error creating tables:', error.message);
  }
}

createTables();