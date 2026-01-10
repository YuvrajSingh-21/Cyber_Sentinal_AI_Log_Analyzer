import { useState } from 'react';
import { Report } from '@/types/cyber';
import { StatusBadge } from '@/components/common/StatusBadge';
import { cn } from '@/lib/utils';
import {
  FileBarChart,
  Download,
  FileText,
  FileSpreadsheet,
  FileJson,
  Plus,
  Hash,
  Clock,
  Shield,
  CheckCircle,
  Loader2
} from 'lucide-react';

export const Reports = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportType, setReportType] = useState<Report['type']>('pdf');
  const [reportName, setReportName] = useState('');

  const handleGenerateReport = async () => {
    if (!reportName.trim()) return;

    setIsGenerating(true);

    try {
      const endpoint = `/api/reports/export/${reportType}`;

      const res = await fetch(
        `${import.meta.env.VITE_API_URL}${endpoint}`
      );

      if (!res.ok) {
        throw new Error('Export failed');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `${reportName}.${reportType}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      /* OPTIONAL: fake report entry for UI */
      setReports(prev => [
        {
          id: crypto.randomUUID(),
          name: reportName,
          type: reportType,
          status: 'completed',
          date: new Date(),
          hash: 'generated-at-export',
          chainOfCustody: ['Generated', 'Exported']
        },
        ...prev
      ]);

      setReportName('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const typeIcons = {
    pdf: FileText,
    csv: FileSpreadsheet,
    json: FileJson,
  };

  const typeColors = {
    pdf: 'bg-destructive/10 text-destructive',
    csv: 'bg-success/10 text-success',
    json: 'bg-warning/10 text-warning',
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <FileBarChart className="w-7 h-7 text-primary" />
            Forensic Reports
          </h1>
          <p className="text-muted-foreground mt-1">
            Generate and export investigation reports with chain of custody
          </p>
        </div>
      </div>

      {/* Generate Report */}
      <div className="glass-card p-6">
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5 text-primary" />
          Generate New Report
        </h2>

        <div className="grid sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label className="text-sm text-muted-foreground mb-1.5 block">
              Report Name
            </label>
            <input
              type="text"
              placeholder="e.g., Incident Investigation - January 2026"
              value={reportName}
              onChange={(e) => setReportName(e.target.value)}
              className="search-input w-full"
            />
          </div>

          <div>
            <label className="text-sm text-muted-foreground mb-1.5 block">
              Format
            </label>
            <div className="flex gap-2">
              {(['pdf', 'csv', 'json'] as const).map((type) => {
                const Icon = typeIcons[type];
                return (
                  <button
                    key={type}
                    onClick={() => setReportType(type)}
                    className={cn(
                      'flex-1 p-2 rounded-lg border transition-all flex items-center justify-center gap-2',
                      reportType === type
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="uppercase text-xs font-medium">
                      {type}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <button
          onClick={handleGenerateReport}
          disabled={isGenerating || !reportName.trim()}
          className={cn(
            'cyber-button-primary mt-4 w-full sm:w-auto',
            (isGenerating || !reportName.trim()) &&
              'opacity-50 cursor-not-allowed'
          )}
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating Report...
            </>
          ) : (
            <>
              <FileBarChart className="w-4 h-4" />
              Generate Report
            </>
          )}
        </button>
      </div>

      {/* Info */}
      <div className="glass-card p-4 flex items-center gap-4 text-sm">
        <Shield className="w-5 h-5 text-primary" />
        <p className="text-muted-foreground">
          All reports include SHA256 hash verification and chain of custody timestamps for forensic integrity.
        </p>
      </div>

      {/* Reports List */}
      <div className="space-y-4">
        <h2 className="font-semibold">Generated Reports</h2>

        <div className="grid gap-4">
          {reports.map((report) => {
            const Icon = typeIcons[report.type];

            return (
              <div key={report.id} className="glass-card-hover p-4">
                <div className="flex items-center gap-4">
                  <div className={cn('p-3 rounded-xl', typeColors[report.type])}>
                    <Icon className="w-6 h-6" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium">{report.name}</h3>
                    <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {report.date.toLocaleDateString()}
                      <span className="uppercase font-mono">{report.type}</span>
                    </div>

                    <div className="mt-2 text-xs text-muted-foreground">
                      Chain of custody: {report.chainOfCustody.join(' → ')}
                    </div>
                  </div>

                  <StatusBadge variant="success">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    completed
                  </StatusBadge>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
