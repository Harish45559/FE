import React from "react";
import { useRoutes } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Attendance from "./pages/Attendance";
import Employees from "./pages/Employees";
import Reports from "./pages/Reports";
import PreviousOrders from "./pages/PreviousOrders";
import HeldOrders from "./pages/HeldOrders";
import MasterData from "./pages/MasterData";
import BillingCounter from "./pages/BillingCounter";
import ForgotPassword from "./pages/ForgotPassword";
import ProtectedRoute from "./components/ProtectedRoute";
import EndOfDaySales from "./pages/EndOfDaySales";

// Staff online ordering pages
import OnlineOrders from "./pages/OnlineOrders";
import Customers from "./pages/Customers";

// Customer-facing pages
import CustomerLogin from "./pages/customer/CustomerLogin";
import CustomerRegister from "./pages/customer/CustomerRegister";
import CustomerForgotPassword from "./pages/customer/CustomerForgotPassword";
import CustomerResetPassword from "./pages/customer/CustomerResetPassword";
import CustomerMenu from "./pages/customer/CustomerMenu";
import CustomerCart from "./pages/customer/CustomerCart";
import OrderConfirmation from "./pages/customer/OrderConfirmation";
import CustomerOrders from "./pages/customer/CustomerOrders";
import CustomerProfile from "./pages/customer/CustomerProfile";
import CustomerProtectedRoute from "./components/CustomerProtectedRoute";

const AppRouter = () => {
  const routes = useRoutes([
    { path: "/", element: <Login /> },
    { path: "/login", element: <Login /> },
    { path: "/forgot-password", element: <ForgotPassword /> },

    // 🔐 Admin-only routes
    {
      path: "/dashboard",
      element: (
        <ProtectedRoute allowedRoles={["admin"]}>
          <Dashboard />
        </ProtectedRoute>
      ),
    },

    {
      path: "/employees",
      element: (
        <ProtectedRoute allowedRoles={["admin"]}>
          <Employees />
        </ProtectedRoute>
      ),
    },

    {
      path: "/reports",
      element: (
        <ProtectedRoute allowedRoles={["admin"]}>
          <Reports />
        </ProtectedRoute>
      ),
    },

    {
      path: "/master-data",
      element: (
        <ProtectedRoute allowedRoles={["admin"]}>
          <MasterData />
        </ProtectedRoute>
      ),
    },

    {
      path: "/eod-sales",
      element: (
        <ProtectedRoute allowedRoles={["admin"]}>
          <EndOfDaySales />
        </ProtectedRoute>
      ),
    },

    // 🔐 Shared routes - for both admin and employee
    {
      path: "/attendance",
      element: (
        <ProtectedRoute allowedRoles={["admin", "employee"]}>
          <Attendance />
        </ProtectedRoute>
      ),
    },
    {
      path: "/billing",
      element: (
        <ProtectedRoute allowedRoles={["admin"]}>
          <BillingCounter />
        </ProtectedRoute>
      ),
    },
    {
      path: "/previous-orders",
      element: (
        <ProtectedRoute allowedRoles={["admin"]}>
          <PreviousOrders />
        </ProtectedRoute>
      ),
    },
    {
      path: "/held-orders",
      element: (
        <ProtectedRoute allowedRoles={["admin"]}>
          <HeldOrders />
        </ProtectedRoute>
      ),
    },

    {
      path: "/online-orders",
      element: (
        <ProtectedRoute allowedRoles={["admin"]}>
          <OnlineOrders />
        </ProtectedRoute>
      ),
    },
    {
      path: "/customers",
      element: (
        <ProtectedRoute allowedRoles={["admin"]}>
          <Customers />
        </ProtectedRoute>
      ),
    },

    // ── Customer-facing routes ──────────────────────────────
    { path: "/customer/login", element: <CustomerLogin /> },
    { path: "/customer/register", element: <CustomerRegister /> },
    { path: "/customer/forgot-password", element: <CustomerForgotPassword /> },
    { path: "/customer/reset-password", element: <CustomerResetPassword /> },

    {
      path: "/customer/menu",
      element: (
        <CustomerProtectedRoute>
          <CustomerMenu />
        </CustomerProtectedRoute>
      ),
    },
    {
      path: "/customer/cart",
      element: (
        <CustomerProtectedRoute>
          <CustomerCart />
        </CustomerProtectedRoute>
      ),
    },
    {
      path: "/customer/order-confirmation",
      element: (
        <CustomerProtectedRoute>
          <OrderConfirmation />
        </CustomerProtectedRoute>
      ),
    },
    {
      path: "/customer/orders",
      element: (
        <CustomerProtectedRoute>
          <CustomerOrders />
        </CustomerProtectedRoute>
      ),
    },
    {
      path: "/customer/profile",
      element: (
        <CustomerProtectedRoute>
          <CustomerProfile />
        </CustomerProtectedRoute>
      ),
    },
  ]);

  return routes;
};

export default AppRouter;
