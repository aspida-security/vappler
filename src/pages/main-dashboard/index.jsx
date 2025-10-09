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
  const { isAuthenticated } = useAuth();
  const { openNewScanModal } = useAppLayout();

  const [loading, setLoading] = useState(true);
  const [selectedWorkspace, setSelectedWorkspace] = useState(null);
  const [workspaces, setWorkspaces] = useState([]);
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
      if (!isAuthenticated) return;
      setLoading(true);
      setError(null);
      try {
        const { data: workspaceData, error: workspaceError } = await workspaceService.getWorkspaces();
        if (workspaceError) throw new Error(workspaceError);
        setWorkspaces(workspaceData || []);
        let workspaceToLoad = selectedWorkspace;
        if (!workspaceToLoad && workspaceData?.length > 0) {
          workspaceToLoad = workspaceData[0];
          setSelectedWorkspace(workspaceData[0]);
        }
        if (workspaceToLoad) {
          const workspaceId = workspaceToLoad.id;
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
  }, [isAuthenticated, selectedWorkspace]);

  const handleWorkspaceChange = (workspaceId) => {
    const workspace = workspaces.find(ws => ws.id === workspaceId);
    if (workspace) {
      setSelectedWorkspace(workspace);
    }
  };

  if (loading) {
      return <div>Loading Dashboard...</div>;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        {/* ... error UI ... */}
      </div>
    );
  }

  // --- VULCAN CHANGE: Simplified the return statement ---
  return (
    <div className="grid grid-cols-1 gap-6">
      <WorkspaceSelector
        workspaces={workspaces}
        selectedWorkspace={selectedWorkspace?.id}
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