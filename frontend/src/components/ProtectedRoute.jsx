import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import Unauthorized from "../views/common/Unauthorized";
import { getPermissionsForRole, ROLES } from "../context/userRoles";

const ProtectedRoute = ({ requiredPermission, children, allowSelf = false, targetUserId = null }) => {
  const currentUser = useSelector((state) => state.userState.currentUser);
  const [customRoles, setCustomRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Get user role - handle both company users and workers
  const userRole = currentUser?.role || currentUser?.worker?.role;
  const userId = currentUser?.id;
  
  // Load custom roles from backend
  useEffect(() => {
    const loadCustomRoles = async () => {
      try {
        const customRoleService = await import('../services/customRoleService');
        const roles = await customRoleService.default.getAllCustomRoles();
        setCustomRoles(roles);
      } catch (error) {
        console.error('Error loading custom roles in ProtectedRoute:', error);
        // Continue with empty custom roles array
        setCustomRoles([]);
      } finally {
        setLoading(false);
      }
    };

    if (currentUser) {
      loadCustomRoles();
    } else {
      setLoading(false);
    }
  }, [currentUser]);
  
  // Show loading state while custom roles are being fetched
  if (loading) {
    return <div>Loading...</div>;
  }
  
  // If no user is logged in, show unauthorized
  if (!currentUser || !userRole) {
    return <Unauthorized />;
  }
  
  console.log(userRole, "custom roles :", customRoles);
  
  // Get permissions for the user's role
  const userPermissions = getPermissionsForRole(userRole, customRoles);
  
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
