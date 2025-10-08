import React, { useState, useEffect } from 'react';
// --- VULCAN CHANGE: Add useOutletContext ---
import { Outlet, useOutletContext, useNavigate } from 'react-router-dom'; 
import Sidebar from '../components/ui/Sidebar';
import Header from '../components/ui/Header';
import { workspaceService } from '../services/workspaceService';
import { useAuth } from '../contexts/AuthContext';
import NewScanModal from '../components/modals/NewScanModal';

const AppLayout = () => {
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const [isNewScanModalOpen, setIsNewScanModalOpen] = useState(false);
    const [workspaces, setWorkspaces] = useState([]);
    const [selectedWorkspace, setSelectedWorkspace] = useState('');
    const { user } = useAuth();
    const navigate = useNavigate();

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

    const handleWorkspaceChange = (workspaceId) => {
        setSelectedWorkspace(workspaceId);
    };

    const openNewScanModal = () => setIsNewScanModalOpen(true);
    const closeNewScanModal = () => setIsNewScanModalOpen(false);

    const handleScanSubmit = (scanData) => {
        console.log("Scan data received in AppLayout:", scanData);
        // This is where we will call the scannerApiService
    };

    return (
        <div className="flex h-screen bg-background text-foreground">
            <Sidebar 
                isOpen={isSidebarOpen}
                onClose={() => setSidebarOpen(false)}
                workspaces={workspaces}
                selectedWorkspace={selectedWorkspace}
                onWorkspaceChange={handleWorkspaceChange}
                // --- VULCAN CHANGE: Pass handler to Sidebar ---
                onNewScanClick={openNewScanModal} 
            />
            <div className="flex-1 flex flex-col overflow-hidden">
                <Header 
                    onMenuClick={() => setSidebarOpen(true)} 
                    onNewScanClick={openNewScanModal} 
                />
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-background p-6">
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

// --- VULCAN CHANGE: Correctly implement the custom hook ---
export function useAppLayout() {
    return useOutletContext();
}

export default AppLayout;