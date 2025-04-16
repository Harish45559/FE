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
import ForgotPassword from './pages/ForgotPassword'; // <-- add this with other imports


const AppRouter = () => {
  const routes = useRoutes([
    { path: '/', element: <Login /> },
    { path: '/forgot-password', element: <ForgotPassword /> },
    { path: '/dashboard', element: <Dashboard /> },
    { path: '/attendance', element: <Attendance /> },
    { path: '/employees', element: <Employees /> },
    { path: '/reports', element: <Reports /> },
    { path: '/previous-orders', element: <PreviousOrders /> },
    { path: '/held-orders', element: <HeldOrders /> },
    { path: '/master-data', element: <MasterData /> },
    { path: '/billing', element: <BillingCounter /> },
    { path: '/sales-report', element: <EndOfDaySales /> }

  ]);
  return routes;
};

export default AppRouter;
