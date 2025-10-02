import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import { Checkbox } from '../../../components/ui/Checkbox';

const WorkspaceTable = ({ 
  workspaces, 
  selectedWorkspaces, 
  onSelectWorkspace, 
  onSelectAll, 
  onSwitchWorkspace, 
  onEditClient, 
  onViewReports,
  sortBy,
  sortOrder,
  onSort
}) => {
  const getRiskScoreColor = (score) => {
    if (score >= 80) return 'text-destructive';
    if (score >= 60) return 'text-warning';
    if (score >= 40) return 'text-accent';
    return 'text-success';
  };

  const getRiskScoreBg = (score) => {
    if (score >= 80) return 'bg-destructive/10';
    if (score >= 60) return 'bg-warning/10';
    if (score >= 40) return 'bg-accent/10';
    return 'bg-success/10';
  };

  const formatDate = (dateString) => {
    return new Date(dateString)?.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleSort = (field) => {
    const newOrder = sortBy === field && sortOrder === 'asc' ? 'desc' : 'asc';
    onSort(field, newOrder);
  };

  const getSortIcon = (field) => {
    if (sortBy !== field) return 'ArrowUpDown';
    return sortOrder === 'asc' ? 'ArrowUp' : 'ArrowDown';
  };

  const columns = [
    { key: 'clientName', label: 'Client Name', sortable: true },
    { key: 'industry', label: 'Industry', sortable: true },
    { key: 'assetCount', label: 'Assets', sortable: true },
    { key: 'lastScanDate', label: 'Last Scan', sortable: true },
    { key: 'riskScore', label: 'Risk Score', sortable: true },
    { key: 'vulnerabilities', label: 'Active Vulnerabilities', sortable: false },
    { key: 'actions', label: 'Actions', sortable: false }
  ];

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50 border-b border-border">
            <tr>
              <th className="w-12 px-4 py-3">
                <Checkbox
                  checked={selectedWorkspaces?.length === workspaces?.length}
                  indeterminate={selectedWorkspaces?.length > 0 && selectedWorkspaces?.length < workspaces?.length}
                  onChange={(e) => onSelectAll(e?.target?.checked)}
                />
              </th>
              {columns?.map((column) => (
                <th key={column?.key} className="px-4 py-3 text-left">
                  {column?.sortable ? (
                    <button
                      onClick={() => handleSort(column?.key)}
                      className="flex items-center space-x-2 text-sm font-medium text-foreground hover:text-accent transition-smooth"
                    >
                      <span>{column?.label}</span>
                      <Icon name={getSortIcon(column?.key)} size={14} />
                    </button>
                  ) : (
                    <span className="text-sm font-medium text-foreground">
                      {column?.label}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {workspaces?.map((workspace) => (
              <tr key={workspace?.id} className="border-b border-border hover:bg-muted/30 transition-smooth">
                <td className="px-4 py-4">
                  <Checkbox
                    checked={selectedWorkspaces?.includes(workspace?.id)}
                    onChange={(e) => onSelectWorkspace(workspace?.id, e?.target?.checked)}
                  />
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-8 h-8 bg-primary/10 rounded-lg">
                      <Icon name="Building" size={16} className="text-primary" />
                    </div>
                    <div>
                      <div className="font-medium text-foreground">
                        {workspace?.clientName}
                      </div>
                      {workspace?.isActive && (
                        <div className="flex items-center space-x-1 text-xs text-success">
                          <div className="w-1.5 h-1.5 bg-success rounded-full"></div>
                          <span>Active</span>
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <span className="text-sm text-muted-foreground">
                    {workspace?.industry}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center space-x-2">
                    <Icon name="Server" size={14} className="text-muted-foreground" />
                    <span className="text-sm text-foreground">
                      {workspace?.assetCount}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <span className="text-sm text-muted-foreground">
                    {formatDate(workspace?.lastScanDate)}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <div className={`inline-flex items-center justify-center w-12 h-8 rounded-lg ${getRiskScoreBg(workspace?.riskScore)}`}>
                    <span className={`text-sm font-semibold ${getRiskScoreColor(workspace?.riskScore)}`}>
                      {workspace?.riskScore}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-destructive rounded-full"></div>
                      <span className="text-xs text-muted-foreground">
                        {workspace?.criticalVulns}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-warning rounded-full"></div>
                      <span className="text-xs text-muted-foreground">
                        {workspace?.highVulns}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-accent rounded-full"></div>
                      <span className="text-xs text-muted-foreground">
                        {workspace?.mediumVulns}
                      </span>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => onSwitchWorkspace(workspace?.id)}
                    >
                      Switch
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEditClient(workspace?.id)}
                      iconName="Edit"
                    >
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onViewReports(workspace?.id)}
                      iconName="FileText"
                    >
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default WorkspaceTable;