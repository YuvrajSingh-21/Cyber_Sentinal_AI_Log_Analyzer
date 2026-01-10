import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface SystemChartProps {
  title: string;
  value: number;
  maxValue?: number;
  color?: 'primary' | 'success' | 'warning' | 'destructive';
  showHistory?: boolean;
}

export const SystemChart = ({ 
  title, 
  value, 
  maxValue = 100,
  color = 'primary',
  showHistory = true 
}: SystemChartProps) => {
  const [history, setHistory] = useState<number[]>([]);
  const percentage = Math.min((value / maxValue) * 100, 100);

  const colorClasses = {
    primary: 'from-primary to-accent',
    success: 'from-success to-emerald-400',
    warning: 'from-warning to-amber-400',
    destructive: 'from-destructive to-red-400',
  };

  const glowColors = {
    primary: 'shadow-primary/30',
    success: 'shadow-success/30',
    warning: 'shadow-warning/30',
    destructive: 'shadow-destructive/30',
  };

  useEffect(() => {
    setHistory(prev => [...prev.slice(-19), value]);
  }, [value]);

  const getBarColor = (val: number) => {
    if (val > 80) return 'bg-destructive';
    if (val > 60) return 'bg-warning';
    return 'bg-primary';
  };

  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-medium text-muted-foreground">{title}</h4>
        <span className={cn(
          "text-2xl font-bold font-mono",
          percentage > 80 && "text-destructive",
          percentage > 60 && percentage <= 80 && "text-warning",
          percentage <= 60 && "text-primary"
        )}>
          {value}%
        </span>
      </div>

      {/* Progress Bar */}
      <div className="h-2 bg-muted rounded-full overflow-hidden mb-4">
        <div 
          className={cn(
            "h-full rounded-full bg-gradient-to-r transition-all duration-500",
            colorClasses[percentage > 80 ? 'destructive' : percentage > 60 ? 'warning' : color]
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* History Chart */}
      {showHistory && (
        <div className="flex items-end gap-1 h-16">
          {history.map((val, i) => (
            <div
              key={i}
              className={cn(
                "flex-1 rounded-t transition-all duration-300",
                getBarColor(val)
              )}
              style={{ 
                height: `${(val / maxValue) * 100}%`,
                opacity: (i + 1) / history.length * 0.5 + 0.5
              }}
            />
          ))}
          {/* Fill remaining slots */}
          {Array.from({ length: 20 - history.length }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="flex-1 h-1 rounded-t bg-muted/50"
            />
          ))}
        </div>
      )}
    </div>
  );
};
