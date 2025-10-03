import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar'; 
import Header from '../components/Header'; 
import { workspaceService } from '../services/workspaceService';
import { useAuth } from '../contexts/AuthContext';

const AppLayout = () => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [workspaces, setWorkspaces] = useState([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to login if user is not authenticated
    if (!user) {
      navigate('/login');
      return;
    }

    // Fetch workspaces when the component mounts
    const fetchWorkspaces = async () => {
      try {
        // Correctly handle the { data, error } object from the service
        const { data, error } = await workspaceService.getWorkspaces();

        // Check for errors from the service call
        if (error) {
          throw new Error(error);
        }

        // Set the workspaces state with the returned data array
        if (data) {
          setWorkspaces(data);
          if (data.length > 0) {
            setSelectedWorkspace(data[0].id); // Select the first workspace
          }
        }
      } catch (error) {
        console.error("Failed to fetch workspaces:", error);
        // You could add error handling here, like showing a toast notification
      }
    };

    fetchWorkspaces();
  }, [user, navigate]);

  const handleWorkspaceChange = (workspaceId) => {
    setSelectedWorkspace(workspaceId);
    console.log("Switched to workspace:", workspaceId);
  };

  return (
    <div className="flex h-screen bg-background text-foreground">
      <Sidebar 
        isOpen={isSidebarOpen}
        onClose={() => setSidebarOpen(false)}
        workspaces={workspaces}
        selectedWorkspace={selectedWorkspace}
        onWorkspaceChange={handleWorkspaceChange}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-background p-6">
          <Outlet /> 
        </main>
      </div>
    </div>
  );
};

export default AppLayout;