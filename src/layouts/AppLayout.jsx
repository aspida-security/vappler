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
        setScanStatusMessage('Processing and saving scan results...'); //

        // --- START: Code to Replace/Insert ---
        // --- START: Improved Try/Catch Block ---
        let newAsset = null; // Declare newAsset outside the try block
        try {
            // --- Asset Creation ---
            console.log("PRE-INSERT CHECK: Asset data to be sent:", JSON.stringify(assetData, null, 2));
            console.log("Attempting to create asset...");
            const { data: createdAsset, error: assetCreationError } = await assetService.createAsset(assetData); // Use a specific error variable

            if (assetCreationError) {
                console.error("Asset creation raw error object:", assetCreationError);
                console.error("Asset creation failed! Details:", assetCreationError.message);
                console.error("Data sent that caused error:", JSON.stringify(assetData, null, 2));
                // Throw specific error for asset creation phase
                throw new Error(`Asset creation phase failed: ${assetCreationError.message || 'Unknown error'}`);
            }

            if (!createdAsset) {
                console.error("Asset creation returned null/undefined data but no explicit error.");
                console.error("Data sent:", JSON.stringify(assetData, null, 2));
                throw new Error("Asset creation phase returned no data.");
            }

            newAsset = createdAsset; // Assign to outer scope variable
            console.log("POST-INSERT: Asset created successfully:", newAsset);
            setScanStatusMessage(`Asset ${newAsset.hostname || newAsset.ip_address} saved. Processing ${hostDetails?.vulnerabilities?.length || 0} vulnerabilities...`);

            // --- Vulnerability Creation Loop ---
            let vulnerabilityErrors = []; // Array to collect errors from the loop
            if (hostDetails?.vulnerabilities && hostDetails.vulnerabilities.length > 0) {
                for (const vuln of hostDetails.vulnerabilities) {
                    const vulnData = {
                        workspace_id: selectedWorkspace,
                        asset_id: newAsset.id,
                        scan_id: null, // TODO: Link scan record
                        cve_id: null, // TODO: Extract
                        title: vuln.details || 'Unknown Vulnerability',
                        description: vuln.details,
                        severity: 'Medium', // TODO: Map
                        cvss_score: null, // TODO: Extract
                        cvss_vector: null, // TODO: Extract
                        status: 'open',
                        port: vuln.port,
                        service: vuln.service,
                        proof_of_concept: null,
                        remediation_steps: 'Check Nmap output for details.', // Placeholder
                        references: null
                    };

                    console.log("Attempting to create vulnerability:", vulnData);
                    // Use a specific error variable for this step
                    const { error: vulnCreationError } = await vulnerabilityService.createVulnerability(vulnData);

                    if (vulnCreationError) {
                        const errorMsg = `Failed to save vulnerability "${vulnData.title}" for asset ${newAsset.id}: ${vulnCreationError.message}`;
                        console.error(errorMsg, vulnCreationError);
                        vulnerabilityErrors.push(errorMsg); // Collect specific error
                        // Continue to next vulnerability instead of throwing immediately
                    } else {
                        console.log(`Vulnerability "${vulnData.title}" saved successfully.`);
                    }
                }
            }

            // --- Final Status Update ---
            if (vulnerabilityErrors.length > 0) {
                // If there were errors saving some vulnerabilities, report partial success
                setScanError(`Scan complete, but ${vulnerabilityErrors.length} vulnerabilities failed to save. Check console for details.`);
                setScanStatusMessage(''); // Clear processing message
            } else {
                // If everything succeeded
                setScanStatusMessage('Scan results processed and saved successfully!');
                setScanError(null); // Explicitly clear any previous error state
            }

        } catch (error) { // Catch errors from asset creation OR critical failures
            console.error("Error during data ingestion:", error);
            // Use the error caught by the try block (could be asset creation error or something else)
            setScanError(`Failed to save scan results: ${error.message}`);
            setScanStatusMessage(''); // Clear processing message on error
        }
        // --- END: Improved Try/Catch Block ---
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