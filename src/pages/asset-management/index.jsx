import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { assetService } from '../../services/assetService';
import AssetTable from './components/AssetTable';
import AssetStats from './components/AssetStats';
import AssetDiscovery from './components/AssetDiscovery';
import SubnetMap from './components/SubnetMap';
import AssetGroups from './components/AssetGroups';
import Button from '../../components/ui/Button';
import Icon from '../../components/AppIcon';

const AssetManagement = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [assets, setAssets] = useState([]);
  const [stats, setStats] = useState({});
  const [selectedAssets, setSelectedAssets] = useState([]);
  const [activeTab, setActiveTab] = useState('assets');
  
  // Hardcoded data for UI placeholders
  const [subnets] = useState([]);
  const [assetGroups, setAssetGroups] = useState([]);
  const [discoveryStatus, setDiscoveryStatus] = useState({
    isRunning: false,
    progress: 0
  });

  // ← FIX: Get workspace from context (same as Dashboard)
  const { selectedWorkspace } = useOutletContext();

  const loadAssetData = async () => {
    // ← FIX: Don't load if no workspace selected
    if (!selectedWorkspace) {
      console.log('[AssetManagement] No workspace selected, skipping load');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('[AssetManagement] Loading assets for workspace:', selectedWorkspace);

      const { data: assetsData, error: assetsError } = await assetService.getAssets(selectedWorkspace);
      
      if (assetsError) throw new Error(assetsError);

      console.log('[AssetManagement] Raw assets data:', assetsData);

      // ← FIX: Match database schema from scan completion
      const formattedAssets = assetsData.map(asset => {
        // Parse services JSON if it's a string
        let services = [];
        try {
          services = typeof asset.services === 'string' 
            ? JSON.parse(asset.services) 
            : (asset.services || []);
        } catch (e) {
          console.warn('[AssetManagement] Failed to parse services for asset', asset.id, e);
          services = [];
        }

        return {
          id: asset.id,
          hostname: asset.hostname || 'Unknown',
          ipAddress: asset.ip_address,
          operatingSystem: asset.os || 'Unknown', // ← FIX: Use 'os' not 'operating_system'
          services: services.map(s => `${s.port}/${s.service || 'unknown'}`), // ← FIX: Format services
          vulnerabilityCount: 0, // ← Will be populated from separate query
          highestSeverity: 'None',
          lastScan: asset.discovered_at || asset.created_at, // ← FIX: Use discovered_at
          status: asset.is_active ? 'online' : 'offline'
        };
      });

      console.log('[AssetManagement] Formatted assets:', formattedAssets);

      setAssets(formattedAssets);

      // ← FIX: Calculate stats from formatted data
      setStats({
        totalAssets: formattedAssets.length,
        onlineAssets: formattedAssets.filter(a => a.status === 'online').length,
        criticalVulns: 0 // ← TODO: Query vulnerabilities separately
      });

    } catch (err) {
      setError(err.message);
      console.error('[AssetManagement] Failed to load asset data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // ← FIX: Reload when workspace changes
  useEffect(() => {
    loadAssetData();
  }, [selectedWorkspace]);

  const tabs = [
    { id: 'assets', label: 'Assets', icon: 'Server', count: assets?.length },
    { id: 'discovery', label: 'Discovery', icon: 'Search' },
    { id: 'subnets', label: 'Network Map', icon: 'Network' },
    { id: 'groups', label: 'Groups', icon: 'Layers', count: assetGroups?.length }
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <Icon icon="Loader" className="w-8 h-8 animate-spin text-primary" />
          <p className="text-text-secondary">Loading assets...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4 max-w-md text-center">
          <Icon icon="AlertTriangle" className="w-12 h-12 text-error" />
          <div>
            <h3 className="text-lg font-semibold mb-2">Failed to Load Assets</h3>
            <p className="text-text-secondary mb-4">{error}</p>
            <Button onClick={loadAssetData}>
              <Icon icon="RefreshCw" className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ← FIX: Show message if no workspace selected
  if (!selectedWorkspace) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4 max-w-md text-center">
          <Icon icon="Inbox" className="w-12 h-12 text-text-secondary" />
          <div>
            <h3 className="text-lg font-semibold mb-2">No Workspace Selected</h3>
            <p className="text-text-secondary">
              Please select a workspace from the dropdown to view assets.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Asset Management</h1>
          <p className="text-text-secondary">
            Organize and track network assets for comprehensive vulnerability scanning
          </p>
        </div>
        <Button variant="primary" onClick={() => setActiveTab('discovery')}>
          <Icon icon="Plus" className="w-4 h-4 mr-2" />
          Discover Assets
        </Button>
      </div>

      {/* Stats Cards */}
      <AssetStats stats={stats} />

      {/* Tabs */}
      <div className="bg-surface rounded-lg border border-border">
        <div className="border-b border-border">
          <div className="flex">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  px-6 py-3 font-medium flex items-center gap-2
                  transition-colors border-b-2
                  ${activeTab === tab.id 
                    ? 'border-primary text-primary' 
                    : 'border-transparent text-text-secondary hover:text-text'
                  }
                `}
              >
                <Icon icon={tab.icon} className="w-4 h-4" />
                {tab.label}
                {tab.count !== undefined && (
                  <span className="ml-2 px-2 py-0.5 text-xs bg-secondary rounded-full">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'assets' && (
            <AssetTable
              assets={assets}
              selectedAssets={selectedAssets}
              onAssetSelect={setSelectedAssets}
              onBulkAction={() => {}}
            />
          )}

          {activeTab === 'discovery' && (
            <AssetDiscovery
              status={discoveryStatus}
              onStartDiscovery={() => {}}
              onStopDiscovery={() => {}}
            />
          )}

          {activeTab === 'subnets' && (
            <SubnetMap subnets={subnets} />
          )}

          {activeTab === 'groups' && (
            <AssetGroups
              groups={assetGroups}
              onCreateGroup={() => {}}
              onEditGroup={() => {}}
              onDeleteGroup={() => {}}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default AssetManagement;
