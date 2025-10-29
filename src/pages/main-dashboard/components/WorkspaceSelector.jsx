import React from 'react';
import Select from '../../../components/ui/Select';
import Icon from '../../../components/AppIcon';

const WorkspaceSelector = ({ workspaces, selectedWorkspace, onWorkspaceChange, stats }) => {
  // --- START FIX ---
  const workspaceOptions = Array.isArray(workspaces) ? workspaces.map(workspace => ({
    value: workspace?.id,
    label: workspace?.name,
    // Correctly access the count from the nested array/object
    // Also format the date properly from created_at, assuming lastScan isn't directly available on workspace
    description: `${workspace?.assets?.[0]?.count ?? 0} assets • Created: ${workspace?.created_at ? new Date(workspace.created_at).toLocaleDateString() : 'N/A'}`
  })) : []; // Ensure workspaceOptions is an empty array if workspaces is not an array
  // --- END FIX ---

  const currentWorkspace = Array.isArray(workspaces) ? workspaces.find(w => w?.id === selectedWorkspace) : null;

  return (
    <div className="bg-card border border-border rounded-lg p-6 shadow-elevation">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="flex items-center justify-center w-10 h-10 bg-blue-500/10 rounded-lg">
            <Icon name="Building" size={20} className="text-blue-500" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Active Workspace</h3>
            <p className="text-sm text-muted-foreground">Select client environment</p>
          </div>
        </div>
      </div>
      <div className="space-y-4">
        <Select
          options={workspaceOptions}
          value={selectedWorkspace}
          onChange={onWorkspaceChange}
          searchable
          className="w-full"
          placeholder={Array.isArray(workspaces) && workspaces.length === 0 ? "No workspaces found" : "Select a workspace..."}
        />

        {currentWorkspace && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-border">
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center justify-center w-8 h-8 bg-green-500/10 rounded-lg mx-auto mb-2">
                <Icon name="Server" size={16} className="text-green-500" />
              </div>
              <div className="text-lg font-bold text-foreground">{stats?.totalAssets ?? 0}</div>
              <div className="text-xs text-muted-foreground">Total Assets</div>
            </div>

            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center justify-center w-8 h-8 bg-red-500/10 rounded-lg mx-auto mb-2">
                <Icon name="AlertTriangle" size={16} className="text-red-500" />
              </div>
              <div className="text-lg font-bold text-foreground">{stats?.criticalVulns ?? 0}</div>
              <div className="text-xs text-muted-foreground">Critical Vulns</div>
            </div>

            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center justify-center w-8 h-8 bg-blue-500/10 rounded-lg mx-auto mb-2">
                <Icon name="Activity" size={16} className="text-blue-500" />
              </div>
              <div className="text-lg font-bold text-foreground">{stats?.activeScans ?? 0}</div>
              <div className="text-xs text-muted-foreground">Active Scans</div>
            </div>

            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center justify-center w-8 h-8 bg-purple-500/10 rounded-lg mx-auto mb-2">
                <Icon name="TrendingUp" size={16} className="text-purple-500" />
              </div>
              <div className="text-lg font-bold text-foreground">{stats?.riskScore ?? 0}</div>
              <div className="text-xs text-muted-foreground">Risk Score</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkspaceSelector;