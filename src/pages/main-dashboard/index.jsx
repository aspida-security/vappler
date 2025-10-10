import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { workspaceService } from '../../services/workspaceService';
import { vulnerabilityService } from '../../services/vulnerabilityService';
import { assetService } from '../../services/assetService';
import { scanService } from '../../services/scanService';
import { useAppLayout } from '../../layouts/AppLayout';
import TopVulnerabilitiesCard from './components/TopVulnerabilitiesCard';
import RecentScanActivity from './components/RecentScanActivity';
import VulnerableHostsCard from './components/VulnerableHostsCard';
import RiskTrendChart from './components/RiskTrendChart';
import WorkspaceSelector from './components/WorkspaceSelector';
import QuickActions from './components/QuickActions';

const MainDashboard = () => {
  const { openNewScanModal, selectedWorkspace } = useAppLayout(); // Get selectedWorkspace from context
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
      stats: {},
      topVulnerabilities: [],
      vulnerableHosts: [],
      recentScans: []
  });
  const [error, setError] = useState(null);

  const riskTrendData = [
    { date: 'Sep 15', riskScore: 6.2, vulnerabilities: 89 },
  ];

  useEffect(() => {
    // Guard clause: Don't fetch data until we have a workspace ID
    if (!selectedWorkspace) {
        setLoading(false);
        return;
    }

    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [
          statsRes,
          vulnRes,
          hostsRes,
          scansRes
        ] = await Promise.all([
          workspaceService.getWorkspaceStats(selectedWorkspace),
          vulnerabilityService.getTopVulnerabilities(selectedWorkspace, 5),
          assetService.getVulnerableHosts(selectedWorkspace, 5),
          scanService.getRecentScans(selectedWorkspace, 5)
        ]);
        
        // Check for errors in any of the promises
        if (statsRes.error) throw new Error(`Stats Error: ${statsRes.error}`);
        if (vulnRes.error) throw new Error(`Vuln Error: ${vulnRes.error}`);
        if (hostsRes.error) throw new Error(`Hosts Error: ${hostsRes.error}`);
        if (scansRes.error) throw new Error(`Scans Error: ${scansRes.error}`);

        setDashboardData({
            stats: statsRes.data || {},
            topVulnerabilities: vulnRes.data || [],
            vulnerableHosts: hostsRes.data || [],
            recentScans: scansRes.data || []
        });

      } catch (err) {
        console.error('Dashboard loading error:', err.message);
        setError('Failed to load dashboard data. Please try refreshing the page.');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [selectedWorkspace]); // Rerun this effect when the workspace changes

  // We need to get the full workspaces list for the selector dropdown
  // This is a separate concern from the dashboard data itself
  const [workspaces, setWorkspaces] = useState([]);
  useEffect(() => {
      workspaceService.getWorkspaces().then(({ data }) => {
          if (data) setWorkspaces(data);
      })
  }, []);
  
  const handleWorkspaceChange = (workspaceId) => {
    // This is handled by the AppLayout now, but we'll leave it in case of direct calls
    // In a future refactor, this might come from a dedicated context provider
    window.location.reload(); // Simple way to force a full refresh on change
  };

  if (loading) {
      return <div>Loading Dashboard...</div>;
  }

  if (error) {
    return (
      <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-center">
        <p className="text-red-400 font-semibold">{error}</p>
      </div>
    );
  }

  // Handle the case where no workspace is selected yet or none exist
  if (!selectedWorkspace) {
      return (
        <div className="text-center p-10 bg-card rounded-lg border border-border">
            <h3 className="text-lg font-semibold">No Workspace Selected</h3>
            <p className="text-muted-foreground mt-2">Please select or create a workspace to see the dashboard.</p>
        </div>
      )
  }

  return (
    <div className="grid grid-cols-1 gap-6">
      <WorkspaceSelector
        workspaces={workspaces}
        selectedWorkspace={selectedWorkspace}
        onWorkspaceChange={handleWorkspaceChange}
        stats={dashboardData.stats}
      />
      <QuickActions
        onNewScan={openNewScanModal} 
        onGenerateReport={() => console.log('Generate Report clicked')}
        onViewReports={() => console.log('View Reports clicked')}
      />
      <RiskTrendChart 
        data={riskTrendData} 
        onViewDetails={() => console.log('View Details clicked')} 
      />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TopVulnerabilitiesCard 
              vulnerabilities={dashboardData.topVulnerabilities}
              onViewDetails={() => console.log('View Details clicked')}
          />
          <VulnerableHostsCard 
              hosts={dashboardData.vulnerableHosts}
              onViewDetails={() => console.log('View Details clicked')}
          />
      </div>
      <RecentScanActivity 
          scans={dashboardData.recentScans}
          onViewDetails={() => console.log('View Details clicked')}
      />
    </div>
  );
};

export default MainDashboard;