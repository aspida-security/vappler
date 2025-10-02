import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedWorkspace, setSelectedWorkspace] = useState('acme-corp');
  const [refreshKey, setRefreshKey] = useState(0);

  // Mock data for workspaces
  const workspaces = [
    {
      id: 'acme-corp',
      name: 'Acme Corporation',
      assets: 245,
      lastScan: '2 hours ago',
      description: 'Primary enterprise client'
    },
    {
      id: 'tech-solutions',
      name: 'Tech Solutions Inc',
      assets: 89,
      lastScan: '1 day ago',
      description: 'Technology consulting firm'
    },
    {
      id: 'global-finance',
      name: 'Global Finance Ltd',
      assets: 156,
      lastScan: '3 hours ago',
      description: 'Financial services provider'
    }
  ];

  // Mock data for top vulnerabilities
  const topVulnerabilities = [
    {
      id: 'CVE-2024-0001',
      title: 'Critical Remote Code Execution in Apache HTTP Server',
      severity: 'Critical',
      cvssScore: 9.8,
      affectedHosts: 12,
      discoveredDate: 'Sep 28, 2025',
      description: `A critical vulnerability in Apache HTTP Server allows remote attackers to execute arbitrary code through malformed HTTP requests.\nThis affects versions 2.4.0 through 2.4.58 and requires immediate patching.`
    },
    {
      id: 'CVE-2024-0002',
      title: 'SQL Injection in Custom Web Application',
      severity: 'High',
      cvssScore: 8.5,
      affectedHosts: 8,
      discoveredDate: 'Sep 27, 2025',
      description: `Multiple SQL injection vulnerabilities found in the customer portal application.\nAttackers can extract sensitive database information and potentially gain administrative access.`
    },
    {
      id: 'CVE-2024-0003',
      title: 'Privilege Escalation in Windows Server',
      severity: 'High',
      cvssScore: 8.2,
      affectedHosts: 15,
      discoveredDate: 'Sep 26, 2025',
      description: `Local privilege escalation vulnerability in Windows Server 2019 and 2022.\nAllows authenticated users to gain SYSTEM-level privileges through registry manipulation.`
    },
    {
      id: 'CVE-2024-0004',
      title: 'Cross-Site Scripting in Web Portal',
      severity: 'Medium',
      cvssScore: 6.1,
      affectedHosts: 5,
      discoveredDate: 'Sep 25, 2025',
      description: `Stored XSS vulnerability in the employee portal allows attackers to inject malicious scripts.\nCould lead to session hijacking and data theft from authenticated users.`
    },
    {
      id: 'CVE-2024-0005',
      title: 'Weak SSL/TLS Configuration',
      severity: 'Medium',
      cvssScore: 5.9,
      affectedHosts: 22,
      discoveredDate: 'Sep 24, 2025',
      description: `Multiple servers are using outdated SSL/TLS protocols and weak cipher suites.\nThis could allow man-in-the-middle attacks and data interception.`
    }
  ];

  // Mock data for recent scans
  const recentScans = [
    {
      id: 'scan-001',
      name: 'Full Network Scan - Production',
      status: 'running',
      workspace: 'Acme Corp',
      targets: 245,
      startTime: '2 hours ago',
      progress: 67
    },
    {
      id: 'scan-002',
      name: 'Web Application Security Test',
      status: 'completed',
      workspace: 'Tech Solutions',
      targets: 12,
      duration: 45,
      startTime: '4 hours ago'
    },
    {
      id: 'scan-003',
      name: 'PCI Compliance Scan',
      status: 'completed',
      workspace: 'Global Finance',
      targets: 89,
      duration: 120,
      startTime: '1 day ago'
    },
    {
      id: 'scan-004',
      name: 'External Perimeter Scan',
      status: 'failed',
      workspace: 'Acme Corp',
      targets: 15,
      startTime: '2 days ago'
    },
    {
      id: 'scan-005',
      name: 'Internal Network Discovery',
      status: 'scheduled',
      workspace: 'Tech Solutions',
      targets: 156,
      startTime: 'Tomorrow 9:00 AM'
    }
  ];

  // Mock data for vulnerable hosts
  const vulnerableHosts = [
    {
      id: 'host-001',
      hostname: 'web-server-01.acme.local',
      ip: '192.168.1.100',
      os: 'Windows Server 2019',
      riskScore: 9.2,
      vulnerabilities: 15,
      openPorts: 8,
      lastScan: '2 hours ago'
    },
    {
      id: 'host-002',
      hostname: 'db-primary.acme.local',
      ip: '192.168.1.50',
      os: 'Ubuntu 20.04 LTS',
      riskScore: 8.7,
      vulnerabilities: 12,
      openPorts: 5,
      lastScan: '2 hours ago'
    },
    {
      id: 'host-003',
      hostname: 'mail-server.acme.local',
      ip: '192.168.1.25',
      os: 'CentOS 8',
      riskScore: 8.1,
      vulnerabilities: 9,
      openPorts: 12,
      lastScan: '3 hours ago'
    },
    {
      id: 'host-004',
      ip: '192.168.1.200',
      os: 'Windows 10 Pro',
      riskScore: 7.5,
      vulnerabilities: 8,
      openPorts: 6,
      lastScan: '1 day ago'
    },
    {
      id: 'host-005',
      hostname: 'backup-server.acme.local',
      ip: '192.168.1.75',
      os: 'Windows Server 2016',
      riskScore: 7.2,
      vulnerabilities: 11,
      openPorts: 4,
      lastScan: '1 day ago'
    }
  ];

  // Mock data for risk trend
  const riskTrendData = [
    { date: 'Sep 15', riskScore: 6.2, vulnerabilities: 89 },
    { date: 'Sep 18', riskScore: 7.1, vulnerabilities: 102 },
    { date: 'Sep 21', riskScore: 6.8, vulnerabilities: 95 },
    { date: 'Sep 24', riskScore: 8.2, vulnerabilities: 134 },
    { date: 'Sep 27', riskScore: 7.9, vulnerabilities: 128 },
    { date: 'Sep 29', riskScore: 8.5, vulnerabilities: 156 }
  ];

  // Mock workspace stats
  const workspaceStats = {
    totalAssets: 245,
    criticalVulns: 23,
    activeScans: 2,
    riskScore: 8.5
  };

  // Auto-refresh dashboard data
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshKey(prev => prev + 1);
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const handleSidebarToggle = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleSidebarClose = () => {
    setIsSidebarOpen(false);
  };

  const handleWorkspaceChange = (workspaceId) => {
    setSelectedWorkspace(workspaceId);
    // In a real app, this would trigger data refresh for the new workspace
    console.log('Switching to workspace:', workspaceId);
  };

  const handleViewDetails = (type, id = null) => {
    switch (type) {
      case 'vulnerabilities': navigate('/vulnerability-management');
        break;
      case 'vulnerability':
        navigate(`/vulnerability-management?id=${id}`);
        break;
      case 'scans': navigate('/scan-management');
        break;
      case 'scan':
        navigate(`/scan-management?id=${id}`);
        break;
      case 'assets': navigate('/asset-management');
        break;
      case 'host':
        navigate(`/asset-management?id=${id}`);
        break;
      case 'trends': navigate('/reports?type=trends');
        break;
      default:
        console.log('View details:', type, id);
    }
  };

  const handleNewScan = () => {
    navigate('/scan-wizard');
  };

  const handleGenerateReport = () => {
    navigate('/reports/generate');
  };

  const handleViewReports = () => {
    navigate('/reports');
  };

  return (
    <div className="min-h-screen bg-background">
      <Header onMenuToggle={handleSidebarToggle} isMenuOpen={isSidebarOpen} />
      <Sidebar isOpen={isSidebarOpen} onClose={handleSidebarClose} />
      <main className="lg:ml-80 pt-16">
        <div className="p-6 space-y-6">
          {/* Page Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Security Dashboard</h1>
              <p className="text-muted-foreground mt-1">
                Comprehensive vulnerability management and security monitoring
              </p>
            </div>
            <div className="text-sm text-muted-foreground">
              Last updated: {new Date()?.toLocaleTimeString()}
            </div>
          </div>

          {/* Workspace Selector */}
          <WorkspaceSelector
            workspaces={workspaces}
            selectedWorkspace={selectedWorkspace}
            onWorkspaceChange={handleWorkspaceChange}
            stats={workspaceStats}
          />

          {/* Quick Actions */}
          <QuickActions
            onNewScan={handleNewScan}
            onGenerateReport={handleGenerateReport}
            onViewReports={handleViewReports}
          />

          {/* Main Dashboard Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Top Vulnerabilities */}
            <TopVulnerabilitiesCard
              vulnerabilities={topVulnerabilities}
              onViewDetails={handleViewDetails}
            />

            {/* Recent Scan Activity */}
            <RecentScanActivity
              scans={recentScans}
              onViewDetails={handleViewDetails}
            />

            {/* Most Vulnerable Hosts */}
            <VulnerableHostsCard
              hosts={vulnerableHosts}
              onViewDetails={handleViewDetails}
            />

            {/* Risk Trend Chart */}
            <RiskTrendChart
              data={riskTrendData}
              onViewDetails={handleViewDetails}
            />
          </div>

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