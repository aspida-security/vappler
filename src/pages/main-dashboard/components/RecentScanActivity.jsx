import React from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const RecentScanActivity = ({ scans, onViewDetails }) => {
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'text-green-500 bg-green-500/10 border-green-500/20';
      case 'running':
        return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
      case 'failed':
        return 'text-red-500 bg-red-500/10 border-red-500/20';
      case 'paused':
        return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
      case 'scheduled':
        return 'text-purple-500 bg-purple-500/10 border-purple-500/20';
      default:
        return 'text-gray-500 bg-gray-500/10 border-gray-500/20';
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'CheckCircle';
      case 'running':
        return 'Play';
      case 'failed':
        return 'XCircle';
      case 'paused':
        return 'Pause';
      case 'scheduled':
        return 'Clock';
      default:
        return 'Circle';
    }
  };

  const formatDuration = (minutes) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6 shadow-elevation">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="flex items-center justify-center w-10 h-10 bg-blue-500/10 rounded-lg">
            <Icon name="Activity" size={20} className="text-blue-500" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Recent Scan Activity</h3>
            <p className="text-sm text-muted-foreground">Latest scanning operations</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onViewDetails('scans')}
          iconName="ExternalLink"
          iconPosition="right"
        >
          View All
        </Button>
      </div>
      <div className="space-y-4">
        {scans?.map((scan) => (
          <div
            key={scan?.id}
            className="flex items-center space-x-4 p-4 bg-muted/30 rounded-lg border border-border/50 hover:bg-muted/50 transition-smooth cursor-pointer"
            onClick={() => onViewDetails('scan', scan?.id)}
          >
            <div className={`flex items-center justify-center w-10 h-10 rounded-lg border ${getStatusColor(scan?.status)}`}>
              <Icon name={getStatusIcon(scan?.status)} size={16} />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <h4 className="text-sm font-medium text-foreground truncate">
                  {scan?.name}
                </h4>
                <div className={`px-2 py-1 rounded-full border text-xs font-medium ${getStatusColor(scan?.status)}`}>
                  {scan?.status}
                </div>
              </div>
              
              <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                <div className="flex items-center space-x-1">
                  <Icon name="Users" size={12} />
                  <span>{scan?.workspace}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Icon name="Server" size={12} />
                  <span>{scan?.targets} targets</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Icon name="Clock" size={12} />
                  <span>{scan?.duration ? formatDuration(scan?.duration) : scan?.startTime}</span>
                </div>
              </div>
              
              {scan?.status === 'running' && scan?.progress && (
                <div className="mt-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span>Progress</span>
                    <span>{scan?.progress}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5">
                    <div 
                      className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${scan?.progress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      {scans?.length === 0 && (
        <div className="text-center py-8">
          <Icon name="Activity" size={48} className="text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No recent scan activity</p>
          <p className="text-sm text-muted-foreground">Start your first scan to see activity here</p>
        </div>
      )}
    </div>
  );
};

export default RecentScanActivity;