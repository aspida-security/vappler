// src/layouts/AppLayout.jsx

import React, { useState, useEffect } from 'react';
import { Outlet, useOutletContext, useNavigate } from 'react-router-dom';
import Sidebar from '../components/ui/Sidebar';
import Header from '../components/ui/Header';
import { workspaceService } from '../services/workspaceService';
import { useAuth } from '../contexts/AuthContext';
import NewScanModal from '../components/modals/NewScanModal';
import { scannerApiService } from '../services/scannerApiService';
import Icon from '../components/AppIcon';
import { showToast } from '../utils/toast';

// Helper to map scanner severity string to DB enum value
const mapSeverity = (severity) => {
  if (!severity) return 'Medium';
  const lower = severity.toLowerCase();
  if (lower.includes('critical')) return 'Critical';
  if (lower.includes('high')) return 'High';
  if (lower.includes('medium')) return 'Medium';
  if (lower.includes('low')) return 'Low';
  return 'Info';
};

const AppLayout = () => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isNewScanModalOpen, setIsNewScanModalOpen] = useState(false);
  const [workspaces, setWorkspaces] = useState([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState('');
  const { user, userProfile, session } = useAuth();
  const navigate = useNavigate();
  const [isScanning, setIsScanning] = useState(false);
  const [scanTaskId, setScanTaskId] = useState(null);
  const [scanId, setScanId] = useState(null);
  const [scanError, setScanError] = useState(null);
  const [scanStatusMessage, setScanStatusMessage] = useState('');
  const [scanResult, setScanResult] = useState(null);

  // ✅ Move fetchWorkspaces HERE (outside useEffect, at component level)
  const fetchWorkspaces = async () => {
    try {
      const { data, error } = await workspaceService.getWorkspaces();
      
      if (error) {
        console.error("[AppLayout] Error fetching workspaces:", error);
        setWorkspaces([]);
        throw new Error(error.message || 'Unknown error fetching workspaces');
      }

      if (Array.isArray(data)) {
        console.log(`[AppLayout] Found ${data.length} workspaces.`);
        setWorkspaces(data);

        if (data.length > 0) {
          if (!selectedWorkspace || !data.some(w => w.id === selectedWorkspace)) {
            console.log(`[AppLayout] Auto-selecting first workspace: ${data[0].id}`);
            setSelectedWorkspace(data[0].id);
          }
        } else {
          console.warn("[AppLayout] User has no workspaces. RLS link likely failed or is missing.");
          setSelectedWorkspace('');
        }
      } else {
        console.warn("[AppLayout] Received non-array data for workspaces, setting to empty.", data);
        setWorkspaces([]);
        setSelectedWorkspace('');
      }
    } catch (error) {
      console.error("[AppLayout] Failed to fetch workspaces (catch block):", error.message);
      setWorkspaces([]);
      setScanError(`Failed to load workspaces: ${error.message}`);
    }
  };

  // Effect to fetch user workspaces on mount
  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (!userProfile) {
      return;
    }

    fetchWorkspaces();  // ✅ Call the function (now defined above)
  }, [user, navigate, userProfile]);  // ✅ Remove selectedWorkspace from dependencies


  // Effect to poll for scan results
  useEffect(() => {
    if (!scanTaskId) return;

    console.log(`[AppLayout] Starting polling for task ID: ${scanTaskId}`);

    const pollInterval = setInterval(async () => {
      console.log(`[AppLayout] Polling results for task ID: ${scanTaskId}`);

      try {
        const data = await scannerApiService.getScanResults(scanTaskId);
        console.log(`[AppLayout] Poll response for ${scanTaskId}:`, data);

        if (data.state === 'SUCCESS') {
          console.log(`[AppLayout] Task ${scanTaskId} SUCCESS. Worker saved all data.`);
          clearInterval(pollInterval);
          
          // Worker already saved all data via service role client (tasks.py lines 171-172)
          // No need to call /complete endpoint or save data manually
          setScanStatusMessage('Scan complete!');
          setScanResult(data.result);
          setIsScanning(false);
          setScanTaskId(null);
          
          showToast('success', 'Scan completed successfully!');
          
          // Refresh workspaces to load new scan data
          console.log('[AppLayout] Refreshing workspaces to show new scan data...');
          fetchWorkspaces();
        } else if (data.state === 'FAILURE') {
          console.error(`[AppLayout] Task ${scanTaskId} FAILURE. Info:`, data.status);
          clearInterval(pollInterval);
          setScanStatusMessage('Scan failed.');
          setScanError(data.status || 'An unknown error occurred during the scan.');
          setIsScanning(false);
          setScanTaskId(null);
        } else {
          setScanStatusMessage(`Scan in progress... (State: ${data.state})`);
        }
      } catch (err) {
        console.error(`[AppLayout] Error polling results for task ${scanTaskId}:`, err);
        clearInterval(pollInterval);
        setScanError(`Failed to get scan results: ${err.message}`);
        showToast('error', `Failed to get scan results: ${err.message}`);
        setIsScanning(false);
        setScanTaskId(null);
      }
    }, 5000);

    return () => {
      console.log(`[AppLayout] Clearing poll interval for task ID: ${scanTaskId}`);
      clearInterval(pollInterval);
    };
  }, [scanTaskId, scanId, selectedWorkspace, session]);

  const handleWorkspaceChange = (workspaceId) => {
    console.log(`[AppLayout] Workspace changed to: ${workspaceId}`);
    setSelectedWorkspace(workspaceId);
    setScanTaskId(null);
    setScanId(null);
    setScanResult(null);
    setScanError(null);
    setScanStatusMessage('');
    setIsScanning(false);
  };

  const openNewScanModal = () => {
    if (!selectedWorkspace) {
      setScanError("Please select a workspace before starting a scan.");
      return;
    }

    console.log("[AppLayout] Opening New Scan Modal.");
    setScanResult(null);
    setScanError(null);
    setScanStatusMessage('');
    setIsNewScanModalOpen(true);
  };

  const closeNewScanModal = () => {
    console.log("[AppLayout] Closing New Scan Modal.");
    setIsNewScanModalOpen(false);
  };

  const handleScanSubmit = async (scanData) => {
    setIsNewScanModalOpen(false);

    if (!selectedWorkspace) {
      setScanError("Cannot start scan: No workspace selected.");
      return;
    }

    console.log(`[AppLayout] Submitting scan for target: ${scanData.target} in workspace: ${selectedWorkspace}`);
    setScanError(null);
    setScanResult(null);
    setIsScanning(true);
    setScanStatusMessage('Requesting new scan...');

    try {
      const response = await scannerApiService.startScan(scanData.target, selectedWorkspace);
      console.log("[AppLayout] Scan request successful. Response:", response);
      
      // Store both task_id and scan_id
      setScanTaskId(response.task_id);
      setScanId(response.scan_id);
      
      showToast('info', `Scan initiated for ${scanData.target}. Processing...`);
      setScanStatusMessage(`Scan requested successfully. Task ID: ${response.task_id}. Waiting for results...`);
    } catch (error) {
      console.error("[AppLayout] Failed to start scan:", error);
      setScanError(`Failed to start scan: ${error.message}`);
      showToast('error', `Failed to start scan: ${error.message}`);
      setIsScanning(false);
      setScanStatusMessage('');
    }
  };

  const contextValue = {
    openNewScanModal,
    workspaces: Array.isArray(workspaces) ? workspaces : [],
    selectedWorkspace,
    handleWorkspaceChange
  };

  return (
    <div className="flex h-screen bg-background text-foreground">
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setSidebarOpen(false)}
        workspaces={Array.isArray(workspaces) ? workspaces : []}
        selectedWorkspace={selectedWorkspace}
        onWorkspaceChange={handleWorkspaceChange}
        onNewScanClick={openNewScanModal}
      />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Header
          onMenuToggle={() => setSidebarOpen(!isSidebarOpen)}
          isMenuOpen={isSidebarOpen}
          onNewScanClick={openNewScanModal}
        />
        <main className="flex-1 overflow-y-auto bg-background p-6 pt-6">
          {/* Scan Status/Error Display */}
          {scanStatusMessage && !scanError && (
            <div className="bg-blue-500/10 border border-blue-500/20 text-blue-300 p-4 rounded-lg mb-6 text-sm">
              <div className="flex items-center space-x-2">
                <Icon name={isScanning ? 'Loader' : 'CheckCircle'} size={16} className={isScanning ? 'animate-spin' : ''} />
                <span>{scanStatusMessage}</span>
              </div>
            </div>
          )}
          {scanError && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-300 p-4 rounded-lg mb-6 text-sm">
              <div className="flex items-center space-x-2">
                <Icon name="AlertTriangle" size={16} />
                <span>Error: {scanError}</span>
              </div>
            </div>
          )}

          {/* Render child route components */}
          <Outlet context={contextValue} />
        </main>
      </div>
      <NewScanModal
        isOpen={isNewScanModalOpen}
        onClose={closeNewScanModal}
        onSubmit={handleScanSubmit}
      />
    </div>
  );
};

export function useAppLayout() {
  const context = useOutletContext();
  if (context === undefined) {
    throw new Error('useAppLayout must be used within an AppLayout Outlet context');
  }
  return context;
}

export default AppLayout;
