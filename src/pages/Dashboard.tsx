import { Cpu, Network, AlertTriangle, Clock, HardDrive, Wifi, Activity, Shield } from 'lucide-react';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { LiveLogFeed } from '@/components/dashboard/LiveLogFeed';
import { SystemChart } from '@/components/dashboard/SystemChart';
import { LogEntry, SystemMetrics, Anomaly } from '@/types/cyber';


interface DashboardProps {
  logs: LogEntry[];
  metrics: SystemMetrics;
  anomalies: Anomaly[];
}

export const Dashboard = ({ logs, metrics, anomalies }: DashboardProps) => {
  const activeAnomalies = anomalies.filter(a => a.status === 'active').length;
  const recentLogs = logs.slice(0, 50);
  const criticalLogs = logs.filter(l => l.severity === 'critical' || l.severity === 'high').length;
  
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Shield className="w-7 h-7 text-primary" />
            Security Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Real-time monitoring and threat detection
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-lg bg-muted/50 text-sm font-mono">
            <span className="text-muted-foreground">Last scan: </span>
            <span className="text-foreground">{new Date().toLocaleTimeString()}</span>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="CPU Usage"
          value={`${metrics.cpu}%`}
          subtitle={`${metrics.activeProcesses} active processes`}
          icon={Cpu}
          variant={metrics.cpu > 80 ? 'critical' : metrics.cpu > 60 ? 'warning' : 'default'}
          trend="neutral"
          trendValue="stable"
        />
        <MetricCard
          title="Network Connections"
          value={metrics.networkConnections}
          subtitle="Active TCP/UDP"
          icon={Network}
          variant="default"
          trend="up"
          trendValue="+12%"
        />
        <MetricCard
          title="Active Anomalies"
          value={activeAnomalies}
          subtitle={`${anomalies.length} total detected`}
          icon={AlertTriangle}
          variant={activeAnomalies > 5 ? 'critical' : activeAnomalies > 0 ? 'warning' : 'success'}
          trend={activeAnomalies > 0 ? 'up' : 'neutral'}
          trendValue={activeAnomalies > 0 ? 'needs attention' : 'all clear'}
        />
        <MetricCard
          title="System Uptime"
          value={
            typeof metrics.uptime === 'number'
              ? formatUptime(metrics.uptime)
              : metrics.uptime
          }
          subtitle="Since last restart"
          icon={Clock}
          variant="success"
        />
      </div>

      {/* Charts and Live Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* System Charts */}
        <div className="lg:col-span-1 space-y-4">
          <SystemChart
            title="CPU"
            value={metrics.cpu}
            color={metrics.cpu > 80 ? 'destructive' : metrics.cpu > 60 ? 'warning' : 'primary'}
          />
          <SystemChart
            title="Memory"
            value={metrics.memory}
            color={metrics.memory > 80 ? 'destructive' : 'success'}
          />
          <SystemChart
            title="Disk"
            value={metrics.disk}
            color="primary"
          />
        </div>

        {/* Live Log Feed */}
        <div className="lg:col-span-2">
          <LiveLogFeed logs={recentLogs} maxItems={50} />
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="glass-card p-4 text-center">
          <Activity className="w-6 h-6 mx-auto mb-2 text-primary" />
          <p className="text-2xl font-bold">{logs.length}</p>
          <p className="text-xs text-muted-foreground">Total Events</p>
        </div>
        <div className="glass-card p-4 text-center">
          <HardDrive className="w-6 h-6 mx-auto mb-2 text-success" />
          <p className="text-2xl font-bold">{metrics.disk}%</p>
          <p className="text-xs text-muted-foreground">Disk Usage</p>
        </div>
        <div className="glass-card p-4 text-center">
          <Wifi className="w-6 h-6 mx-auto mb-2 text-accent" />
          <p className="text-2xl font-bold">{metrics.networkConnections}</p>
          <p className="text-xs text-muted-foreground">Connections</p>
        </div>
        <div className="glass-card p-4 text-center">
          <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-warning" />
          <p className="text-2xl font-bold">{criticalLogs}</p>
          <p className="text-xs text-muted-foreground">High Priority</p>
        </div>
      </div>
    </div>
  );
};

function formatUptime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  return `${hrs}h ${mins}m ${secs}s`;
}
