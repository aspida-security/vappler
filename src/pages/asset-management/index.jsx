import React, { useState, useEffect } from 'react';
import Header from '../../components/ui/Header';
import Sidebar from '../../components/ui/Sidebar';
import AssetTable from './components/AssetTable';
import AssetStats from './components/AssetStats';
import AssetDiscovery from './components/AssetDiscovery';
import SubnetMap from './components/SubnetMap';
import AssetGroups from './components/AssetGroups';
import Button from '../../components/ui/Button';
import Icon from '../../components/AppIcon';

const AssetManagement = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedAssets, setSelectedAssets] = useState([]);
  const [activeTab, setActiveTab] = useState('assets');
  const [discoveryStatus, setDiscoveryStatus] = useState({ isRunning: false, progress: 0 });

  // Mock data for assets
  const [assets] = useState([
    {
      id: 1,
      hostname: 'web-server-01',
      ipAddress: '192.168.1.10',
      operatingSystem: 'Ubuntu 20.04',
      services: ['HTTP', 'HTTPS', 'SSH'],
      vulnerabilityCount: 3,
      highestSeverity: 'High',
      lastScan: '2024-01-28T10:30:00Z',
      status: 'online'
    },
    {
      id: 2,
      hostname: 'db-server-01',
      ipAddress: '192.168.1.20',
      operatingSystem: 'Windows Server 2019',
      services: ['MySQL', 'RDP', 'SMB'],
      vulnerabilityCount: 7,
      highestSeverity: 'Critical',
      lastScan: '2024-01-28T09:15:00Z',
      status: 'online'
    },
    {
      id: 3,
      hostname: 'mail-server',
      ipAddress: '192.168.1.30',
      operatingSystem: 'CentOS 8',
      services: ['SMTP', 'IMAP', 'POP3', 'SSH'],
      vulnerabilityCount: 2,
      highestSeverity: 'Medium',
      lastScan: '2024-01-27T16:45:00Z',
      status: 'online'
    },
    {
      id: 4,
      hostname: 'backup-server',
      ipAddress: '192.168.1.40',
      operatingSystem: 'Ubuntu 18.04',
      services: ['SSH', 'FTP'],
      vulnerabilityCount: 12,
      highestSeverity: 'Critical',
      lastScan: '2024-01-26T14:20:00Z',
      status: 'offline'
    },
    {
      id: 5,
      hostname: 'workstation-01',
      ipAddress: '192.168.1.100',
      operatingSystem: 'Windows 10',
      services: ['RDP', 'SMB'],
      vulnerabilityCount: 1,
      highestSeverity: 'Low',
      lastScan: '2024-01-28T11:00:00Z',
      status: 'scanning'
    }
  ]);

  // Mock statistics
  const [stats] = useState({
    totalAssets: 156,
    assetChange: 8,
    onlineAssets: 142,
    onlineChange: 3,
    criticalVulns: 23,
    criticalChange: -2,
    scanCoverage: 87,
    coverageChange: 5
  });

  // Mock subnets data
  const [subnets] = useState([
    {
      id: 1,
      name: 'DMZ Network',
      range: '192.168.1.0/24',
      totalAssets: 45,
      activeAssets: 42,
      vulnerabilities: 18,
      coverage: 93,
      health: 'warning',
      lastScan: '2024-01-28T10:00:00Z'
    },
    {
      id: 2,
      name: 'Internal LAN',
      range: '10.0.0.0/16',
      totalAssets: 89,
      activeAssets: 85,
      vulnerabilities: 34,
      coverage: 95,
      health: 'healthy',
      lastScan: '2024-01-28T08:30:00Z'
    },
    {
      id: 3,
      name: 'Guest Network',
      range: '172.16.0.0/24',
      totalAssets: 22,
      activeAssets: 15,
      vulnerabilities: 8,
      coverage: 68,
      health: 'critical',
      lastScan: '2024-01-27T15:45:00Z'
    }
  ]);

  // Mock asset groups
  const [assetGroups, setAssetGroups] = useState([
    {
      id: 1,
      name: 'Web Servers',
      description: 'Frontend and backend web servers',
      assetCount: 12,
      color: 'bg-blue-500',
      createdAt: '2024-01-15T10:00:00Z',
      stats: { online: 11, critical: 2, high: 5, lastScan: '2024-01-28T10:00:00Z' }
    },
    {
      id: 2,
      name: 'Database Servers',
      description: 'MySQL, PostgreSQL, and MongoDB instances',
      assetCount: 8,
      color: 'bg-green-500',
      createdAt: '2024-01-20T14:30:00Z',
      stats: { online: 7, critical: 1, high: 3, lastScan: '2024-01-28T09:15:00Z' }
    },
    {
      id: 3,
      name: 'Workstations',
      description: 'Employee desktop and laptop computers',
      assetCount: 45,
      color: 'bg-purple-500',
      createdAt: '2024-01-10T09:00:00Z',
      stats: { online: 38, critical: 0, high: 8, lastScan: '2024-01-27T16:00:00Z' }
    }
  ]);

  const tabs = [
    { id: 'assets', label: 'Assets', icon: 'Server', count: assets?.length },
    { id: 'discovery', label: 'Discovery', icon: 'Search' },
    { id: 'subnets', label: 'Network Map', icon: 'Network' },
    { id: 'groups', label: 'Groups', icon: 'Layers', count: assetGroups?.length }
  ];

  const handleSidebarToggle = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleAssetSelect = (assetIds) => {
    setSelectedAssets(assetIds);
  };

  const handleBulkAction = (action, assetIds = selectedAssets) => {
    console.log(`Performing ${action} on assets:`, assetIds);
    
    switch (action) {
      case 'scan':
        // Start scan for selected assets
        break;
      case 'export':
        // Export asset data
        break;
      case 'tag':
        // Add tags to assets
        break;
      case 'details':
        // Show asset details
        break;
      default:
        break;
    }
  };

  const handleDiscoveryStart = (config) => {
    console.log('Starting discovery with config:', config);
    setDiscoveryStatus({ isRunning: true, progress: 0 });
    
    // Simulate discovery progress
    const interval = setInterval(() => {
      setDiscoveryStatus(prev => {
        const newProgress = prev?.progress + 10;
        if (newProgress >= 100) {
          clearInterval(interval);
          return { isRunning: false, progress: 100 };
        }
        return { ...prev, progress: newProgress };
      });
    }, 1000);
  };

  const handleSubnetSelect = (subnet) => {
    console.log('Selected subnet:', subnet);
  };

  const handleGroupCreate = (group) => {
    setAssetGroups(prev => [...prev, group]);
  };

  const handleGroupUpdate = (groupId, updates) => {
    setAssetGroups(prev => 
      prev?.map(group => 
        group?.id === groupId ? { ...group, ...updates } : group
      )
    );
  };

  const handleGroupDelete = (groupId) => {
    setAssetGroups(prev => prev?.filter(group => group?.id !== groupId));
  };

  // Clear discovery status after completion
  useEffect(() => {
    if (discoveryStatus?.progress === 100) {
      const timeout = setTimeout(() => {
        setDiscoveryStatus({ isRunning: false, progress: 0 });
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [discoveryStatus?.progress]);

  return (
    <div className="min-h-screen bg-background">
      <Header onMenuToggle={handleSidebarToggle} isMenuOpen={isSidebarOpen} />
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <main className="lg:ml-80 pt-16">
        <div className="p-6">
          {/* Page Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-foreground">Asset Management</h1>
                <p className="text-muted-foreground">
                  Organize and track network assets for comprehensive vulnerability scanning
                </p>
              </div>
              
              <div className="flex items-center space-x-3">
                <Button
                  variant="outline"
                  iconName="RefreshCw"
                  iconPosition="left"
                >
                  Refresh
                </Button>
                
                <Button
                  variant="default"
                  iconName="Plus"
                  iconPosition="left"
                >
                  Add Assets
                </Button>
              </div>
            </div>

            {/* Statistics */}
            <AssetStats stats={stats} />
          </div>

          {/* Tab Navigation */}
          <div className="mb-6">
            <div className="border-b border-border">
              <nav className="flex space-x-8">
                {tabs?.map((tab) => (
                  <button
                    key={tab?.id}
                    onClick={() => setActiveTab(tab?.id)}
                    className={`
                      flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors
                      ${activeTab === tab?.id
                        ? 'border-primary text-primary' :'border-transparent text-muted-foreground hover:text-foreground hover:border-muted'
                      }
                    `}
                  >
                    <Icon name={tab?.icon} size={16} />
                    <span>{tab?.label}</span>
                    {tab?.count && (
                      <span className="bg-muted text-muted-foreground text-xs px-2 py-1 rounded-full">
                        {tab?.count}
                      </span>
                    )}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Tab Content */}
          <div className="space-y-6">
            {activeTab === 'assets' && (
              <AssetTable
                assets={assets}
                onAssetSelect={handleAssetSelect}
                selectedAssets={selectedAssets}
                onBulkAction={handleBulkAction}
              />
            )}

            {activeTab === 'discovery' && (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <AssetDiscovery
                  onDiscoveryStart={handleDiscoveryStart}
                  discoveryStatus={discoveryStatus}
                />
                
                <div className="bg-card rounded-lg border border-border p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Icon name="Activity" size={20} className="text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">Discovery Tips</h3>
                      <p className="text-sm text-muted-foreground">
                        Best practices for asset discovery
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-4 text-sm text-muted-foreground">
                    <div className="flex items-start space-x-3">
                      <Icon name="CheckCircle" size={16} className="text-green-500 mt-0.5" />
                      <div>
                        <div className="font-medium text-foreground">Use CIDR notation</div>
                        <div>Format subnets as 192.168.1.0/24 for efficient scanning</div>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3">
                      <Icon name="CheckCircle" size={16} className="text-green-500 mt-0.5" />
                      <div>
                        <div className="font-medium text-foreground">Schedule regular scans</div>
                        <div>Set up automated discovery to catch new assets</div>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3">
                      <Icon name="CheckCircle" size={16} className="text-green-500 mt-0.5" />
                      <div>
                        <div className="font-medium text-foreground">Use common ports first</div>
                        <div>Start with top 1000 ports for faster initial discovery</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'subnets' && (
              <SubnetMap
                subnets={subnets}
                onSubnetSelect={handleSubnetSelect}
              />
            )}

            {activeTab === 'groups' && (
              <AssetGroups
                groups={assetGroups}
                onGroupCreate={handleGroupCreate}
                onGroupUpdate={handleGroupUpdate}
                onGroupDelete={handleGroupDelete}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default AssetManagement;