import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const ClientProfileModal = ({ isOpen, onClose, client }) => {
  const [activeTab, setActiveTab] = useState('overview');

  if (!isOpen || !client) return null;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: 'Info' },
    { id: 'assets', label: 'Assets', icon: 'Server' },
    { id: 'scans', label: 'Scan History', icon: 'Activity' },
    { id: 'settings', label: 'Settings', icon: 'Settings' }
  ];

  const mockAssets = [
    { id: 1, ip: '192.168.1.10', hostname: 'web-server-01', type: 'Web Server', os: 'Ubuntu 20.04', status: 'Online' },
    { id: 2, ip: '192.168.1.20', hostname: 'db-server-01', type: 'Database', os: 'CentOS 8', status: 'Online' },
    { id: 3, ip: '192.168.1.30', hostname: 'mail-server-01', type: 'Mail Server', os: 'Windows Server 2019', status: 'Offline' }
  ];

  const mockScans = [
    { id: 1, type: 'Full Network Scan', date: '2024-12-28', status: 'Completed', vulnerabilities: 15, duration: '2h 45m' },
    { id: 2, type: 'Quick Scan', date: '2024-12-25', status: 'Completed', vulnerabilities: 8, duration: '45m' },
    { id: 3, type: 'Compliance Scan', date: '2024-12-20', status: 'Failed', vulnerabilities: 0, duration: '1h 20m' }
  ];

  const formatDate = (dateString) => {
    return new Date(dateString)?.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'online': case'completed':
        return 'text-success';
      case 'offline': case'failed':
        return 'text-destructive';
      default:
        return 'text-muted-foreground';
    }
  };

  const getStatusBg = (status) => {
    switch (status?.toLowerCase()) {
      case 'online': case'completed':
        return 'bg-success/10';
      case 'offline': case'failed':
        return 'bg-destructive/10';
      default:
        return 'bg-muted/10';
    }
  };

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-foreground">Client Information</h4>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">Company Name</label>
              <p className="text-sm text-foreground">{client?.clientName}</p>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Industry</label>
              <p className="text-sm text-foreground">{client?.industry}</p>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Contact Email</label>
              <p className="text-sm text-foreground">{client?.contactEmail || 'contact@client.com'}</p>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Contact Phone</label>
              <p className="text-sm text-foreground">{client?.contactPhone || '+1 (555) 123-4567'}</p>
            </div>
          </div>
        </div>
        
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-foreground">Security Overview</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-muted/30 rounded-lg p-3">
              <div className="text-lg font-semibold text-foreground">{client?.riskScore}</div>
              <div className="text-xs text-muted-foreground">Risk Score</div>
            </div>
            <div className="bg-muted/30 rounded-lg p-3">
              <div className="text-lg font-semibold text-foreground">{client?.assetCount}</div>
              <div className="text-xs text-muted-foreground">Total Assets</div>
            </div>
            <div className="bg-muted/30 rounded-lg p-3">
              <div className="text-lg font-semibold text-destructive">{client?.criticalVulns}</div>
              <div className="text-xs text-muted-foreground">Critical Vulns</div>
            </div>
            <div className="bg-muted/30 rounded-lg p-3">
              <div className="text-lg font-semibold text-warning">{client?.highVulns}</div>
              <div className="text-xs text-muted-foreground">High Vulns</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAssets = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-foreground">Asset Inventory</h4>
        <Button variant="outline" size="sm" iconName="Plus">
          Add Asset
        </Button>
      </div>
      
      <div className="space-y-2">
        {mockAssets?.map((asset) => (
          <div key={asset?.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
            <div className="flex items-center space-x-3">
              <Icon name="Server" size={16} className="text-muted-foreground" />
              <div>
                <div className="text-sm font-medium text-foreground">{asset?.hostname}</div>
                <div className="text-xs text-muted-foreground">{asset?.ip} • {asset?.type}</div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="text-xs text-muted-foreground">{asset?.os}</div>
              <div className={`px-2 py-1 rounded-full text-xs ${getStatusBg(asset?.status)} ${getStatusColor(asset?.status)}`}>
                {asset?.status}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderScans = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-foreground">Recent Scans</h4>
        <Button variant="outline" size="sm" iconName="Play">
          New Scan
        </Button>
      </div>
      
      <div className="space-y-2">
        {mockScans?.map((scan) => (
          <div key={scan?.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
            <div className="flex items-center space-x-3">
              <Icon name="Activity" size={16} className="text-muted-foreground" />
              <div>
                <div className="text-sm font-medium text-foreground">{scan?.type}</div>
                <div className="text-xs text-muted-foreground">
                  {formatDate(scan?.date)} • {scan?.duration}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="text-xs text-muted-foreground">
                {scan?.vulnerabilities} vulnerabilities
              </div>
              <div className={`px-2 py-1 rounded-full text-xs ${getStatusBg(scan?.status)} ${getStatusColor(scan?.status)}`}>
                {scan?.status}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-foreground">Scan Configuration</h4>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
            <div>
              <div className="text-sm font-medium text-foreground">Automatic Scanning</div>
              <div className="text-xs text-muted-foreground">Run scheduled scans weekly</div>
            </div>
            <div className="w-10 h-6 bg-success rounded-full relative">
              <div className="w-4 h-4 bg-white rounded-full absolute top-1 right-1"></div>
            </div>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
            <div>
              <div className="text-sm font-medium text-foreground">Email Notifications</div>
              <div className="text-xs text-muted-foreground">Send alerts for critical findings</div>
            </div>
            <div className="w-10 h-6 bg-success rounded-full relative">
              <div className="w-4 h-4 bg-white rounded-full absolute top-1 right-1"></div>
            </div>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
            <div>
              <div className="text-sm font-medium text-foreground">Report Generation</div>
              <div className="text-xs text-muted-foreground">Auto-generate monthly reports</div>
            </div>
            <div className="w-10 h-6 bg-muted rounded-full relative">
              <div className="w-4 h-4 bg-white rounded-full absolute top-1 left-1"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverview();
      case 'assets':
        return renderAssets();
      case 'scans':
        return renderScans();
      case 'settings':
        return renderSettings();
      default:
        return renderOverview();
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-card border border-border rounded-lg shadow-elevation-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-10 h-10 bg-primary/10 rounded-lg">
                <Icon name="Building" size={20} className="text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">
                  {client?.clientName}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {client?.industry}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
            >
              <Icon name="X" size={20} />
            </Button>
          </div>
          
          {/* Tabs */}
          <div className="border-b border-border">
            <nav className="flex space-x-8 px-6">
              {tabs?.map((tab) => (
                <button
                  key={tab?.id}
                  onClick={() => setActiveTab(tab?.id)}
                  className={`flex items-center space-x-2 py-4 border-b-2 transition-smooth ${
                    activeTab === tab?.id
                      ? 'border-primary text-primary' :'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon name={tab?.icon} size={16} />
                  <span className="text-sm font-medium">{tab?.label}</span>
                </button>
              ))}
            </nav>
          </div>
          
          {/* Content */}
          <div className="p-6 max-h-[60vh] overflow-y-auto">
            {renderTabContent()}
          </div>
        </div>
      </div>
    </>
  );
};

export default ClientProfileModal;