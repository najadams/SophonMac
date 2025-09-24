export const ROLES = {
  SUPER_ADMIN: "super_admin",
  ADMIN: "admin", 
  MANAGER: "manager",
  EMPLOYEE: "employee",
  VIEWER: "viewer",
};

export const PERMISSIONS = {
  VIEW_DASHBOARD: "view_dashboard",
  MANAGE_USERS: "manage_users",
  VIEW_REPORTS: "view_reports",
  MANAGE_CUSTOMERS: "manage_customers",
  MANAGE_INVENTORY: "manage_inventory",
  MANAGE_PAYROLL: "manage_payroll",
  MANAGE_SETTINGS: "manage_settings",
  PROCESS_SALES: "process_sales",
  MANAGE_VENDORS: "manage_vendors",
  MANAGE_DEBT: "manage_debt",
  MANAGE_TRANSACTIONS: "manage_transactions",
  VIEW_NOTIFICATIONS: "view_notifications",
  CUSTOMIZE_PERMISSIONS: "customize_permissions", // New permission for admins
};

// Default sidebar pages that can be customized
export const SIDEBAR_PAGES = {
  DASHBOARD: { path: "/dashboard", icon: "bx-home", text: "Dashboard", permission: PERMISSIONS.VIEW_DASHBOARD },
  SALES: { path: "/sales", icon: "bx-receipt", text: "Make Sales", permission: PERMISSIONS.PROCESS_SALES },
  INVENTORY: { path: "/products", icon: "bx-cart-alt", text: "Inventory", permission: PERMISSIONS.MANAGE_INVENTORY },
  CUSTOMERS: { path: "/customers", icon: "bx-user-plus", text: "Customers", permission: PERMISSIONS.MANAGE_CUSTOMERS },
  VENDORS: { path: "/vendors", icon: "bx-store-alt", text: "Vendors", permission: PERMISSIONS.MANAGE_VENDORS },
  DEBT: { path: "/debt", icon: "bx-money", text: "Debt", permission: PERMISSIONS.MANAGE_DEBT },
  TRANSACTIONS: { path: "/transactions", icon: "bx-money-withdraw", text: "Transactions", permission: PERMISSIONS.MANAGE_TRANSACTIONS },
  REPORTS: { path: "/reports", icon: "bx-line-chart", text: "Reports", permission: PERMISSIONS.VIEW_REPORTS },
  NOTIFICATIONS: { path: "/notification", icon: "bx-notification", text: "Notification", permission: PERMISSIONS.VIEW_NOTIFICATIONS },
};

export const rolePermissions = {
  [ROLES.SUPER_ADMIN]: [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.MANAGE_USERS,
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.MANAGE_CUSTOMERS,
    PERMISSIONS.MANAGE_INVENTORY,
    PERMISSIONS.MANAGE_PAYROLL,
    PERMISSIONS.MANAGE_SETTINGS,
    PERMISSIONS.PROCESS_SALES,
    PERMISSIONS.MANAGE_VENDORS,
    PERMISSIONS.MANAGE_DEBT,
    PERMISSIONS.MANAGE_TRANSACTIONS,
    PERMISSIONS.VIEW_NOTIFICATIONS,
    PERMISSIONS.CUSTOMIZE_PERMISSIONS,
  ],
  [ROLES.ADMIN]: [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.MANAGE_USERS,
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.MANAGE_CUSTOMERS,
    PERMISSIONS.MANAGE_INVENTORY,
    PERMISSIONS.MANAGE_SETTINGS,
    PERMISSIONS.PROCESS_SALES,
    PERMISSIONS.MANAGE_VENDORS,
    PERMISSIONS.MANAGE_DEBT,
    PERMISSIONS.MANAGE_TRANSACTIONS,
    PERMISSIONS.VIEW_NOTIFICATIONS,
    PERMISSIONS.CUSTOMIZE_PERMISSIONS,
  ],
  [ROLES.MANAGER]: [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.MANAGE_CUSTOMERS,
    PERMISSIONS.MANAGE_INVENTORY,
    PERMISSIONS.PROCESS_SALES,
    PERMISSIONS.MANAGE_VENDORS,
    PERMISSIONS.MANAGE_DEBT,
    PERMISSIONS.MANAGE_TRANSACTIONS,
    PERMISSIONS.VIEW_NOTIFICATIONS,
  ],
  [ROLES.EMPLOYEE]: [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.PROCESS_SALES,
    PERMISSIONS.MANAGE_CUSTOMERS,
    PERMISSIONS.VIEW_NOTIFICATIONS,
  ],
  [ROLES.VIEWER]: [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.VIEW_NOTIFICATIONS,
  ],
};

export const getPermissionsForRole = (role, customRoles = []) => {
  console.log('getPermissionsForRole called with:', { role, customRoles });
  
  // Check if it's a custom role first
  const customRole = customRoles.find(cr => cr.name === role);
  console.log('Found custom role:', customRole);
  
  if (customRole) {
    // Parse permissions if they're stored as JSON string
    const permissions = typeof customRole.permissions === 'string' 
      ? JSON.parse(customRole.permissions) 
      : customRole.permissions;
    console.log('Custom role permissions:', permissions);
    return permissions || [];
  }
  
  // Fall back to built-in role permissions
  const builtInPermissions = rolePermissions[role] || [];
  console.log('Built-in role permissions:', builtInPermissions);
  return builtInPermissions;
};

