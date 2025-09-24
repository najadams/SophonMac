import React, { lazy, useEffect, useState } from "react";
import { Route, Routes } from "react-router-dom";
import { useSelector } from "react-redux";
import SalesRoutes from "./sales/SalesRoutes";
import DebtsRoutes from "./debts/DebtsRoutes";
import ReportsRoutes from "./reports/ReportsRoutes";
import VendorsRoutes from "./vendors/VendorsRoutes";
import ViewReceipt from "../views/ViewReceipt";
import { getPermissionsForRole, PERMISSIONS } from "../context/userRoles";
import ProtectedRoute from "../components/ProtectedRoute";
import Unauthorized from "../views/common/Unauthorized";
import Employees from "./Employees";

const Dashboard = lazy(() => import("../views/Dashboard"));
const VendorDetails = lazy(() => import("../views/VendorDetails"))
const Customers = lazy(() => import("../views/Customers"));
const ProductCatalogue = lazy(() => import("../views/ProductCatalogue"));
const StockEntry = lazy(() => import("../views/StockEntry"));
const Transactions = lazy(() => import("../views/Transactions"));
const Settings = lazy(() => import("../views/Settings"));
const CreateUser = lazy(() => import("../views/CreateUser"));
const WorkerEntry = lazy(() => import("../views/common/WorkerEntry"));
const NoPage = lazy(() => import("../views/NoPage"));
const MyAccount = lazy(() => import("../views/MyAccount"));
const Notifications = lazy(() => import("../views/Notifications"));
const ProductInfo = lazy(() => import("../views/ProductInfo"))
const CustomerInfo = lazy(() => import("../views/CustomerInfo"))
const NetworkManager = lazy(() => import("../components/NetworkManager"));

const AuthenticatedRoutes = () => {
  const userRole = useSelector((state) => state.userState?.currentUser.role);
  const permissions = getPermissionsForRole(userRole);
  const isLoggedIn = useSelector((state) => state.companyState.isLoggedIn);
  console.log(permissions, userRole, isLoggedIn);
  return (
    <Routes>
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute requiredPermission={PERMISSIONS.VIEW_DASHBOARD}>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/products"
        element={
          <ProtectedRoute requiredPermission={PERMISSIONS.MANAGE_INVENTORY}>
            <ProductCatalogue />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute requiredPermission={PERMISSIONS.MANAGE_SETTINGS}>
            <Settings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/create-user"
        element={
          <ProtectedRoute requiredPermission={PERMISSIONS.MANAGE_USERS}>
            <CreateUser />
          </ProtectedRoute>
        }
      />
      <Route
        path="/employees"
        element={
          <ProtectedRoute requiredPermission={PERMISSIONS.MANAGE_USERS}>
            <Employees />
          </ProtectedRoute>
        }
      />
      <Route
        path="/customers"
        element={
          <ProtectedRoute requiredPermission={PERMISSIONS.MANAGE_CUSTOMERS}>
            <Customers />
          </ProtectedRoute>
        }
      />
      <Route
        path="/stocks"
        element={
          <ProtectedRoute requiredPermission={PERMISSIONS.MANAGE_INVENTORY}>
            <StockEntry />
          </ProtectedRoute>
        }
      />
      <Route
        path="/transactions"
        element={
          <ProtectedRoute requiredPermission={PERMISSIONS.MANAGE_TRANSACTIONS}>
            <Transactions />
          </ProtectedRoute>
        }
      />
      <Route
        path="/vendors/*"
        element={
          <ProtectedRoute requiredPermission={PERMISSIONS.MANAGE_VENDORS}>
            <VendorsRoutes />
          </ProtectedRoute>
        }
      />
      <Route
        path="/debt/*"
        element={
          <ProtectedRoute requiredPermission={PERMISSIONS.MANAGE_DEBT}>
            <DebtsRoutes />
          </ProtectedRoute>
        }
      />
      <Route
        path="/receipts/:receiptId"
        element={
          <ProtectedRoute requiredPermission={PERMISSIONS.PROCESS_SALES}>
            <ViewReceipt />
          </ProtectedRoute>
        }
      />
      <Route
        path="/account"
        element={<WorkerEntry isLoggedIn={isLoggedIn} />}
      />
      <Route
        path="/sales/*"
        element={
          <ProtectedRoute requiredPermission={PERMISSIONS.PROCESS_SALES}>
            <SalesRoutes />
          </ProtectedRoute>
        }
      />
      <Route 
        path="/vendors/:vendorId" 
        element={
          <ProtectedRoute requiredPermission={PERMISSIONS.MANAGE_VENDORS}>
            <VendorDetails />
          </ProtectedRoute>
        } 
      />
      <Route
        path="/reports/*"
        element={
          <ProtectedRoute requiredPermission={PERMISSIONS.VIEW_REPORTS}>
            <ReportsRoutes />
          </ProtectedRoute>
        }
      />
      <Route 
        path="/myaccount/:accoutNumber" 
        element={
          <ProtectedRoute requiredPermission={PERMISSIONS.VIEW_DASHBOARD}>
            <MyAccount />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/notification" 
        element={
          <ProtectedRoute requiredPermission={PERMISSIONS.VIEW_NOTIFICATIONS}>
            <Notifications />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/network" 
        element={
          <ProtectedRoute requiredPermission={PERMISSIONS.MANAGE_SETTINGS}>
            <NetworkManager />
          </ProtectedRoute>
        } 
      />
      <Route path="/not-authorized" element={<Unauthorized />} />
      <Route path="/*" element={<NoPage />} />
      <Route 
        path="/products/:id" 
        element={
          <ProtectedRoute requiredPermission={PERMISSIONS.MANAGE_INVENTORY}>
            <ProductInfo />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/customers/:id" 
        element={
          <ProtectedRoute requiredPermission={PERMISSIONS.MANAGE_CUSTOMERS}>
            <CustomerInfo />
          </ProtectedRoute>
        } 
      />
    </Routes>
  );
};

export default AuthenticatedRoutes;