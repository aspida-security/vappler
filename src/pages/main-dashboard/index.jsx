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
      if (!isAuthenticated || !selectedWorkspace) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const workspaceId = selectedWorkspace;
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
      } catch (err) {
        console.error('Dashboard loading error:', err.message);
        setError('Failed to load dashboard data. Please try refreshing the page.');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [isAuthenticated, selectedWorkspace]);

  if (error) {
    return (
      <div className="text-red-400">Error: {error}</div>
    );
  }

  if (!selectedWorkspace) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center mt-10">
            <Icon name="Inbox" size={48} className="text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground">No Workspace Selected</h3>
            <p className="text-muted-foreground">Please select or create a workspace to see the dashboard.</p>
        </div>
      );
  }

  if (loading) {
      return <div>Loading Dashboard...</div>;
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