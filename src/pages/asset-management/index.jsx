import React, { useState, useEffect } from 'react';
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
  const [discoveryStatus, setDiscoveryStatus] = useState({ isRunning: false, progress: 0 });

  // In a real app, this would come from context
  const currentWorkspaceId = 'ac50873a-91d9-4813-a496-f99a31d926c5';

  const loadAssetData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data: assetsData, error: assetsError } = await assetService.getAssets(currentWorkspaceId);
      if (assetsError) throw new Error(assetsError.message);
      
      const formattedAssets = assetsData.map(asset => ({
        id: asset.id,
        hostname: asset.hostname,
        ipAddress: asset.ip_address,
        operatingSystem: asset.operating_system || 'Unknown',
        services: asset.open_ports || [],
        vulnerabilityCount: asset.vulnerabilities?.[0]?.count || 0,
        highestSeverity: asset.highest_severity || 'None',
        lastScan: asset.last_scan_at,
        status: asset.is_active ? 'online' : 'offline'
      }));
      
      setAssets(formattedAssets);
      setStats({ 
          totalAssets: formattedAssets.length, 
          onlineAssets: formattedAssets.filter(a => a.status === 'online').length,
          criticalVulns: 0 // Placeholder
      });

    } catch (err) {
      setError(err.message);
      console.error("Failed to load asset data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAssetData();
  }, []);

  const tabs = [
    { id: 'assets', label: 'Assets', icon: 'Server', count: assets?.length },
    { id: 'discovery', label: 'Discovery', icon: 'Search' },
    { id: 'subnets', label: 'Network Map', icon: 'Network' },
    { id: 'groups', label: 'Groups', icon: 'Layers', count: assetGroups?.length }
  ];

  if (isLoading) { return <div className="flex items-center justify-center min-h-[50vh]">Loading asset data...</div>; }
  if (error) { return <div className="flex items-center justify-center min-h-[50vh] text-red-400">Error: {error}</div>; }

  return (
    <div className="p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Asset Management</h1>
            <p className="text-muted-foreground">Organize and track network assets for comprehensive vulnerability scanning</p>
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="outline" iconName="RefreshCw" iconPosition="left" onClick={loadAssetData}>Refresh</Button>
            <Button variant="default" iconName="Plus" iconPosition="left">Add Assets</Button>
          </div>
        </div>
        <AssetStats stats={stats} />
      </div>

      <div className="mb-6">
        <div className="border-b border-border">
          <nav className="flex space-x-8">
            {tabs?.map((tab) => (
              <button key={tab?.id} onClick={() => setActiveTab(tab?.id)} 
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === tab?.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted'}`}>
                <Icon name={tab?.icon} size={16} />
                <span>{tab?.label}</span>
                {tab?.count != null && (<span className="bg-muted text-muted-foreground text-xs px-2 py-1 rounded-full">{tab.count}</span>)}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <div>
        {activeTab === 'assets' && (
          <AssetTable
            assets={assets}
            onAssetSelect={setSelectedAssets}
            selectedAssets={selectedAssets}
            onBulkAction={() => {}}
          />
        )}
        {activeTab === 'discovery' && <AssetDiscovery onDiscoveryStart={() => {}} discoveryStatus={discoveryStatus} />}
        {activeTab === 'subnets' && <SubnetMap subnets={subnets} onSubnetSelect={() => {}} />}
        {activeTab === 'groups' && <AssetGroups groups={assetGroups} onGroupCreate={() => {}} />}
      </div>
    </div>
  );
};

export default AssetManagement;