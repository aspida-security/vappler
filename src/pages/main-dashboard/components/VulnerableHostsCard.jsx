import React from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const VulnerableHostsCard = ({ hosts, onViewDetails }) => {
  const getRiskColor = (riskScore) => {
    if (riskScore >= 9) return 'text-red-500 bg-red-500/10 border-red-500/20';
    if (riskScore >= 7) return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
    if (riskScore >= 5) return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
    if (riskScore >= 3) return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
    return 'text-green-500 bg-green-500/10 border-green-500/20';
  };

  const getRiskLevel = (riskScore) => {
    if (riskScore >= 9) return 'Critical';
    if (riskScore >= 7) return 'High';
    if (riskScore >= 5) return 'Medium';
    if (riskScore >= 3) return 'Low';
    return 'Minimal';
  };

  const getOSIcon = (os) => {
    const osLower = os?.toLowerCase();
    if (osLower?.includes('windows')) return 'Monitor';
    if (osLower?.includes('linux')) return 'Terminal';
    if (osLower?.includes('mac')) return 'Laptop';
    return 'Server';
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6 shadow-elevation">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="flex items-center justify-center w-10 h-10 bg-orange-500/10 rounded-lg">
            <Icon name="Server" size={20} className="text-orange-500" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Most Vulnerable Hosts</h3>
            <p className="text-sm text-muted-foreground">Highest risk assets requiring attention</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onViewDetails('assets')}
          iconName="ExternalLink"
          iconPosition="right"
        >
          View All
        </Button>
      </div>
      <div className="space-y-4">
        {hosts?.map((host, index) => (
          <div
            key={host?.id}
            className="flex items-center space-x-4 p-4 bg-muted/30 rounded-lg border border-border/50 hover:bg-muted/50 transition-smooth cursor-pointer"
            onClick={() => onViewDetails('host', host?.id)}
          >
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted border border-border">
              <span className="text-sm font-medium text-muted-foreground">
                {index + 1}
              </span>
            </div>
            
            <div className="flex items-center justify-center w-10 h-10 bg-muted/50 rounded-lg">
              <Icon name={getOSIcon(host?.os)} size={16} className="text-muted-foreground" />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h4 className="text-sm font-medium text-foreground">
                    {host?.hostname || host?.ip}
                  </h4>
                  {host?.hostname && (
                    <p className="text-xs text-muted-foreground">{host?.ip}</p>
                  )}
                </div>
                <div className={`flex items-center space-x-2 px-3 py-1 rounded-full border text-xs font-medium ${getRiskColor(host?.riskScore)}`}>
                  <div className="w-2 h-2 rounded-full bg-current" />
                  <span>{host?.riskScore?.toFixed(1)}</span>
                </div>
              </div>
              
              <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                <div className="flex items-center space-x-1">
                  <Icon name="Shield" size={12} />
                  <span>{host?.vulnerabilities} vulns</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Icon name="Wifi" size={12} />
                  <span>{host?.openPorts} ports</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Icon name="Calendar" size={12} />
                  <span>{host?.lastScan}</span>
                </div>
              </div>
              
              <div className="flex items-center space-x-2 mt-2">
                <span className="text-xs text-muted-foreground">OS:</span>
                <span className="text-xs text-foreground">{host?.os}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${getRiskColor(host?.riskScore)}`}>
                  {getRiskLevel(host?.riskScore)} Risk
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
      {hosts?.length === 0 && (
        <div className="text-center py-8">
          <Icon name="Server" size={48} className="text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No vulnerable hosts detected</p>
          <p className="text-sm text-muted-foreground">Run a scan to identify potential security risks</p>
        </div>
      )}
    </div>
  );
};

export default VulnerableHostsCard;