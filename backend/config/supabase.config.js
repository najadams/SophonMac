// Supabase configuration for centralized database sync
const { createClient } = require('@supabase/supabase-js');

// Check if Supabase is configured
const isSupabaseConfigured = !!(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY);

const supabaseConfig = {
  // Supabase project configuration
  url: process.env.SUPABASE_URL || null, 
  anonKey: process.env.SUPABASE_ANON_KEY || null,
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || null,
  isConfigured: isSupabaseConfigured,
  
  // Sync settings
  syncSettings: {
    batchSyncInterval: 15 * 60 * 1000,
    
    // Maximum records to sync in one batch
    maxBatchSize: 100,
    
    // Retry configuration
    maxRetries: 3,
    retryDelay: 5000, // 5 seconds
    
    // Conflict resolution strategy
    conflictResolution: 'last_write_wins', // 'last_write_wins', 'server_wins', 'manual'
    
    // Tables to sync (in dependency order)
    syncTables: [
      'Company',
      'Settings', 
      'Worker',
      'Customer',
      'Vendor',
      'Inventory',
      'Receipt',
      'ReceiptDetail',
      'Debt',
      'DebtPayment',
      'Supplies',
      'SuppliesDetail',
      'PurchaseOrder',
      'PurchaseOrderItem',
      'VendorPayment',
      'Notification'
    ],
    
    // Tables that require immediate sync (critical operations)
    criticalTables: [
      'Receipt',
      'Debt',
      'VendorPayment'
    ]
  }
};

// Create Supabase client instances
const createSupabaseClient = () => {
  if (!isSupabaseConfigured) {
    console.warn('Supabase is not configured. Skipping Supabase client creation.');
    return null;
  }
  return createClient(supabaseConfig.url, supabaseConfig.anonKey);
};

const createSupabaseServiceClient = () => {
  if (!isSupabaseConfigured) {
    console.warn('Supabase is not configured. Skipping Supabase service client creation.');
    return null;
  }
  
  // Double-check that we have valid values before calling createClient
  if (!supabaseConfig.url || !supabaseConfig.serviceRoleKey) {
    console.warn('Supabase configuration incomplete. Missing URL or service role key.');
    return null;
  }
  
  return createClient(supabaseConfig.url, supabaseConfig.serviceRoleKey);
};

module.exports = {
  supabaseConfig,
  createSupabaseClient,
  createSupabaseServiceClient
};