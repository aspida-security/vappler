// src/Routes.jsx

import React from "react";
import { BrowserRouter, Routes as RouterRoutes, Route } from "react-router-dom";
import ScrollToTop from "./components/ScrollToTop";
import ErrorBoundary from "./components/ErrorBoundary";
import NotFound from "./pages/NotFound";

// --- VULCAN CHANGE 1: Import our new components ---
import ProtectedRoute from "./components/ProtectedRoute";
import AppLayout from "./layouts/AppLayout"; 

// --- VULCAN CHANGE 2: Import all pages ---
import Login from './pages/login';
import Register from './pages/register';
import VerifyEmail from './pages/register/verify-email';
import ResetPassword from './pages/reset-password';
import MainDashboard from './pages/main-dashboard';
import ClientWorkspaceManager from './pages/client-workspace-manager';
import AssetManagement from './pages/asset-management';
import VulnerabilityManagement from './pages/vulnerability-management';

const Routes = () => {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <ScrollToTop />
        <RouterRoutes>
          {/* === Public Routes === */}
          {/* These routes are accessible without logging in */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/register/verify-email" element={<VerifyEmail />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* === Protected Routes === */}
          {/* All routes inside here will require authentication */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}> {/* The AppLayout provides the sidebar/header */}
              <Route path="/" element={<MainDashboard />} />
              <Route path="/main-dashboard" element={<MainDashboard />} />
              <Route path="/client-workspace-manager" element={<ClientWorkspaceManager />} />
              <Route path="/asset-management" element={<AssetManagement />} />
              <Route path="/vulnerability-management" element={<VulnerabilityManagement />} />
            </Route>
          </Route>

          {/* This is the catch-all for any routes that don't match */}
          <Route path="*" element={<NotFound />} />
        </RouterRoutes>
      </ErrorBoundary>
    </BrowserRouter>
  );
};

export default Routes;
