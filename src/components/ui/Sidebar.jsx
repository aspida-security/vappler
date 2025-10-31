import React, { useState, useEffect, useMemo } from 'react';
import Icon from '../AppIcon';
import Button from './Button';
import Select from './Select';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const Sidebar = ({ 
  isOpen, 
  onClose, 
  className,
  workspaces = [],
  selectedWorkspace,
  onWorkspaceChange,
  onNewScanClick
}) => {
  const [scanProgress, setScanProgress] = useState({
    assets: 2,
    vulnerabilities: 5
  });

  const { userProfile, signOut } = useAuth();
  const location = useLocation();

  const workspaceOptions = useMemo(() => {
    return workspaces.map(ws => ({
      value: ws.id,
      label: ws.name,
      description: `undefined assets • undefined`
    }));
  }, [workspaces]);

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
      badge: scanProgress.assets > 0 ? scanProgress.assets : null
    },
    {
      label: 'Vulnerabilities',
      path: '/vulnerability-management',
      icon: 'Shield',
      description: 'Security findings',
      badge: scanProgress.vulnerabilities > 0 ? scanProgress.vulnerabilities : null
    },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setScanProgress(prev => ({
        assets: Math.random() > 0.7 ? Math.floor(Math.random() * 5) : prev.assets,
        vulnerabilities: Math.random() > 0.8 ? Math.floor(Math.random() * 10) : prev.vulnerabilities
      }));
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={`
          fixed top-0 left-0 h-full w-80 bg-card border-r border-border z-50
          flex flex-col
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:relative lg:w-80
          ${className}
        `}
      >
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-10 h-10 bg-primary rounded-lg">
              <Icon name="Shield" size={24} color="var(--color-primary-foreground)" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">Vappler</h1>
              <p className="text-xs text-muted-foreground">Security Platform</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="lg:hidden"
          >
            <Icon name="X" size={20} />
          </Button>
        </div>
        <div className="flex-1 flex flex-col overflow-y-auto">
          <div className="p-6 border-b border-border">
            <Select
              label="Active Workspace"
              options={workspaceOptions}
              value={selectedWorkspace}
              onChange={onWorkspaceChange}
              searchable
              className="w-full"
            />
          </div>
          <nav className="flex-1 p-6 space-y-2">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">
              Navigation
            </div>
            {navigationItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
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
                      name={item.icon} 
                      size={20} 
                      className={isActive ? 'text-primary-foreground' : 'text-current'}
                    />
                    <div>
                      <div className="font-medium">{item.label}</div>
                      <div className={`text-xs ${isActive ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                        {item.description}
                      </div>
                    </div>
                  </div>
                  {item.badge && (
                    <div className={`
                      flex items-center justify-center min-w-[20px] h-5 px-2 rounded-full text-xs font-medium
                      ${isActive 
                        ? 'bg-primary-foreground text-primary' 
                        : 'bg-accent text-accent-foreground'
                      }
                    `}>
                      {item.badge}
                    </div>
                  )}
                </Link>
              );
            })}
          </nav>
          <div className="p-6 border-t border-border">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">
              Quick Actions
            </div>
            <div className="space-y-3">
              <Button
                  key="new-scan"
                  variant="default"
                  onClick={onNewScanClick}
                  className="w-full justify-start"
                  iconName="Play"
                  iconPosition="left"
                >
                  New Scan
              </Button>
              <Button
                  key="gen-report"
                  variant="outline"
                  onClick={() => console.log('Generate Report')}
                  className="w-full justify-start"
                  iconName="FileText"
                  iconPosition="left"
                >
                  Generate Report
              </Button>
            </div>
          </div>
        </div>
        <div className="p-6 border-t border-border">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-8 h-8 bg-muted rounded-full">
              <Icon name="User" size={16} color="var(--color-muted-foreground)" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-foreground truncate">
                {userProfile?.full_name || 'User'}
              </div>
              <div className="text-xs text-muted-foreground truncate">
                {userProfile?.email || 'No email'}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={signOut}
              className="text-muted-foreground hover:text-destructive"
            >
              <Icon name="LogOut" size={16} />
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;