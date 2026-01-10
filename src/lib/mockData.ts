import { LogEntry, Anomaly, TimelineEvent, SystemMetrics, Report } from '@/types/cyber';

const generateHash = () => {
  return Array.from({ length: 64 }, () => 
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
};

const randomIP = () => {
  return `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
};

const sources: LogEntry['source'][] = ['network', 'system', 'file', 'auth'];
const severities: LogEntry['severity'][] = ['low', 'medium', 'high', 'critical'];
const statuses: LogEntry['status'][] = ['success', 'warning', 'error', 'info'];

const eventTypes = {
  network: ['TCP_CONNECT', 'TCP_CLOSE', 'UDP_SEND', 'HTTP_REQUEST', 'DNS_QUERY', 'PORT_SCAN'],
  system: ['CPU_USAGE', 'MEMORY_ALLOC', 'DISK_WRITE', 'PROCESS_START', 'PROCESS_END', 'SERVICE_RESTART'],
  file: ['FILE_CREATE', 'FILE_MODIFY', 'FILE_DELETE', 'FILE_ACCESS', 'PERMISSION_CHANGE'],
  auth: ['LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGOUT', 'PASSWORD_CHANGE', 'MFA_TRIGGERED', 'SESSION_EXPIRED'],
};

const messages = {
  network: [
    'Established connection to remote host',
    'Incoming connection from external IP',
    'DNS resolution completed',
    'HTTP GET request processed',
    'Connection timeout detected',
    'Unusual port activity detected',
  ],
  system: [
    'CPU usage exceeded threshold',
    'Memory allocation successful',
    'Disk write operation completed',
    'New process spawned',
    'Process terminated normally',
    'Service restarted automatically',
  ],
  file: [
    'New file created in monitored directory',
    'Configuration file modified',
    'Temporary file deleted',
    'File accessed by user process',
    'File permissions updated',
  ],
  auth: [
    'User authenticated successfully',
    'Failed login attempt detected',
    'User session terminated',
    'Password updated for account',
    'Multi-factor authentication triggered',
    'Session expired due to inactivity',
  ],
};

export const generateLogEntry = (): LogEntry => {
  const source = sources[Math.floor(Math.random() * sources.length)];
  const eventType = eventTypes[source][Math.floor(Math.random() * eventTypes[source].length)];
  const message = messages[source][Math.floor(Math.random() * messages[source].length)];
  
  return {
    id: `LOG-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date(),
    source,
    ip: source === 'network' || source === 'auth' ? randomIP() : undefined,
    eventType,
    status: statuses[Math.floor(Math.random() * statuses.length)],
    message,
    severity: severities[Math.floor(Math.random() * severities.length)],
    hash: generateHash(),
  };
};

export const generateInitialLogs = (count: number): LogEntry[] => {
  const logs: LogEntry[] = [];
  const now = Date.now();
  
  for (let i = 0; i < count; i++) {
    const log = generateLogEntry();
    log.timestamp = new Date(now - (count - i) * 60000);
    logs.push(log);
  }
  
  return logs;
};

const anomalyTypes: Anomaly['type'][] = ['cpu_spike', 'network_anomaly', 'file_change', 'auth_failure', 'suspicious_activity'];

const xaiReasons = {
  cpu_spike: 'CPU usage exceeded 80% threshold. SHAP analysis indicates high correlation with process "node.exe" consuming 45% of resources. Historical baseline: 23% average.',
  network_anomaly: 'Unusual outbound traffic pattern detected. LIME explanation: 47 connections to unique IPs in 60s window exceeds 3σ from baseline of 12 connections/min.',
  file_change: 'Critical system file modified outside maintenance window. Permission escalation detected. Hash mismatch with known-good baseline.',
  auth_failure: 'Multiple failed authentication attempts from single IP. Pattern matches brute-force signature with 95% confidence. 23 attempts in 5 minutes.',
  suspicious_activity: 'Anomalous process behavior detected. Parent-child relationship unusual. Process spawned shell with elevated privileges.',
};

