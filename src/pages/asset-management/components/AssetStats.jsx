import React from 'react';
import Icon from '../../../components/AppIcon';

const AssetStats = ({ stats }) => {
  const statCards = [
    {
      title: 'Total Assets',
      value: stats?.totalAssets,
      change: stats?.assetChange,
      icon: 'Server',
      color: 'text-primary', // VAPPLER CHANGE: Use Primary (Teal)
      bgColor: 'bg-primary/10' // VAPPLER CHANGE: Use Primary (Teal)
    },
    {
      title: 'Online Assets',
      value: stats?.onlineAssets,
      change: stats?.onlineChange,
      icon: 'CheckCircle',
      color: 'text-green-500',
      bgColor: 'bg-green-500/10'
    },
    {
      title: 'Critical Vulnerabilities',
      value: stats?.criticalVulns,
      change: stats?.criticalChange,
      icon: 'AlertTriangle',
      color: 'text-red-500',
      bgColor: 'bg-red-500/10'
    },
    {
      title: 'Last Scan Coverage',
      value: `${stats?.scanCoverage}%`,
      change: stats?.coverageChange,
      icon: 'Shield',
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10'
    }
  ];

  const getChangeColor = (change) => {
    if (change > 0) return 'text-green-500';
    if (change < 0) return 'text-red-500';
    return 'text-muted-foreground';
  };

  const getChangeIcon = (change) => {
    if (change > 0) return 'TrendingUp';
    if (change < 0) return 'TrendingDown';
    return 'Minus';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
      {statCards?.map((stat, index) => (
        <div
          key={index}
          className="bg-card rounded-lg border border-border p-6 hover:shadow-elevation transition-shadow"
        >
          <div className="flex items-center justify-between mb-4">
            <div className={`p-3 rounded-lg ${stat?.bgColor}`}>
              <Icon name={stat?.icon} size={24} className={stat?.color} />
            </div>
            
            <div className="flex items-center space-x-1">
              <Icon 
                name={getChangeIcon(stat?.change)} 
                size={16} 
                className={getChangeColor(stat?.change)}
              />
              <span className={`text-sm font-medium ${getChangeColor(stat?.change)}`}>
                {Math.abs(stat?.change)}%
              </span>
            </div>
          </div>
          
          <div>
            <div className="text-2xl font-bold text-foreground mb-1">
              {typeof stat?.value === 'number' ? stat?.value?.toLocaleString() : stat?.value}
            </div>
            <div className="text-sm text-muted-foreground">
              {stat?.title}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default AssetStats;