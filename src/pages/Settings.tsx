import { useState } from 'react';
import { cn } from '@/lib/utils';
import { 
  Settings as SettingsIcon, 
  Database, 
  Bell, 
  Shield, 
  Cpu,
  Network,
  FileCode,
  Key,
  Save,
  RotateCcw,
  Download,
  Upload
} from 'lucide-react';

interface SettingsState {
  logSources: {
    network: boolean;
    system: boolean;
    file: boolean;
    auth: boolean;
  };
  anomalyThresholds: {
    cpuHigh: number;
    memoryHigh: number;
    networkConnections: number;
    failedAuthAttempts: number;
  };
  notifications: {
    enabled: boolean;
    criticalOnly: boolean;
    sound: boolean;
  };
  dataRetention: number;
}

const defaultSettings: SettingsState = {
  logSources: {
    network: true,
    system: true,
    file: true,
    auth: true,
  },
  anomalyThresholds: {
    cpuHigh: 80,
    memoryHigh: 85,
    networkConnections: 100,
    failedAuthAttempts: 5,
  },
  notifications: {
    enabled: true,
    criticalOnly: false,
    sound: true,
  },
  dataRetention: 30,
};

export const Settings = () => {
  const [settings, setSettings] = useState<SettingsState>(() => {
    const saved = localStorage.getItem('cybersentinel-settings');
    return saved ? JSON.parse(saved) : defaultSettings;
  });
  const [hasChanges, setHasChanges] = useState(false);

  const updateSettings = <K extends keyof SettingsState>(
    section: K,
    value: SettingsState[K]
  ) => {
    setSettings(prev => ({ ...prev, [section]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    localStorage.setItem('cybersentinel-settings', JSON.stringify(settings));
    setHasChanges(false);
  };

  const handleReset = () => {
    setSettings(defaultSettings);
    localStorage.removeItem('cybersentinel-settings');
    setHasChanges(false);
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cybersentinel-config.json';
    a.click();
  };

  const sourceIcons = {
    network: Network,
    system: Cpu,
    file: FileCode,
    auth: Key,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <SettingsIcon className="w-7 h-7 text-primary" />
            Settings
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure log sources, thresholds, and preferences
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport} className="cyber-button-secondary">
            <Download className="w-4 h-4" />
            Export
          </button>
          <button onClick={handleReset} className="cyber-button-ghost">
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
          <button 
            onClick={handleSave}
            className={cn(
              "cyber-button-primary",
              !hasChanges && "opacity-50 cursor-not-allowed"
            )}
            disabled={!hasChanges}
          >
            <Save className="w-4 h-4" />
            Save
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Log Sources */}
        <div className="glass-card p-6">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <Database className="w-5 h-5 text-primary" />
            Log Sources
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Enable or disable log collection from different sources
          </p>
          
          <div className="space-y-3">
            {(Object.keys(settings.logSources) as (keyof typeof settings.logSources)[]).map((source) => {
              const Icon = sourceIcons[source];
              return (
                <label 
                  key={source}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-5 h-5 text-muted-foreground" />
                    <span className="capitalize font-medium">{source}</span>
                  </div>
                  <button
                    onClick={() => updateSettings('logSources', {
                      ...settings.logSources,
                      [source]: !settings.logSources[source]
                    })}
                    className={cn(
                      "w-12 h-6 rounded-full transition-colors relative",
                      settings.logSources[source] ? "bg-primary" : "bg-muted"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 w-4 h-4 rounded-full bg-white transition-transform",
                      settings.logSources[source] ? "translate-x-7" : "translate-x-1"
                    )} />
                  </button>
                </label>
              );
            })}
          </div>
        </div>

        {/* Anomaly Thresholds */}
        <div className="glass-card p-6">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Anomaly Thresholds
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Set thresholds that trigger anomaly detection
          </p>
          
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">CPU High (%)</label>
                <span className="font-mono text-sm">{settings.anomalyThresholds.cpuHigh}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="100"
                value={settings.anomalyThresholds.cpuHigh}
                onChange={(e) => updateSettings('anomalyThresholds', {
                  ...settings.anomalyThresholds,
                  cpuHigh: parseInt(e.target.value)
                })}
                className="w-full accent-primary"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">Memory High (%)</label>
                <span className="font-mono text-sm">{settings.anomalyThresholds.memoryHigh}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="100"
                value={settings.anomalyThresholds.memoryHigh}
                onChange={(e) => updateSettings('anomalyThresholds', {
                  ...settings.anomalyThresholds,
                  memoryHigh: parseInt(e.target.value)
                })}
                className="w-full accent-primary"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">Max Network Connections</label>
                <span className="font-mono text-sm">{settings.anomalyThresholds.networkConnections}</span>
              </div>
              <input
                type="range"
                min="20"
                max="500"
                step="10"
                value={settings.anomalyThresholds.networkConnections}
                onChange={(e) => updateSettings('anomalyThresholds', {
                  ...settings.anomalyThresholds,
                  networkConnections: parseInt(e.target.value)
                })}
                className="w-full accent-primary"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">Failed Auth Attempts</label>
                <span className="font-mono text-sm">{settings.anomalyThresholds.failedAuthAttempts}</span>
              </div>
              <input
                type="range"
                min="1"
                max="20"
                value={settings.anomalyThresholds.failedAuthAttempts}
                onChange={(e) => updateSettings('anomalyThresholds', {
                  ...settings.anomalyThresholds,
                  failedAuthAttempts: parseInt(e.target.value)
                })}
                className="w-full accent-primary"
              />
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="glass-card p-6">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            Notifications
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Configure alert and notification preferences
          </p>
          
          <div className="space-y-3">
            {[
              { key: 'enabled', label: 'Enable Notifications' },
              { key: 'criticalOnly', label: 'Critical Alerts Only' },
              { key: 'sound', label: 'Sound Alerts' },
            ].map(({ key, label }) => (
              <label 
                key={key}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
              >
                <span className="font-medium">{label}</span>
                <button
                  onClick={() => updateSettings('notifications', {
                    ...settings.notifications,
                    [key]: !settings.notifications[key as keyof typeof settings.notifications]
                  })}
                  className={cn(
                    "w-12 h-6 rounded-full transition-colors relative",
                    settings.notifications[key as keyof typeof settings.notifications] ? "bg-primary" : "bg-muted"
                  )}
                >
                  <div className={cn(
                    "absolute top-1 w-4 h-4 rounded-full bg-white transition-transform",
                    settings.notifications[key as keyof typeof settings.notifications] ? "translate-x-7" : "translate-x-1"
                  )} />
                </button>
              </label>
            ))}
          </div>
        </div>

        {/* Data Retention */}
        <div className="glass-card p-6">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <Database className="w-5 h-5 text-primary" />
            Data Retention
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Configure how long logs and events are stored
          </p>
          
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Retention Period</label>
              <span className="font-mono text-sm">{settings.dataRetention} days</span>
            </div>
            <input
              type="range"
              min="7"
              max="30"
              step="1"
              value={settings.dataRetention}
              onChange={(e) => updateSettings('dataRetention', parseInt(e.target.value))}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>7 days</span>
              <span>30 days</span>
            </div>
          </div>

          <div className="mt-6 p-4 bg-muted/30 rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>Note:</strong> Logs older than the retention period will be automatically archived for forensic compliance.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
