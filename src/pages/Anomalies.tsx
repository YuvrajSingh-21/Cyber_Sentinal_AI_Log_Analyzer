import { useState } from 'react';
import { Anomaly } from '@/types/cyber';
import { StatusBadge } from '@/components/common/StatusBadge';
import { cn } from '@/lib/utils';
import { apiFetch } from '@/lib/api';

import {
  AlertTriangle,
  Cpu,
  Network,
  FileCode,
  Key,
  ChevronRight,
  X,
  CheckCircle,
  Eye,
  Trash2,
  Brain,
  TrendingUp
} from 'lucide-react';

interface AnomaliesProps {
  anomalies: Anomaly[];
  onUpdateStatus: (id: string, status: Anomaly['status']) => void;
}

interface XAIResponse {
  summary: string;
  risk_score: number;
  confidence: number;
  why_flagged: {
    signal: string;
    explanation: string;
    severity: 'low' | 'medium' | 'high';
  }[];
  remediation_steps: {
    step: number;
    action: string;
    reason: string;
  }[];
  preventive_measures: {
    control: string;
    purpose: string;
  }[];
  evidence: {
    type: string;
    source: string;
    description: string;
  }[];
}

const typeIcons = {
  cpu_spike: Cpu,
  network_anomaly: Network,
  file_change: FileCode,
  auth_failure: Key,
  suspicious_activity: AlertTriangle,
};


const typeColors = {
  cpu_spike: 'bg-warning/10 text-warning border-warning/30',
  network_anomaly: 'bg-primary/10 text-primary border-primary/30',
  file_change: 'bg-success/10 text-success border-success/30',
  auth_failure: 'bg-destructive/10 text-destructive border-destructive/30',
  suspicious_activity: 'bg-accent/10 text-accent border-accent/30',
};

