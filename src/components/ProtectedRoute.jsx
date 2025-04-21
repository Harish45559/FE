import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const user = JSON.parse(localStorage.getItem('user'));


    // If user is not logged in at all
    if (!user) {
      return <Navigate to="/login" replace />;
    }

  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/attendance" replace />;
  }

  return children;
};

export default ProtectedRoute;
