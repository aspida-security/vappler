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
import { scanService } from '../services/scanService'; // Make sure scanService is imported

const AppLayout = () => {
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const [isNewScanModalOpen, setIsNewScanModalOpen] = useState(false);
    const [workspaces, setWorkspaces] = useState([]);
    const [selectedWorkspace, setSelectedWorkspace] = useState('');
    // --- VULCAN FIX 1: Destructure user for ID access ---
    const { user, userProfile } = useAuth(); 
    const navigate = useNavigate();

    const [isScanning, setIsScanning] = useState(false);
    const [scanTaskId, setScanTaskId] = useState(null);
    const [scanError, setScanError] = useState(null);
    const [scanStatusMessage, setScanStatusMessage] = useState('');
    const [scanResult, setScanResult] = useState(null);

    // --- VULCAN FIX 2: Refactor processAndSaveScanResults for robustness and scan_id use ---
    const processAndSaveScanResults = async (result) => {
        const resultScanId = result?.scan_id; // Get the scan ID from the payload (injected by Celery task)
        const vulnerabilityDetails = result?.vulnerability_details || [];
        
        if (!selectedWorkspace || !resultScanId || !user?.id) {
            setScanError("Cannot save results: Missing Workspace ID, Scan ID, or User ID.");
            // Attempt to update the scan status to failed if we have the ID
            if (resultScanId) {
                await scanService.updateScanStatus(resultScanId, 'failed');
            }
            return;
        }

        setScanStatusMessage('Processing and saving scan results...');

        let allVulnerabilityErrors = [];
        let totalHostsProcessed = 0;
        let totalVulnsSaved = 0;
        let finalStatus = 'completed';

        try {
            for (const hostDetails of vulnerabilityDetails) {
                totalHostsProcessed++;
                const ipAddress = hostDetails?.host;
                const hostname = hostDetails?.hostname || ipAddress;
                const hostVulnerabilities = hostDetails?.vulnerabilities || [];
                
                const assetData = {
                    workspace_id: selectedWorkspace,
                    hostname: hostname,
                    ip_address: ipAddress,
                    asset_type: 'server', 
                    // Calculate asset risk score based on highest vuln score (0.0 is placeholder)
                    risk_score: Math.max(...hostVulnerabilities.map(v => v.cvss_score || 0), 0),
                    last_scan_at: new Date().toISOString(),
                    is_active: true,
                };

                let newAsset = null;
                try {
                    setScanStatusMessage(`Saving asset: ${hostname} (${ipAddress})...`);
                    // Note: If asset already exists, we should update it, but for MVP we create a new one.
                    const { data: createdAsset, error: assetCreationError } = await assetService.createAsset(assetData);
                    
                    if (assetCreationError) {
                        finalStatus = 'completed_with_errors';
                        allVulnerabilityErrors.push(`Asset creation failed for ${ipAddress}: ${assetCreationError.message}`);
                        continue;
                    }
                    newAsset = createdAsset;

                } catch (e) {
                    finalStatus = 'completed_with_errors';
                    allVulnerabilityErrors.push(`Asset creation failed with unhandled error for ${ipAddress}: ${e.message}`);
                    continue;
                }
                
                if (newAsset && hostVulnerabilities.length > 0) {
                    for (const vuln of hostVulnerabilities) {
                        
                        // Fallback title in case of missing data
                        let vulnerabilityTitle = vuln.name || vuln.details || 'Unknown Vulnerability';
                        
                        // VULCAN ENHANCEMENT: Prepend a severe warning if KEV
                        if (vuln.is_kev) {
                             vulnerabilityTitle = `[EXPLOITED-KEV] ${vulnerabilityTitle}`;
                        }
                        
                        const vulnData = {
                            workspace_id: selectedWorkspace,
                            asset_id: newAsset.id,
                            scan_id: resultScanId, // *** CRITICAL FIX: USING THE PASSED SCAN ID ***
                            cve_id: vuln.cve || 'N/A', 
                            title: vulnerabilityTitle, // Updated title to flag KEV
                            description: vuln.details || 'No description provided by scanner.',
                            severity: vuln.severity || 'Medium',
                            cvss_score: vuln.cvss_score || 0.0,
                            status: 'open',
                            port: vuln.port,
                            service: vuln.service,
                            remediation_steps: vuln.remediation_steps || 'Check Nmap output for details.',
                            discovered_at: new Date().toISOString(),
                            
                            // --- VULCAN ENHANCEMENT: KEV FLAG INGESTION ---
                            // This field will be IGNORED by the DB client until schema update, 
                            // but is included here for completeness and to check client validation.
                            is_kev_exploited: vuln.is_kev || false 
                            // ---------------------------------------------
                        };
                        
                        try {
                            const { error: vulnCreationError } = await vulnerabilityService.createVulnerability(vulnData);
                            if (vulnCreationError) {
                                throw vulnCreationError;
                            }
                            totalVulnsSaved++;
                        } catch (vulnError) {
                            finalStatus = 'completed_with_errors';
                            allVulnerabilityErrors.push(`Vulnerability saving failed for ${newAsset.ip_address}: ${vulnError.message || JSON.stringify(vulnError)}`);
                        }
                    }
                }
            }
            
            const scanUpdateData = {
                status: finalStatus,
                completed_at: new Date().toISOString(),
                // NOTE: created_by is already set in api.py, no need to overwrite
                target_count: totalHostsProcessed
            };
            
            // Finalize scan record and calculate duration automatically
            const { error: updateErrorFromScanService } = await scanService.updateScanStatus(resultScanId, finalStatus, null, scanUpdateData);
            
            if (updateErrorFromScanService) {
                 console.error("Failed to update final scan status:", updateErrorFromScanService);
            }
            
            if (allVulnerabilityErrors.length > 0) {
                setScanError(`Scan complete, but ${allVulnerabilityErrors.length} data ingestion errors occurred. ${totalVulnsSaved} vulnerabilities saved.`);
                setScanStatusMessage('');
            } else {
                setScanStatusMessage(`Scan results processed and ${totalVulnsSaved} vulnerabilities saved successfully!`);
                setScanError(null);
            }

        } catch (error) {
            console.error("Critical error during data ingestion pipeline:", error);
            setScanError(`Critical failure during data ingestion: ${error.message}`);
            setScanStatusMessage('');
            // Attempt to mark scan as failed
            await scanService.updateScanStatus(resultScanId, 'failed');
        }
    };
    // --- END VULCAN FIX 2 ---
    
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
                        // Find a workspace that is active by default
                        const defaultWs = data.find(ws => ws.is_active) || data[0];
                        setSelectedWorkspace(defaultWs.id);
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
                    // CRITICAL: Pass the full result payload (which contains scan_id)
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
    }, [scanTaskId, selectedWorkspace, user?.id]); // Added user.id to dependencies

    // --- VULCAN FIX 3: Update submit handler to use user.id and capture both IDs ---
    const handleScanSubmit = async (scanData) => {
        if (!user?.id) {
            alert("Authentication error: User ID is required to start a scan.");
            return;
        }
        if (!selectedWorkspace) {
            alert("Please select a workspace before starting a scan.");
            return;
        }

        setIsNewScanModalOpen(false);
        setScanError(null);
        setScanResult(null);
        setIsScanning(true);
        setScanStatusMessage('Requesting new scan from the backend...');
        try {
            // CRITICAL FIX: Pass selectedWorkspace and user.id
            const response = await scannerApiService.startScan(
                scanData.target, 
                selectedWorkspace, 
                user.id
            ); 
            setScanTaskId(response.task_id);
            setScanStatusMessage(`Scan initiated. Task ID: ${response.task_id}. Waiting for results...`);
        } catch (error) {
            console.error("Failed to start scan:", error);
            setScanError(error.message);
            setIsScanning(false);
        }
    };
    // ------------------------------------------

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