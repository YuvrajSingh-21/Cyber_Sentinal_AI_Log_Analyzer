import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileJson, FileText, File, X, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LogEntry } from '@/types/cyber';

interface UploadedLog {
  id: string;
  timestamp: string;
  source: string;
  eventType: string;
  status: string;
  message: string;
  severity: string;
}

export const UploadData = () => {
  const [uploadedLogs, setUploadedLogs] = useState<UploadedLog[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateId = () => Math.random().toString(36).substring(2, 11);

  const parseLogFile = async (file: File): Promise<UploadedLog[]> => {
    const text = await file.text();
    const extension = file.name.split('.').pop()?.toLowerCase();

    try {
      if (extension === 'json') {
        const data = JSON.parse(text);
        const logs = Array.isArray(data) ? data : [data];
        return logs.map((log: any) => ({
          id: generateId(),
          timestamp: log.timestamp || new Date().toISOString(),
          source: log.source || 'uploaded',
          eventType: log.eventType || log.event_type || log.type || 'unknown',
          status: log.status || 'info',
          message: log.message || JSON.stringify(log),
          severity: log.severity || 'low',
        }));
      } else if (extension === 'csv') {
        const lines = text.split('\n').filter(line => line.trim());
        if (lines.length < 2) return [];
        
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        return lines.slice(1).map(line => {
          const values = line.split(',').map(v => v.trim());
          const obj: any = {};
          headers.forEach((header, i) => {
            obj[header] = values[i] || '';
          });
          return {
            id: generateId(),
            timestamp: obj.timestamp || new Date().toISOString(),
            source: obj.source || 'uploaded',
            eventType: obj.eventtype || obj.event_type || obj.type || 'unknown',
            status: obj.status || 'info',
            message: obj.message || line,
            severity: obj.severity || 'low',
          };
        });
      } else if (extension === 'log') {
        const lines = text.split('\n').filter(line => line.trim());
        return lines.map(line => ({
          id: generateId(),
          timestamp: new Date().toISOString(),
          source: 'uploaded',
          eventType: 'log_entry',
          status: line.toLowerCase().includes('error') ? 'error' : 
                  line.toLowerCase().includes('warn') ? 'warning' : 'info',
          message: line,
          severity: line.toLowerCase().includes('error') ? 'high' : 
                   line.toLowerCase().includes('warn') ? 'medium' : 'low',
        }));
      }
    } catch (error) {
      console.error('Error parsing file:', error);
      throw new Error(`Failed to parse ${file.name}`);
    }

    return [];
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const validExtensions = ['json', 'log', 'csv'];
    const validFiles: File[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const extension = file.name.split('.').pop()?.toLowerCase();
      if (extension && validExtensions.includes(extension)) {
        validFiles.push(file);
      }
    }

    if (validFiles.length === 0) {
      setUploadStatus('error');
      setStatusMessage('No valid files found. Please upload .json, .log, or .csv files.');
      setTimeout(() => setUploadStatus('idle'), 3000);
      return;
    }

    try {
      const allLogs: UploadedLog[] = [];
      for (const file of validFiles) {
        const logs = await parseLogFile(file);
        allLogs.push(...logs);
      }

      setUploadedLogs(prev => [...allLogs, ...prev]);
      setUploadStatus('success');
      setStatusMessage(`Successfully uploaded ${allLogs.length} log entries from ${validFiles.length} file(s).`);
      setTimeout(() => setUploadStatus('idle'), 3000);
    } catch (error) {
      setUploadStatus('error');
      setStatusMessage(error instanceof Error ? error.message : 'Failed to parse files.');
      setTimeout(() => setUploadStatus('idle'), 3000);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  }, []);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const clearLogs = () => {
    setUploadedLogs([]);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'error': return 'text-destructive';
      case 'warning': return 'text-warning';
      case 'success': return 'text-success';
      default: return 'text-info';
    }
  };

  const getSeverityBadge = (severity: string) => {
    const colors: Record<string, string> = {
      critical: 'bg-destructive/20 text-destructive border-destructive/30',
      high: 'bg-warning/20 text-warning border-warning/30',
      medium: 'bg-info/20 text-info border-info/30',
      low: 'bg-muted text-muted-foreground border-border',
    };
    return colors[severity.toLowerCase()] || colors.low;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Upload Data</h1>
          <p className="text-muted-foreground mt-1">
            Upload log files for analysis (.json, .log, .csv)
          </p>
        </div>
        {uploadedLogs.length > 0 && (
          <button
            onClick={clearLogs}
            className="px-4 py-2 text-sm font-medium text-destructive hover:text-destructive/80 
                     border border-destructive/30 rounded-lg hover:bg-destructive/10 transition-colors"
          >
            Clear All Logs
          </button>
        )}
      </div>

      {/* Upload Dropzone */}
      <motion.div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        className={cn(
          "relative border-2 border-dashed rounded-xl p-8 cursor-pointer transition-all duration-300",
          "flex flex-col items-center justify-center gap-4 min-h-[200px]",
          isDragging 
            ? "border-primary bg-primary/10 scale-[1.02]" 
            : "border-border hover:border-primary/50 hover:bg-accent/50",
          "glass-card"
        )}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".json,.log,.csv"
          onChange={handleFileChange}
          className="hidden"
        />

        <motion.div
          animate={{ 
            y: isDragging ? -10 : 0,
            scale: isDragging ? 1.1 : 1 
          }}
          className={cn(
            "w-16 h-16 rounded-full flex items-center justify-center",
            isDragging ? "bg-primary/20" : "bg-accent"
          )}
        >
          <Upload className={cn(
            "w-8 h-8 transition-colors",
            isDragging ? "text-primary" : "text-muted-foreground"
          )} />
        </motion.div>

        <div className="text-center">
          <p className="text-lg font-medium text-foreground">
            {isDragging ? "Drop files here" : "Drag & drop files or click to browse"}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Supports .json, .log, .csv files
          </p>
        </div>

        {/* File type icons */}
        <div className="flex items-center gap-4 mt-2">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <FileJson className="w-4 h-4" />
            <span>JSON</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <FileText className="w-4 h-4" />
            <span>LOG</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <File className="w-4 h-4" />
            <span>CSV</span>
          </div>
        </div>

        {/* Upload Status */}
        <AnimatePresence>
          {uploadStatus !== 'idle' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={cn(
                "absolute bottom-4 left-4 right-4 px-4 py-2 rounded-lg flex items-center gap-2",
                uploadStatus === 'success' ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"
              )}
            >
              {uploadStatus === 'success' ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <AlertCircle className="w-4 h-4" />
              )}
              <span className="text-sm">{statusMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Uploaded Logs Table */}
      {uploadedLogs.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-xl overflow-hidden"
        >
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h2 className="font-semibold text-foreground">
              Uploaded Logs ({uploadedLogs.length})
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Source
                  </th>
                  <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Event Type
                  </th>
                  <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Severity
                  </th>
                  <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Message
                  </th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {uploadedLogs.map((log, index) => (
                    <motion.tr
                      key={log.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: index * 0.02 }}
                      className="border-b border-border/50 hover:bg-accent/50 transition-colors"
                    >
                      <td className="p-3 text-sm text-muted-foreground font-mono">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="p-3 text-sm text-foreground capitalize">
                        {log.source}
                      </td>
                      <td className="p-3 text-sm text-foreground">
                        {log.eventType}
                      </td>
                      <td className={cn("p-3 text-sm font-medium capitalize", getStatusColor(log.status))}>
                        {log.status}
                      </td>
                      <td className="p-3">
                        <span className={cn(
                          "px-2 py-1 text-xs font-medium rounded-full border capitalize",
                          getSeverityBadge(log.severity)
                        )}>
                          {log.severity}
                        </span>
                      </td>
                      <td className="p-3 text-sm text-muted-foreground max-w-md truncate">
                        {log.message}
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* Empty State */}
      {uploadedLogs.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No logs uploaded yet. Upload files to see them here.</p>
        </div>
      )}
    </div>
  );
};
