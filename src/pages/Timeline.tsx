import { TimelineEvent } from '@/types/cyber';
import { StatusBadge } from '@/components/common/StatusBadge';
import { cn } from '@/lib/utils';
import { 
  Clock, 
  AlertTriangle, 
  Shield, 
  FileText, 
  Key,
  CircleDot
} from 'lucide-react';

interface TimelineProps {
  events: TimelineEvent[];
}

const categoryIcons = {
  incident: AlertTriangle,
  alert: Shield,
  change: FileText,
  access: Key,
};

const categoryColors = {
  incident: 'bg-destructive text-destructive-foreground',
  alert: 'bg-warning text-warning-foreground',
  change: 'bg-primary text-primary-foreground',
  access: 'bg-success text-success-foreground',
};

const severityColors = {
  critical: 'border-destructive',
  high: 'border-warning',
  medium: 'border-primary',
  low: 'border-muted-foreground',
};

export const Timeline = ({ events }: TimelineProps) => {
  const groupedEvents = events.reduce((acc, event) => {
    const date = event.timestamp.toLocaleDateString();
    if (!acc[date]) acc[date] = [];
    acc[date].push(event);
    return acc;
  }, {} as Record<string, TimelineEvent[]>);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Clock className="w-7 h-7 text-primary" />
            Incident Timeline
          </h1>
          <p className="text-muted-foreground mt-1">
            Forensic event reconstruction and analysis
          </p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          {(['incident', 'alert', 'change', 'access'] as const).map((cat) => {
            const Icon = categoryIcons[cat];
            return (
              <div key={cat} className="flex items-center gap-2">
                <div className={cn("p-1 rounded", categoryColors[cat])}>
                  <Icon className="w-3 h-3" />
                </div>
                <span className="capitalize text-muted-foreground">{cat}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-8">
        {Object.entries(groupedEvents).map(([date, dayEvents]) => (
          <div key={date}>
            {/* Date Header */}
            <div className="flex items-center gap-4 mb-6">
              <div className="glass-card px-4 py-2">
                <span className="font-semibold">{date}</span>
              </div>
              <div className="flex-1 h-px bg-border" />
              <span className="text-sm text-muted-foreground">
                {dayEvents.length} events
              </span>
            </div>

            {/* Events */}
            <div className="relative pl-8">
              {/* Vertical Line */}
              <div className="timeline-line" />

              <div className="space-y-6">
                {dayEvents.map((event, index) => {
                  const Icon = categoryIcons[event.category];
                  
                  return (
                    <div 
                      key={event.id} 
                      className={cn(
                        "relative pl-8 animate-fade-in",
                        index === 0 && "pt-0"
                      )}
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      {/* Timeline Dot */}
                      <div className={cn(
                        "timeline-dot border-2",
                        severityColors[event.severity]
                      )}>
                        <CircleDot className="w-3 h-3 text-muted-foreground" />
                      </div>

                      {/* Event Card */}
                      <div className="glass-card-hover p-4 ml-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3">
                            <div className={cn(
                              "p-2 rounded-lg shrink-0",
                              categoryColors[event.category]
                            )}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div>
                              <h3 className="font-medium">{event.description}</h3>
                              <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                                <span className="font-mono">
                                  {event.timestamp.toLocaleTimeString()}
                                </span>
                                <span>•</span>
                                <span className="capitalize">{event.source}</span>
                              </div>
                              {event.details && (
                                <p className="mt-2 text-sm text-muted-foreground">
                                  {event.details}
                                </p>
                              )}
                            </div>
                          </div>

                          <StatusBadge 
                            variant={
                              event.severity === 'critical' ? 'critical' :
                              event.severity === 'high' ? 'warning' :
                              event.severity === 'medium' ? 'info' : 'default'
                            }
                          >
                            {event.severity}
                          </StatusBadge>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>

      {events.length === 0 && (
        <div className="glass-card p-12 text-center">
          <Clock className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No timeline events recorded</p>
        </div>
      )}
    </div>
  );
};
