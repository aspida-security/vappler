import React from 'react';
import Icon from '../../../components/AppIcon';

const WorkspaceSummary = ({ summaryData }) => {
  const summaryCards = [
    {
      title: 'Total Clients',
      value: summaryData?.totalClients,
      icon: 'Users',
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      change: '+2 this month'
    },
    {
      title: 'Average Risk Score',
      value: summaryData?.averageRiskScore,
      icon: 'Shield',
      color: 'text-warning',
      bgColor: 'bg-warning/10',
      change: '-5 from last month'
    },
    {
      title: 'Active Scans',
      value: summaryData?.activeScans,
      icon: 'Activity',
      color: 'text-success',
      bgColor: 'bg-success/10',
      change: '3 running now'
    },
    {
      title: 'Scheduled Scans',
      value: summaryData?.scheduledScans,
      icon: 'Calendar',
      color: 'text-accent',
      bgColor: 'bg-accent/10',
      change: 'Next in 2 hours'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {summaryCards?.map((card, index) => (
        <div key={index} className="bg-card border border-border rounded-lg p-6 hover:shadow-elevation transition-smooth">
          <div className="flex items-center justify-between mb-4">
            <div className={`flex items-center justify-center w-12 h-12 rounded-lg ${card?.bgColor}`}>
              <Icon name={card?.icon} size={24} className={card?.color} />
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-foreground">
                {card?.value}
              </div>
              <div className="text-sm text-muted-foreground">
                {card?.title}
              </div>
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            {card?.change}
          </div>
        </div>
      ))}
    </div>
  );
};

export default WorkspaceSummary;