// Role hierarchy - higher number means higher authority
export const ROLE_HIERARCHY = {
  [ROLES.VIEWER]: 1,
  [ROLES.EMPLOYEE]: 2,
  [ROLES.MANAGER]: 3,
  [ROLES.ADMIN]: 4,
  [ROLES.SUPER_ADMIN]: 5,
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

// Custom permissions storage (in real app, this would be in database/backend)
let customUserPermissions = {};

// Set custom sidebar permissions for a user
export const setCustomUserPermissions = (userId, sidebarPages) => {
  customUserPermissions[userId] = sidebarPages;
};

// Get custom sidebar permissions for a user
export const getCustomUserPermissions = (userId) => {
  return customUserPermissions[userId] || null;
};

// Get sidebar pages for a user (considering custom permissions and custom roles)
export const getSidebarPagesForUser = (user, customRoles = []) => {
  const userId = user?.id || user?.worker?.id;
  const userRole = user?.role || user?.worker?.role;
  
  console.log('getSidebarPagesForUser called with:', { user, userRole, customRoles });
  
  // Check if user has custom permissions (individual overrides)
  const customPermissions = getCustomUserPermissions(userId);
  if (customPermissions) {
    console.log('Using custom user permissions:', customPermissions);
    return customPermissions;
  }
  
  // Fall back to role-based permissions (including custom roles)
  const userPermissions = getPermissionsForRole(userRole, customRoles);
  console.log('User permissions from role:', userPermissions);
  
  const filteredPages = Object.values(SIDEBAR_PAGES).filter(page => {
    // Super admin and admin have access to all pages
    if (userRole === ROLES.SUPER_ADMIN || userRole === ROLES.ADMIN) {
      return true;
    }
    // Check if user has the required permission
    const hasPermission = userPermissions.includes(page.permission);
    console.log(`Page ${page.text} (${page.permission}): ${hasPermission ? 'ALLOWED' : 'DENIED'}`);
    return hasPermission;
  });
  
  console.log('Final filtered pages:', filteredPages);
  return filteredPages;
};

// Custom roles storage (in real app, this would be in database/backend)
let customRoles = {};

// Create a new custom role
export const createCustomRole = (roleData) => {
  if (customRoles[roleData.name]) {
    throw new Error('Role with this name already exists');
  }
  
  customRoles[roleData.name] = {
    ...roleData,
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
  };
  
  // Add to role permissions mapping
  rolePermissions[roleData.name] = roleData.permissions;
  
  // Add to role hierarchy if specified
  if (roleData.hierarchyLevel) {
    ROLE_HIERARCHY[roleData.name] = roleData.hierarchyLevel;
  }
  
  return customRoles[roleData.name];
};

// Update an existing custom role
export const updateCustomRole = (roleName, roleData) => {
  if (!customRoles[roleName]) {
    throw new Error('Role not found');
  }
  
  // If name is changing, handle the transition
  if (roleData.name !== roleName) {
    if (customRoles[roleData.name]) {
      throw new Error('Role with new name already exists');
    }
    
    // Move to new name
    customRoles[roleData.name] = { ...customRoles[roleName], ...roleData };
    delete customRoles[roleName];
    delete rolePermissions[roleName];
    delete ROLE_HIERARCHY[roleName];
    
    // Update with new name
    rolePermissions[roleData.name] = roleData.permissions;
    if (roleData.hierarchyLevel) {
      ROLE_HIERARCHY[roleData.name] = roleData.hierarchyLevel;
    }
  } else {
    // Update existing
    customRoles[roleName] = { ...customRoles[roleName], ...roleData };
    rolePermissions[roleName] = roleData.permissions;
    if (roleData.hierarchyLevel) {
      ROLE_HIERARCHY[roleName] = roleData.hierarchyLevel;
    }
  }
  
  return customRoles[roleData.name] || customRoles[roleName];
};

// Delete a custom role
export const deleteCustomRole = (roleName) => {
  if (!customRoles[roleName]) {
    throw new Error('Role not found');
  }
  
  delete customRoles[roleName];
  delete rolePermissions[roleName];
  delete ROLE_HIERARCHY[roleName];
  
  return true;
};

// Get all custom roles
export const getCustomRoles = () => {
  return Object.values(customRoles);
};

// Get a specific custom role
export const getCustomRole = (roleName) => {
  return customRoles[roleName] || null;
};

// Check if a role is custom
export const isCustomRole = (roleName) => {
  return customRoles.hasOwnProperty(roleName);
};

// Get all available roles (built-in + custom) - enhanced version that fetches from backend
export const getAllRoles = async (companyId) => {
  try {
    // Import the service dynamically to avoid circular dependencies
    const { default: customRoleService } = await import('../services/customRoleService');
    const customRoles = await customRoleService.getCustomRoles(companyId);
    const builtInRoles = Object.values(ROLES);
    const customRoleNames = customRoles.map(role => role.name);
    return [...builtInRoles, ...customRoleNames];
  } catch (error) {
    console.error('Error fetching custom roles:', error);
    // Fallback to built-in roles only
    return Object.values(ROLES);
  }
};

// Get all available roles (built-in + custom) - synchronous version using local storage
export const getAllRolesSync = () => {
  const builtInRoles = Object.values(ROLES);
  const customRoleNames = Object.keys(customRoles);
  return [...builtInRoles, ...customRoleNames];
};

// Get all permissions
export const getAllPermissions = () => {
  return Object.values(PERMISSIONS);
};

// Get role display name
export const getRoleDisplayName = (roleName) => {
  // Check if it's a custom role
  if (customRoles[roleName]) {
    return customRoles[roleName].displayName;
  }
  
  // Built-in role display names
  const roleDisplayNames = {
    [ROLES.SUPER_ADMIN]: 'Super Admin',
    [ROLES.ADMIN]: 'Admin',
    [ROLES.MANAGER]: 'Manager',
    [ROLES.EMPLOYEE]: 'Employee',
    [ROLES.VIEWER]: 'Viewer',
  };
  
  return roleDisplayNames[roleName] || roleName;
};
