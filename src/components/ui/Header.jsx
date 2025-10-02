import React, { useState } from 'react';
import Icon from '../AppIcon';
import Button from './Button';

const Header = ({ onMenuToggle, isMenuOpen = false }) => {
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  const primaryNavItems = [
    { label: 'Dashboard', path: '/main-dashboard', icon: 'LayoutDashboard' },
    { label: 'Clients', path: '/client-workspace-manager', icon: 'Users' },
    { label: 'Assets', path: '/asset-management', icon: 'Server' },
    { label: 'Vulnerabilities', path: '/vulnerability-management', icon: 'Shield' },
  ];

  const secondaryNavItems = [
    { label: 'Settings', path: '/settings', icon: 'Settings' },
    { label: 'Help', path: '/help', icon: 'HelpCircle' },
  ];

  const handleNavigation = (path) => {
    window.location.href = path;
  };

  const toggleMoreMenu = () => {
    setIsMoreMenuOpen(!isMoreMenuOpen);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-card border-b border-border shadow-elevation">
      <div className="flex items-center justify-between h-16 px-6">
        {/* Left Section - Logo and Mobile Menu */}
        <div className="flex items-center space-x-4">
          {/* Mobile Menu Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuToggle}
            className="lg:hidden"
          >
            <Icon name={isMenuOpen ? 'X' : 'Menu'} size={20} />
          </Button>

          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-8 h-8 bg-primary rounded-lg">
              <Icon name="Shield" size={20} color="var(--color-primary-foreground)" />
            </div>
            <span className="text-xl font-semibold text-foreground">
              Vulcan Scan
            </span>
          </div>
        </div>

        {/* Center Section - Primary Navigation (Desktop) */}
        <nav className="hidden lg:flex items-center space-x-1">
          {primaryNavItems?.map((item) => (
            <Button
              key={item?.path}
              variant="ghost"
              onClick={() => handleNavigation(item?.path)}
              className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-smooth"
            >
              <Icon name={item?.icon} size={16} />
              <span>{item?.label}</span>
            </Button>
          ))}
        </nav>

        {/* Right Section - Actions and More Menu */}
        <div className="flex items-center space-x-3">
          {/* Quick Actions */}
          <Button
            variant="outline"
            size="sm"
            className="hidden md:flex items-center space-x-2"
          >
            <Icon name="Plus" size={16} />
            <span>New Scan</span>
          </Button>

          <Button
            variant="default"
            size="sm"
            className="hidden md:flex items-center space-x-2"
          >
            <Icon name="FileText" size={16} />
            <span>Report</span>
          </Button>

          {/* More Menu */}
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMoreMenu}
              className="text-muted-foreground hover:text-foreground"
            >
              <Icon name="MoreVertical" size={20} />
            </Button>

            {isMoreMenuOpen && (
              <>
                {/* Backdrop */}
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsMoreMenuOpen(false)}
                />
                
                {/* Dropdown Menu */}
                <div className="absolute right-0 top-full mt-2 w-48 bg-popover border border-border rounded-lg shadow-elevation-lg z-50 py-2">
                  {secondaryNavItems?.map((item) => (
                    <button
                      key={item?.path}
                      onClick={() => {
                        handleNavigation(item?.path);
                        setIsMoreMenuOpen(false);
                      }}
                      className="flex items-center space-x-3 w-full px-4 py-2 text-sm text-popover-foreground hover:bg-muted/50 transition-smooth"
                    >
                      <Icon name={item?.icon} size={16} />
                      <span>{item?.label}</span>
                    </button>
                  ))}
                  
                  <div className="border-t border-border my-2" />
                  
                  <button
                    onClick={() => {
                      handleNavigation('/login');
                      setIsMoreMenuOpen(false);
                    }}
                    className="flex items-center space-x-3 w-full px-4 py-2 text-sm text-destructive hover:bg-destructive/10 transition-smooth"
                  >
                    <Icon name="LogOut" size={16} />
                    <span>Sign Out</span>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* User Profile */}
          <div className="flex items-center justify-center w-8 h-8 bg-muted rounded-full">
            <Icon name="User" size={16} color="var(--color-muted-foreground)" />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;