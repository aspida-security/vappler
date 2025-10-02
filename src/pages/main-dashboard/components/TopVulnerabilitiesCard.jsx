import React from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const TopVulnerabilitiesCard = ({ vulnerabilities, onViewDetails }) => {
  const getSeverityColor = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'critical':
        return 'text-red-500 bg-red-500/10 border-red-500/20';
      case 'high':
        return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
      case 'medium':
        return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
      case 'low':
        return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
      default:
        return 'text-gray-500 bg-gray-500/10 border-gray-500/20';
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'critical':
        return 'AlertTriangle';
      case 'high':
        return 'Shield';
      case 'medium':
        return 'Info';
      case 'low':
        return 'CheckCircle';
      default:
        return 'Circle';
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6 shadow-elevation">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="flex items-center justify-center w-10 h-10 bg-red-500/10 rounded-lg">
            <Icon name="AlertTriangle" size={20} className="text-red-500" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Top 5 Critical Vulnerabilities</h3>
            <p className="text-sm text-muted-foreground">Highest priority security findings</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onViewDetails('vulnerabilities')}
          iconName="ExternalLink"
          iconPosition="right"
        >
          View All
        </Button>
      </div>
      <div className="space-y-4">
        {vulnerabilities?.map((vuln, index) => (
          <div
            key={vuln?.id}
            className="flex items-start space-x-4 p-4 bg-muted/30 rounded-lg border border-border/50 hover:bg-muted/50 transition-smooth cursor-pointer"
            onClick={() => onViewDetails('vulnerability', vuln?.id)}
          >
            <div className="flex items-center justify-center w-8 h-8 rounded-full border">
              <span className="text-sm font-medium text-muted-foreground">
                {index + 1}
              </span>
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-2">
                <h4 className="text-sm font-medium text-foreground truncate pr-2">
                  {vuln?.title}
                </h4>
                <div className={`flex items-center space-x-1 px-2 py-1 rounded-full border text-xs font-medium ${getSeverityColor(vuln?.severity)}`}>
                  <Icon name={getSeverityIcon(vuln?.severity)} size={12} />
                  <span>{vuln?.severity}</span>
                </div>
              </div>
              
              <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                <div className="flex items-center space-x-1">
                  <Icon name="Server" size={12} />
                  <span>{vuln?.affectedHosts} hosts</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Icon name="Calendar" size={12} />
                  <span>{vuln?.discoveredDate}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Icon name="TrendingUp" size={12} />
                  <span>CVSS {vuln?.cvssScore}</span>
                </div>
              </div>
              
              <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                {vuln?.description}
              </p>
            </div>
          </div>
        ))}
      </div>
      {vulnerabilities?.length === 0 && (
        <div className="text-center py-8">
          <Icon name="Shield" size={48} className="text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No critical vulnerabilities found</p>
          <p className="text-sm text-muted-foreground">Your security posture is looking good!</p>
        </div>
      )}
    </div>
  );
};

export default TopVulnerabilitiesCard;