export const generateAnomaly = (): Anomaly => {
  const type = anomalyTypes[Math.floor(Math.random() * anomalyTypes.length)];
  
  return {
    id: `ANOM-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date(),
    source: sources[Math.floor(Math.random() * sources.length)],
    description: `${type.replace(/_/g, ' ').toUpperCase()} detected`,
    riskScore: Math.floor(Math.random() * 40) + 60,
    type,
    xaiReason: xaiReasons[type],
    status: 'active',
    relatedLogs: Array.from({ length: Math.floor(Math.random() * 5) + 1 }, () => 
      `LOG-${Math.random().toString(36).substr(2, 9)}`
    ),
  };
};

export const generateInitialAnomalies = (count: number): Anomaly[] => {
  const anomalies: Anomaly[] = [];
  const now = Date.now();
  
  for (let i = 0; i < count; i++) {
    const anomaly = generateAnomaly();
    anomaly.timestamp = new Date(now - (count - i) * 300000);
    anomaly.status = ['active', 'investigating', 'resolved'][Math.floor(Math.random() * 3)] as Anomaly['status'];
    anomalies.push(anomaly);
  }
  
  return anomalies;
};

export const generateTimelineEvent = (): TimelineEvent => {
  const categories: TimelineEvent['category'][] = ['incident', 'alert', 'change', 'access'];
  const category = categories[Math.floor(Math.random() * categories.length)];
  
  const descriptions = {
    incident: 'Security incident detected and logged',
    alert: 'System alert triggered by threshold breach',
    change: 'Configuration change detected',
    access: 'Access control event recorded',
  };
  
  return {
    id: `TL-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date(),
    source: sources[Math.floor(Math.random() * sources.length)],
    description: descriptions[category],
    severity: severities[Math.floor(Math.random() * severities.length)],
    category,
    details: 'Additional forensic details available in full report.',
  };
};

export const generateInitialTimeline = (count: number): TimelineEvent[] => {
  const events: TimelineEvent[] = [];
  const now = Date.now();
  
  for (let i = 0; i < count; i++) {
    const event = generateTimelineEvent();
    event.timestamp = new Date(now - (count - i) * 600000);
    events.push(event);
  }
  
  return events;
};

export const generateSystemMetrics = (): SystemMetrics => {
  return {
    cpu: Math.floor(Math.random() * 60) + 10,
    memory: Math.floor(Math.random() * 40) + 30,
    disk: Math.floor(Math.random() * 30) + 40,
    networkConnections: Math.floor(Math.random() * 100) + 20,
    activeProcesses: Math.floor(Math.random() * 150) + 50,
    uptime: `${Math.floor(Math.random() * 30)}d ${Math.floor(Math.random() * 24)}h ${Math.floor(Math.random() * 60)}m`,
  };
};

export const generateReport = (name: string, type: Report['type']): Report => {
  return {
    id: `RPT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name,
    date: new Date(),
    type,
    hash: generateHash(),
    chainOfCustody: [
      `Generated by CyberSentinel at ${new Date().toISOString()}`,
      `Hash verified: SHA256`,
      `Export initiated by current user`,
    ],
    status: 'completed',
  };
};

export const initialReports: Report[] = [
  {
    id: 'RPT-001',
    name: 'Weekly Security Summary',
    date: new Date(Date.now() - 86400000 * 2),
    type: 'pdf',
    hash: generateHash(),
    chainOfCustody: ['Generated automatically', 'Hash verified'],
    status: 'completed',
  },
  {
    id: 'RPT-002',
    name: 'Anomaly Investigation - Jan 2026',
    date: new Date(Date.now() - 86400000 * 5),
    type: 'pdf',
    hash: generateHash(),
    chainOfCustody: ['Manual generation', 'Hash verified', 'Downloaded'],
    status: 'completed',
  },
  {
    id: 'RPT-003',
    name: 'Network Traffic Export',
    date: new Date(Date.now() - 86400000),
    type: 'csv',
    hash: generateHash(),
    chainOfCustody: ['Export requested', 'Hash verified'],
    status: 'completed',
  },
];
