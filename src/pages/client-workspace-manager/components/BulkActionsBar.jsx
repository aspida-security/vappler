import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Select from '../../../components/ui/Select';

const BulkActionsBar = ({ selectedCount, onBulkScan, onBulkReport, onClearSelection }) => {
  const [selectedAction, setSelectedAction] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const actionOptions = [
    { value: 'quick-scan', label: 'Quick Vulnerability Scan' },
    { value: 'full-scan', label: 'Full Network Scan' },
    { value: 'compliance-scan', label: 'Compliance Assessment' },
    { value: 'generate-report', label: 'Generate Summary Report' },
    { value: 'export-data', label: 'Export Client Data' }
  ];

  const handleExecuteAction = async () => {
    if (!selectedAction) return;
    
    setIsProcessing(true);
    
    try {
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      switch (selectedAction) {
        case 'quick-scan': case'full-scan': case'compliance-scan':
          onBulkScan(selectedAction);
          break;
        case 'generate-report': case'export-data':
          onBulkReport(selectedAction);
          break;
        default:
          break;
      }
      
      setSelectedAction('');
    } catch (error) {
      console.error('Error executing bulk action:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  if (selectedCount === 0) return null;

  return (
    <div className="bg-accent/10 border border-accent/20 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Icon name="CheckSquare" size={20} className="text-accent" />
            <span className="text-sm font-medium text-foreground">
              {selectedCount} client{selectedCount > 1 ? 's' : ''} selected
            </span>
          </div>
          
          <div className="w-px h-6 bg-border"></div>
          
          <div className="flex items-center space-x-3">
            <Select
              id="selectActionId"
              placeholder="Choose bulk action..."
              options={actionOptions}
              value={selectedAction}
              onChange={setSelectedAction}
              className="w-64"
            />
            
            <Button
              variant="default"
              size="sm"
              onClick={handleExecuteAction}
              disabled={!selectedAction || isProcessing}
              loading={isProcessing}
              iconName="Play"
              iconPosition="left"
            >
              Execute
            </Button>
          </div>
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearSelection}
          iconName="X"
          iconPosition="left"
        >
          Clear Selection
        </Button>
      </div>
    </div>
  );
};

export default BulkActionsBar;