export const ROLES = {
  COMPANY: "company",
  SUPER_ADMIN: "super_admin",
  ADMIN: "admin",
  WORKER: "worker",
  STORE_MANAGER: "store_manager",
  SALES_ASSOCIATE_AND_INVENTORY_MANAGER: "sales_associate_and_inventory_manager",
  SALES_ASSOCIATE: "sales_associate",
  INVENTORY_MANAGER: "inventory_manager",
  HR: "hr",
  IT_SUPPORT: "it_support",
};

export const PERMISSIONS = {
  VIEW_DASHBOARD: "view_dashboard",
  MANAGE_USERS: "manage_users",
  VIEW_REPORTS: "view_reports",
  MANAGE_INVENTORY: "manage_inventory",
  MANAGE_PAYROLL: "manage_payroll",
  MANAGE_SETTINGS: "manage_settings",
  PROCESS_SALES: "process_sales",
};

export const BASE_PERMISSIONS = {
  MANAGE_STORE: [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.MANAGE_INVENTORY,
    PERMISSIONS.PROCESS_SALES,
  ],
  MANAGE_SYSTEM: [PERMISSIONS.MANAGE_USERS, PERMISSIONS.MANAGE_SETTINGS],
  MANAGE_HR: [PERMISSIONS.MANAGE_PAYROLL],
};

export const rolePermissions = {
  [ROLES.COMPANY]: [
    ...BASE_PERMISSIONS.MANAGE_STORE,
    ...BASE_PERMISSIONS.MANAGE_SYSTEM,
    ...BASE_PERMISSIONS.MANAGE_HR,
  ],
  [ROLES.SUPER_ADMIN]: [
    ...BASE_PERMISSIONS.MANAGE_STORE,
    ...BASE_PERMISSIONS.MANAGE_SYSTEM,
    ...BASE_PERMISSIONS.MANAGE_HR,
  ],
  [ROLES.ADMIN]: [
    ...BASE_PERMISSIONS.MANAGE_STORE,
    PERMISSIONS.MANAGE_USERS,
    PERMISSIONS.MANAGE_SETTINGS,
  ],
  [ROLES.WORKER]: [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.PROCESS_SALES,
    PERMISSIONS.VIEW_REPORTS,
  ],
  [ROLES.STORE_MANAGER]: [
    ...BASE_PERMISSIONS.MANAGE_STORE,
    PERMISSIONS.MANAGE_SETTINGS,
  ],
  [ROLES.SALES_ASSOCIATE]: [PERMISSIONS.PROCESS_SALES],
  [ROLES.SALES_ASSOCIATE_AND_INVENTORY_MANAGER]: [PERMISSIONS.PROCESS_SALES,PERMISSIONS.MANAGE_INVENTORY],
  [ROLES.INVENTORY_MANAGER]: [
    PERMISSIONS.MANAGE_INVENTORY,
    PERMISSIONS.MANAGE_SETTINGS,
  ],
  [ROLES.HR]: [...BASE_PERMISSIONS.MANAGE_HR],
  [ROLES.IT_SUPPORT]: [PERMISSIONS.MANAGE_SETTINGS],
};

export const getPermissionsForRole = (role) => rolePermissions[role] || [];

// Role hierarchy - higher number means higher authority
export const ROLE_HIERARCHY = {
  [ROLES.SALES_ASSOCIATE]: 1,
  [ROLES.INVENTORY_MANAGER]: 2,
  [ROLES.SALES_ASSOCIATE_AND_INVENTORY_MANAGER]: 2,
  [ROLES.IT_SUPPORT]: 3,
  [ROLES.HR]: 3,
  [ROLES.WORKER]: 4,
  [ROLES.STORE_MANAGER]: 5,
  [ROLES.ADMIN]: 6,
  [ROLES.SUPER_ADMIN]: 7,
  [ROLES.COMPANY]: 8,
};

// Check if user can change another user's role
export const canChangeUserRole = (currentUserRole, targetUserRole) => {
  const currentUserLevel = ROLE_HIERARCHY[currentUserRole] || 0;
  const targetUserLevel = ROLE_HIERARCHY[targetUserRole] || 0;
  return currentUserLevel > targetUserLevel;
};

// Get roles that a user can assign to others
export const getAssignableRoles = (currentUserRole) => {
  const currentUserLevel = ROLE_HIERARCHY[currentUserRole] || 0;
  return Object.keys(ROLE_HIERARCHY).filter(role => 
    ROLE_HIERARCHY[role] < currentUserLevel
  );
};
