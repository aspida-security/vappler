import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const SubnetMap = ({ subnets, onSubnetSelect }) => {
  const [selectedSubnet, setSelectedSubnet] = useState(null);

  const getSubnetHealthColor = (health) => {
    switch (health) {
      case 'healthy': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      case 'critical': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getSubnetHealthIcon = (health) => {
    switch (health) {
      case 'healthy': return 'CheckCircle';
      case 'warning': return 'AlertTriangle';
      case 'critical': return 'AlertCircle';
      default: return 'HelpCircle';
    }
  };

  const handleSubnetClick = (subnet) => {
    setSelectedSubnet(subnet);
    onSubnetSelect(subnet);
  };

  return (
    <div className="bg-card rounded-lg border border-border">
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Icon name="Network" size={20} className="text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">Network Coverage</h3>
              <p className="text-sm text-muted-foreground">
                Subnet overview and asset distribution
              </p>
            </div>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            iconName="RefreshCw"
            iconPosition="left"
          >
            Refresh
          </Button>
        </div>
      </div>
      <div className="p-6">
        {/* Subnet Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {subnets?.map((subnet) => (
            <div
              key={subnet?.id}
              onClick={() => handleSubnetClick(subnet)}
              className={`
                p-4 rounded-lg border cursor-pointer transition-all hover:shadow-elevation
                ${selectedSubnet?.id === subnet?.id 
                  ? 'border-primary bg-primary/5' :'border-border hover:border-primary/50'
                }
              `}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${getSubnetHealthColor(subnet?.health)}`} />
                  <span className="font-medium text-foreground">{subnet?.name}</span>
                </div>
                
                <Icon 
                  name={getSubnetHealthIcon(subnet?.health)} 
                  size={16} 
                  className={
                    subnet?.health === 'healthy' ? 'text-green-500' :
                    subnet?.health === 'warning' ? 'text-yellow-500' :
                    subnet?.health === 'critical'? 'text-red-500' : 'text-gray-500'
                  }
                />
              </div>
              
              <div className="text-sm text-muted-foreground mb-2">
                {subnet?.range}
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {subnet?.activeAssets}/{subnet?.totalAssets} active
                </span>
                <span className="text-muted-foreground">
                  {subnet?.vulnerabilities} vulns
                </span>
              </div>
              
              {/* Coverage Bar */}
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                  <span>Coverage</span>
                  <span>{subnet?.coverage}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      subnet?.coverage >= 80 ? 'bg-green-500' :
                      subnet?.coverage >= 60 ? 'bg-yellow-500': 'bg-primary' // VAPPLER CHANGE: Use Primary (Teal) for Low Coverage
                    }`}
                    style={{ width: `${subnet?.coverage}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Selected Subnet Details */}
        {selectedSubnet && (
          <div className="bg-muted/30 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium text-foreground">
                {selectedSubnet?.name} Details
              </h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedSubnet(null)}
                iconName="X"
              />
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Total Assets</div>
                <div className="text-lg font-semibold text-foreground">
                  {selectedSubnet?.totalAssets}
                </div>
              </div>
              
              <div>
                <div className="text-xs text-muted-foreground mb-1">Active Assets</div>
                <div className="text-lg font-semibold text-green-500">
                  {selectedSubnet?.activeAssets}
                </div>
              </div>
              
              <div>
                <div className="text-xs text-muted-foreground mb-1">Vulnerabilities</div>
                <div className="text-lg font-semibold text-red-500">
                  {selectedSubnet?.vulnerabilities}
                </div>
              </div>
              
              <div>
                <div className="text-xs text-muted-foreground mb-1">Last Scan</div>
                <div className="text-sm text-foreground">
                  {new Date(selectedSubnet.lastScan)?.toLocaleDateString()}
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 mt-4">
              <Button
                variant="default"
                size="sm"
                iconName="Play"
                iconPosition="left"
              >
                Scan Subnet
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                iconName="Eye"
                iconPosition="left"
              >
                View Assets
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                iconName="Download"
                iconPosition="left"
              >
                Export
              </Button>
            </div>
          </div>
        )}

        {subnets?.length === 0 && (
          <div className="text-center py-12">
            <Icon name="Network" size={48} className="mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No subnets discovered</h3>
            <p className="text-muted-foreground mb-4">
              Start asset discovery to map your network topology.
            </p>
            <Button variant="outline">
              Start Discovery
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SubnetMap;