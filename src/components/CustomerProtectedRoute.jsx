import React from "react";
import { Navigate } from "react-router-dom";

const CustomerProtectedRoute = ({ children }) => {
  const token = localStorage.getItem("customer_token");
  if (!token) return <Navigate to="/customer/login" replace />;
  return children;
};

export default CustomerProtectedRoute;
