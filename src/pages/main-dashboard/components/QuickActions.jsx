import React from 'react';
import Icon from '../../../components/AppIcon';

// The 'onNewScan' prop will be passed down from the MainDashboard
const QuickActions = ({ onNewScan, onGenerateReport, onViewReports }) => {
  const quickActionItems = [
    {
      title: "Start New Scan",
      description: "Launch vulnerability assessment",
      icon: "Play",
      // --- VULCAN CHANGE: Use the onNewScan function ---
      action: onNewScan,
      primary: true
    },
    {
      title: "Generate Report",
      description: "Create security assessment report",
      icon: "FileText",
      action: onGenerateReport,
      primary: false
    },
    {
      title: "View Reports",
      description: "Access existing reports",
      icon: "FolderOpen",
      action: onViewReports,
      primary: false
    }
  ];

  return (
    <div className="bg-card border border-border rounded-lg p-6 shadow-elevation">
      <div className="flex items-center space-x-3 mb-6">
        <div className="flex items-center justify-center w-10 h-10 bg-green-500/10 rounded-lg">
          <Icon name="Zap" size={20} className="text-green-500" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">Quick Actions</h3>
          <p className="text-sm text-muted-foreground">Common tasks and operations</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {quickActionItems?.map((item, index) => (
          <div
            key={index}
            className={`
              p-4 rounded-lg border transition-smooth cursor-pointer group
              ${item?.primary 
                ? 'bg-primary/5 border-primary/20 hover:bg-primary/10' :'bg-muted/30 border-border hover:bg-muted/50'
              }
            `}
            onClick={item?.action}
          >
            <div className="flex items-start space-x-3">
              <div className={`
                flex items-center justify-center w-10 h-10 rounded-lg transition-smooth
                ${item?.primary 
                  ? 'bg-primary text-primary-foreground group-hover:bg-primary/90' 
                  : 'bg-muted text-muted-foreground group-hover:bg-accent group-hover:text-accent-foreground'
                }
              `}>
                <Icon name={item?.icon} size={20} />
              </div>
              
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-foreground group-hover:text-foreground">
                  {item?.title}
                </h4>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {item?.description}
                </p>
              </div>
              
              <Icon 
                name="ChevronRight" 
                size={16} 
                className="text-muted-foreground group-hover:text-foreground transition-smooth" 
              />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-6 pt-6 border-t border-border">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-lg font-bold text-foreground">24</div>
            <div className="text-xs text-muted-foreground">Scans This Month</div>
          </div>
          <div>
            <div className="text-lg font-bold text-foreground">156</div>
            <div className="text-xs text-muted-foreground">Total Vulnerabilities</div>
          </div>
          <div>
            <div className="text-lg font-bold text-foreground">12</div>
            <div className="text-xs text-muted-foreground">Reports Generated</div>
          </div>
          <div>
            <div className="text-lg font-bold text-foreground">98.5%</div>
            <div className="text-xs text-muted-foreground">Uptime</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickActions;