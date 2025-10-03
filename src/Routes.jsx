import React from "react";
import { BrowserRouter, Routes as RouterRoutes, Route } from "react-router-dom";
import ScrollToTop from "components/ScrollToTop";
import ErrorBoundary from "components/ErrorBoundary";
import NotFound from "pages/NotFound";
import ClientWorkspaceManager from './pages/client-workspace-manager';
import MainDashboard from './pages/main-dashboard';
import Login from './pages/login';
import AssetManagement from './pages/asset-management';
import VulnerabilityManagement from './pages/vulnerability-management';
import Register from './pages/register';

const Routes = () => {
  return (
    <BrowserRouter>
      <ErrorBoundary>
      <ScrollToTop />
      <RouterRoutes>
        {/* Define your route here */}
        <Route path="/" element={<MainDashboard />} />
        <Route path="/client-workspace-manager" element={<ClientWorkspaceManager />} />
        <Route path="/main-dashboard" element={<MainDashboard />} />
        <Route path="/login" element={<Login />} />
        <Route path="/asset-management" element={<AssetManagement />} />
        <Route path="/vulnerability-management" element={<VulnerabilityManagement />} />
        <Route path="/register" element={<Register />} />
        <Route path="*" element={<NotFound />} />
      </RouterRoutes>
      </ErrorBoundary>
    </BrowserRouter>
  );
};

export default Routes;
