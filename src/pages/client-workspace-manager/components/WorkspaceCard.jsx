import React from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const WorkspaceCard = ({ workspace, onSwitchWorkspace, onEditClient, onViewReports }) => {
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

  return (
    <div className="bg-card border border-border rounded-lg p-6 hover:shadow-elevation-lg transition-smooth">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-foreground mb-1">
            {workspace?.clientName}
          </h3>
          <p className="text-sm text-muted-foreground mb-2">
            {workspace?.industry}
          </p>
          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
            <span className="flex items-center space-x-1">
              <Icon name="Server" size={14} />
              <span>{workspace?.assetCount} assets</span>
            </span>
            <span className="flex items-center space-x-1">
              <Icon name="Calendar" size={14} />
              <span>Last scan: {formatDate(workspace?.lastScanDate)}</span>
            </span>
          </div>
        </div>
        
        <div className={`flex items-center justify-center w-16 h-16 rounded-lg ${getRiskScoreBg(workspace?.riskScore)}`}>
          <div className="text-center">
            <div className={`text-xl font-bold ${getRiskScoreColor(workspace?.riskScore)}`}>
              {workspace?.riskScore}
            </div>
            <div className="text-xs text-muted-foreground">Risk</div>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-destructive rounded-full"></div>
            <span className="text-sm text-muted-foreground">
              {workspace?.criticalVulns} Critical
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-warning rounded-full"></div>
            <span className="text-sm text-muted-foreground">
              {workspace?.highVulns} High
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-accent rounded-full"></div>
            <span className="text-sm text-muted-foreground">
              {workspace?.mediumVulns} Medium
            </span>
          </div>
        </div>
        
        {workspace?.isActive && (
          <div className="flex items-center space-x-1 text-xs text-success">
            <div className="w-2 h-2 bg-success rounded-full"></div>
            <span>Active</span>
          </div>
        )}
      </div>
      <div className="flex items-center space-x-2">
        <Button
          variant="default"
          size="sm"
          onClick={() => onSwitchWorkspace(workspace?.id)}
          className="flex-1"
        >
          Switch Workspace
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onEditClient(workspace?.id)}
          iconName="Edit"
        >
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onViewReports(workspace?.id)}
          iconName="FileText"
        >
        </Button>
      </div>
    </div>
  );
};

export default WorkspaceCard;