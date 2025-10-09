import React, { useState, useEffect } from 'react';
import { Outlet, useOutletContext, useNavigate } from 'react-router-dom'; 
import Sidebar from '../components/ui/Sidebar';
import Header from '../components/ui/Header'; 
import { workspaceService } from '../services/workspaceService';
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
                    if (data.length > 0) {
                        setSelectedWorkspace(data[0].id);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch workspaces:", error);
            }
        };

        fetchWorkspaces();
    }, [user, navigate]);

    useEffect(() => {
        if (!scanTaskId) return;

        setScanStatusMessage('Scan initiated. Waiting for worker to pick up the task...');

        const pollInterval = setInterval(async () => {
            try {
                const data = await scannerApiService.getScanResults(scanTaskId);
                
                if (data.state === 'SUCCESS') {
                    setScanStatusMessage('Scan complete! Results received.');
                    setScanResult(data.result);
                    setIsScanning(false);
                    setScanTaskId(null);
                    clearInterval(pollInterval);
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
    }, [scanTaskId]);

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
                <main className="flex-1 overflow-y-auto bg-background p-6 pt-16">
                    {(isScanning || scanStatusMessage) && !scanResult && !scanError && (
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
                           <h3 className="font-bold">Scan Results:</h3>
                           <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(scanResult, null, 2)}</pre>
                        </div>
                    )}
                    <Outlet context={{ openNewScanModal }} /> 
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