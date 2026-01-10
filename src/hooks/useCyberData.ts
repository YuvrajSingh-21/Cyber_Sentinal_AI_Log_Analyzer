import { useState, useEffect, useCallback,useMemo } from 'react';
import { LogEntry, Anomaly, TimelineEvent, SystemMetrics } from '@/types/cyber';
import { apiFetch } from '@/lib/api';


export const useCyberData = () => {
  /* -------------------- STATE -------------------- */
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [metrics, setMetrics] = useState<SystemMetrics>({
    cpu: 0,
    memory: 0,
    disk: 0,
    networkConnections: 0,
    activeProcesses: 0,
    uptime: 0,
  });


  const [isLive, setIsLive] = useState(true);
  
  useEffect(() => {
    let isMounted = true;

    const fetchLogs = async () => {
      try {
        const data = await apiFetch<any[]>('/api/logs/explorer');

        if (!isMounted || !Array.isArray(data)) return;

        const normalizedLogs: LogEntry[] = data.map((log) => ({
          id: String(log.id),

          // 🔥 CRITICAL: string → Date
          timestamp: new Date(log.timestamp),

          // backend → frontend mapping
          eventType: log.log_type ?? 'system',

          source: ['network', 'system', 'file', 'auth'].includes(
            (log.log_type || '').toLowerCase()
          )
            ? log.log_type.toLowerCase()
            : 'system',

          severity:
            log.severity === 'critical'
              ? 'critical'
              : log.severity === 'high'
              ? 'high'
              : log.severity === 'medium'
              ? 'medium'
              : 'low',

          message: log.message,

          ip: log.message?.match(/\b\d{1,3}(\.\d{1,3}){3}\b/)?.[0],

          hash: btoa(`${log.id}-${log.timestamp}`).slice(0, 16),

          status:
          log.severity === 'critical'
            ? 'error'
            : log.severity === 'high'
            ? 'warning'
            : log.severity === 'medium'
            ? 'info'
            : 'success',

        }));

        setLogs(normalizedLogs);
      } catch (err) {
        console.error('❌ Failed to fetch logs', err);
      }
    };

    fetchLogs();
    const interval = setInterval(fetchLogs, 3000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);


  useEffect(() => {
    apiFetch<any[]>('/api/timeline')
      .then(data => {
        if (Array.isArray(data)) {
          setTimeline(data.map(normalizeTimelineEvent));
        }
      })
      .catch(err => console.error('❌ Timeline fetch failed', err));
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchAnomalies = async () => {
      try {
        const data = await apiFetch<any[]>('/api/anomalies');
        if (Array.isArray(data)) {
          setAnomalies(data.map(normalizeAnomaly));
        }
      } catch (err) {
        console.error('❌ Failed to fetch anomalies', err);
      }
    };

    fetchAnomalies();
    const interval = setInterval(fetchAnomalies, 3000);

      return () => {
        isMounted = false;
        clearInterval(interval);
      };
  }, []);

  const normalizedLogs = useMemo(() => {
    return logs.filter(
      (l): l is LogEntry =>
        typeof l === 'object' &&
        l !== null &&
        'source' in l &&
        'timestamp' in l &&
        l.timestamp instanceof Date
    );
  }, [logs]);


  useEffect(() => {
    if (!normalizedLogs.length) return;

    // --- SYSTEM LOGS ---
    const systemLogs = normalizedLogs.filter(l => l.source === 'system');

    let cpu = 0;
    let memory = 0;
    let disk = 0;

    for (const log of systemLogs) {
      if (typeof log.message !== 'string') continue;

      cpu = extractPercent('CPU', log.message) ?? cpu;
      memory = extractPercent('MEM', log.message) ?? memory;
      disk = extractPercent('DISK', log.message) ?? disk;
    }

    // --- NETWORK HOSTS ---
    const networkLogs = normalizedLogs.filter(l => l.source === 'network');
    const uniqueHosts = new Set<string>();

    for (const log of networkLogs) {
      if (log.ip) uniqueHosts.add(log.ip);
    }

    const networkConnections = uniqueHosts.size;
    const activeProcesses = systemLogs.length;

    const uptime =
      Math.floor(
        (Date.now() -
          normalizedLogs[normalizedLogs.length - 1].timestamp.getTime()) / 1000
      );

    // ✅ SAFE STATE UPDATE (THIS IS THE FIX)
    setMetrics(prev => {
      if (
        prev.cpu === cpu &&
        prev.memory === memory &&
        prev.disk === disk &&
        prev.networkConnections === networkConnections &&
        prev.activeProcesses === activeProcesses &&
        prev.uptime === uptime
      ) {
        return prev; // ⛔ STOP HERE → no re-render
      }

      return {
        cpu,
        memory,
        disk,
        networkConnections,
        activeProcesses,
        uptime,
      };
    });
  }, [normalizedLogs]);


  /* -------------------- WEBSOCKET (LIVE LOGS) -------------------- */
  useEffect(() => {
    if (!isLive) return;
    let isMounted = true;
    const ws = new WebSocket(
      'ws://localhost:8000/ws/alerts?endpoint_id=default'
    );

    ws.onmessage = async (event) => {
      try {
        const payload = JSON.parse(event.data);

        // 🔹 log event
        if (payload.log_type) {
          setLogs(prev => [payload, ...prev].slice(0, 200));
        }

        // 🔹 anomaly refresh
        const anomaliesData = await apiFetch<any[]>('/api/anomalies');
        if (Array.isArray(anomaliesData)) {
          setAnomalies(anomaliesData.map(normalizeAnomaly));
        }

        // 🔹 timeline refresh
        const timelineData = await apiFetch<any[]>('/api/timeline');
        if (Array.isArray(timelineData)) {
          setTimeline(timelineData.map(normalizeTimelineEvent));
        }
      } catch (err) {
        console.error('❌ WS message error', err);
      }
    };


    ws.onerror = (err) => {
      console.error('❌ WebSocket error', err);
    };

    return () => {
      isMounted = false;
      ws.close();
    };
  }, [isLive]);

  /* -------------------- ANOMALY STATUS UPDATE -------------------- */
  const updateAnomalyStatus = useCallback(
    async (id: string, status: Anomaly['status']) => {
      await apiFetch(`/api/anomalies/${id}/status?status=${status}`, {
        method: 'PATCH',
      });

      setAnomalies(prev =>
        prev.map(a => (a.id === id ? { ...a, status } : a))
      );
    },
    []
  );

  /* -------------------- ACTIONS -------------------- */
  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  const toggleLive = useCallback(() => {
    setIsLive(prev => !prev);
  }, []);

  /* -------------------- EXPORT -------------------- */
  return {
    logs,
    anomalies,
    timeline,
    metrics,
    isLive,
    updateAnomalyStatus,
    clearLogs,
    toggleLive,
  };
};


function normalizeAnomaly(raw: any): Anomaly {
  return {
    id: String(raw.id ?? crypto.randomUUID()),

    title:
      raw.title ??
      raw.anomaly_type ??
      raw.log_type ??
      'Security Anomaly',

    description:
      raw.description ??
      raw.details ??
      raw.message ??
      'Suspicious behavior detected',

    timestamp: raw.timestamp
      ? new Date(raw.timestamp)
      : new Date(),

    source: raw.source ?? 'system',

    severity:
      raw.severity === 'critical'
        ? 'critical'
        : raw.severity === 'high'
        ? 'high'
        : raw.severity === 'medium'
        ? 'medium'
        : 'low',

    riskScore:
      typeof raw.risk_score === 'number'
        ? raw.risk_score
        : typeof raw.riskScore === 'number'
        ? raw.riskScore
        : 60,

    type:
      raw.type ??
      raw.anomaly_type ??
      'suspicious_activity',

    xaiReason:
      raw.xai_reason ??
      raw.xaiReason ??
      'Model detected abnormal deviation from baseline behavior',

    status:
      raw.status === 'resolved'
        ? 'resolved'
        : raw.status === 'investigating'
        ? 'investigating'
        : raw.status === 'dismissed'
        ? 'dismissed'
        : 'active',

    relatedLogs: Array.isArray(raw.related_logs)
      ? raw.related_logs.map(String)
      : Array.isArray(raw.relatedLogs)
      ? raw.relatedLogs.map(String)
      : [],
  };
}



function normalizeTimelineEvent(raw: any): TimelineEvent {
  return {
    id: String(raw.id),

    timestamp: new Date(raw.timestamp),

    title:
      raw.title ??
      raw.event_type ??
      raw.log_type?.toUpperCase() ??
      'Timeline Event',

    description:
      raw.description ??
      raw.message ??
      'Event recorded',

    // ✅ REQUIRED FIELD
    type:
      raw.type ??
      raw.event_type ??
      raw.log_type ??
      'system',

    severity:
      raw.severity === 'critical'
        ? 'critical'
        : raw.severity === 'high'
        ? 'high'
        : raw.severity === 'medium'
        ? 'medium'
        : 'low',

    // ✅ REQUIRED ENUM
    category:
      raw.category ??
      (raw.anomaly_id
        ? 'incident'
        : raw.log_type === 'access'
        ? 'access'
        : raw.log_type === 'change'
        ? 'change'
        : 'alert'),

    // ✅ REQUIRED FIELD
    details:
      raw.details ??
      raw.raw_data ??
      raw.message ??
      'No additional details',

    source: raw.source ?? 'system',
  };
}

function extractPercent(label: string, message: string): number | null {
  const regex = new RegExp(`${label}\\s*(\\d+(\\.\\d+)?)%`, 'i');
  const match = message.match(regex);
  return match ? Number(match[1]) : null;
}