// FILE: src/layouts/AppLayout.jsx
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
import { scanService } from '../services/scanService';

const AppLayout = () => {
    // --- State Declarations (Moved scanId UP) ---
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const [isNewScanModalOpen, setIsNewScanModalOpen] = useState(false);
    const [workspaces, setWorkspaces] = useState([]);
    const [selectedWorkspace, setSelectedWorkspace] = useState('');
    const { user, userProfile } = useAuth();
    const navigate = useNavigate();
    const [isScanning, setIsScanning] = useState(false);
    const [scanTaskId, setScanTaskId] = useState(null);
    const [scanError, setScanError] = useState(null);
    const [scanStatusMessage, setScanStatusMessage] = useState('');
    const [scanResult, setScanResult] = useState(null);
    // *** FIX: Moved scanId state declaration UP ***
    const [scanId, setScanId] = useState(null); // To store the DB ID of the scan record
    // --- End State Declarations ---

    // --- processAndSaveScanResults Function ---
    // (This function remains the same as the previous version)
    const processAndSaveScanResults = async (result, scanId) => {
        if (!selectedWorkspace) {
            console.error("[AppLayout] Cannot save results: No workspace is selected.");
            throw new Error("Cannot save results: No workspace is selected.");
        }
        if (!scanId) {
             console.error("[AppLayout] Cannot save results: Scan ID is missing.");
             throw new Error("Cannot save results: Scan ID is missing.");
        }
        setScanStatusMessage('Processing and saving scan results...');
        console.log("[AppLayout] Starting data ingestion for scan:", scanId, "Result data:", result);

        if (!result || !result.vulnerability_details || result.vulnerability_details.length === 0) {
             console.warn("[AppLayout] No vulnerability details found in scan result for scan:", scanId);
             setScanStatusMessage('Scan complete, but no new host details found.');
             try {
                await scanService.updateScanStatus(scanId, 'completed', 100);
                console.log(`[AppLayout] Scan record ${scanId} marked as completed (no hosts).`);
             } catch (updateErr) {
                console.error(`[AppLayout] Failed to update scan ${scanId} status after no hosts found:`, updateErr);
             }
             return;
        }

        let overallIngestionError = null;
        let successfulIngestions = 0;
        let failedIngestions = 0;

        for (const hostDetails of result.vulnerability_details) {
            if (!hostDetails || !hostDetails.host) {
                 console.warn("[AppLayout] Skipping invalid host entry in results:", hostDetails);
                 continue;
            }

            const hostIpOrName = hostDetails.host;
            console.log(`[AppLayout] Processing host: ${hostIpOrName}`);

             const assetData = {
                workspace_id: selectedWorkspace,
                ...(hostIpOrName.match(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/)
                     ? { ip_address: hostIpOrName, hostname: null }
                     : { hostname: hostIpOrName, ip_address: null }),
                operating_system: 'Unknown',
                risk_score: 0.0,
                is_active: true,
                last_scan_at: new Date().toISOString()
             };

            let newAsset = null;
            try {
                console.log(`[AppLayout] Preparing to save asset: ${hostIpOrName}`);
                const { data: createdAsset, error: assetCreationError } = await assetService.createAsset(assetData);

                if (assetCreationError) {
                    console.error(`[AppLayout] Asset creation failed for ${hostIpOrName}:`, assetCreationError);
                    console.error("    Data sent:", JSON.stringify(assetData, null, 2));
                    throw new Error(`Asset creation failed: ${assetCreationError.message || 'Unknown DB error'}`);
                }
                if (!createdAsset) {
                    console.error(`[AppLayout] Asset creation returned no data for ${hostIpOrName}.`);
                    throw new Error("Asset creation returned no data.");
                }
                newAsset = createdAsset;
                console.log(`[AppLayout] Asset saved/updated successfully for ${hostIpOrName}. Asset ID: ${newAsset.id}`);

                let vulnerabilityErrors = [];
                if (hostDetails.vulnerabilities && hostDetails.vulnerabilities.length > 0) {
                    console.log(`[AppLayout] Saving ${hostDetails.vulnerabilities.length} vulnerabilities for asset ${newAsset.id}...`);
                    for (const vuln of hostDetails.vulnerabilities) {
                        let severity = 'Info';
                        const score = vuln.cvss_score || 0;
                        if (score >= 9.0) severity = 'Critical';
                        else if (score >= 7.0) severity = 'High';
                        else if (score >= 4.0) severity = 'Medium';
                        else if (score > 0) severity = 'Low';

                        const vulnData = {
                            workspace_id: selectedWorkspace,
                            asset_id: newAsset.id,
                            scan_id: scanId,
                            cve_id: vuln.cve || null,
                            title: vuln.name || vuln.details || 'Unknown Vulnerability',
                            description: vuln.details || vuln.name || 'No description provided.',
                            severity: severity,
                            cvss_score: vuln.cvss_score || null,
                            status: 'open',
                            port: vuln.port || null,
                            service: vuln.service || null,
                            remediation_steps: 'Review scanner output and vendor advisories.',
                            discovered_at: new Date().toISOString()
                        };

                        const { error: vulnCreationError } = await vulnerabilityService.createVulnerability(vulnData);

                        if (vulnCreationError) {
                            const errorMsg = `Failed to save vulnerability "${vulnData.title}" for asset ${newAsset.id}: ${vulnCreationError.message}`;
                            console.error(`[AppLayout]   ${errorMsg}`, vulnCreationError);
                            vulnerabilityErrors.push(errorMsg);
                        }
                    }
                } else {
                    console.log(`[AppLayout] No vulnerabilities reported for asset ${newAsset.id}.`);
                }


                if (vulnerabilityErrors.length > 0) {
                    console.warn(`[AppLayout] Finished processing host ${hostIpOrName} with ${vulnerabilityErrors.length} vulnerability save errors.`);
                    failedIngestions++;
                    if (!overallIngestionError) {
                       overallIngestionError = `Partially failed to save vulnerabilities for host ${hostIpOrName}. Check logs.`;
                    }
                } else {
                    console.log(`[AppLayout] Finished processing host ${hostIpOrName} successfully.`);
                    successfulIngestions++;
                }

            } catch (hostProcessingError) {
                console.error(`[AppLayout] CRITICAL ERROR processing host ${hostIpOrName}:`, hostProcessingError);
                failedIngestions++;
                 if (!overallIngestionError) {
                    overallIngestionError = `Failed to process host ${hostIpOrName}: ${hostProcessingError.message}`;
                 }
            }
        } // End of loop

        try {
            const finalScanStatus = overallIngestionError ? 'completed_with_errors' : 'completed';
             await scanService.updateScanStatus(scanId, finalScanStatus, 100);
             console.log(`[AppLayout] Scan record ${scanId} updated to status: ${finalScanStatus}.`);

             if (overallIngestionError) {
                 setScanError(`Scan completed, but errors occurred during data saving: ${overallIngestionError}`);
                 setScanStatusMessage('');
             } else {
                 setScanStatusMessage(`Scan results processed and saved successfully! (${successfulIngestions} hosts processed).`);
                 setScanError(null);
             }
        } catch (finalUpdateError) {
             console.error(`[AppLayout] Failed to update final scan status for ${scanId}:`, finalUpdateError);
              setScanError(overallIngestionError || `Scan completed, but failed to update final scan status: ${finalUpdateError.message}`);
              setScanStatusMessage('');
        }
    };
    // --- End processAndSaveScanResults ---


    // --- useEffect Hooks ---
    useEffect(() => {
        // Workspace fetching logic (remains the same)
        if (!user) {
            console.log("[AppLayout] No user found, redirecting to login.");
            navigate('/login');
            return;
        }

        const fetchWorkspaces = async () => {
            console.log("[AppLayout] Fetching workspaces...");
            try {
                const { data, error } = await workspaceService.getWorkspaces();
                if (error) {
                    console.error("[AppLayout] Error fetching workspaces:", error.message);
                    throw new Error(error.message);
                }
                if (data) {
                    console.log(`[AppLayout] Found ${data.length} workspaces.`);
                    setWorkspaces(data);
                    if (data.length > 0 && (!selectedWorkspace || !data.some(w => w.id === selectedWorkspace))) {
                        console.log(`[AppLayout] Auto-selecting first workspace: ${data[0].id}`);
                        setSelectedWorkspace(data[0].id);
                    } else if (data.length === 0) {
                        console.log("[AppLayout] No workspaces found for user.");
                        setSelectedWorkspace('');
                    }
                } else {
                     console.log("[AppLayout] No workspace data returned.");
                     setWorkspaces([]);
                     setSelectedWorkspace('');
                }
            } catch (error) {
                console.error("[AppLayout] Failed to fetch workspaces:", error);
                setScanError(`Failed to load workspaces: ${error.message}`);
            }
        };

        fetchWorkspaces();
    }, [user, navigate]);


    // Polling useEffect (scanId is now declared above)
    useEffect(() => {
        // *** This useEffect hook now correctly uses scanId declared earlier ***
        if (!scanTaskId || !scanId) return;

        console.log(`[AppLayout] Starting polling for Celery task: ${scanTaskId}, related to Scan record: ${scanId}`);
        setScanStatusMessage('Scan requested. Waiting for worker...');

        const pollInterval = setInterval(async () => {
            console.log(`[AppLayout] Polling task status for ${scanTaskId}...`);
            try {
                const data = await scannerApiService.getScanResults(scanTaskId);

                if (data.state === 'SUCCESS') {
                    clearInterval(pollInterval);
                    console.log(`[AppLayout] Task ${scanTaskId} SUCCESS. Results received:`, data.result);
                    setScanStatusMessage('Scan complete! Processing results...');
                    setScanResult(data.result);
                    setIsScanning(false);
                    setScanTaskId(null);
                    await processAndSaveScanResults(data.result, scanId); // Pass scanId

                } else if (data.state === 'FAILURE') {
                    clearInterval(pollInterval);
                    const failureReason = data.status || 'Unknown error occurred in worker.';
                    console.error(`[AppLayout] Task ${scanTaskId} FAILURE. Reason: ${failureReason}`);
                    setScanStatusMessage('Scan failed.');
                    setScanError(failureReason);
                    setIsScanning(false);
                    setScanTaskId(null);
                    try {
                         await scanService.updateScanStatus(scanId, 'failed');
                         console.log(`[AppLayout] Scan record ${scanId} marked as failed.`);
                    } catch (updateErr) {
                         console.error(`[AppLayout] Failed to update scan ${scanId} status after task failure:`, updateErr);
                    }

                } else if (data.state === 'STARTED') {
                     try {
                         await scanService.updateScanStatus(scanId, 'running');
                         console.log(`[AppLayout] Scan record ${scanId} marked as running.`);
                     } catch (updateErr) {
                          console.warn(`[AppLayout] Failed to update scan ${scanId} status to running:`, updateErr);
                     }
                     setScanStatusMessage(`Scan in progress... (Worker processing)`);
                }
                 else {
                    setScanStatusMessage(`Scan status: ${data.state}...`);
                }
            } catch (err) {
                clearInterval(pollInterval);
                console.error(`[AppLayout] Error polling task ${scanTaskId}:`, err);
                setScanError(`Error checking scan status: ${err.message}`);
                setIsScanning(false);
                setScanTaskId(null);
                 try {
                      await scanService.updateScanStatus(scanId, 'failed');
                      console.log(`[AppLayout] Scan record ${scanId} marked as failed due to polling error.`);
                 } catch (updateErr) {
                      console.error(`[AppLayout] Failed to update scan ${scanId} status after polling error:`, updateErr);
                 }
            }
        }, 5000);

        return () => clearInterval(pollInterval);
    }, [scanTaskId, scanId, selectedWorkspace]); // Dependencies are correct
    // --- End useEffect Hooks ---


    // --- Event Handlers ---
    const handleWorkspaceChange = (workspaceId) => {
        console.log(`[AppLayout] Workspace changed to: ${workspaceId}`);
        setSelectedWorkspace(workspaceId);
        setScanError(null);
        setScanStatusMessage('');
        setScanResult(null);
        setIsScanning(false);
        setScanTaskId(null);
        setScanId(null);
    };

    const openNewScanModal = () => {
        if (!selectedWorkspace) {
            console.warn("[AppLayout] Tried to open New Scan modal without a selected workspace.");
            alert("Please select a workspace before starting a scan.");
            return;
        }
        console.log("[AppLayout] Opening New Scan modal.");
        setScanResult(null);
        setScanError(null);
        setScanStatusMessage('');
        setIsNewScanModalOpen(true);
    };
    const closeNewScanModal = () => setIsNewScanModalOpen(false);


    const handleScanSubmit = async (scanData) => {
        if (!selectedWorkspace || !user) {
             console.error("[AppLayout] Cannot submit scan: Missing workspace or user.");
             setScanError("Cannot start scan: Workspace not selected or user not logged in.");
             return;
        }
        console.log(`[AppLayout] handleScanSubmit called with target: ${scanData.target}`);
        setIsNewScanModalOpen(false);
        setScanError(null);
        setScanResult(null);
        setIsScanning(true);
        setScanStatusMessage('Initializing scan in database...');
        setScanTaskId(null);
        setScanId(null);

        try {
            // Backend /scan endpoint handles DB insert now
            const response = await scannerApiService.startScan(scanData.target, selectedWorkspace); // Pass workspaceId

            if (response.task_id && response.scan_id) {
                 console.log(`[AppLayout] Scan initialized. Scan ID: ${response.scan_id}, Task ID: ${response.task_id}`);
                 setScanId(response.scan_id);
                 setScanTaskId(response.task_id);
                 setScanStatusMessage('Scan queued. Waiting for worker...');
            } else {
                 throw new Error("Backend did not return expected task_id and scan_id.");
            }
        } catch (error) {
            console.error("[AppLayout] Failed to start scan:", error);
            setScanError(`Failed to initialize scan: ${error.message}`);
            setIsScanning(false);
        }
    };
    // --- End Event Handlers ---


    // --- Render ---
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
                    {/* Status Banners */}
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
                           <h3 className="font-bold">Scan Results Received (Debug):</h3>
                           <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(scanResult, null, 2)}</pre>
                        </div>
                    )}
                    {/* Main Content Area */}
                    <Outlet context={{ openNewScanModal, workspaces, selectedWorkspace, handleWorkspaceChange }} />
                </main>
                {/* Scan Modal */}
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