# Role-Based Access Control (RBAC) Guide

This document explains how the role-based access control system works in the application.

## Overview

The application implements a comprehensive RBAC system that controls access to different pages and features based on user roles and permissions. All permissions are centrally managed in `/frontend/src/context/userRoles.jsx`.

## Roles and Permissions

### Available Roles
- **COMPANY**: Company owner with full access
- **SUPER_ADMIN**: Super administrator with full access
- **ADMIN**: Administrator with store management and user management
- **WORKER**: Basic worker with limited access
- **STORE_MANAGER**: Store manager with inventory and sales access
- **SALES_ASSOCIATE**: Sales-only access
- **SALES_ASSOCIATE_AND_INVENTORY_MANAGER**: Sales and inventory access
- **INVENTORY_MANAGER**: Inventory management access
- **HR**: Human resources with payroll access
- **IT_SUPPORT**: IT support with settings access

### Available Permissions
- **VIEW_DASHBOARD**: Access to dashboard and basic views
- **MANAGE_USERS**: Create, edit, and manage user accounts
- **VIEW_REPORTS**: Access to reports and analytics
- **MANAGE_INVENTORY**: Manage products and stock
- **MANAGE_PAYROLL**: Access to payroll and HR functions
- **MANAGE_SETTINGS**: Access to system settings
- **PROCESS_SALES**: Process sales transactions

## Role-Permission Mapping

### COMPANY & SUPER_ADMIN
- All permissions (full access)

### ADMIN
- VIEW_DASHBOARD
- VIEW_REPORTS
- MANAGE_INVENTORY
- PROCESS_SALES
- MANAGE_USERS
- MANAGE_SETTINGS

### STORE_MANAGER
- VIEW_DASHBOARD
- VIEW_REPORTS
- MANAGE_INVENTORY
- PROCESS_SALES
- MANAGE_SETTINGS

### WORKER
- VIEW_DASHBOARD
- PROCESS_SALES
- VIEW_REPORTS

### SALES_ASSOCIATE
- PROCESS_SALES

### SALES_ASSOCIATE_AND_INVENTORY_MANAGER
- PROCESS_SALES
- MANAGE_INVENTORY

### INVENTORY_MANAGER
- MANAGE_INVENTORY
- MANAGE_SETTINGS

### HR
- MANAGE_PAYROLL

### IT_SUPPORT
- MANAGE_SETTINGS

## Implementation Details

### Protected Routes
All routes in `/frontend/src/routes/AuthenticatedRoutes.jsx` are protected using the `ProtectedRoute` component:

```jsx
<Route
  path="/dashboard"
  element={
    <ProtectedRoute requiredPermission={PERMISSIONS.VIEW_DASHBOARD}>
      <Dashboard />
    </ProtectedRoute>
  }
/>
```

### Route-Permission Mapping
- `/dashboard` → VIEW_DASHBOARD
- `/sales/*` → PROCESS_SALES
- `/products` → MANAGE_INVENTORY
- `/stocks` → MANAGE_INVENTORY
- `/customers` → VIEW_DASHBOARD
- `/vendors/*` → VIEW_DASHBOARD
- `/debt/*` → VIEW_DASHBOARD
- `/transactions` → VIEW_DASHBOARD
- `/reports/*` → VIEW_REPORTS
- `/settings` → MANAGE_SETTINGS
- `/employees` → MANAGE_USERS
- `/!employee!@` → MANAGE_USERS
- `/products/:id` → MANAGE_INVENTORY
- `/customers/:id` → VIEW_DASHBOARD
- `/vendors/:vendorId` → VIEW_DASHBOARD
- `/receipts/:receiptId` → VIEW_DASHBOARD
- `/myaccount/:accountNumber` → VIEW_DASHBOARD
- `/notification` → VIEW_DASHBOARD

### Sidebar Navigation
The sidebar in `/frontend/src/components/common/Sidebar.jsx` automatically filters menu items based on user permissions. Users will only see navigation items they have access to.

### Header Menu
The header menu in `/frontend/src/components/common/Header.jsx` conditionally shows:
- "Add an Employee account" → Requires MANAGE_USERS permission
- "Settings" → Requires MANAGE_SETTINGS permission

## How to Use

### For Developers

1. **Adding New Permissions**: Add new permissions to the `PERMISSIONS` object in `userRoles.jsx`
2. **Assigning Permissions to Roles**: Update the `rolePermissions` object
3. **Protecting New Routes**: Wrap new routes with `ProtectedRoute` component
4. **Protecting UI Elements**: Use permission checks in components:

```jsx
import { useSelector } from 'react-redux';
import { getPermissionsForRole, PERMISSIONS } from '../context/userRoles';

const MyComponent = () => {
  const currentUser = useSelector((state) => state.userState.currentUser);
  const userRole = currentUser?.role || currentUser?.worker?.role;
  const userPermissions = getPermissionsForRole(userRole);
  
  const canManageUsers = userRole === 'company' || 
                        userRole === 'super_admin' || 
                        userPermissions.includes(PERMISSIONS.MANAGE_USERS);
  
  return (
    <div>
      {canManageUsers && (
        <Button>Add User</Button>
      )}
    </div>
  );
};
```

### For Administrators

1. **Assigning Roles**: When creating user accounts, assign appropriate roles based on job responsibilities
2. **Role Hierarchy**: Remember that COMPANY and SUPER_ADMIN have access to everything
3. **Principle of Least Privilege**: Assign the minimum permissions necessary for each role

## Security Notes

- All route protection is enforced on the frontend, but backend APIs should also implement proper authorization
- The `ProtectedRoute` component handles unauthorized access by showing an "Unauthorized" page
- Users without proper permissions will not see restricted navigation items
- Role and permission checks are performed in real-time based on the current user's state

## Troubleshooting

### User Can't Access a Page
1. Check if the user's role includes the required permission
2. Verify the route is properly wrapped with `ProtectedRoute`
3. Ensure the correct permission is specified for the route

### Navigation Item Not Showing
1. Check if the user's role has the required permission
2. Verify the permission is correctly assigned in the sidebar's `allMenuItems` array

### Permission Changes Not Taking Effect
1. User may need to log out and log back in
2. Check if the Redux state is properly updated
3. Verify the permission changes are saved in `userRoles.jsx`