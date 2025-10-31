import React from 'react';
import { Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const RiskTrendChart = ({ data, onViewDetails }) => {
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload?.length) {
      return (
        <div className="bg-popover border border-border rounded-lg p-3 shadow-elevation-lg">
          <p className="text-sm font-medium text-popover-foreground mb-2">{label}</p>
          {payload?.map((entry, index) => (
            <div key={index} className="flex items-center space-x-2 text-xs">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: entry?.color }}
              />
              <span className="text-muted-foreground">{entry?.name}:</span>
              <span className="font-medium text-popover-foreground">{entry?.value}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const getTrendDirection = () => {
    if (data?.length < 2) return 'stable';
    const latest = data?.[data?.length - 1]?.riskScore;
    const previous = data?.[data?.length - 2]?.riskScore;
    if (latest > previous) return 'up';
    if (latest < previous) return 'down';
    return 'stable';
  };

  const getTrendIcon = () => {
    const direction = getTrendDirection();
    switch (direction) {
      case 'up':
        return { icon: 'TrendingUp', color: 'text-red-500' };
      case 'down':
        return { icon: 'TrendingDown', color: 'text-green-500' };
      default:
        return { icon: 'Minus', color: 'text-yellow-500' };
    }
  };

  const trendInfo = getTrendIcon();
  const currentRisk = data?.length > 0 ? data?.[data?.length - 1]?.riskScore : 0;
  const previousRisk = data?.length > 1 ? data?.[data?.length - 2]?.riskScore : 0;
  const riskChange = currentRisk - previousRisk;

  return (
    <div className="bg-card border border-border rounded-lg p-6 shadow-elevation">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="flex items-center justify-center w-10 h-10 bg-purple-500/10 rounded-lg">
            <Icon name="TrendingUp" size={20} className="text-purple-500" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Risk Score Trend</h3>
            <p className="text-sm text-muted-foreground">Security posture over time</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onViewDetails('trends')}
          iconName="ExternalLink"
          iconPosition="right"
        >
          View Details
        </Button>
      </div>
      {/* Current Risk Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center p-3 bg-muted/30 rounded-lg">
          <div className="text-2xl font-bold text-foreground">{currentRisk?.toFixed(1)}</div>
          <div className="text-xs text-muted-foreground">Current Risk</div>
        </div>
        <div className="text-center p-3 bg-muted/30 rounded-lg">
          <div className={`flex items-center justify-center space-x-1 text-lg font-bold ${trendInfo?.color}`}>
            <Icon name={trendInfo?.icon} size={16} />
            <span>{Math.abs(riskChange)?.toFixed(1)}</span>
          </div>
          <div className="text-xs text-muted-foreground">Change</div>
        </div>
        <div className="text-center p-3 bg-muted/30 rounded-lg">
          <div className="text-2xl font-bold text-foreground">{data?.length}</div>
          <div className="text-xs text-muted-foreground">Data Points</div>
        </div>
      </div>
      {/* Chart */}
      <div className="h-64 w-full">
        {data?.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <defs>
                <linearGradient id="riskGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="rgb(0, 200, 180)" stopOpacity={0.3} /> {/* VULCAN CHANGE: Teal/Accent */}
                  <stop offset="95%" stopColor="rgb(0, 200, 180)" stopOpacity={0} /> {/* VULCAN CHANGE: Teal/Accent */}
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis 
                dataKey="date" 
                stroke="var(--color-muted-foreground)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                stroke="var(--color-muted-foreground)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                domain={[0, 10]}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="riskScore"
                stroke="rgb(0, 200, 180)" /* VULCAN CHANGE: Teal/Accent */
                strokeWidth={2}
                fill="url(#riskGradient)"
                name="Risk Score"
              />
              <Line
                type="monotone"
                dataKey="vulnerabilities"
                stroke="rgb(239, 68, 68)" /* Red-500 (Destructive) */
                strokeWidth={2}
                dot={{ fill: 'rgb(239, 68, 68)', strokeWidth: 2, r: 4 }}
                name="Vulnerabilities"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Icon name="BarChart3" size={48} className="text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No trend data available</p>
              <p className="text-sm text-muted-foreground">Complete more scans to see trends</p>
            </div>
          </div>
        )}
      </div>
      {/* Legend */}
      {data?.length > 0 && (
        <div className="flex items-center justify-center space-x-6 mt-4 pt-4 border-t border-border">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-primary" /> {/* VULCAN CHANGE: Use Primary */}
            <span className="text-xs text-muted-foreground">Risk Score</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-xs text-muted-foreground">Vulnerabilities</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default RiskTrendChart;