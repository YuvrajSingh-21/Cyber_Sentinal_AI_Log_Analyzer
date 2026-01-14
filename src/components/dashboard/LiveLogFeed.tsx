import { useEffect, useRef } from 'react';
import { LogEntry } from '@/types/cyber';
import { cn } from '@/lib/utils';
import { Network, Cpu, FileCode, Key } from 'lucide-react';

interface LiveLogFeedProps {
  logs: LogEntry[];
  maxItems?: number;
}

const sourceIcons = {
  network: Network,
  system: Cpu,
  file: FileCode,
  auth: Key,
};

const severityColors = {
  low: 'text-muted-foreground',
  medium: 'text-primary',
  high: 'text-warning',
  critical: 'text-destructive',
};

const statusDots = {
  success: 'bg-success',
  warning: 'bg-warning',
  error: 'bg-destructive',
  info: 'bg-primary',
};

export const LiveLogFeed = ({ logs, maxItems = 10 }: LiveLogFeedProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const displayLogs = logs
    .filter((log) => log.eventType !== 'system_metrics') // 🔑 HIDE METRICS
    .slice(0, maxItems);


  useEffect(() => {
    if (containerRef.current && logs.length > 0) {
      const firstChild = containerRef.current.firstElementChild;
      if (firstChild) {
        firstChild.classList.add('animate-fade-in');
        setTimeout(() => firstChild.classList.remove('animate-fade-in'), 300);
      }
    }
  }, [logs.length]);

  return (
    <div className="glass-card overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-border/50">
        <h3 className="font-semibold flex items-center gap-2">
          <div className="relative">
            <div className="w-2 h-2 rounded-full bg-success" />
            <div className="absolute inset-0 w-2 h-2 rounded-full bg-success animate-ping" />
          </div>
          Live Log Feed
        </h3>
        <span className="text-xs text-muted-foreground font-mono">
          {logs.length} total
        </span>
      </div>
      
      <div ref={containerRef} className="divide-y divide-border/30 max-h-[400px] overflow-y-auto scrollbar-cyber">
        {displayLogs.map((log) => {
          const Icon = sourceIcons[log.source];
          
          return (
            <div
              key={log.id}
              className="p-3 hover:bg-muted/20 transition-colors group"
            >
              <div className="flex items-start gap-3">
                <div className={cn(
                  "p-2 rounded-lg shrink-0 transition-colors",
                  log.source === 'network' && "bg-primary/10 text-primary",
                  log.source === 'system' && "bg-warning/10 text-warning",
                  log.source === 'file' && "bg-success/10 text-success",
                  log.source === 'auth' && "bg-accent/10 text-accent"
                )}>
                  <Icon className="w-4 h-4" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-semibold text-foreground">
                      {log.eventType}
                    </span>
                    <div className={cn("w-1.5 h-1.5 rounded-full", statusDots[log.status])} />
                    <span className={cn("text-xs", severityColors[log.severity])}>
                      {log.severity}
                    </span>
                  </div>
                  
                  <p className="text-sm text-muted-foreground truncate">
                    {log.message}
                  </p>
                  
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                    <span className="font-mono">
                      {log.timestamp.toLocaleTimeString()}
                    </span>
                    {log.ip && (
                      <span className="font-mono bg-muted/50 px-1.5 py-0.5 rounded">
                        {log.ip}
                      </span>
                    )}
                  </div>
                </div>

                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-[10px] font-mono text-muted-foreground truncate max-w-[100px] inline-block">
                    {log.hash.slice(0, 8)}...
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
