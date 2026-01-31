import React, { lazy, useEffect, useState } from "react";
import { Route, Routes } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { ActionCreators } from "../actions/action";
import { tableActions } from "../config/Functions";
import SalesRoutes from "./sales/SalesRoutes";
import DebtsRoutes from "./debts/DebtsRoutes";
import ReportsRoutes from "./reports/ReportsRoutes";
import VendorsRoutes from "./vendors/VendorsRoutes";
import ViewReceipt from "../views/ViewReceipt";
import { getPermissionsForRole, PERMISSIONS } from "../context/userRoles";
import ProtectedRoute from "../components/ProtectedRoute";
import Unauthorized from "../views/common/Unauthorized";
import Employees from "./Employees";
const ImportBackup = lazy(() => import("../views/ImportBackup"));

const Dashboard = lazy(() => import("../views/Dashboard"));
const VendorDetails = lazy(() => import("../views/VendorDetails"))
const Customers = lazy(() => import("../views/Customers"));
const ProductCatalogue = lazy(() => import("../views/ProductCatalogue"));

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
const TaxDashboard = lazy(() => import("../views/TaxDashboard"));
const Intelligence = lazy(() => import("../views/Intelligence"));
const Expenses = lazy(() => import("../views/Expenses"));
const BillingCallback = lazy(() => import("../views/BillingCallback"));

const AuthenticatedRoutes = () => {
  const userRole = useSelector((state) => state.userState?.currentUser.role);
  const permissions = getPermissionsForRole(userRole);
  const isLoggedIn = useSelector((state) => state.companyState.isLoggedIn);
  const companyId = useSelector((state) => state.companyState.data?.id);
  const allowedUnits = useSelector((state) => state.companyState.allowedUnits);
  const allowedCategories = useSelector((state) => state.companyState.allowedCategories);
  const dispatch = useDispatch();

  useEffect(() => {
    const fetchCompanyData = async () => {
      if (isLoggedIn && companyId) {
        // If units or categories are missing/empty, fetch complete company data
        if ((!allowedUnits || allowedUnits.length === 0) || 
            (!allowedCategories || allowedCategories.length === 0)) {
          try {
            const companyData = await tableActions.fetchCompany(companyId);
            dispatch(ActionCreators.fetchCompanySuccess(companyData));
            console.log("Refetched company data to restore settings via AuthenticatedRoutes");
          } catch (error) {
            console.error("Failed to refetch company data:", error);
          }
        }
      }
    };

    fetchCompanyData();
  }, [isLoggedIn, companyId, allowedUnits, allowedCategories, dispatch]);

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
        path="/backup/import"
        element={
          <ProtectedRoute requiredPermission={PERMISSIONS.MANAGE_SETTINGS}>
            <ImportBackup />
          </ProtectedRoute>
        }
      />
      <Route
        path="/backup/import"
        element={
          <ProtectedRoute requiredPermission={PERMISSIONS.MANAGE_SETTINGS}>
            <ImportBackup />
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
      <Route 
        path="/tax" 
        element={
          <ProtectedRoute requiredPermission={PERMISSIONS.VIEW_TAX_DASHBOARD}>
            <TaxDashboard />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/intelligence" 
        element={
          <ProtectedRoute requiredPermission={PERMISSIONS.VIEW_DASHBOARD}>
            <Intelligence />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/expenses" 
        element={
          <ProtectedRoute requiredPermission={PERMISSIONS.MANAGE_EXPENSES}>
            <Expenses />
          </ProtectedRoute>
        }
      />
      <Route path="/billing/callback" element={<BillingCallback />} />
    </Routes>
  );
};

export default AuthenticatedRoutes;