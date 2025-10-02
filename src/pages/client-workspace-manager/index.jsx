import React, { useState, useEffect } from 'react';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Header from '../../components/ui/Header';
import Sidebar from '../../components/ui/Sidebar';
import WorkspaceCard from './components/WorkspaceCard';
import WorkspaceTable from './components/WorkspaceTable';
import WorkspaceSummary from './components/WorkspaceSummary';
import AddClientModal from './components/AddClientModal';
import BulkActionsBar from './components/BulkActionsBar';
import ClientProfileModal from './components/ClientProfileModal';

const ClientWorkspaceManager = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'cards'
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('clientName');
  const [sortOrder, setSortOrder] = useState('asc');
  const [filterBy, setFilterBy] = useState('all');
  const [selectedWorkspaces, setSelectedWorkspaces] = useState([]);
  const [isAddClientModalOpen, setIsAddClientModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [isClientProfileModalOpen, setIsClientProfileModalOpen] = useState(false);

  // Mock data for client workspaces
  const [workspaces, setWorkspaces] = useState([
    {
      id: '1',
      clientName: 'Acme Corporation',
      industry: 'Technology',
      assetCount: 45,
      lastScanDate: '2024-12-28T10:30:00Z',
      riskScore: 75,
      criticalVulns: 3,
      highVulns: 8,
      mediumVulns: 12,
      lowVulns: 5,
      isActive: true,
      contactEmail: 'security@acme.com',
      contactPhone: '+1 (555) 123-4567'
    },
    {
      id: '2',
      clientName: 'Global Finance Ltd',
      industry: 'Financial Services',
      assetCount: 78,
      lastScanDate: '2024-12-27T14:15:00Z',
      riskScore: 92,
      criticalVulns: 7,
      highVulns: 15,
      mediumVulns: 23,
      lowVulns: 8,
      isActive: false,
      contactEmail: 'it@globalfinance.com',
      contactPhone: '+1 (555) 987-6543'
    },
    {
      id: '3',
      clientName: 'HealthTech Solutions',
      industry: 'Healthcare',
      assetCount: 32,
      lastScanDate: '2024-12-26T09:45:00Z',
      riskScore: 58,
      criticalVulns: 1,
      highVulns: 4,
      mediumVulns: 9,
      lowVulns: 12,
      isActive: true,
      contactEmail: 'admin@healthtech.com',
      contactPhone: '+1 (555) 456-7890'
    },
    {
      id: '4',
      clientName: 'Manufacturing Plus',
      industry: 'Manufacturing',
      assetCount: 67,
      lastScanDate: '2024-12-25T16:20:00Z',
      riskScore: 83,
      criticalVulns: 5,
      highVulns: 11,
      mediumVulns: 18,
      lowVulns: 7,
      isActive: false,
      contactEmail: 'security@mfgplus.com',
      contactPhone: '+1 (555) 321-0987'
    },
    {
      id: '5',
      clientName: 'EduTech Institute',
      industry: 'Education',
      assetCount: 28,
      lastScanDate: '2024-12-24T11:00:00Z',
      riskScore: 41,
      criticalVulns: 0,
      highVulns: 2,
      mediumVulns: 6,
      lowVulns: 15,
      isActive: true,
      contactEmail: 'it@edutech.edu',
      contactPhone: '+1 (555) 654-3210'
    }
  ]);

  // Summary data calculation
  const summaryData = {
    totalClients: workspaces?.length,
    averageRiskScore: Math.round(workspaces?.reduce((sum, ws) => sum + ws?.riskScore, 0) / workspaces?.length),
    activeScans: 3,
    scheduledScans: 8
  };

  const filterOptions = [
    { value: 'all', label: 'All Clients' },
    { value: 'active', label: 'Active Workspaces' },
    { value: 'high-risk', label: 'High Risk (80+)' },
    { value: 'medium-risk', label: 'Medium Risk (40-79)' },
    { value: 'low-risk', label: 'Low Risk (<40)' },
    { value: 'recent', label: 'Scanned Recently' }
  ];

  // Filter and sort workspaces
  const filteredAndSortedWorkspaces = workspaces?.filter(workspace => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery?.toLowerCase();
        if (!workspace?.clientName?.toLowerCase()?.includes(query) &&
            !workspace?.industry?.toLowerCase()?.includes(query)) {
          return false;
        }
      }

      // Category filter
      switch (filterBy) {
        case 'active':
          return workspace?.isActive;
        case 'high-risk':
          return workspace?.riskScore >= 80;
        case 'medium-risk':
          return workspace?.riskScore >= 40 && workspace?.riskScore < 80;
        case 'low-risk':
          return workspace?.riskScore < 40;
        case 'recent':
          const daysSinceLastScan = (new Date() - new Date(workspace.lastScanDate)) / (1000 * 60 * 60 * 24);
          return daysSinceLastScan <= 7;
        default:
          return true;
      }
    })?.sort((a, b) => {
      let aValue = a?.[sortBy];
      let bValue = b?.[sortBy];

      if (sortBy === 'lastScanDate') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  const handleSwitchWorkspace = (workspaceId) => {
    const workspace = workspaces?.find(ws => ws?.id === workspaceId);
    if (workspace) {
      // Update active workspace
      setWorkspaces(prev => prev?.map(ws => ({
        ...ws,
        isActive: ws?.id === workspaceId
      })));
      
      // Navigate to main dashboard with workspace context
      window.location.href = '/main-dashboard';
    }
  };

  const handleEditClient = (workspaceId) => {
    const client = workspaces?.find(ws => ws?.id === workspaceId);
    if (client) {
      setSelectedClient(client);
      setIsClientProfileModalOpen(true);
    }
  };

  const handleViewReports = (workspaceId) => {
    // Navigate to reports page with client context
    window.location.href = `/reports?client=${workspaceId}`;
  };

  const handleAddClient = (newClient) => {
    setWorkspaces(prev => [...prev, newClient]);
  };

  const handleSelectWorkspace = (workspaceId, isSelected) => {
    setSelectedWorkspaces(prev => {
      if (isSelected) {
        return [...prev, workspaceId];
      } else {
        return prev?.filter(id => id !== workspaceId);
      }
    });
  };

  const handleSelectAll = (isSelected) => {
    if (isSelected) {
      setSelectedWorkspaces(filteredAndSortedWorkspaces?.map(ws => ws?.id));
    } else {
      setSelectedWorkspaces([]);
    }
  };

  const handleBulkScan = (scanType) => {
    console.log(`Initiating ${scanType} for ${selectedWorkspaces?.length} clients`);
    // Simulate scan initiation
    setSelectedWorkspaces([]);
  };

  const handleBulkReport = (reportType) => {
    console.log(`Generating ${reportType} for ${selectedWorkspaces?.length} clients`);
    // Simulate report generation
    setSelectedWorkspaces([]);
  };

  const handleClearSelection = () => {
    setSelectedWorkspaces([]);
  };

  const handleSort = (field, order) => {
    setSortBy(field);
    setSortOrder(order);
  };

  // Handle mobile sidebar
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <Header 
        onMenuToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        isMenuOpen={isSidebarOpen}
      />
      {/* Sidebar */}
      <Sidebar 
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      {/* Main Content */}
      <main className="lg:ml-80 pt-16">
        <div className="p-6">
          {/* Page Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-foreground">
                  Client Workspace Manager
                </h1>
                <p className="text-muted-foreground mt-1">
                  Manage and organize multiple client environments for vulnerability scanning
                </p>
              </div>
              
              <Button
                variant="default"
                onClick={() => setIsAddClientModalOpen(true)}
                iconName="Plus"
                iconPosition="left"
              >
                Add New Client
              </Button>
            </div>

            {/* Summary Cards */}
            <WorkspaceSummary summaryData={summaryData} />
          </div>

          {/* Controls */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <Input
                type="search"
                placeholder="Search clients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e?.target?.value)}
                className="w-full sm:w-80"
              />
              
              <Select
                placeholder="Filter by..."
                options={filterOptions}
                value={filterBy}
                onChange={setFilterBy}
                className="w-full sm:w-48"
              />
            </div>

            <div className="flex items-center space-x-3">
              <div className="flex items-center bg-muted rounded-lg p-1">
                <Button
                  variant={viewMode === 'table' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('table')}
                  iconName="Table"
                >
                </Button>
                <Button
                  variant={viewMode === 'cards' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('cards')}
                  iconName="Grid3X3"
                >
                </Button>
              </div>
              
              <div className="text-sm text-muted-foreground">
                {filteredAndSortedWorkspaces?.length} of {workspaces?.length} clients
              </div>
            </div>
          </div>

          {/* Bulk Actions Bar */}
          <BulkActionsBar
            selectedCount={selectedWorkspaces?.length}
            onBulkScan={handleBulkScan}
            onBulkReport={handleBulkReport}
            onClearSelection={handleClearSelection}
          />

          {/* Content */}
          {viewMode === 'table' ? (
            <WorkspaceTable
              workspaces={filteredAndSortedWorkspaces}
              selectedWorkspaces={selectedWorkspaces}
              onSelectWorkspace={handleSelectWorkspace}
              onSelectAll={handleSelectAll}
              onSwitchWorkspace={handleSwitchWorkspace}
              onEditClient={handleEditClient}
              onViewReports={handleViewReports}
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSort={handleSort}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredAndSortedWorkspaces?.map((workspace) => (
                <WorkspaceCard
                  key={workspace?.id}
                  workspace={workspace}
                  onSwitchWorkspace={handleSwitchWorkspace}
                  onEditClient={handleEditClient}
                  onViewReports={handleViewReports}
                />
              ))}
            </div>
          )}

          {/* Empty State */}
          {filteredAndSortedWorkspaces?.length === 0 && (
            <div className="text-center py-12">
              <Icon name="Building" size={48} className="text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                No clients found
              </h3>
              <p className="text-muted-foreground mb-6">
                {searchQuery || filterBy !== 'all' ?'Try adjusting your search or filter criteria' :'Get started by adding your first client workspace'
                }
              </p>
              {(!searchQuery && filterBy === 'all') && (
                <Button
                  variant="default"
                  onClick={() => setIsAddClientModalOpen(true)}
                  iconName="Plus"
                  iconPosition="left"
                >
                  Add Your First Client
                </Button>
              )}
            </div>
          )}
        </div>
      </main>
      {/* Modals */}
      <AddClientModal
        isOpen={isAddClientModalOpen}
        onClose={() => setIsAddClientModalOpen(false)}
        onAddClient={handleAddClient}
      />
      <ClientProfileModal
        isOpen={isClientProfileModalOpen}
        onClose={() => setIsClientProfileModalOpen(false)}
        client={selectedClient}
      />
    </div>
  );
};

export default ClientWorkspaceManager;