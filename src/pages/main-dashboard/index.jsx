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
// THIS IS THE FIX: Import the Icon component
import Icon from '../../components/AppIcon';

const MainDashboard = () => {
  const { isAuthenticated } = useAuth();
  const { openNewScanModal, workspaces, selectedWorkspace, handleWorkspaceChange } = useAppLayout();

  const [loading, setLoading] = useState(true);
  const [topVulnerabilities, setTopVulnerabilities] = useState([]);
  const [recentScans, setRecentScans] = useState([]);
  const [vulnerableHosts, setVulnerableHosts] = useState([]);
  const [workspaceStats, setWorkspaceStats] = useState({});
  const [error, setError] = useState(null);

  const riskTrendData = [
    { date: 'Sep 15', riskScore: 6.2, vulnerabilities: 89 },
  ];

  useEffect(() => {
    const loadData = async () => {
      // NOTE: This check handles the new flow: if selectedWorkspace is null/empty, we stop loading data.
      if (!isAuthenticated || !selectedWorkspace) {
        setLoading(false);
        // CRITICAL FIX: Ensure error is cleared if selectedWorkspace is null
        setError(null); 
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const workspaceId = selectedWorkspace;
        const [
          { data: stats, error: statsError },
          { data: vulnData, error: vulnError },
          { data: hostsData, error: hostsError },
          { data: scansData, error: scansError }
        ] = await Promise.all([
          workspaceService.getWorkspaceStats(workspaceId),
          vulnerabilityService.getTopVulnerabilities(workspaceId, 5),
          assetService.getVulnerableHosts(workspaceId, 5),
          scanService.getRecentScans(workspaceId, 5)
        ]);

        if (statsError || vulnError || hostsError || scansError) {
          throw new Error(statsError || vulnError || hostsError || scansError);
        }

        setWorkspaceStats(stats || {});
        setTopVulnerabilities(vulnData || []);
        setVulnerableHosts(hostsData || []);
        setRecentScans(scansData || []);
      } catch (err) {
        console.error('Dashboard loading error:', err.message);
        setError('Failed to load dashboard data: ' + err.message);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [isAuthenticated, selectedWorkspace]);


  // CRITICAL FIX: This handles the error state correctly and returns content.
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center mt-10 p-6 bg-red-500/10 border border-red-500/20 rounded-lg">
          <Icon name="AlertTriangle" size={48} className="text-red-500 mb-4" />
          <h3 className="text-lg font-medium text-red-400">Dashboard Load Error</h3>
          <p className="text-red-300 mt-2">{error}</p>
          <p className="text-red-300 text-sm mt-4">Please ensure your database is running and RLS policies are correct, then try reloading.</p>
      </div>
    );
  }

  // This handles the state where the user is authenticated but the DB trigger hasn't run yet
  // or the fetch returned 0 workspaces.
  if (!selectedWorkspace) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center mt-10 p-6 bg-card border border-border rounded-lg">
            <Icon name="Inbox" size={48} className="text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground">No Workspace Selected</h3>
            <p className="text-muted-foreground">Please select or create a workspace to see the dashboard.</p>
            <p className="text-muted-foreground text-sm mt-2">
                If this is your first login, ensure you have clicked the email verification link to automatically provision your workspace.
            </p>
        </div>
      );
  }

  if (loading) {
      return <div className="text-center p-10"><Icon name="Loader" size={24} className="animate-spin text-primary mx-auto" /> Loading Dashboard...</div>;
  }

  return (
    <div className="grid grid-cols-1 gap-6">
      <WorkspaceSelector
        workspaces={workspaces}
        selectedWorkspace={selectedWorkspace}
        onWorkspaceChange={handleWorkspaceChange}
        stats={workspaceStats}
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
  );
};

export default MainDashboard;