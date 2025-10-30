import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = () => {
  const { user, loading } = useAuth();

  // CRITICAL FIX: Use the actual loading state from AuthContext.
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  // FIX: Redirect to /login on sign out or if no user.
  if (!user) {
    console.log('[ProtectedRoute] No user, redirecting to /login');
    return <Navigate to="/login" replace />; 
  }

  console.log('[ProtectedRoute] User authenticated, rendering children');
  
  // NOTE: We rely on AppLayout to handle the subsequent workspace loading state.
  return <Outlet />;
};

export default ProtectedRoute;