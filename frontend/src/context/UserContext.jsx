import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
} from "react";
import { ROLES, rolePermissions } from "./userRoles";

// Create UserContext
const UserContext = createContext();

// UserProvider component
export const UserProvider = ({ children }) => {
  const [user, setUser] = useState({
    role: ROLES.EMPLOYEE, // Example initial role
    permissions: rolePermissions[ROLES.EMPLOYEE],
  });

  // Update user permissions whenever the role changes
  useEffect(() => {
    if (user.role) {
      setUser((prevUser) => ({
        ...prevUser,
        permissions: rolePermissions[user.role] || [],
      }));
    }
  }, [user.role]);

  const value = useMemo(() => ({ user, setUser }), [user]);

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

// Custom hook to use the UserContext
export const useUser = () => useContext(UserContext);
