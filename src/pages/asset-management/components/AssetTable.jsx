import React, { useState, useMemo } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import { Checkbox } from '../../../components/ui/Checkbox';

const AssetTable = ({ assets, onAssetSelect, selectedAssets, onBulkAction }) => {
  const [sortConfig, setSortConfig] = useState({ key: 'lastScan', direction: 'desc' });
  const [searchTerm, setSearchTerm] = useState('');
  const [osFilter, setOsFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const osOptions = [
    { value: '', label: 'All Operating Systems' },
    { value: 'Windows', label: 'Windows' },
    { value: 'Linux', label: 'Linux' },
    { value: 'macOS', label: 'macOS' },
    { value: 'Unknown', label: 'Unknown' }
  ];

  const statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'online', label: 'Online' },
    { value: 'offline', label: 'Offline' },
    { value: 'scanning', label: 'Currently Scanning' }
  ];

  const filteredAndSortedAssets = useMemo(() => {
    let filtered = assets?.filter(asset => {
      const matchesSearch = asset?.hostname?.toLowerCase()?.includes(searchTerm?.toLowerCase()) ||
                           asset?.ipAddress?.includes(searchTerm);
      const matchesOS = !osFilter || asset?.operatingSystem === osFilter;
      const matchesStatus = !statusFilter || asset?.status === statusFilter;
      
      return matchesSearch && matchesOS && matchesStatus;
    });

    if (sortConfig?.key) {
      filtered?.sort((a, b) => {
        let aValue = a?.[sortConfig?.key];
        let bValue = b?.[sortConfig?.key];
        
        if (sortConfig?.key === 'lastScan') {
          aValue = new Date(aValue);
          bValue = new Date(bValue);
        }
        
        if (aValue < bValue) return sortConfig?.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig?.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [assets, searchTerm, osFilter, statusFilter, sortConfig]);

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev?.key === key && prev?.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      onAssetSelect(filteredAndSortedAssets?.map(asset => asset?.id));
    } else {
      onAssetSelect([]);
    }
  };

  const isAllSelected = filteredAndSortedAssets?.length > 0 && 
    filteredAndSortedAssets?.every(asset => selectedAssets?.includes(asset?.id));

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'Critical': return 'text-red-500';
      case 'High': return 'text-orange-500';
      case 'Medium': return 'text-yellow-500';
      case 'Low': return 'text-primary'; // VAPPLER CHANGE: Use Primary (Teal) for Low Risk
      default: return 'text-gray-500';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'online': return { icon: 'CheckCircle', color: 'text-green-500' };
      case 'offline': return { icon: 'XCircle', color: 'text-red-500' };
      case 'scanning': return { icon: 'Loader', color: 'text-primary' }; // VAPPLER CHANGE: Use Primary (Teal) for Scanning
      default: return { icon: 'HelpCircle', color: 'text-gray-500' };
    }
  };

  return (
    <div className="bg-card rounded-lg border border-border">
      {/* Table Header with Filters */}
      <div className="p-6 border-b border-border">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div className="flex-1 max-w-md">
            <Input
              id="searchByHnIpAddrId"
              type="search"
              placeholder="Search by hostname or IP address..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e?.target?.value)}
              className="w-full"
            />
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <Select
              id="selectFilterByOsId"
              options={osOptions}
              value={osFilter}
              onChange={setOsFilter}
              placeholder="Filter by OS"
              className="w-48"
            />
            
            <Select
              id="selectFilterByStatusId"
              options={statusOptions}
              value={statusFilter}
              onChange={setStatusFilter}
              placeholder="Filter by Status"
              className="w-48"
            />
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedAssets?.length > 0 && (
          <div className="mt-4 p-4 bg-muted/50 rounded-lg flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {selectedAssets?.length} asset{selectedAssets?.length !== 1 ? 's' : ''} selected
            </span>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onBulkAction('scan')}
                iconName="Play"
                iconPosition="left"
              >
                Start Scan
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => onBulkAction('export')}
                iconName="Download"
                iconPosition="left"
              >
                Export
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => onBulkAction('tag')}
                iconName="Tag"
                iconPosition="left"
              >
                Add Tags
              </Button>
            </div>
          </div>
        )}
      </div>
      {/* Desktop Table View */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/30">
            <tr>
              <th className="w-12 p-4">
                <Checkbox
                  checked={isAllSelected}
                  onChange={(e) => handleSelectAll(e?.target?.checked)}
                />
              </th>
              
              <th className="text-left p-4">
                <button
                  onClick={() => handleSort('hostname')}
                  className="flex items-center space-x-2 text-sm font-medium text-foreground hover:text-primary"
                >
                  <span>Asset</span>
                  <Icon name="ArrowUpDown" size={14} />
                </button>
              </th>
              
              <th className="text-left p-4">
                <button
                  onClick={() => handleSort('operatingSystem')}
                  className="flex items-center space-x-2 text-sm font-medium text-foreground hover:text-primary"
                >
                  <span>Operating System</span>
                  <Icon name="ArrowUpDown" size={14} />
                </button>
              </th>
              
              <th className="text-left p-4">
                <span className="text-sm font-medium text-foreground">Services</span>
              </th>
              
              <th className="text-left p-4">
                <button
                  onClick={() => handleSort('vulnerabilityCount')}
                  className="flex items-center space-x-2 text-sm font-medium text-foreground hover:text-primary"
                >
                  <span>Vulnerabilities</span>
                  <Icon name="ArrowUpDown" size={14} />
                </button>
              </th>
              
              <th className="text-left p-4">
                <button
                  onClick={() => handleSort('lastScan')}
                  className="flex items-center space-x-2 text-sm font-medium text-foreground hover:text-primary"
                >
                  <span>Last Scan</span>
                  <Icon name="ArrowUpDown" size={14} />
                </button>
              </th>
              
              <th className="text-left p-4">
                <span className="text-sm font-medium text-foreground">Status</span>
              </th>
              
              <th className="w-24 p-4">
                <span className="text-sm font-medium text-foreground">Actions</span>
              </th>
            </tr>
          </thead>
          
          <tbody>
            {filteredAndSortedAssets?.map((asset) => {
              const statusInfo = getStatusIcon(asset?.status);
              const isSelected = selectedAssets?.includes(asset?.id);
              
              return (
                <tr
                  key={asset?.id}
                  className={`border-b border-border hover:bg-muted/30 transition-colors ${
                    isSelected ? 'bg-primary/5' : ''
                  }`}
                >
                  <td className="p-4">
                    <Checkbox
                      checked={isSelected}
                      onChange={(e) => {
                        if (e?.target?.checked) {
                          onAssetSelect([...selectedAssets, asset?.id]);
                        } else {
                          onAssetSelect(selectedAssets?.filter(id => id !== asset?.id));
                        }
                      }}
                    />
                  </td>
                  <td className="p-4">
                    <div>
                      <div className="font-medium text-foreground">{asset?.hostname}</div>
                      <div className="text-sm text-muted-foreground">{asset?.ipAddress}</div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center space-x-2">
                      <Icon name="Monitor" size={16} className="text-muted-foreground" />
                      <span className="text-sm text-foreground">{asset?.operatingSystem}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-1">
                      {asset?.services?.slice(0, 3)?.map((service, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-muted text-muted-foreground"
                        >
                          {service}
                        </span>
                      ))}
                      {asset?.services?.length > 3 && (
                        <span className="text-xs text-muted-foreground">
                          +{asset?.services?.length - 3} more
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center space-x-2">
                      <span className={`text-sm font-medium ${getSeverityColor(asset?.highestSeverity)}`}>
                        {asset?.vulnerabilityCount}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ({asset?.highestSeverity})
                      </span>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="text-sm text-muted-foreground">
                      {new Date(asset.lastScan)?.toLocaleDateString()}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center space-x-2">
                      <Icon 
                        name={statusInfo?.icon} 
                        size={16} 
                        className={statusInfo?.color}
                      />
                      <span className="text-sm text-foreground capitalize">
                        {asset?.status}
                      </span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center space-x-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onBulkAction('scan', [asset?.id])}
                      >
                        <Icon name="Play" size={16} />
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onBulkAction('details', [asset?.id])}
                      >
                        <Icon name="Eye" size={16} />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {/* Mobile Card View */}
      <div className="lg:hidden">
        {filteredAndSortedAssets?.map((asset) => {
          const statusInfo = getStatusIcon(asset?.status);
          const isSelected = selectedAssets?.includes(asset?.id);
          
          return (
            <div
              key={asset?.id}
              className={`p-4 border-b border-border ${isSelected ? 'bg-primary/5' : ''}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <Checkbox
                    checked={isSelected}
                    onChange={(e) => {
                      if (e?.target?.checked) {
                        onAssetSelect([...selectedAssets, asset?.id]);
                      } else {
                        onAssetSelect(selectedAssets?.filter(id => id !== asset?.id));
                      }
                    }}
                  />
                  
                  <div>
                    <div className="font-medium text-foreground">{asset?.hostname}</div>
                    <div className="text-sm text-muted-foreground">{asset?.ipAddress}</div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Icon 
                    name={statusInfo?.icon} 
                    size={16} 
                    className={statusInfo?.color}
                  />
                  <span className="text-sm text-foreground capitalize">
                    {asset?.status}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Operating System</div>
                  <div className="text-sm text-foreground">{asset?.operatingSystem}</div>
                </div>
                
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Vulnerabilities</div>
                  <div className="flex items-center space-x-2">
                    <span className={`text-sm font-medium ${getSeverityColor(asset?.highestSeverity)}`}>
                      {asset?.vulnerabilityCount}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({asset?.highestSeverity})
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-xs text-muted-foreground">
                  Last scan: {new Date(asset.lastScan)?.toLocaleDateString()}
                </div>
                
                <div className="flex items-center space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onBulkAction('scan', [asset?.id])}
                    iconName="Play"
                    iconPosition="left"
                  >
                    Scan
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onBulkAction('details', [asset?.id])}
                    iconName="Eye"
                    iconPosition="left"
                  >
                    Details
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {/* Empty State */}
      {filteredAndSortedAssets?.length === 0 && (
        <div className="p-12 text-center">
          <Icon name="Server" size={48} className="mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No assets found</h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm || osFilter || statusFilter
              ? 'Try adjusting your filters to see more results.' :'Start by adding assets to your workspace.'}
          </p>
          <Button variant="outline" onClick={() => window.location.href = '#add-assets'}>
            Add Assets
          </Button>
        </div>
      )}
    </div>
  );
};

export default AssetTable;