import React, { createContext, useState, useContext } from "react";

// Create a context
export const SidebarContext = createContext();

// Create a provider component
export const SidebarProvider = ({ children }) => {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);

  return (
    <SidebarContext.Provider
      value={{ isSidebarExpanded, setIsSidebarExpanded }}>
      {children}
    </SidebarContext.Provider>
  );
};

// Create a custom hook to use the sidebar context
export const useSidebar = () => {
  return useContext(SidebarContext);
};


export const DialogContext = React.createContext()