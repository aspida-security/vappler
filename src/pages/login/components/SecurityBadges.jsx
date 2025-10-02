import React from 'react';
import Icon from '../../../components/AppIcon';

const SecurityBadges = () => {
  const securityFeatures = [
    {
      icon: 'Shield',
      title: 'SSL Encrypted',
      description: '256-bit encryption'
    },
    {
      icon: 'Lock',
      title: 'SOC 2 Compliant',
      description: 'Type II certified'
    },
    {
      icon: 'CheckCircle',
      title: 'ISO 27001',
      description: 'Security certified'
    },
    {
      icon: 'Key',
      title: 'Multi-Factor Auth',
      description: 'Enhanced security'
    }
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
      {securityFeatures?.map((feature, index) => (
        <div
          key={index}
          className="flex flex-col items-center p-4 bg-card/50 border border-border/50 rounded-lg backdrop-blur-sm"
        >
          <div className="flex items-center justify-center w-10 h-10 bg-primary/10 rounded-lg mb-2">
            <Icon name={feature?.icon} size={20} className="text-primary" />
          </div>
          <h3 className="text-xs font-medium text-foreground text-center mb-1">
            {feature?.title}
          </h3>
          <p className="text-xs text-muted-foreground text-center">
            {feature?.description}
          </p>
        </div>
      ))}
    </div>
  );
};

export default SecurityBadges;