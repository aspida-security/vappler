import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';

const AssetGroups = ({ groups, onGroupCreate, onGroupUpdate, onGroupDelete }) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [expandedGroup, setExpandedGroup] = useState(null);

  const handleCreateGroup = () => {
    if (!newGroupName?.trim()) return;
    
    const newGroup = {
      id: Date.now(),
      name: newGroupName,
      description: newGroupDescription,
      assetCount: 0,
      color: getRandomColor(),
      createdAt: new Date()
    };
    
    onGroupCreate(newGroup);
    setNewGroupName('');
    setNewGroupDescription('');
    setIsCreating(false);
  };

  const getRandomColor = () => {
    const colors = [
      'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500',
      'bg-pink-500', 'bg-indigo-500', 'bg-teal-500', 'bg-red-500'
    ];
    return colors?.[Math.floor(Math.random() * colors?.length)];
  };

  const toggleGroupExpansion = (groupId) => {
    setExpandedGroup(expandedGroup === groupId ? null : groupId);
  };

  return (
    <div className="bg-card rounded-lg border border-border">
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Icon name="Layers" size={20} className="text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">Asset Groups</h3>
              <p className="text-sm text-muted-foreground">
                Organize assets by departments, locations, or custom criteria
              </p>
            </div>
          </div>
          
          <Button
            variant="default"
            size="sm"
            onClick={() => setIsCreating(true)}
            iconName="Plus"
            iconPosition="left"
          >
            New Group
          </Button>
        </div>
      </div>
      <div className="p-6">
        {/* Create New Group Form */}
        {isCreating && (
          <div className="bg-muted/30 rounded-lg p-4 mb-6">
            <h4 className="font-medium text-foreground mb-4">Create New Group</h4>
            
            <div className="space-y-4">
              <Input
                id="groupNameId"
                label="Group Name"
                type="text"
                placeholder="e.g., Web Servers, Database Servers"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e?.target?.value)}
                required
              />
              
              <Input
                id="assetDescriptionId"
                label="Description"
                type="text"
                placeholder="Brief description of this asset group"
                value={newGroupDescription}
                onChange={(e) => setNewGroupDescription(e?.target?.value)}
              />
              
              <div className="flex items-center space-x-3">
                <Button
                  variant="default"
                  onClick={handleCreateGroup}
                  disabled={!newGroupName?.trim()}
                  iconName="Check"
                  iconPosition="left"
                >
                  Create Group
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsCreating(false);
                    setNewGroupName('');
                    setNewGroupDescription('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Groups List */}
        <div className="space-y-3">
          {groups?.map((group) => (
            <div
              key={group?.id}
              className="border border-border rounded-lg overflow-hidden"
            >
              <div
                className="p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => toggleGroupExpansion(group?.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-4 h-4 rounded-full ${group?.color}`} />
                    
                    <div>
                      <div className="font-medium text-foreground">{group?.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {group?.assetCount} assets
                        {group?.description && ` • ${group?.description}`}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-muted-foreground">
                      {group?.assetCount} assets
                    </span>
                    
                    <Icon
                      name={expandedGroup === group?.id ? 'ChevronUp' : 'ChevronDown'}
                      size={16}
                      className="text-muted-foreground"
                    />
                  </div>
                </div>
              </div>
              
              {/* Expanded Group Details */}
              {expandedGroup === group?.id && (
                <div className="border-t border-border bg-muted/20 p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-sm text-muted-foreground">
                      Created {new Date(group.createdAt)?.toLocaleDateString()}
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        iconName="Edit"
                        iconPosition="left"
                      >
                        Edit
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        iconName="Users"
                        iconPosition="left"
                      >
                        Manage Assets
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        iconName="Play"
                        iconPosition="left"
                      >
                        Scan Group
                      </Button>
                      
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => onGroupDelete(group?.id)}
                        iconName="Trash2"
                      />
                    </div>
                  </div>
                  
                  {/* Group Statistics */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-card rounded-lg">
                      <div className="text-lg font-semibold text-foreground">
                        {group?.stats?.online || 0}
                      </div>
                      <div className="text-xs text-muted-foreground">Online</div>
                    </div>
                    
                    <div className="text-center p-3 bg-card rounded-lg">
                      <div className="text-lg font-semibold text-red-500">
                        {group?.stats?.critical || 0}
                      </div>
                      <div className="text-xs text-muted-foreground">Critical</div>
                    </div>
                    
                    <div className="text-center p-3 bg-card rounded-lg">
                      <div className="text-lg font-semibold text-orange-500">
                        {group?.stats?.high || 0}
                      </div>
                      <div className="text-xs text-muted-foreground">High</div>
                    </div>
                    
                    <div className="text-center p-3 bg-card rounded-lg">
                      <div className="text-lg font-semibold text-muted-foreground">
                        {group?.stats?.lastScan ? 
                          new Date(group.stats.lastScan)?.toLocaleDateString() : 
                          'Never'
                        }
                      </div>
                      <div className="text-xs text-muted-foreground">Last Scan</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Empty State */}
        {groups?.length === 0 && (
          <div className="text-center py-12">
            <Icon name="Layers" size={48} className="mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No asset groups</h3>
            <p className="text-muted-foreground mb-4">
              Create groups to organize your assets by department, location, or function.
            </p>
            <Button
              variant="outline"
              onClick={() => setIsCreating(true)}
              iconName="Plus"
              iconPosition="left"
            >
              Create First Group
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AssetGroups;