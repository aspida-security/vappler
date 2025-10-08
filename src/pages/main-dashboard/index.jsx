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
  const [error, setError] = useState(null);

  // Mock data remains for now, can be replaced with a service call later
  const riskTrendData = [
    { date: 'Sep 15', riskScore: 6.2, vulnerabilities: 89 },
    // ... other data points
  ];

  // Refactored data loading logic into a single, stable useEffect hook
useEffect(() => {
    const loadData = async () => {
      if (!isAuthenticated) {
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const { data: workspaceData, error: workspaceError } = await workspaceService.getWorkspaces();

        if (workspaceError) {
          console.error('[MainDashboard] useEffect: Workspace error received from service.');
          throw new Error(workspaceError);
        }

        setWorkspaces(workspaceData || []);

        // Determine the workspace to load details for
        let workspaceToLoad = selectedWorkspace;
        if (!workspaceToLoad && workspaceData?.length > 0) {
          workspaceToLoad = workspaceData[0];
          setSelectedWorkspace(workspaceData[0]); // Set the first one as active
        }

        // Step 2: If a workspace is selected, fetch all its detailed data
        if (workspaceToLoad) {
          const workspaceId = workspaceToLoad.id;
          
          // Use Promise.all to fetch details concurrently for better performance
          const [
            { data: stats },
            { data: vulnData },
            { data: hostsData },
            { data: scansData }
          ] = await Promise.all([
            workspaceService.getWorkspaceStats(workspaceId),
            vulnerabilityService.getTopVulnerabilities(workspaceId, 5),
            assetService.getVulnerableHosts(workspaceId, 5),
            scanService.getRecentScans(workspaceId, 5)
          ]);
          
          setWorkspaceStats(stats || {});
          setTopVulnerabilities(vulnData || []);
          setVulnerableHosts(hostsData || []);
          setRecentScans(scansData || []);
        }
      } catch (err) {
        console.error('Dashboard loading error:', err.message);
        setError('Failed to load dashboard data. Please try refreshing the page.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [isAuthenticated, selectedWorkspace]); // This dependency array stays the same

  // --- Handlers remain the same ---
  const handleWorkspaceChange = (workspaceId) => {
    const workspace = workspaces.find(ws => ws.id === workspaceId);
    if (workspace) {
      setSelectedWorkspace(workspace);
    }
  };

  const handleNewScan = () => navigate('/scan-wizard');
  // ... other handlers

  if (error) {
    // This is the error screen shown if data loading fails
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-4 text-lg font-semibold">Dashboard Error</p>
          <p className="text-muted-foreground mb-6">{error}</p>
          <button onClick={() => window.location.reload()} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // --- JSX remains largely the same ---
    return (
    <div className="min-h-screen bg-background">
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)}
        workspaces={workspaces}
        selectedWorkspace={selectedWorkspace?.id}
        onWorkspaceChange={handleWorkspaceChange}
      />
      <div className="lg:pl-80">
        <Header onMenuToggle={() => setIsSidebarOpen(!isSidebarOpen)} isMenuOpen={isSidebarOpen} />
        <main className="p-6">
          <div className="grid grid-cols-1 gap-6">
            <WorkspaceSelector
              workspaces={workspaces}
              selectedWorkspace={selectedWorkspace?.id}
              onWorkspaceChange={handleWorkspaceChange}
              stats={workspaceStats}
            />
            <QuickActions
              onNewScan={handleNewScan}
              onGenerateReport={() => console.log('Generate Report clicked')}
              onViewReports={() => console.log('View Reports clicked')}
            />
            <RiskTrendChart 
              data={riskTrendData} 
              onViewDetails={() => console.log('View Details clicked')} 
            />

            {/* --- ADD THE FINAL THREE COMPONENTS --- */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <TopVulnerabilitiesCard 
                    vulnerabilities={topVulnerabilities}
                    onViewDetails={() => console.log('View Details clicked')}
                />
                <VulnerableHostsCard 
                    hosts={vulnerableHosts}
                    onViewDetails={() => console.log('View Details clicked')}
                />
            </div>
            <RecentScanActivity 
                scans={recentScans}
                onViewDetails={() => console.log('View Details clicked')}
            />

          </div>
        </main>
      </div>
    </div>
  );
};

export default MainDashboard;