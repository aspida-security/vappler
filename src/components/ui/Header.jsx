// File: src/components/ui/Header.jsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../AppIcon';
import Button from './Button';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

// --- VULCAN CHANGE: Added onNewScanClick to the props ---
const Header = ({ onMenuToggle, isMenuOpen = false, onNewScanClick }) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { userProfile, signOut } = useAuth();

  const primaryNavItems = [
    { label: 'Dashboard', path: '/main-dashboard', icon: 'LayoutDashboard' },
    { label: 'Clients', path: '/client-workspace-manager', icon: 'Users' },
    { label: 'Assets', path: '/asset-management', icon: 'Server' },
    { label: 'Vulnerabilities', path: '/vulnerability-management', icon: 'Shield' },
  ];

  return (
    <header className="bg-card border-b border-border shadow-sm">
      <div className="flex items-center justify-between h-16 px-6">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={onMenuToggle} className="lg:hidden">
            <Icon name={isMenuOpen ? 'X' : 'Menu'} size={20} />
          </Button>
          <div className="flex lg:hidden items-center space-x-3">
            <div className="flex items-center justify-center w-8 h-8 bg-primary rounded-lg">
              <Icon name="Shield" size={20} color="var(--color-primary-foreground)" />
            </div>
            <span className="text-xl font-semibold text-foreground">
              Vulcan Scan
            </span>
          </div>
        </div>

        <nav className="hidden lg:flex items-center space-x-1">
          {primaryNavItems.map((item) => {
              const isActive = location.pathname.startsWith(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium ring-offset-background transition-colors ${
                      isActive ? 'text-foreground bg-muted/50' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  }`}
                >
                  <Icon name={item.icon} size={16} className="mr-2" />
                  <span>{item.label}</span>
                </Link>
              )
          })}
        </nav>

        <div className="flex items-center space-x-3">
          {/* FIX for ERR-0001: New Scan Button now calls the modal opener from AppLayout */}
          <Button onClick={onNewScanClick} variant="outline" size="sm" className="hidden md:flex items-center">
            <Icon name="Plus" size={16} className="mr-2"/>
            <span>New Scan</span>
          </Button>
          {/* FIX for ERR-0002: Reports Button now logs action (placeholder) */}
          <Button onClick={() => console.log('Reports button clicked - Wire up to report module later')} variant="default" size="sm" className="hidden md:flex items-center">
             <Icon name="FileText" size={16} className="mr-2"/>
            <span>Report</span>
          </Button>
          <div className="relative">
            <button onClick={() => setIsUserMenuOpen(!isUserMenuOpen)} className="flex items-center justify-center w-9 h-9 bg-muted rounded-full focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
              <Icon name="User" size={18} className="text-muted-foreground" />
            </button>
            {isUserMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsUserMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-2 w-56 bg-popover border border-border rounded-lg shadow-lg z-50 py-2">
                  <div className="px-4 py-2 border-b border-border">
                    <p className="text-sm font-medium text-foreground truncate">{userProfile?.full_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{userProfile?.email}</p>
                  </div>
                  <button onClick={signOut} className="flex items-center space-x-3 w-full px-4 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors mt-1">
                    <Icon name="LogOut" size={16} />
                    <span>Sign Out</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;