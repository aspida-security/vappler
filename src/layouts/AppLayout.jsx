import React, { useState, useEffect } from 'react';
import { Outlet, useOutletContext, useNavigate } from 'react-router-dom'; 
import Sidebar from '../components/ui/Sidebar';
import Header from '../components/ui/Header'; 
import { workspaceService } from '../services/workspaceService';
import { useAuth } from '../contexts/AuthContext';
import NewScanModal from '../components/modals/NewScanModal';
import { scannerApiService } from '../services/scannerApiService';
import { assetService } from '../services/assetService';
import { vulnerabilityService } from '../services/vulnerabilityService';

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

    const processAndSaveScanResults = async (result) => {
        if (!selectedWorkspace) {
            throw new Error("Cannot save results: No workspace is selected.");
        }
        setScanStatusMessage('Processing and saving scan results...');
        try {
            if (!result || !result.vulnerability_details || result.vulnerability_details.length === 0) {
                throw new Error("Invalid scan result format received from backend.");
            }

            const assetDetail = result.vulnerability_details[0];
            const assetPayload = {
                workspace_id: selectedWorkspace,
                hostname: assetDetail.host,
                ip_address: assetDetail.host,
                asset_type: 'server',
                operating_system: 'Unknown',
                risk_score: 0.0,
                is_active: true,
                last_scan_at: new Date().toISOString(),
                open_ports: assetDetail.vulnerabilities.map(v => v.port)
            };

            const { data: newAsset, error: assetError } = await assetService.createAsset(assetPayload);
            if (assetError) {
                throw new Error(`Asset creation failed: ${assetError.message || 'Unknown error'}`);
            }

            const vulnerabilityPayloads = assetDetail.vulnerabilities.map(vuln => ({
                workspace_id: selectedWorkspace,
                asset_id: newAsset.id,
                scan_id: null,
                cve_id: 'CVE-2025-XXXX',
                title: vuln.details,
                description: `Discovered on port ${vuln.port} with service ${vuln.service}.`,
                severity: 'Critical',
                cvss_score: 9.8,
                status: 'open',
                port: vuln.port,
                service: vuln.service,
                remediation_steps: 'Upgrade the affected software package.',
            }));

            for (const payload of vulnerabilityPayloads) {
                const { error: vulnError } = await vulnerabilityService.createVulnerability(payload);
                if (vulnError) {
                    console.error("Failed to save a vulnerability:", vulnError);
                }
            }
            
            setScanStatusMessage('Successfully saved new asset and associated vulnerabilities!');

        } catch (err) {
            console.error("Error during data ingestion:", err);
            setScanError(`Data ingestion failed: ${err.message}`);
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
                if (data && data.length > 0) {
                    setWorkspaces(data);
                    if (!selectedWorkspace) {
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

        const pollInterval = setInterval(async () => {
            try {
                const data = await scannerApiService.getScanResults(scanTaskId);
                
                if (data.state === 'SUCCESS') {
                    clearInterval(pollInterval);
                    setScanStatusMessage('Scan complete! Results received.');
                    setScanResult(data.result);
                    setIsScanning(false);
                    setScanTaskId(null);
                    await processAndSaveScanResults(data.result);

                } else if (data.state === 'FAILURE') {
                    clearInterval(pollInterval);
                    setScanStatusMessage('Scan failed. Please check backend logs.');
                    setScanError(data.status || 'An unknown error occurred.');
                    setIsScanning(false);
                    setScanTaskId(null);
                } else {
                    setScanStatusMessage(`Scan in progress... (State: ${data.state})`);
                }
            } catch (err) {
                clearInterval(pollInterval);
                setScanError(err.message);
                setIsScanning(false);
                setScanTaskId(null);
            }
        }, 5000);

        return () => clearInterval(pollInterval);
    }, [scanTaskId, selectedWorkspace]);

    const handleWorkspaceChange = (workspaceId) => {
        setSelectedWorkspace(workspaceId);
    };

    const openNewScanModal = () => {
        if (!selectedWorkspace) {
            alert("Please select a workspace before starting a scan.");
            return;
        }
        setScanResult(null);
        setScanError(null);
        setScanStatusMessage('');
        setIsNewScanModalOpen(true);
    };
    const closeNewScanModal = () => setIsNewScanModalOpen(false);

    const handleScanSubmit = async (scanData) => {
        setIsNewScanModalOpen(false);
        setScanError(null);
        setScanResult(null);
        setIsScanning(true);
        setScanStatusMessage('Requesting new scan from the backend...');
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
                    onMenuToggle={() => setSidebarOpen(true)} 
                    onNewScanClick={openNewScanModal} 
                />
                <main className="flex-1 overflow-y-auto bg-background p-6 pt-20">
                    {scanStatusMessage && (
                        <div className="bg-blue-500/10 text-blue-300 p-4 rounded-lg mb-6">
                           <p>{scanStatusMessage}</p>
                        </div>
                    )}
                    {scanError && (
                        <div className="bg-red-500/10 text-red-300 p-4 rounded-lg mb-6">
                           <p>Error: {scanError}</p>
                        </div>
                    )}
                    {scanResult && !scanError && (
                        <div className="bg-green-500/10 text-green-300 p-4 rounded-lg mb-6">
                           <h3 className="font-bold">Scan Results Received:</h3>
                           <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(scanResult, null, 2)}</pre>
                        </div>
                    )}
                    <Outlet context={{ openNewScanModal, workspaces, selectedWorkspace, handleWorkspaceChange }} /> 
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