import React from 'react';
import Select from '../../../components/ui/Select';
import Icon from '../../../components/AppIcon';

const WorkspaceSelector = ({ workspaces, selectedWorkspace, onWorkspaceChange, stats }) => {
  const workspaceOptions = workspaces?.map(workspace => ({
    value: workspace?.id,
    label: workspace?.name,
    description: `${workspace?.assets} assets • ${workspace?.lastScan}`
  }));

  const currentWorkspace = workspaces?.find(w => w?.id === selectedWorkspace);

  return (
    <div className="bg-card border border-border rounded-lg p-6 shadow-elevation">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="flex items-center justify-center w-10 h-10 bg-primary/10 rounded-lg">
            <Icon name="Building" size={20} className="text-primary" />
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
        />

        {currentWorkspace && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-border">
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center justify-center w-8 h-8 bg-green-500/10 rounded-lg mx-auto mb-2">
                <Icon name="Server" size={16} className="text-green-500" />
              </div>
              <div className="text-lg font-bold text-foreground">{stats?.totalAssets}</div>
              <div className="text-xs text-muted-foreground">Total Assets</div>
            </div>
            
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center justify-center w-8 h-8 bg-red-500/10 rounded-lg mx-auto mb-2">
                <Icon name="AlertTriangle" size={16} className="text-red-500" />
              </div>
              <div className="text-lg font-bold text-foreground">{stats?.criticalVulns}</div>
              <div className="text-xs text-muted-foreground">Critical Vulns</div>
            </div>
            
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center justify-center w-8 h-8 bg-primary/10 rounded-lg mx-auto mb-2">
                <Icon name="Activity" size={16} className="text-primary" />
              </div>
              <div className="text-lg font-bold text-foreground">{stats?.activeScans}</div>
              <div className="text-xs text-muted-foreground">Active Scans</div>
            </div>
            
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center justify-center w-8 h-8 bg-purple-500/10 rounded-lg mx-auto mb-2">
                <Icon name="TrendingUp" size={16} className="text-purple-500" />
              </div>
              <div className="text-lg font-bold text-foreground">{stats?.riskScore}</div>
              <div className="text-xs text-muted-foreground">Risk Score</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkspaceSelector;