import React, { useState, useEffect } from 'react';
// --- VULCAN INTEGRATION 1: Import our services ---
import { assetService } from '../../services/assetService';
import { scannerApiService } from '../../services/scannerApiService';
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
  // --- VULCAN INTEGRATION 2: Add loading/error state and remove mock data ---
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [assets, setAssets] = useState([]);
  const [stats, setStats] = useState({});
  // Mock data for tabs and other UI elements that are not yet dynamic
  const [subnets] = useState([]); 
  const [assetGroups, setAssetGroups] = useState([]);

  // --- VULCAN INTEGRATION 3: Add state for our new scanner ---
  const [isScanning, setIsScanning] = useState(false);
  const [scanTaskId, setScanTaskId] = useState(null);
  const [scanStatusMessage, setScanStatusMessage] = useState('');
  const [scanResult, setScanResult] = useState(null);

  // --- Existing UI state ---
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedAssets, setSelectedAssets] = useState([]);
  const [activeTab, setActiveTab] = useState('assets');
  const [discoveryStatus, setDiscoveryStatus] = useState({ isRunning: false, progress: 0 });


  // --- VULCAN INTEGRATION 4: Fetch live data on component load ---
  useEffect(() => {
    // NOTE: This assumes a workspace context is available. For now, we'll hardcode an ID.
    // In your full app, you'd get this from a context provider (like your useAuth or a new WorkspaceContext).
    const currentWorkspaceId = 'YOUR_WORKSPACE_ID'; // Replace with a real ID from your Supabase table

    const loadAssetData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // We'll fetch assets and stats. Other data can be added later.
        const { data: assetsData, error: assetsError } = await assetService.getAssets(currentWorkspaceId);

        if (assetsError) throw new Error(assetsError);
        
        // Map Supabase data (snake_case) to the format your components expect (camelCase)
        const formattedAssets = assetsData.map(asset => ({
          id: asset.id,
          hostname: asset.hostname,
          ipAddress: asset.ip_address,
          operatingSystem: asset.operating_system,
          services: asset.services || [],
          vulnerabilityCount: asset.vulnerabilities[0]?.count || 0,
          highestSeverity: asset.highest_severity,
          lastScan: asset.last_scan,
          status: asset.status
        }));
        
        setAssets(formattedAssets);
        // You would also fetch and set stats, subnets, etc. here
        setStats({ totalAssets: formattedAssets.length, onlineAssets: formattedAssets.filter(a=>a.status === 'online').length });

      } catch (err) {
        setError(err.message);
        console.error("Failed to load asset data:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadAssetData();
  }, []); // Empty array ensures this runs once

  // --- VULCAN INTEGRATION 5: Add polling useEffect for scan results ---
  useEffect(() => {
    if (!scanTaskId) return;

    const pollInterval = setInterval(async () => {
      try {
        setScanStatusMessage(`Polling for results... (Task ID: ${scanTaskId})`);
        const data = await scannerApiService.getScanResults(scanTaskId);
        
        if (data.state === 'SUCCESS') {
          setScanResult(data.result);
          setIsScanning(false);
          setScanTaskId(null);
          setScanStatusMessage('Scan complete! Results will be saved and displayed shortly.');
          clearInterval(pollInterval);
          // TODO: Here you would call a function to process 'data.result' and save it to Supabase
          // using your vulnerabilityService.
        } else if (data.state === 'FAILURE') {
          setError('Scan failed. Check backend logs.');
          setIsScanning(false);
          setScanTaskId(null);
          clearInterval(pollInterval);
        }
      } catch (err) {
        setError(err.message);
        setIsScanning(false);
        setScanTaskId(null);
        clearInterval(pollInterval);
      }
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(pollInterval);
  }, [scanTaskId]);

  // --- VULCAN INTEGRATION 6: Update handleBulkAction to trigger scans ---
  const handleBulkAction = async (action, assetIds = selectedAssets) => {
    if (action === 'scan') {
      if (assetIds.length === 0) {
        alert("Please select at least one asset to scan.");
        return;
      }
      
      setIsScanning(true);
      setScanResult(null);
      setError(null);
      setScanStatusMessage(`Initiating scan for ${assetIds.length} asset(s)...`);

      // For simplicity, we'll scan the first selected asset.
      const assetToScan = assets.find(a => a.id === assetIds[0]);
      if (!assetToScan || !assetToScan.ipAddress) {
        setError("Selected asset has no IP address to scan.");
        setIsScanning(false);
        return;
      }

      try {
        const data = await scannerApiService.startScan(assetToScan.ipAddress);
        setScanTaskId(data.task_id); // This triggers the polling useEffect
      } catch (err) {
        setError(err.message);
        setIsScanning(false);
      }
    } else {
      console.log(`Performing ${action} on assets:`, assetIds);
    }
  };

  const tabs = [
    { id: 'assets', label: 'Assets', icon: 'Server', count: assets?.length },
    { id: 'discovery', label: 'Discovery', icon: 'Search' },
    { id: 'subnets', label: 'Network Map', icon: 'Network' },
    { id: 'groups', label: 'Groups', icon: 'Layers', count: assetGroups?.length }
  ];

  if (isLoading) { return <div className="flex items-center justify-center min-h-screen">Loading asset data...</div>; }
  if (error && !isScanning) { return <div className="flex items-center justify-center min-h-screen text-red-500">Error: {error.message || 'An unexpected error occurred.'}</div>; }

  return (
    <div className="min-h-screen bg-background">
       <Header onMenuToggle={() => setIsSidebarOpen(!isSidebarOpen)} isMenuOpen={isSidebarOpen} />
       <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
       <main className="lg:ml-80 pt-16">
         <div className="p-6">
           {/* Page Header */}
           <div className="mb-8">
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
            {/* Statistics */}
            <AssetStats stats={stats} />
          </div>

          {/* Tab Navigation */}
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

          {/* Tab Content */}
          <div>
            {/* --- VULCAN INTEGRATION 7: Add a display for scan status --- */}
            {isScanning && (
              <div className="p-4 mb-6 border border-blue-500 bg-blue-50 rounded-lg">
                <h3 className="font-bold text-blue-800">Scan in Progress</h3>
                <p className="text-sm text-blue-700">{scanStatusMessage}</p>
              </div>
            )}
            {scanResult && (
              <div className="p-4 mb-6 border border-green-500 bg-green-50 rounded-lg">
                <h3 className="font-bold text-green-800">Scan Report Received</h3>
                <pre className="text-sm text-green-900 whitespace-pre-wrap">{JSON.stringify(scanResult, null, 2)}</pre>
              </div>
            )}

            {activeTab === 'assets' && (
              <AssetTable
                assets={assets}
                onAssetSelect={setSelectedAssets}
                selectedAssets={selectedAssets}
                onBulkAction={handleBulkAction}
              />
            )}
            {/* ... other tab components will go here ... */}
          </div>
        </div>
      </main>
    </div>
  );
};

export default AssetManagement;