import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';

const AssetDiscovery = ({ onDiscoveryStart, discoveryStatus }) => {
  const [discoveryType, setDiscoveryType] = useState('subnet');
  const [targetInput, setTargetInput] = useState('');
  const [portRange, setPortRange] = useState('common');

  const discoveryTypeOptions = [
    { value: 'subnet', label: 'Subnet Discovery', description: 'Scan IP ranges and subnets' },
    { value: 'single', label: 'Single Host', description: 'Scan individual IP addresses' },
    { value: 'domain', label: 'Domain Discovery', description: 'Discover subdomains and web assets' },
    { value: 'import', label: 'Import List', description: 'Upload asset list from file' }
  ];

  const portRangeOptions = [
    { value: 'common', label: 'Common Ports (Top 1000)' },
    { value: 'full', label: 'Full Port Range (1-65535)' },
    { value: 'custom', label: 'Custom Port Range' }
  ];

  const recentDiscoveries = [
    {
      id: 1,
      target: '192.168.1.0/24',
      type: 'Subnet',
      assetsFound: 24,
      timestamp: new Date(Date.now() - 3600000),
      status: 'completed'
    },
    {
      id: 2,
      target: 'example.com',
      type: 'Domain',
      assetsFound: 8,
      timestamp: new Date(Date.now() - 7200000),
      status: 'completed'
    },
    {
      id: 3,
      target: '10.0.0.0/16',
      type: 'Subnet',
      assetsFound: 156,
      timestamp: new Date(Date.now() - 86400000),
      status: 'completed'
    }
  ];

  const handleStartDiscovery = () => {
    if (!targetInput?.trim()) return;
    
    const discoveryConfig = {
      type: discoveryType,
      target: targetInput,
      portRange: portRange,
      timestamp: new Date()
    };
    
    onDiscoveryStart(discoveryConfig);
  };

  const getPlaceholder = () => {
    switch (discoveryType) {
      case 'subnet': return 'e.g., 192.168.1.0/24 or 10.0.0.1-10.0.0.100';
      case 'single': return 'e.g., 192.168.1.100 or server.example.com';
      case 'domain': return 'e.g., example.com or *.example.com';
      case 'import': return 'Select file to upload...';
      default: return 'Enter target...';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'running': return 'text-blue-500';
      case 'completed': return 'text-green-500';
      case 'failed': return 'text-red-500';
      default: return 'text-muted-foreground';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'running': return 'Loader';
      case 'completed': return 'CheckCircle';
      case 'failed': return 'XCircle';
      default: return 'Clock';
    }
  };

  return (
    <div className="bg-card rounded-lg border border-border">
      <div className="p-6 border-b border-border">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Icon name="Search" size={20} className="text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Asset Discovery</h3>
            <p className="text-sm text-muted-foreground">
              Discover and add new assets to your workspace
            </p>
          </div>
        </div>

        {/* Discovery Configuration */}
        <div className="space-y-4">
          <Select
            label="Discovery Type"
            options={discoveryTypeOptions}
            value={discoveryType}
            onChange={setDiscoveryType}
            className="w-full"
          />

          <Input
            label="Target"
            type={discoveryType === 'import' ? 'file' : 'text'}
            placeholder={getPlaceholder()}
            value={targetInput}
            onChange={(e) => setTargetInput(e?.target?.value)}
            description={
              discoveryType === 'subnet' ?'Enter IP ranges in CIDR notation or range format'
                : discoveryType === 'domain' ?'Enter domain names or use wildcards for subdomain discovery' :'Enter the target for discovery'
            }
          />

          {discoveryType !== 'import' && (
            <Select
              label="Port Scanning"
              options={portRangeOptions}
              value={portRange}
              onChange={setPortRange}
              description="Select which ports to scan during discovery"
            />
          )}

          <div className="flex items-center justify-between pt-4">
            <div className="text-sm text-muted-foreground">
              {discoveryStatus?.isRunning ? (
                <div className="flex items-center space-x-2">
                  <Icon name="Loader" size={16} className="text-blue-500 animate-spin" />
                  <span>Discovery in progress... {discoveryStatus?.progress}%</span>
                </div>
              ) : (
                'Ready to start discovery'
              )}
            </div>

            <Button
              variant="default"
              onClick={handleStartDiscovery}
              disabled={!targetInput?.trim() || discoveryStatus?.isRunning}
              loading={discoveryStatus?.isRunning}
              iconName="Search"
              iconPosition="left"
            >
              Start Discovery
            </Button>
          </div>
        </div>
      </div>
      {/* Recent Discoveries */}
      <div className="p-6">
        <h4 className="text-sm font-medium text-foreground mb-4">Recent Discoveries</h4>
        
        <div className="space-y-3">
          {recentDiscoveries?.map((discovery) => (
            <div
              key={discovery?.id}
              className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <Icon 
                  name={getStatusIcon(discovery?.status)} 
                  size={16} 
                  className={getStatusColor(discovery?.status)}
                />
                
                <div>
                  <div className="text-sm font-medium text-foreground">
                    {discovery?.target}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {discovery?.type} • {discovery?.assetsFound} assets found
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-xs text-muted-foreground">
                  {discovery?.timestamp?.toLocaleDateString()}
                </div>
                <div className="text-xs text-muted-foreground">
                  {discovery?.timestamp?.toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}
        </div>

        {recentDiscoveries?.length === 0 && (
          <div className="text-center py-8">
            <Icon name="Search" size={32} className="mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              No recent discoveries. Start your first asset discovery above.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AssetDiscovery;