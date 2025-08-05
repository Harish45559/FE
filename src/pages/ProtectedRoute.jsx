import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const user = JSON.parse(localStorage.getItem('user'));

  // If not logged in, or the role is not allowed, redirect to root
  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  // Otherwise, render the children (i.e., the routed component)
  return children;
};

export default ProtectedRoute;
