// src/components/ProtectedRoute.jsx

import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = () => {
  const { user, loading } = useAuth();

  // 1. Handle Loading State
  if (loading) {
    return null;
  }

  // 2. Handle Unauthenticated State
  if (!user) {
    console.log('[ProtectedRoute] No user, redirecting to /login');
    return <Navigate to="/login" replace />;
  }

  // 3. Handle Unverified Email State
  // ✅ NEW: Redirect to verification page instead of showing inline screen
  if (!user.email_confirmed_at) {
    console.log('[ProtectedRoute] Email not confirmed, redirecting to verification page');
    return <Navigate to="/register/verify-email" replace state={{ email: user.email }} />;
  }

  // 4. User is authenticated AND verified → Allow access
  console.log('[ProtectedRoute] ✅ User verified, allowing access');
  return <Outlet />;
};

export default ProtectedRoute;
