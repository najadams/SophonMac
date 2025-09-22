const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createTablesManually() {
  console.log('Creating tables in Supabase manually...');
  
  try {
    // First, let's try to create a simple Company record to see if the table exists
    console.log('Testing Company table...');
    const { data: companyData, error: companyError } = await supabase
      .from('Company')
      .select('*')
      .limit(1);
    
    if (companyError) {
      console.log('Company table does not exist:', companyError.message);
    } else {
      console.log('Company table exists, found records:', companyData?.length || 0);
    }

    // Test VendorPayment table
    console.log('Testing VendorPayment table...');
    const { data: vendorData, error: vendorError } = await supabase
      .from('VendorPayment')
      .select('*')
      .limit(1);
    
    if (vendorError) {
      console.log('VendorPayment table does not exist:', vendorError.message);
    } else {
      console.log('VendorPayment table exists, found records:', vendorData?.length || 0);
    }

    // Test Notification table
    console.log('Testing Notification table...');
    const { data: notificationData, error: notificationError } = await supabase
      .from('Notification')
      .select('*')
      .limit(1);
    
    if (notificationError) {
      console.log('Notification table does not exist:', notificationError.message);
    } else {
      console.log('Notification table exists, found records:', notificationData?.length || 0);
    }

    console.log('\n=== SOLUTION ===');
    console.log('The tables need to be created manually in the Supabase dashboard.');
    console.log('Go to: https://supabase.com/dashboard/project/ihcabwkhqifznlmobufz/editor');
    console.log('And create the tables using the SQL editor with the schema from supabase_schema.sql');

  } catch (error) {
    console.error('Error:', error.message);
  }
}

createTablesManually();