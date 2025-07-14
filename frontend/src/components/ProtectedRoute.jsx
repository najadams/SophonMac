import React from "react";
import { useSelector } from "react-redux";
import Unauthorized from "../views/common/Unauthorized";
import { getPermissionsForRole, ROLES } from "../context/userRoles";

const ProtectedRoute = ({ requiredPermission, children, allowSelf = false, targetUserId = null }) => {
  const currentUser = useSelector((state) => state.userState.currentUser);
  
  // Get user role - handle both company users and workers
  const userRole = currentUser?.role || currentUser?.worker?.role;
  const userId = currentUser?.id;
  
  // If no user is logged in, show unauthorized
  if (!currentUser || !userRole) {
    return <Unauthorized />;
  }
  
  // Get permissions for the user's role
  const userPermissions = getPermissionsForRole(userRole);
  
  // Special case: company owners have all permissions
  if (userRole === 'company') {
    return children;
  }
  
  // Special case: super admins have all permissions except company-specific ones
  if (userRole === 'super_admin') {
    return children;
  }
  
  // Check if user has the required permission
  const hasPermission = userPermissions.includes(requiredPermission);
  
  // If allowSelf is true and targetUserId matches current user, allow access
  if (allowSelf && targetUserId && userId === targetUserId) {
    return children;
  }
  
  // If user doesn't have permission, show unauthorized
  if (!hasPermission) {
    return <Unauthorized />;
  }
  
  return children;
};

export default ProtectedRoute;
