import React from 'react';
import Icon from '../../../components/AppIcon';

const LoginHeader = () => {
  return (
    <div className="text-center mb-8">
      <div className="flex items-center justify-center mb-6">
        <div className="flex items-center justify-center w-16 h-16 bg-primary rounded-xl shadow-lg">
          <Icon name="Shield" size={32} color="var(--color-primary-foreground)" />
        </div>
      </div>
      
      <h1 className="text-3xl font-bold text-foreground mb-2">
        Welcome to Vappler
      </h1>
      
      <p className="text-lg text-muted-foreground mb-4">
        Enterprise Vulnerability Management Platform
      </p>
      
      <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
        <Icon name="Users" size={16} />
        <span>Trusted by 500+ Security Consultants</span>
      </div>
    </div>
  );
};

export default LoginHeader;