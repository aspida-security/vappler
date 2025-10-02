import React, { useState, useEffect } from 'react';
import Icon from '../AppIcon';
import Button from './Button';
import Select from './Select';

const Sidebar = ({ isOpen = false, onClose, className = '' }) => {
  const [selectedWorkspace, setSelectedWorkspace] = useState('acme-corp');
  const [scanProgress, setScanProgress] = useState({
    assets: 2,
    vulnerabilities: 5
  });

  const workspaceOptions = [
    { value: 'acme-corp', label: 'Acme Corporation', description: 'Primary client workspace' },
    { value: 'tech-solutions', label: 'Tech Solutions Inc', description: 'Secondary client' },
    { value: 'global-finance', label: 'Global Finance Ltd', description: 'Financial services client' },
  ];

  const navigationItems = [
    {
      label: 'Dashboard',
      path: '/main-dashboard',
      icon: 'LayoutDashboard',
      description: 'Overview and insights'
    },
    {
      label: 'Clients',
      path: '/client-workspace-manager',
      icon: 'Users',
      description: 'Manage client workspaces'
    },
    {
      label: 'Assets',
      path: '/asset-management',
      icon: 'Server',
      description: 'Network inventory',
      badge: scanProgress?.assets > 0 ? scanProgress?.assets : null
    },
    {
      label: 'Vulnerabilities',
      path: '/vulnerability-management',
      icon: 'Shield',
      description: 'Security findings',
      badge: scanProgress?.vulnerabilities > 0 ? scanProgress?.vulnerabilities : null
    },
  ];

  const quickActions = [
    { label: 'New Scan', icon: 'Play', variant: 'default' },
    { label: 'Generate Report', icon: 'FileText', variant: 'outline' }
  ];

  const handleNavigation = (path) => {
    window.location.href = path;
    if (onClose) onClose();
  };

  const handleWorkspaceChange = (value) => {
    setSelectedWorkspace(value);
    // Simulate workspace context change
    console.log('Switching to workspace:', value);
  };

  const handleQuickAction = (action) => {
    console.log('Quick action:', action);
    // Handle quick actions like opening modals
  };

  // Simulate real-time scan progress updates
  useEffect(() => {
    const interval = setInterval(() => {
      setScanProgress(prev => ({
        assets: Math.random() > 0.7 ? Math.floor(Math.random() * 5) : prev?.assets,
        vulnerabilities: Math.random() > 0.8 ? Math.floor(Math.random() * 10) : prev?.vulnerabilities
      }));
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full w-80 bg-card border-r border-border z-50
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:fixed
          ${className}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-10 h-10 bg-primary rounded-lg">
                <Icon name="Shield" size={24} color="var(--color-primary-foreground)" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground">Vulcan Scan</h1>
                <p className="text-xs text-muted-foreground">Security Platform</p>
              </div>
            </div>
            
            {/* Mobile Close Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="lg:hidden"
            >
              <Icon name="X" size={20} />
            </Button>
          </div>

          {/* Workspace Selector */}
          <div className="p-6 border-b border-border">
            <Select
              label="Active Workspace"
              options={workspaceOptions}
              value={selectedWorkspace}
              onChange={handleWorkspaceChange}
              searchable
              className="w-full"
            />
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-6 space-y-2">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">
              Navigation
            </div>
            
            {navigationItems?.map((item) => {
              const isActive = window.location?.pathname === item?.path;
              
              return (
                <button
                  key={item?.path}
                  onClick={() => handleNavigation(item?.path)}
                  className={`
                    flex items-center justify-between w-full p-3 rounded-lg text-left
                    transition-smooth group
                    ${isActive 
                      ? 'bg-primary text-primary-foreground shadow-sm' 
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    }
                  `}
                >
                  <div className="flex items-center space-x-3">
                    <Icon 
                      name={item?.icon} 
                      size={20} 
                      className={isActive ? 'text-primary-foreground' : 'text-current'}
                    />
                    <div>
                      <div className="font-medium">{item?.label}</div>
                      <div className={`text-xs ${isActive ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                        {item?.description}
                      </div>
                    </div>
                  </div>
                  {item?.badge && (
                    <div className={`
                      flex items-center justify-center min-w-[20px] h-5 px-2 rounded-full text-xs font-medium
                      ${isActive 
                        ? 'bg-primary-foreground text-primary' 
                        : 'bg-accent text-accent-foreground'
                      }
                    `}>
                      {item?.badge}
                    </div>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Quick Actions */}
          <div className="p-6 border-t border-border">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">
              Quick Actions
            </div>
            
            <div className="space-y-3">
              {quickActions?.map((action) => (
                <Button
                  key={action?.label}
                  variant={action?.variant}
                  onClick={() => handleQuickAction(action?.label)}
                  className="w-full justify-start"
                  iconName={action?.icon}
                  iconPosition="left"
                >
                  {action?.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-border">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-8 h-8 bg-muted rounded-full">
                <Icon name="User" size={16} color="var(--color-muted-foreground)" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground truncate">
                  Security Analyst
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  analyst@vulcanscan.com
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleNavigation('/login')}
                className="text-muted-foreground hover:text-destructive"
              >
                <Icon name="LogOut" size={16} />
              </Button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;