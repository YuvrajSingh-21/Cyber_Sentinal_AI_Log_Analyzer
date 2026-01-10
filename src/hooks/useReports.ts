import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

export interface ReportData {
  range: string;
  total_logs: number;
  total_anomalies: number;
  severity_breakdown: Record<string, number>;
  source_breakdown: Record<string, number>;
  top_anomalies: {
    id: string;
    title: string;
    severity: string;
    riskScore: number;
    status: string;
  }[];
}

export const useReports = (range: '24h' | '7d' | '30d') => {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);

    apiFetch<ReportData>(`/api/reports/summary?range=${range}`)
      .then(setData)
      .finally(() => setLoading(false));
  }, [range]);

  return { data, loading };
};
