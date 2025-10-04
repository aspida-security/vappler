import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { workspaceService } from '../../services/workspaceService';
import { vulnerabilityService } from '../../services/vulnerabilityService';
import { assetService } from '../../services/assetService';
import { scanService } from '../../services/scanService';
import Header from '../../components/ui/Header';
import Sidebar from '../../components/ui/Sidebar';
import TopVulnerabilitiesCard from './components/TopVulnerabilitiesCard';
import RecentScanActivity from './components/RecentScanActivity';
import VulnerableHostsCard from './components/VulnerableHostsCard';
import RiskTrendChart from './components/RiskTrendChart';
import WorkspaceSelector from './components/WorkspaceSelector';
import QuickActions from './components/QuickActions';

const MainDashboard = () => {
  const navigate = useNavigate();
  const { user, userProfile, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedWorkspace, setSelectedWorkspace] = useState(null);
  const [workspaces, setWorkspaces] = useState([]);
  const [topVulnerabilities, setTopVulnerabilities] = useState([]);
  const [recentScans, setRecentScans] = useState([]);
  const [vulnerableHosts, setVulnerableHosts] = useState([]);
  const [workspaceStats, setWorkspaceStats] = useState({});
  const [refreshKey, setRefreshKey] = useState(0);
  const [error, setError] = useState(null);

  // Mock risk trend data
  const riskTrendData = [
    { date: 'Sep 15', riskScore: 6.2, vulnerabilities: 89 },
    { date: 'Sep 18', riskScore: 7.1, vulnerabilities: 102 },
    { date: 'Sep 21', riskScore: 6.8, vulnerabilities: 95 },
    { date: 'Sep 24', riskScore: 8.2, vulnerabilities: 134 },
    { date: 'Sep 27', riskScore: 7.9, vulnerabilities: 128 },
    { date: 'Sep 29', riskScore: 8.5, vulnerabilities: 156 }
  ];

  const loadWorkspaceData = useCallback(async (workspaceId) => {
    try {
      // Load workspace statistics
      const { data: stats, error: statsError } = await workspaceService?.getWorkspaceStats(workspaceId);
      if (statsError) throw new Error(statsError);
      setWorkspaceStats(stats || {});

      // Load top vulnerabilities
      const { data: vulnData, error: vulnError } = await vulnerabilityService?.getTopVulnerabilities(workspaceId, 5);
      if (vulnError) throw new Error(vulnError);
      setTopVulnerabilities(vulnData || []);

      // Load vulnerable hosts
      const { data: hostsData, error: hostsError } = await assetService?.getVulnerableHosts(workspaceId, 5);
      if (hostsError) throw new Error(hostsError);
      setVulnerableHosts(hostsData || []);

      // Load recent scans
      const { data: scansData, error: scansError } = await scanService?.getRecentScans(workspaceId, 5);
      if (scansError) throw new Error(scansError);
      setRecentScans(scansData || []);

    } catch (error) {
      console.log('Workspace data loading error:', error?.message);
      setError('Failed to load workspace data.');
    }
  }, []); // Empty dependency array is OK here as service imports are static

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Load workspaces
      const { data: workspaceData, error: workspaceError } = await workspaceService?.getWorkspaces();
      if (workspaceError) throw new Error(workspaceError);
      setWorkspaces(workspaceData || []);
      
      // Select first workspace if none selected
      if (workspaceData?.length > 0 && !selectedWorkspace) {
        setSelectedWorkspace(workspaceData?.[0]?.id);
        await loadWorkspaceData(workspaceData?.[0]?.id);
      } else if (selectedWorkspace) {
        await loadWorkspaceData(selectedWorkspace);
      }
    } catch (error) {
      console.log('Dashboard loading error:', error?.message);
      setError('Failed to load dashboard data. Please try refreshing the page.');
    } finally {
      setLoading(false);
    }
  }, [selectedWorkspace, loadWorkspaceData]);

  // Load initial data
  useEffect(() => {
    if (isAuthenticated) {
      loadDashboardData();
    }
  }, [isAuthenticated, refreshKey, loadDashboardData]);

  // Auto-refresh dashboard data
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshKey(prev => prev + 1);
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, []);
  
  const handleSidebarToggle = () => setIsSidebarOpen(!isSidebarOpen);
  const handleSidebarClose = () => setIsSidebarOpen(false);

  const handleWorkspaceChange = async (workspaceId) => {
    setSelectedWorkspace(workspaceId);
    await loadWorkspaceData(workspaceId);
  };

  const handleViewDetails = (type, id = null) => {
    switch (type) {
      case 'vulnerabilities': navigate('/vulnerability-management'); break;
      case 'vulnerability': navigate(`/vulnerability-management?id=${id}`); break;
      case 'scans': navigate('/scan-management'); break;
      case 'scan': navigate(`/scan-management?id=${id}`); break;
      case 'assets': navigate('/asset-management'); break;
      case 'host': navigate(`/asset-management?id=${id}`); break;
      case 'trends': navigate('/reports?type=trends'); break;
      default: console.log('View details:', type, id);
    }
  };

  const handleNewScan = () => navigate('/scan-wizard');
  const handleGenerateReport = () => navigate('/reports/generate');
  const handleViewReports = () => navigate('/reports');

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-destructive mb-4">
            <svg className="w-12 h-12 mx-auto" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-2">Dashboard Error</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <button 
            onClick={loadDashboardData}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header onMenuToggle={handleSidebarToggle} isMenuOpen={isSidebarOpen} />
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={handleSidebarClose}
        workspaces={workspaces}
        selectedWorkspace={selectedWorkspace}
        onWorkspaceChange={handleWorkspaceChange}
      />
      <main className="lg:ml-80 pt-16">
        <div className="p-6 space-y-6">
          {/* Page Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Security Dashboard</h1>
              <p className="text-muted-foreground mt-1">
                Welcome back, {userProfile?.full_name || user?.email}. Comprehensive vulnerability management and security monitoring.
              </p>
            </div>
            <div className="text-sm text-muted-foreground">
              Last updated: {new Date()?.toLocaleTimeString()}
            </div>
          </div>

          {/* Workspace Selector */}
          {workspaces?.length > 0 && (
            <WorkspaceSelector
              workspaces={workspaces}
              selectedWorkspace={selectedWorkspace}
              onWorkspaceChange={handleWorkspaceChange}
              stats={workspaceStats}
            />
          )}

          {/* Quick Actions */}
          <QuickActions
            onNewScan={handleNewScan}
            onGenerateReport={handleGenerateReport}
            onViewReports={handleViewReports}
          />

          {/* Main Dashboard Grid */}
          {selectedWorkspace ? (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <TopVulnerabilitiesCard
                vulnerabilities={topVulnerabilities}
                onViewDetails={handleViewDetails}
                loading={loading}
              />
              <RecentScanActivity
                scans={recentScans}
                onViewDetails={handleViewDetails}
                loading={loading}
              />
              <VulnerableHostsCard
                hosts={vulnerableHosts}
                onViewDetails={handleViewDetails}
                loading={loading}
              />
              <RiskTrendChart
                data={riskTrendData}
                onViewDetails={handleViewDetails}
              />
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-muted-foreground mb-4">
                <svg className="w-12 h-12 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 01-1.447.894L10 15.118l-4.553 1.776A1 1 0 014 16V4zm2 3a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">No Workspaces Available</h3>
              <p className="text-muted-foreground">Create a workspace to start managing vulnerabilities and assets.</p>
            </div>
          )}

          {/* Footer */}
          <div className="text-center py-8 border-t border-border">
            <p className="text-sm text-muted-foreground">
              © {new Date()?.getFullYear()} Vulcan Scan. All rights reserved.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default MainDashboard;