import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  variant?: 'default' | 'success' | 'warning' | 'critical';
  className?: string;
}

export const MetricCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendValue,
  variant = 'default',
  className,
}: MetricCardProps) => {
  const variantStyles = {
    default: 'before:bg-primary',
    success: 'before:bg-success',
    warning: 'before:bg-warning',
    critical: 'before:bg-destructive',
  };

  const iconVariants = {
    default: 'text-primary bg-primary/10',
    success: 'text-success bg-success/10',
    warning: 'text-warning bg-warning/10',
    critical: 'text-destructive bg-destructive/10',
  };

  return (
    <div className={cn("metric-card group", variantStyles[variant], className)}>
      <div className="flex items-start justify-between mb-4">
        <div className={cn(
          "p-3 rounded-xl transition-transform group-hover:scale-110",
          iconVariants[variant]
        )}>
          <Icon className="w-6 h-6" />
        </div>
        
        {trend && trendValue && (
          <div className={cn(
            "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full",
            trend === 'up' && "bg-success/10 text-success",
            trend === 'down' && "bg-destructive/10 text-destructive",
            trend === 'neutral' && "bg-muted text-muted-foreground"
          )}>
            {trend === 'up' && '↑'}
            {trend === 'down' && '↓'}
            {trend === 'neutral' && '→'}
            {trendValue}
          </div>
        )}
      </div>

      <div className="space-y-1">
        <p className="text-sm text-muted-foreground font-medium">{title}</p>
        <p className="text-3xl font-bold tracking-tight">{value}</p>
        {subtitle && (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        )}
      </div>

      {/* Animated corner accent */}
      <div className="absolute top-0 right-0 w-20 h-20 overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity">
        <div className={cn(
          "absolute -top-10 -right-10 w-20 h-20 rotate-45",
          variant === 'default' && "bg-gradient-to-br from-primary/20 to-transparent",
          variant === 'success' && "bg-gradient-to-br from-success/20 to-transparent",
          variant === 'warning' && "bg-gradient-to-br from-warning/20 to-transparent",
          variant === 'critical' && "bg-gradient-to-br from-destructive/20 to-transparent"
        )} />
      </div>
    </div>
  );
};
