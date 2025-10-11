import React, { useState, useEffect } from 'react';
import { Outlet, useOutletContext, useNavigate } from 'react-router-dom'; 
import Sidebar from '../components/ui/Sidebar';
import Header from '../components/ui/Header'; 
import { workspaceService } from '../services/workspaceService';
import { assetService } from '../services/assetService';
import { vulnerabilityService } from '../services/vulnerabilityService';
import { useAuth } from '../contexts/AuthContext';
import NewScanModal from '../components/modals/NewScanModal';
import { scannerApiService } from '../services/scannerApiService';

const AppLayout = () => {
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const [isNewScanModalOpen, setIsNewScanModalOpen] = useState(false);
    const [workspaces, setWorkspaces] = useState([]);
    const [selectedWorkspace, setSelectedWorkspace] = useState('');
    const { user } = useAuth();
    const navigate = useNavigate();

    const [isScanning, setIsScanning] = useState(false);
    const [scanTaskId, setScanTaskId] = useState(null);
    const [scanError, setScanError] = useState(null);
    const [scanStatusMessage, setScanStatusMessage] = useState('');
    const [scanResult, setScanResult] = useState(null);

    const processAndSaveScanResults = async (result, workspaceId) => {
        // --- VULCAN FIX: Add better handling for empty results ---
        if (!result || !result.vulnerability_details || result.vulnerability_details.length === 0) {
            console.log("Scan completed but found no vulnerabilities or assets.");
            setScanStatusMessage("Scan complete. No new assets or vulnerabilities were discovered.");
            // We can add a timeout to clear this message after a few seconds
            setTimeout(() => {
                setScanStatusMessage('');
                setScanResult(null); // Clear the raw results from the screen
            }, 5000);
            return;
        }

        setScanStatusMessage("Scan complete. Saving results to the database...");

        try {
            const assetsToSave = result.vulnerability_details.map(detail => ({
                workspace_id: workspaceId,
                hostname: detail.host,
                ip_address: detail.host,
                status: 'online', 
                risk_score: detail.vulnerabilities.reduce((max, v) => Math.max(max, v.cvss_score || 0), 0),
                last_scan_at: new Date().toISOString(),
            }));

            const { data: savedAssets, error: assetError } = await assetService.bulkImportAssets(workspaceId, assetsToSave);
            if (assetError) throw new Error(`Failed to save assets: ${assetError.message}`);

            setScanStatusMessage(`${savedAssets.length} assets saved. Now saving vulnerabilities...`);

            const assetIpToIdMap = new Map(savedAssets.map(asset => [asset.ip_address, asset.id]));
            let vulnerabilitiesSavedCount = 0;

            for (const detail of result.vulnerability_details) {
                const assetId = assetIpToIdMap.get(detail.host);
                if (!assetId) continue;

                for (const vuln of detail.vulnerabilities) {
                    const vulnerabilityData = {
                        workspace_id: workspaceId,
                        asset_id: assetId,
                        cve_id: vuln.cve,
                        title: vuln.name,
                        description: vuln.details,
                        severity: vuln.severity,
                        cvss_score: vuln.cvss_score,
                        port: vuln.port,
                        service: vuln.service,
                        status: 'open',
                    };
                    const { error: vulnError } = await vulnerabilityService.createVulnerability(vulnerabilityData);
                    if (vulnError) {
                        console.warn(`Could not save vulnerability ${vuln.cve} for asset ${assetId}:`, vulnError.message);
                    } else {
                        vulnerabilitiesSavedCount++;
                    }
                }
            }
            
            setScanStatusMessage(`Save complete! ${vulnerabilitiesSavedCount} vulnerabilities recorded. Refreshing the page to view results.`);
            
            setTimeout(() => {
                window.location.reload();
            }, 3000);

        } catch (error) {
            console.error("Error during data ingestion:", error);
            setScanError(`Data ingestion failed: ${error.message}`);
        }
    };
    
    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }
        
        const fetchWorkspaces = async () => {
            try {
                const { data, error } = await workspaceService.getWorkspaces();
                if (error) throw new Error(error);
                if (data) {
                    setWorkspaces(data);
                    if (data.length > 0 && !selectedWorkspace) {
                        setSelectedWorkspace(data[0].id);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch workspaces:", error);
            }
        };

        fetchWorkspaces();
    }, [user, navigate, selectedWorkspace]);

    useEffect(() => {
        if (!scanTaskId) return;

        setScanStatusMessage('Scan initiated. Waiting for worker to pick up the task...');

        const pollInterval = setInterval(async () => {
            try {
                const data = await scannerApiService.getScanResults(scanTaskId);
                
                if (data.state === 'SUCCESS') {
                    clearInterval(pollInterval);
                    setScanResult(data.result);
                    setIsScanning(false);
                    setScanTaskId(null);
                    await processAndSaveScanResults(data.result, selectedWorkspace);

                } else if (data.state === 'FAILURE') {
                    setScanStatusMessage('Scan failed. Please check backend logs.');
                    setScanError(data.status || 'An unknown error occurred.');
                    setIsScanning(false);
                    setScanTaskId(null);
                    clearInterval(pollInterval);
                } else {
                    setScanStatusMessage(`Scan in progress... (State: ${data.state})`);
                }
            } catch (err) {
                setScanError(err.message);
                setIsScanning(false);
                setScanTaskId(null);
                clearInterval(pollInterval);
            }
        }, 5000);

        return () => clearInterval(pollInterval);
    }, [scanTaskId, selectedWorkspace]);

    const handleWorkspaceChange = (workspaceId) => {
        setSelectedWorkspace(workspaceId);
    };

    const openNewScanModal = () => {
        setScanResult(null);
        setScanError(null);
        setScanStatusMessage('');
        setIsNewScanModalOpen(true);
    };
    const closeNewScanModal = () => setIsNewScanModalOpen(false);

    const handleScanSubmit = async (scanData) => {
        console.log("Scan data received in AppLayout:", scanData);
        setScanError(null);
        setScanResult(null);
        setIsScanning(true);
        try {
            const response = await scannerApiService.startScan(scanData.target);
            setScanTaskId(response.task_id);
        } catch (error) {
            console.error("Failed to start scan:", error);
            setScanError(error.message);
            setIsScanning(false);
        }
    };

    return (
        <div className="flex h-screen bg-background text-foreground">
            <Sidebar 
                isOpen={isSidebarOpen}
                onClose={() => setSidebarOpen(false)}
                workspaces={workspaces}
                selectedWorkspace={selectedWorkspace}
                onWorkspaceChange={handleWorkspaceChange}
                onNewScanClick={openNewScanModal} 
            />
            <div className="flex-1 flex flex-col overflow-hidden min-w-0">
                <Header 
                    onMenuClick={() => setSidebarOpen(true)} 
                    onNewScanClick={openNewScanModal} 
                />
                <main className="flex-1 overflow-y-auto bg-background p-6 pt-24">
                    {(isScanning || scanStatusMessage) && (
                        <div className="bg-blue-500/10 text-blue-300 p-4 rounded-lg mb-6">
                           <p>{scanStatusMessage}</p>
                        </div>
                    )}
                    {scanError && (
                        <div className="bg-red-500/10 text-red-300 p-4 rounded-lg mb-6">
                           <p>Error: {scanError}</p>
                        </div>
                    )}
                    {scanResult && (
                        <div className="bg-green-500/10 text-green-300 p-4 rounded-lg mb-6">
                           <h3 className="font-bold">Raw Scan Results Received:</h3>
                           <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(scanResult, null, 2)}</pre>
                        </div>
                    )}
                    <Outlet context={{ 
                        openNewScanModal, 
                        workspaces, 
                        selectedWorkspace, 
                        onWorkspaceChange: handleWorkspaceChange 
                    }} /> 
                </main>
            
                <NewScanModal 
                    isOpen={isNewScanModalOpen} 
                    onClose={closeNewScanModal}
                    onSubmit={handleScanSubmit}
                />
            </div>
        </div>
    );
};

export function useAppLayout() {
    return useOutletContext();
}

export default AppLayout;