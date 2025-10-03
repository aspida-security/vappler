import React from 'react';
import Button from './Button';
import Icon from '../AppIcon';

const Header = ({ onMenuClick }) => {
  return (
    <header className="flex items-center justify-between p-4 bg-card border-b border-border lg:hidden">
      <div className="text-lg font-semibold">Vulcan Scan</div>
      <Button variant="ghost" size="icon" onClick={onMenuClick}>
        <Icon name="Menu" size={24} />
      </Button>
    </header>
  );
};

export default Header;