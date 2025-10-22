// src/layouts/AppLayout.jsx
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
import { supabase } from '../lib/supabase'; // Make sure supabase client is imported

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

    const processAndSaveScanResults = async (celeryResult) => { // Renamed param for clarity
        if (!selectedWorkspace) {
            setScanError('Cannot save results: No workspace is selected.');
            return;
        }
        setScanStatusMessage('Processing results and saving to database...');

        try {
            // Use the Supabase SDK to invoke the function, passing the workspaceId in the 'query' object.
            // The SDK handles appending this to the URL as a query parameter.
            const { data, error } = await supabase.functions.invoke('process-scan-results', {
                body: celeryResult,
                // --- THE CRITICAL FIX ---
                query: { workspaceId: selectedWorkspace }, 
                // ------------------------
            });
            
            if (error) {
                // Propagate the specific error from the Edge Function back to the UI
                throw new Error(error.message || `Edge Function returned an error: ${error.name}`);
            }
            
            // Final success message for the user
            setScanStatusMessage(`Scan results successfully saved to database for asset: ${data?.assetId || 'Unknown'}.`);
            setScanTaskId(null);
            setIsScanning(false);

        } catch (error) {
            console.error('Error invoking edge function or processing response:', error);
            setScanError(`Failed to save scan results: ${error.message}`);
            setIsScanning(false);
            setScanTaskId(null);
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
                if (error) throw new Error(error.message); // Throw error message
                if (data) { // Check if data is not null/undefined
                    setWorkspaces(data);
                    // Select first workspace if none is selected and data is available
                    if (!selectedWorkspace && data.length > 0) {
                        setSelectedWorkspace(data[0].id);
                    }
                } else {
                    setWorkspaces([]); // Set to empty array if data is null/undefined
                }
            } catch (error) {
                console.error("Failed to fetch workspaces:", error.message);
                // Optionally set an error state here to show in the UI
            }
        };


        fetchWorkspaces();
    }, [user, navigate, selectedWorkspace]);

    useEffect(() => {
        if (!scanTaskId) return;

        console.log(`Polling for results of task ID: ${scanTaskId}`); // Log polling start
        const pollInterval = setInterval(async () => {
            try {
                console.log(`Polling task ${scanTaskId}...`); // Log each poll attempt
                const data = await scannerApiService.getScanResults(scanTaskId);
                console.log(`Received poll data for ${scanTaskId}:`, data); // Log received data

                if (data.state === 'SUCCESS') {
                    console.log(`Task ${scanTaskId} SUCCESS received.`); // Log success
                    clearInterval(pollInterval);
                    setScanStatusMessage('Scan complete! Results received.');
                    setScanResult(data.result); // Store the inner result for potential display
                    setIsScanning(false);
                    setScanTaskId(null);

                    // --- THIS IS THE FIX ---
                    // Pass the INNER data.result object to the processing function
                    await processAndSaveScanResults(data.result);
                    // --- END FIX ---

                } else if (data.state === 'FAILURE') {
                    console.error(`Task ${scanTaskId} FAILED.`); // Log failure
                    clearInterval(pollInterval);
                    setScanStatusMessage('Scan failed. Please check backend logs.');
                    setScanError(data.status || 'An unknown error occurred during scan execution.');
                    setIsScanning(false);
                    setScanTaskId(null);
                } else {
                    // Keep polling, update status (optional)
                     setScanStatusMessage(`Scan in progress... (State: ${data.state || 'PENDING'})`);
                    console.log(`Task ${scanTaskId} state is ${data.state || 'PENDING'}. Continuing poll.`);
                }
            } catch (err) {
                console.error(`Error polling task ${scanTaskId}:`, err); // Log polling error
                clearInterval(pollInterval);
                setScanError(`Failed to poll scan results: ${err.message}`);
                setIsScanning(false);
                setScanTaskId(null);
                setScanStatusMessage('Error fetching scan results.'); // Update UI
            }
        }, 5000); // Poll every 5 seconds

        // Cleanup function to clear interval if component unmounts or scanTaskId changes
        return () => {
            console.log(`Clearing poll interval for task ID: ${scanTaskId}`);
            clearInterval(pollInterval);
        }
    }, [scanTaskId, selectedWorkspace]); // Added selectedWorkspace dependency

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
        setIsScanning(true); // Indicate scanning process started
        setScanStatusMessage('Requesting new scan from the backend...');
        try {
            console.log("Starting scan for target:", scanData.target); // Log scan start
            const response = await scannerApiService.startScan(scanData.target);
            console.log("Scan started, Task ID:", response.task_id); // Log task ID
            setScanTaskId(response.task_id); // Start polling by setting the task ID
        } catch (error) {
            console.error("Failed to start scan:", error);
            setScanError(`Failed to initiate scan: ${error.message}`);
            setIsScanning(false);
            setScanStatusMessage(''); // Clear status message on error
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
                    onMenuToggle={() => setSidebarOpen(!isSidebarOpen)} // Toggle sidebar
                    isMenuOpen={isSidebarOpen} // Pass state to header if needed
                    onNewScanClick={openNewScanModal}
                />
                <main className="flex-1 overflow-y-auto bg-background p-6 pt-4 lg:pt-6"> {/* Adjusted padding */}
                    {/* Status/Error Messages */}
                    {scanStatusMessage && !scanError && ( // Only show status if no error
                        <div className="bg-blue-900/50 border border-blue-700 text-blue-200 px-4 py-3 rounded relative mb-4" role="alert">
                           <span className="block sm:inline">{scanStatusMessage}</span>
                        </div>
                    )}
                    {scanError && (
                        <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded relative mb-4" role="alert">
                           <strong className="font-bold">Error: </strong>
                           <span className="block sm:inline">{scanError}</span>
                        </div>
                    )}
                    {/* Optional: Display Scan Results for Debugging */}
                    {/* {scanResult && !scanError && (
                        <div className="bg-green-900/50 border border-green-700 text-green-200 p-4 rounded-lg mb-4">
                           <h3 className="font-bold mb-2">Scan Results Received (Debug):</h3>
                           <pre className="text-xs whitespace-pre-wrap overflow-auto max-h-60 bg-black/20 p-2 rounded">{JSON.stringify(scanResult, null, 2)}</pre>
                        </div>
                    )} */}
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