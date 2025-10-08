// src/components/ProtectedRoute.jsx

import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = () => {
  const { isAuthenticated, loading } = useAuth();

  // While the AuthContext is loading and checking the session,
  // we don't want to render anything to avoid screen flicker.
  if (loading) {
    return null; 
  }

  // Once loading is false, we know the auth state.
  // If authenticated, render the nested child routes.
  // Otherwise, redirect to the login page.
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};

export default ProtectedRoute;