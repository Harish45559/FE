import React from 'react';
import { useRoutes } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Attendance from './pages/Attendance';
import Employees from './pages/Employees';
import Reports from './pages/Reports';
import PreviousOrders from './pages/PreviousOrders';
import HeldOrders from './pages/HeldOrders';
import MasterData from './pages/MasterData';
import BillingCounter from './pages/BillingCounter';
import EndOfDaySales from './pages/EndOfDaySales';
import ForgotPassword from './pages/ForgotPassword';
import ProtectedRoute from './components/ProtectedRoute';

const AppRouter = () => {
  const routes = useRoutes([
    { path: '/', element: <Login /> },
    { path: '/forgot-password', element: <ForgotPassword /> },

    // 🔐 Admin-only routes
    {
      path: '/dashboard',
      element: (
        <ProtectedRoute allowedRoles={['admin']}>
          <Dashboard />
        </ProtectedRoute>
      )
    },
    {
      path: '/employees',
      element: (
        <ProtectedRoute allowedRoles={['admin']}>
          <Employees />
        </ProtectedRoute>
      )
    },
    {
      path: '/reports',
      element: (
        <ProtectedRoute allowedRoles={['admin']}>
          <Reports />
        </ProtectedRoute>
      )
    },
    {
      path: '/master-data',
      element: (
        <ProtectedRoute allowedRoles={['admin']}>
          <MasterData />
        </ProtectedRoute>
      )
    },
    {
      path: '/sales-report',
      element: (
        <ProtectedRoute allowedRoles={['admin']}>
          <EndOfDaySales />
        </ProtectedRoute>
      )
    },

    // ✅ Shared routes
    { path: '/attendance', element: <Attendance /> },
    { path: '/billing', element: <BillingCounter /> },
    { path: '/previous-orders', element: <PreviousOrders /> },
    { path: '/held-orders', element: <HeldOrders /> },
  ]);

  return routes;
};

export default AppRouter;
