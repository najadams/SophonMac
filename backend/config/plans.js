// Feature Keys — keep in sync with frontend/src/config/plans.js
const FEATURES = {
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
  ADVANCED_INVENTORY: 'advanced_inventory',
  EXPENSE_TRACKING: 'expense_tracking',

  // Enterprise
  API_ACCESS: 'api_access',
  CUSTOM_WORKFLOWS: 'custom_workflows',
  WHITE_LABEL: 'white_label',
};

const PLANS = {
  STARTER: {
    name: 'Starter',
    price: 20000,     // pesewas (GHS 200)
    interval: null,   // one-time
    features: [
      FEATURES.POS,
      FEATURES.INVENTORY_BASIC,
      FEATURES.OFFLINE_MODE,
    ],
    limits: {
      branches: 1,
      staff: 0,
      products: 100,
      devices: 1,
    }
  },
  TRADER: {
    name: 'Trader',
    price: 1500,        // pesewas (GHS 15/mo)
    interval: 'monthly',
    features: [
      FEATURES.POS, FEATURES.INVENTORY_BASIC, FEATURES.OFFLINE_MODE,
      FEATURES.CLOUD_SYNC, FEATURES.TAX_INVOICE, FEATURES.WAYBILL,
      FEATURES.CUSTOMER_MGMT, FEATURES.WHATSAPP_RECEIPTS, FEATURES.STOCK_TRACKING,
      FEATURES.EXPENSE_TRACKING,
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
    price: 4500,        // pesewas (GHS 45/mo)
    interval: 'monthly',
    features: [
      FEATURES.POS, FEATURES.INVENTORY_BASIC, FEATURES.OFFLINE_MODE,
      FEATURES.CLOUD_SYNC, FEATURES.TAX_INVOICE, FEATURES.WAYBILL,
      FEATURES.CUSTOMER_MGMT, FEATURES.WHATSAPP_RECEIPTS, FEATURES.STOCK_TRACKING,
      FEATURES.MULTI_BRANCH, FEATURES.UNLIMITED_STAFF, FEATURES.ADVANCED_ROLES,
      FEATURES.PRO_FORMA, FEATURES.PURCHASE_ORDERS, FEATURES.ACCOUNTING_EXPORT,
      FEATURES.ADVANCED_INVENTORY, FEATURES.EXPENSE_TRACKING,
    ],
    limits: {
      branches: 5,
      staff: 999,
      products: 10000,
      devices: 10,
    }
  },
  ENTERPRISE: {
    name: 'Enterprise',
    price: null,        // contact sales
    interval: null,
    features: Object.values(FEATURES),
    limits: {
      branches: 999,
      staff: 999,
      products: 999999,
      devices: 999,
    }
  }
};

const hasFeature = (currentPlan, featureKey) => {
  const plan = PLANS[currentPlan?.toUpperCase()] || PLANS.STARTER;
  return plan.features.includes(featureKey);
};

const getLimit = (currentPlan, limitKey) => {
  const plan = PLANS[currentPlan?.toUpperCase()] || PLANS.STARTER;
  return plan.limits?.[limitKey] || 0;
};

module.exports = { FEATURES, PLANS, hasFeature, getLimit };
