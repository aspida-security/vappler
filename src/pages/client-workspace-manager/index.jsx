import React, { useState, useEffect } from 'react';
import { workspaceService } from '../../services/workspaceService';
import WorkspaceCard from './components/WorkspaceCard';
import Icon from '../../components/AppIcon';

const ClientWorkspaceManager = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [workspaces, setWorkspaces] = useState([]);

  useEffect(() => {
    const fetchWorkspaces = async () => {
      setIsLoading(true);
      setError(null);
      const { data, error } = await workspaceService.getWorkspaces();

      if (error) {
        setError(error.message);
        setWorkspaces([]);
      } else if (data) {
        const formattedWorkspaces = data.map(ws => ({
          id: ws.id,
          clientName: ws.name,
          industry: ws.industry || 'Not Specified',
          assetCount: ws.assets && ws.assets.length > 0 ? ws.assets[0].count : 0,
          lastScanDate: ws.updated_at || new Date().toISOString(),
          riskScore: ws.risk_score || 0,
          criticalVulns: 0, highVulns: 0, mediumVulns: 0, lowVulns: 0,
          isActive: ws.is_active,
        }));
        setWorkspaces(formattedWorkspaces);
      }
      setIsLoading(false);
    };

    fetchWorkspaces();
  }, []);
  
  const handleSwitch = (id) => console.log(`Switching to workspace ${id}`);
  const handleEdit = (id) => console.log(`Editing client ${id}`);
  const handleReports = (id) => console.log(`Viewing reports for ${id}`);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-10">
        <Icon name="Loader" className="animate-spin mr-2" />
        Loading Client Workspaces...
      </div>
    );
  }

  if (error) {
    return (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-center">
            <p className="text-red-400 font-semibold">Error loading clients.</p>
            <p className="text-red-500 text-sm mt-1">{error}</p>
        </div>
    ); 
  }

  return (
    <div className="space-y-6">
        <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-foreground">Client Workspace Manager</h1>
            {/* Add New Client button can be wired up later */}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {workspaces.map(ws => (
                <WorkspaceCard 
                    key={ws.id} 
                    workspace={ws} 
                    onSwitchWorkspace={handleSwitch}
                    onEditClient={handleEdit}
                    onViewReports={handleReports}
                />
            ))}
        </div>

        {workspaces.length === 0 && (
            <div className="text-center p-10 bg-card rounded-lg border border-border">
                <Icon name="Users" size={48} className="mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">No Workspaces Found</h3>
                <p className="text-muted-foreground mt-2">Create your first client workspace to get started.</p>
            </div>
        )}
    </div>
  );
};

export default ClientWorkspaceManager;