// Feature Keys
export const FEATURES = {
  // Essentials
  POS: 'pos',
  INVENTORY_BASIC: 'inventory_basic',
  OFFLINE_MODE: 'offline_mode',
  
  // Cloud & Growth
  CLOUD_SYNC: 'cloud_sync',
  TAX_INVOICE: 'tax_invoice',
  WAYBILL: 'waybill',
  CUSTOMER_MGMT: 'customer_mgmt',
  WHATSAPP_RECEIPTS: 'whatsapp_receipts',
  STOCK_TRACKING: 'stock_tracking',
  
  // Business Control
  MULTI_BRANCH: 'multi_branch',
  UNLIMITED_STAFF: 'unlimited_staff',
  ADVANCED_ROLES: 'advanced_roles',
  PRO_FORMA: 'pro_forma',
  PURCHASE_ORDERS: 'purchase_orders',
  ACCOUNTING_EXPORT: 'accounting_export',
  ADVANCED_INVENTORY: 'advanced_inventory', // Batches, Expiry
  
  // Enterprise
  API_ACCESS: 'api_access',
  CUSTOM_WORKFLOWS: 'custom_workflows',
  WHITE_LABEL: 'white_label',
};

// Plan Definitions
export const PLANS = {
  STARTER: {
    name: 'Starter',
    label: 'Starter (Free)',
    features: [
      FEATURES.POS,
      FEATURES.INVENTORY_BASIC,
      FEATURES.OFFLINE_MODE,
    ],
    limits: {
      branches: 1,
      staff: 0, // Owner only
      products: 100,
      devices: 1,
    }
  },
  TRADER: {
    name: 'Trader',
    label: 'Trader',
    features: [
      FEATURES.POS,
      FEATURES.INVENTORY_BASIC,
      FEATURES.OFFLINE_MODE,
      FEATURES.CLOUD_SYNC,
      FEATURES.TAX_INVOICE,
      FEATURES.WAYBILL,
      FEATURES.CUSTOMER_MGMT,
      FEATURES.WHATSAPP_RECEIPTS,
      FEATURES.STOCK_TRACKING,
    ],
    limits: {
      branches: 1,
      staff: 3,
      products: 2000,
      devices: 3,
    }
  },
  BUSINESS: {
    name: 'Business',
    label: 'Business',
    features: [
      // All Trader features included implicitly or explicitly
      FEATURES.POS, FEATURES.INVENTORY_BASIC, FEATURES.OFFLINE_MODE,
      FEATURES.CLOUD_SYNC, FEATURES.TAX_INVOICE, FEATURES.WAYBILL,
      FEATURES.CUSTOMER_MGMT, FEATURES.WHATSAPP_RECEIPTS, FEATURES.STOCK_TRACKING,
      
      // New features
      FEATURES.MULTI_BRANCH,
      FEATURES.UNLIMITED_STAFF,
      FEATURES.ADVANCED_ROLES,
      FEATURES.PRO_FORMA,
      FEATURES.PURCHASE_ORDERS,
      FEATURES.ACCOUNTING_EXPORT,
      FEATURES.ADVANCED_INVENTORY,
    ],
    limits: {
      branches: 5,
      staff: 999, // Unlimited
      products: 10000,
      devices: 10,
    }
  },
  ENTERPRISE: {
    name: 'Enterprise',
    label: 'Enterprise',
    features: Object.values(FEATURES), // All features
    limits: {
      branches: 999,
      staff: 999,
      products: 999999,
      devices: 999,
    }
  }
};

/**
 * Checks if a plan has a specific feature.
 * @param {string} currentPlan - The plan key (e.g., 'STARTER')
 * @param {string} featureKey - The feature constant to check
 * @returns {boolean}
 */
export const hasFeature = (currentPlan, featureKey) => {
  const plan = PLANS[currentPlan?.toUpperCase()] || PLANS.STARTER;
  return plan.features.includes(featureKey);
};

/**
 * Gets the limit for a specific resource.
 * @param {string} currentPlan 
 * @param {string} limitKey 
 * @returns {number}
 */
export const getLimit = (currentPlan, limitKey) => {
  const plan = PLANS[currentPlan?.toUpperCase()] || PLANS.STARTER;
  return plan.limits?.[limitKey] || 0;
};
