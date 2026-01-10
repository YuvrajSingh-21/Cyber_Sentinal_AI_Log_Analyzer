import { cn } from '@/lib/utils';

type BadgeVariant = 'critical' | 'warning' | 'success' | 'info' | 'default';

interface StatusBadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  pulse?: boolean;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  critical: 'status-critical',
  warning: 'status-warning',
  success: 'status-success',
  info: 'status-info',
  default: 'bg-muted text-muted-foreground border border-border',
};

export const StatusBadge = ({ 
  variant = 'default', 
  children, 
  pulse = false,
  className 
}: StatusBadgeProps) => {
  return (
    <span className={cn("status-badge", variantStyles[variant], className)}>
      {pulse && (
        <span className={cn(
          "w-1.5 h-1.5 rounded-full mr-1.5",
          variant === 'critical' && "bg-destructive animate-pulse",
          variant === 'warning' && "bg-warning animate-pulse",
          variant === 'success' && "bg-success",
          variant === 'info' && "bg-primary animate-pulse",
          variant === 'default' && "bg-muted-foreground"
        )} />
      )}
      {children}
    </span>
  );
};
