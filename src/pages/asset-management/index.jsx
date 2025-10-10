import React, { useState, useEffect } from 'react';
import { assetService } from '../../services/assetService';
import { scannerApiService } from '../../services/scannerApiService';
import AssetTable from './components/AssetTable';
import AssetStats from './components/AssetStats';
import Button from '../../components/ui/Button';
import Icon from '../../components/AppIcon';
// --- VULCAN CHANGE: Import the layout hook ---
import { useAppLayout } from '../../layouts/AppLayout';

const AssetManagement = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [assets, setAssets] = useState([]);
  const [stats, setStats] = useState({});
  const [selectedAssets, setSelectedAssets] = useState([]);

  // --- VULCAN CHANGE: Get the selectedWorkspace from the context ---
  const { selectedWorkspace } = useAppLayout();

  // Fetch live data on component load or when workspace changes
  useEffect(() => {
    // --- VULCAN CHANGE: Guard against running without a workspace ID ---
    if (!selectedWorkspace) {
        setIsLoading(false);
        return;
    }

    const loadAssetData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const { data: assetsData, error: assetsError } = await assetService.getAssets(selectedWorkspace);

        if (assetsError) throw new Error(assetsError);
        
        const formattedAssets = assetsData.map(asset => ({
          id: asset.id,
          hostname: asset.hostname,
          ipAddress: asset.ip_address,
          operatingSystem: asset.operating_system,
          services: asset.open_ports || [], // Assuming open_ports is the correct field
          vulnerabilityCount: asset.vulnerabilities[0]?.count || 0,
          highestSeverity: asset.highest_severity || 'None',
          lastScan: asset.last_scan_at || new Date().toISOString(),
          status: asset.status || 'unknown'
        }));
        
        setAssets(formattedAssets);
        setStats({ totalAssets: formattedAssets.length, onlineAssets: formattedAssets.filter(a=>a.status === 'online').length });

      } catch (err) {
        setError(err.message);
        console.error("Failed to load asset data:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadAssetData();
  }, [selectedWorkspace]); // --- VULCAN CHANGE: Rerun when selectedWorkspace changes ---


  const handleBulkAction = (action) => {
    // Logic for bulk actions like scanning, exporting, etc.
    console.log(`Performing ${action} on assets:`, selectedAssets);
  };

  if (isLoading) { return <div className="flex items-center justify-center p-10">Loading asset data...</div>; }
  
  if (error) { 
      return (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-center">
              <p className="text-red-400 font-semibold">Error: An unexpected error occurred.</p>
              <p className="text-red-500 text-sm mt-1">{error}</p>
          </div>
      ); 
  }

  return (
    <div className="space-y-6">
        {/* Page Header */}
        <div>
            <div className="flex items-center justify-between mb-4">
                <div>
                <h1 className="text-3xl font-bold text-foreground">Asset Management</h1>
                <p className="text-muted-foreground">Organize and track network assets for comprehensive vulnerability scanning</p>
                </div>
                <div className="flex items-center space-x-3">
                <Button variant="outline" iconName="RefreshCw" iconPosition="left">Refresh</Button>
                <Button variant="default" iconName="Plus" iconPosition="left">Add Assets</Button>
                </div>
            </div>
            {/* Statistics can be re-enabled once data is flowing */}
            {/* <AssetStats stats={stats} /> */}
        </div>

        {/* For now, we will just render the table */}
        <AssetTable
            assets={assets}
            onAssetSelect={setSelectedAssets}
            selectedAssets={selectedAssets}
            onBulkAction={handleBulkAction}
        />
    </div>
  );
};

export default AssetManagement;