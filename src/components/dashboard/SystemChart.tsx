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

      {showHistory && (
        <div className="h-16 w-full">
          <svg
            viewBox="0 0 100 40"
            preserveAspectRatio="none"
            className="w-full h-full"
          >
            {/* Gradient */}
            <defs>
              <linearGradient id={`line-${title}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.6" />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.05" />
              </linearGradient>
            </defs>

            {/* Area under line */}
            <path
              d={`
                M 0 40
                ${history
                  .map((val, i) => {
                    const x = (i / (Math.max(history.length - 1, 1))) * 100;
                    const y = 40 - (val / maxValue) * 40;
                    return `L ${x} ${y}`;
                  })
                  .join(' ')}
                L 100 40
                Z
              `}
              fill={`url(#line-${title})`}
            />

            {/* Line */}
            <polyline
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
              points={history
                .map((val, i) => {
                  const x = (i / (Math.max(history.length - 1, 1))) * 100;
                  const y = 40 - (val / maxValue) * 40;
                  return `${x},${y}`;
                })
                .join(' ')}
            />
          </svg>
        </div>
      )}

    </div>
  );
};
