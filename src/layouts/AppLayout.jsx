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

    const processScanResults = async (result) => {
        if (!result || !result.vulnerability_details || !selectedWorkspace) {
            setScanError("Save failed: Invalid scan result or no workspace selected.");
            return;
        }

        setScanStatusMessage('Saving results to database...');
        try {
            for (const hostData of result.vulnerability_details) {
                const { data: asset, error: assetError } = await assetService.createAsset({
                    workspace_id: selectedWorkspace,
                    ip_address: hostData.host,
                    hostname: hostData.host,
                    status: 'active'
                });
                if (assetError) throw new Error(`Asset creation failed: ${assetError.message}`);

                if (hostData.vulnerabilities && asset) {
                    for (const vuln of hostData.vulnerabilities) {
                        const cvss = parseFloat(vuln.cvss) || 0.0;
                        let severity = 'Info';
                        if (cvss >= 9.0) severity = 'Critical';
                        else if (cvss >= 7.0) severity = 'High';
                        else if (cvss >= 4.0) severity = 'Medium';
                        else if (cvss > 0) severity = 'Low';
                        
                        if(vuln.details && vuln.details.trim() !== "") {
                            await vulnerabilityService.createVulnerability({
                                workspace_id: selectedWorkspace,
                                asset_id: asset.id,
                                title: vuln.script_id.replace(/-/g, ' ').replace('http ', ''),
                                description: vuln.details,
                                severity: severity,
                                status: 'open',
                                port: parseInt(vuln.port, 10),
                                service: vuln.service,
                                cvss_score: cvss
                            });
                        }
                    }
                }
            }
            setScanStatusMessage('Scan complete and all results have been saved successfully!');
            // --- VULCAN CHANGE: Add a slight delay then reload the page ---
            setTimeout(() => window.location.reload(), 2000);
        } catch (error) {
            console.error("Failed to save scan results:", error);
            setScanError(`Failed to save scan results: ${error.message}`);
        }
    };
    
    useEffect(() => {
        if (!user) { navigate('/login'); return; }
        const fetchWorkspaces = async () => {
            try {
                const { data, error } = await workspaceService.getWorkspaces();
                if (error) throw new Error(error.message);
                if (data && data.length > 0 && !selectedWorkspace) {
                    setWorkspaces(data);
                    setSelectedWorkspace(data[0].id);
                } else if (data) {
                    setWorkspaces(data);
                }
            } catch (error) { console.error("Failed to fetch workspaces:", error); }
        };
        fetchWorkspaces();
    }, [user, navigate]);

    useEffect(() => {
        if (!scanTaskId) return;
        setScanStatusMessage('Scan initiated. Waiting for worker...');
        const pollInterval = setInterval(async () => {
            try {
                const data = await scannerApiService.getScanResults(scanTaskId);
                if (data.state === 'SUCCESS') {
                    clearInterval(pollInterval);
                    setIsScanning(false);
                    setScanTaskId(null);
                    setScanResult(data.result);
                    await processScanResults(data.result);
                } else if (data.state === 'FAILURE') {
                    clearInterval(pollInterval);
                    setIsScanning(false);
                    setScanTaskId(null);
                    setScanError(data.status || 'An unknown error occurred.');
                    setScanStatusMessage('Scan failed. Please check backend logs.');
                } else {
                    setScanStatusMessage(`Scan in progress... (State: ${data.state})`);
                }
            } catch (err) {
                clearInterval(pollInterval);
                setIsScanning(false);
                setScanTaskId(null);
                setScanError(err.message);
            }
        }, 5000);
        return () => clearInterval(pollInterval);
    }, [scanTaskId, selectedWorkspace]);

    const handleWorkspaceChange = (workspaceId) => setSelectedWorkspace(workspaceId);
    const openNewScanModal = () => setIsNewScanModalOpen(true);
    const closeNewScanModal = () => setIsNewScanModalOpen(false);
    const handleScanSubmit = async (scanData) => {
        setIsScanning(true);
        setScanStatusMessage(`Submitting scan for ${scanData.target}...`);
        try {
            const response = await scannerApiService.startScan(scanData.target);
            setScanTaskId(response.task_id);
            setScanStatusMessage("Scan successfully submitted to backend. Waiting for worker...");
        } catch (error) {
            console.error("CRITICAL: Failed to start scan.", error);
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
                    onMenuToggle={() => setIsSidebarOpen(!isSidebarOpen)} 
                    isMenuOpen={isSidebarOpen}
                    onNewScanClick={openNewScanModal}
                />
                <main className="flex-1 overflow-y-auto bg-background p-6">
                    {(isScanning || scanStatusMessage || scanError) && (
                        <div className={`p-4 rounded-lg mb-6 ${scanError ? 'bg-red-500/10 text-red-300' : 'bg-blue-500/10 text-blue-300'}`}>
                           <p>{scanStatusMessage || scanError}</p>
                           {scanResult && (
                               <div>
                                 <h3 className="font-bold mt-4">Scan Results:</h3>
                                 <pre className="text-xs whitespace-pre-wrap mt-2">{JSON.stringify(scanResult, null, 2)}</pre>
                               </div>
                           )}
                        </div>
                    )}
                    <Outlet context={{ openNewScanModal, selectedWorkspace }} /> 
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