export const Anomalies = ({ anomalies, onUpdateStatus }: AnomaliesProps) => {
  const [selectedAnomaly, setSelectedAnomaly] = useState<Anomaly | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'investigating' | 'resolved'>('all');
  const [showRemediation, setShowRemediation] = useState(false);
  
  // 🔥 NEW: XAI state
  const [xaiData, setXaiData] = useState<XAIResponse | null>(null);
  const [xaiLoading, setXaiLoading] = useState(false);
  const [xaiError, setXaiError] = useState<string | null>(null);

  const filteredAnomalies =
    filter === 'all' ? anomalies : anomalies.filter(a => a.status === filter);

  const getRiskColor = (score: number) => {
    if (score >= 80) return 'text-destructive';
    if (score >= 60) return 'text-warning';
    return 'text-primary';
  };

  const getRiskBg = (score: number) => {
    if (score >= 80) return 'bg-destructive';
    if (score >= 60) return 'bg-warning';
    return 'bg-primary';
  };

  // 🔥 NEW: Fetch XAI data
  const fetchXAI = async (anomalyId: string) => {
    setXaiLoading(true);
    setXaiError(null);

    try {
      const data = await apiFetch<any>(`/api/anomalies/${anomalyId}/xai`);

      // normalize response shape
      const xai = data?.xai ?? data;

      if (!xai) {
        throw new Error('Empty XAI response');
      }

      setXaiData(xai);
      setShowRemediation(true);
    } catch (err) {
      console.error('❌ XAI fetch failed', err);
      setXaiError('Failed to load AI explanation');
    } finally {
      setXaiLoading(false);
    }
  };


  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header + Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <AlertTriangle className="w-7 h-7 text-warning" />
            Anomaly Detection
          </h1>
          <p className="text-muted-foreground mt-1">
            AI-powered threat analysis with XAI explanations
          </p>
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          {(['all', 'active', 'investigating', 'resolved'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize",
                filter === status
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="glass-card p-4">
          <p className="text-xs text-muted-foreground mb-1">Active</p>
          <p className="text-2xl font-bold text-destructive">
            {anomalies.filter(a => a.status === 'active').length}
          </p>
        </div>

        <div className="glass-card p-4">
          <p className="text-xs text-muted-foreground mb-1">Investigating</p>
          <p className="text-2xl font-bold text-warning">
            {anomalies.filter(a => a.status === 'investigating').length}
          </p>
        </div>

        <div className="glass-card p-4">
          <p className="text-xs text-muted-foreground mb-1">Resolved</p>
          <p className="text-2xl font-bold text-success">
            {anomalies.filter(a => a.status === 'resolved').length}
          </p>
        </div>

        <div className="glass-card p-4">
          <p className="text-xs text-muted-foreground mb-1">Avg Risk Score</p>
          <p className="text-2xl font-bold text-primary">
            {anomalies.length > 0
              ? Math.round(
                  anomalies.reduce((acc, a) => acc + a.riskScore, 0) / anomalies.length
                )
              : 0}
          </p>
        </div>
      </div>
      {/* Anomaly List */}
      <div className="grid gap-4">
        {filteredAnomalies.map((anomaly) => {
          const Icon = typeIcons[anomaly.type] ?? AlertTriangle;

          return (
            <div
              key={anomaly.id}
              className={cn(
                "glass-card-hover p-4 cursor-pointer",
                selectedAnomaly?.id === anomaly.id && "ring-2 ring-primary"
              )}
              onClick={() => {
                setSelectedAnomaly(anomaly);
                setXaiData(null);
                setShowRemediation(false);
                setXaiError(null);
              }}
            >
              <div className="flex items-start gap-4">
                <div className={cn(
                  "p-3 rounded-xl border shrink-0",
                  typeColors[anomaly.type] ?? "bg-muted text-muted-foreground border-border"
                )}>
                  <Icon className="w-6 h-6" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div>
                      <h3 className="font-semibold">{anomaly.description}</h3>
                      <p className="text-sm text-muted-foreground">
                        {anomaly.timestamp.toLocaleString()} • {anomaly.source}
                      </p>
                    </div>

                    <StatusBadge>{anomaly.status}</StatusBadge>
                  </div>

                  <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-3">
                    <div
                      className={cn("h-full rounded-full", getRiskBg(anomaly.riskScore))}
                      style={{ width: `${anomaly.riskScore}%` }}
                    />
                  </div>

                  <ChevronRight className="w-4 h-4 ml-auto" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* XAI Modal */}
      {selectedAnomaly && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Brain className="w-5 h-5" />
                XAI Analysis
              </h2>
        

              <button onClick={() => {
                setSelectedAnomaly(null);
                setShowRemediation(false);
                setXaiData(null);
              }}>
                <X />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Suspicious Behavior */}
              <div>
                <h3 className="font-semibold mb-1">Suspicious behavior detected</h3>
                <p className="text-sm text-muted-foreground">
                  Detected at {selectedAnomaly.timestamp.toLocaleString()}
                </p>
              </div>

              {/* Risk Assessment */}
              <div className="glass-card p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium">Risk Assessment</span>
                  <span className={cn("text-2xl font-bold", getRiskColor(selectedAnomaly.riskScore))}>
                    {selectedAnomaly.riskScore}/100
                  </span>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all", getRiskBg(selectedAnomaly.riskScore))}
                    style={{ width: `${selectedAnomaly.riskScore}%` }}
                  />
                </div>
              </div>
              {/* Why flagged */}
              <div className="glass-card p-4">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Why was this flagged?
                </h4>

                {xaiLoading && <p className="text-sm text-muted-foreground">Analyzing...</p>}
                {xaiError && <p className="text-sm text-destructive">{xaiError}</p>}

                {xaiData && (
                  <ul className="space-y-2 text-sm">
                    {xaiData.why_flagged.map((item, idx) => (
                      <li key={idx}>
                        <strong>{item.signal}:</strong>{' '}
                        <span className="text-muted-foreground">{item.explanation}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Remediation */}
              {showRemediation && xaiData && (
                <>
                  <div className="glass-card p-4">
                    <h4 className="font-semibold mb-3">Steps to Remediate</h4>
                    <ol className="space-y-2 text-sm">
                      {xaiData.remediation_steps.map(step => (
                        <li key={step.step}>
                          <strong>Step {step.step}:</strong> {step.action}
                          <div className="text-xs text-muted-foreground">{step.reason}</div>
                        </li>
                      ))}
                    </ol>
                  </div>

                  <div className="glass-card p-4">
                    <h4 className="font-semibold mb-3">Precautions</h4>
                    <ul className="space-y-2 text-sm">
                      {xaiData.preventive_measures.map((p, idx) => (
                        <li key={idx}>
                          <strong>{p.control}:</strong> {p.purpose}
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t">
                {!showRemediation && (
                  <button
                    className="cyber-button-secondary flex-1"
                    onClick={async () => {
                      onUpdateStatus(selectedAnomaly.id, 'investigating');
                      await fetchXAI(selectedAnomaly.id); // ✅ ONLY HERE
                    }}
                  >
                    <Eye className="w-4 h-4" />
                    Investigate
                  </button>
                )}


                <button
                  className="cyber-button-primary flex-1"
                  onClick={() => {
                    onUpdateStatus(selectedAnomaly.id, 'resolved');
                    setSelectedAnomaly(null);
                  }}
                >
                  <CheckCircle className="w-4 h-4" />
                  Resolve
                </button>

                <button
                  className="cyber-button-ghost"
                  onClick={() => setSelectedAnomaly(null)}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
