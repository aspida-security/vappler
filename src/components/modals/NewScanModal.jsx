// src/components/modals/NewScanModal.jsx

import React, { useState } from 'react';
import Icon from '../AppIcon';
import Button from '../ui/Button';
import Input from '../ui/Input';

const NewScanModal = ({ isOpen, onClose, onSubmit }) => {
  const [target, setTarget] = useState('');
  const [error, setError] = useState('');

  const handleClose = () => {
    setTarget('');
    setError('');
    onClose();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!target.trim()) {
      setError('Scan target cannot be empty.');
      return;
    }
    // For now, we just log the data. We will wire this up later.
    console.log('Submitting scan for target:', target);
    onSubmit({ target });
    handleClose();
  };

  if (!isOpen) {
    return null;
  }

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-card border border-border rounded-lg shadow-elevation-lg w-full max-w-md">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <div className="flex items-center space-x-3">
              <Icon name="Play" size={20} className="text-primary" />
              <h2 className="text-xl font-semibold text-foreground">
                Start a New Scan
              </h2>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="text-muted-foreground hover:text-foreground"
            >
              <Icon name="X" size={20} />
            </Button>
          </div>
          
          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <Input
              label="Scan Target"
              type="text"
              placeholder="Enter IP, hostname, or CIDR range"
              value={target}
              onChange={(e) => {
                setTarget(e.target.value);
                if (error) setError('');
              }}
              error={error}
              required
              autoFocus
            />
            
            <div className="text-xs text-muted-foreground">
              Examples: `192.168.1.10`, `server.vulcanscan.com`, `10.0.0.0/24`
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="default"
                iconName="Play"
                iconPosition="left"
              >
                Start Scan
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default NewScanModal;