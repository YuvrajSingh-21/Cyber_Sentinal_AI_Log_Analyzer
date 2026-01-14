import { useState, useEffect, useCallback, useMemo } from 'react';
import { LogEntry, Anomaly, TimelineEvent, SystemMetrics } from '@/types/cyber';
import { apiFetch } from '@/lib/api';

/* ================= SAFE JSON PARSER ================= */
function safeParseRawData(raw: any): any | null {
  if (!raw) return null;
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

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
  const [liveMetrics, setLiveMetrics] = useState<SystemMetrics | null>(null);
  const [activeHosts, setActiveHosts] = useState<Set<string>>(new Set());

  const [isLive, setIsLive] = useState(true);

  /* -------------------- FETCH LOGS -------------------- */
  useEffect(() => {
    let isMounted = true;

    const fetchLogs = async () => {
      try {
        const data = await apiFetch<any[]>('/api/logs/explorer');
        if (!isMounted || !Array.isArray(data)) return;

        const normalizedLogs: LogEntry[] = data.map((log) => {
          const rawType = (log.log_type || '').toLowerCase();

          const source =
            rawType === 'network'
              ? 'network'
              : rawType === 'file'
              ? 'file'
              : rawType === 'auth'
              ? 'auth'
              : 'system';

          return {
            id: String(log.id),
            timestamp: new Date(log.timestamp),
            eventType: log.log_type ?? 'system',

            source, // ✅ FIXED

            severity:
              log.severity === 'critical'
                ? 'critical'
                : log.severity === 'high'
                ? 'high'
                : log.severity === 'medium'
                ? 'medium'
                : 'low',

            message: log.message ?? '',
            raw_data: log.raw_data ?? null,

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
          };
        });



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

  /* -------------------- TIMELINE -------------------- */
  useEffect(() => {
    apiFetch<any[]>('/api/timeline')
      .then((data) => {
        if (Array.isArray(data)) {
          setTimeline(data.map(normalizeTimelineEvent));
        }
      })
      .catch((err) => console.error('❌ Timeline fetch failed', err));
  }, []);

  /* -------------------- ANOMALIES -------------------- */
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

  /* -------------------- NORMALIZED LOGS -------------------- */
  const normalizedLogs = useMemo(() => {
    return logs.filter(
      (l): l is LogEntry =>
        l &&
        typeof l === 'object' &&
        l.timestamp instanceof Date &&
        !isNaN(l.timestamp.getTime())
    );
  }, [logs]);

  /* -------------------- METRICS -------------------- */

useEffect(() => {
  if (!normalizedLogs.length) return;

  // ⚠️ ALWAYS recompute from the newest timestamp
  let latest: LogEntry | null = null;

  for (const l of normalizedLogs) {
    if (l.eventType !== 'system_metrics' || !l.raw_data) continue;
    if (!latest || l.timestamp > latest.timestamp) {
      latest = l;
    }
  }

  if (!latest) return;

  const data = safeParseRawData(latest.raw_data);
  if (!data) return;

  let disk = 0;
  if (data.disks) {
    const values = Object.values(data.disks) as Array<{
      used_percent?: number;
    }>;
    if (values.length) {
      disk = Math.round(
        values.reduce((s, d) => s + (d.used_percent ?? 0), 0) /
          values.length
      );
    }
  }

  setMetrics((prev) => ({
    ...prev,
    cpu: data.cpu_percent ?? prev.cpu,
    memory: data.memory_percent ?? prev.memory,
    disk,
    uptime: data.uptime_seconds ?? prev.uptime,
  }));
}, [normalizedLogs]);

useEffect(() => {
  setLiveMetrics(prev => ({
    ...prev,
    networkConnections: activeHosts.size,
  }));
}, [activeHosts]);
// 🔑 DERIVE NETWORK CONNECTIONS FROM LOGS (ACTIVE HOSTS)
useEffect(() => {
  const hosts = new Set<string>();

  logs.forEach((log) => {
    if (log.eventType === 'network' && log.raw_data) {
      const data =
        typeof log.raw_data === 'string'
          ? JSON.parse(log.raw_data)
          : log.raw_data;

      if (data?.src_ip) {
        hosts.add(data.src_ip);
      }
    }
  });

  setMetrics((prev) => ({
    ...prev,
    networkConnections: hosts.size,
  }));
}, [logs]);

  /* -------------------- WEBSOCKET -------------------- */
  useEffect(() => {
  if (!isLive) return;

  const ws = new WebSocket(
    'ws://localhost:8000/ws/alerts?endpoint_id=default'
  );

  ws.onmessage = async (event) => {
    try {
      const payload = JSON.parse(event.data);

      /* ---------------- LOGS (UNCHANGED) ---------------- */
      if (payload.log_type) {
        const normalized: LogEntry = {
          id: String(payload.id ?? crypto.randomUUID()),
          timestamp: payload.timestamp
            ? new Date(payload.timestamp)
            : new Date(),
          eventType: payload.log_type ?? 'system',
          source: payload.log_type ?? 'system',
          severity:
            payload.severity === 'critical'
              ? 'critical'
              : payload.severity === 'high'
              ? 'high'
              : payload.severity === 'medium'
              ? 'medium'
              : 'low',
          message: payload.message ?? '',
          raw_data: payload.raw_data ?? null,
          status: 'info',
          hash: crypto.randomUUID().slice(0, 12),
        };

        setLogs((prev) => [normalized, ...prev].slice(0, 200));
      }

      /* ---------------- 🔑 LIVE SYSTEM METRICS (NEW) ---------------- */
      if (payload.log_type === 'system_metrics' && payload.raw_data) {
        const data =
          typeof payload.raw_data === 'string'
            ? JSON.parse(payload.raw_data)
            : payload.raw_data;

        let disk = 0;
        if (data?.disks) {
          const values = Object.values(data.disks) as Array<{
            used_percent?: number;
          }>;

          if (values.length) {
            disk = Math.round(
              values.reduce(
                (sum, d) => sum + (d.used_percent ?? 0),
                0
              ) / values.length
            );
          }
        }
         // 🔑 TRACK ACTIVE HOSTS (NETWORK STATE)
        if (payload.log_type === 'network' && payload.raw_data) {
          const data =
            typeof payload.raw_data === 'string'
              ? JSON.parse(payload.raw_data)
              : payload.raw_data;

          if (data?.src_ip) {
            setActiveHosts(prev => {
              const next = new Set(prev);
              next.add(data.src_ip);
              return next;
            });
          }
        }

        setLiveMetrics((prev) => ({
          cpu: data.cpu_percent ?? prev?.cpu ?? 0,
          memory: data.memory_percent ?? prev?.memory ?? 0,
          disk,
          networkConnections: activeHosts.size,
          activeProcesses: prev?.activeProcesses ?? 0,
          uptime: data.uptime_seconds ?? prev?.uptime ?? 0,
        }));
      }

      /* ---------------- ANOMALIES (UNCHANGED) ---------------- */
      const anomaliesData = await apiFetch<any[]>('/api/anomalies');
      if (Array.isArray(anomaliesData)) {
        setAnomalies(anomaliesData.map(normalizeAnomaly));
      }

      /* ---------------- TIMELINE (UNCHANGED) ---------------- */
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
    ws.close();
  };
}, [isLive]);


  /* -------------------- ACTIONS -------------------- */
  const updateAnomalyStatus = useCallback(
    async (id: string, status: Anomaly['status']) => {
      await apiFetch(`/api/anomalies/${id}/status?status=${status}`, {
        method: 'PATCH',
      });

      setAnomalies((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status } : a))
      );
    },
    []
  );
  const fetchAnomalyXAI = useCallback(async (id: string) => {
    try {
      const data = await apiFetch(`/api/anomalies/${id}/xai`);
      return data;
    } catch (err) {
      console.error('❌ Failed to fetch anomaly XAI', err);
      return null;
    }
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  const toggleLive = useCallback(() => {
    setIsLive((prev) => !prev);
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
    fetchAnomalyXAI,
  };
};

/* ================= NORMALIZERS ================= */

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
    timestamp: raw.timestamp ? new Date(raw.timestamp) : new Date(),
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
    type: raw.type ?? raw.anomaly_type ?? 'suspicious_activity',
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
    category:
      raw.category ??
      (raw.anomaly_id
        ? 'incident'
        : raw.log_type === 'access'
        ? 'access'
        : raw.log_type === 'change'
        ? 'change'
        : 'alert'),
    details:
      raw.details ??
      raw.raw_data ??
      raw.message ??
      'No additional details',
    source: raw.source ?? 'system',
  };
}
