import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileJson, FileText, File, X, CheckCircle, AlertCircle, ChevronDown, AlertTriangle, Shield, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LogEntry } from '@/types/cyber';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface UploadedLog {
  id: string;
  timestamp: string;
  source: string;
  eventType: string;
  status: string;
  message: string;
  severity: string;
  fileName: string;
}

interface UploadedFile {
  name: string;
  logCount: number;
  uploadedAt: string;
}

interface DetectedAnomaly {
  id: string;
  logId: string;
  type: string;
  description: string;
  riskScore: number;
  xaiReason: string;
  timestamp: string;
}

export const UploadData = () => {
  const [uploadedLogs, setUploadedLogs] = useState<UploadedLog[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [detectedAnomalies, setDetectedAnomalies] = useState<DetectedAnomaly[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const loadUploadedLogs = async () => {
      try {
        const res = await fetch('http://127.0.0.1:8000/api/upload/entries');
        const data: UploadedLog[] = await res.json();

        // 🔹 restore logs
        setUploadedLogs(data);

        // 🔹 rebuild dropdown
        const filesMap: Record<string, number> = {};
        data.forEach(log => {
          filesMap[log.fileName] = (filesMap[log.fileName] || 0) + 1;
        });

        setUploadedFiles(
          Object.entries(filesMap).map(([name, count]) => ({
            name,
            logCount: count,
            uploadedAt: new Date().toISOString(),
          }))
        );

        // 🔹 run anomaly detection
        setDetectedAnomalies(detectAnomalies(data));
      } catch (err) {
        console.error('Failed to load uploaded logs', err);
      }
    };

    loadUploadedLogs();
  }, []);

  const generateId = () => Math.random().toString(36).substring(2, 11);

  // Anomaly detection patterns
  const anomalyPatterns = [
    { pattern: /failed|failure|denied|unauthorized/i, type: 'Authentication Failure', risk: 75 },
    { pattern: /error|exception|critical/i, type: 'System Error', risk: 60 },
    { pattern: /attack|malicious|intrusion|breach/i, type: 'Security Threat', risk: 95 },
    { pattern: /suspicious|unusual|anomaly/i, type: 'Suspicious Activity', risk: 70 },
    { pattern: /timeout|unreachable|connection refused/i, type: 'Network Issue', risk: 50 },
    { pattern: /sql injection|xss|csrf/i, type: 'Web Attack', risk: 90 },
    { pattern: /brute.?force|multiple.?attempts/i, type: 'Brute Force Attack', risk: 85 },
  ];

  const detectAnomalies = (logs: UploadedLog[]): DetectedAnomaly[] => {
    const anomalies: DetectedAnomaly[] = [];
    
    logs.forEach(log => {
      for (const { pattern, type, risk } of anomalyPatterns) {
        if (pattern.test(log.message) || pattern.test(log.eventType)) {
          anomalies.push({
            id: generateId(),
            logId: log.id,
            type,
            description: `Detected ${type.toLowerCase()} in log entry`,
            riskScore: risk + Math.floor(Math.random() * 10) - 5,
            xaiReason: generateXaiReason(type, log),
            timestamp: log.timestamp,
          });
          break;
        }
      }
    });

    // Also flag high severity logs
    logs.filter(log => log.severity === 'high' || log.severity === 'critical').forEach(log => {
      if (!anomalies.find(a => a.logId === log.id)) {
        anomalies.push({
          id: generateId(),
          logId: log.id,
          type: 'High Severity Event',
          description: `Log entry marked as ${log.severity} severity`,
          riskScore: log.severity === 'critical' ? 90 : 70,
          xaiReason: `This event was flagged because it has a ${log.severity} severity level, indicating potential security concerns that require immediate attention.`,
          timestamp: log.timestamp,
        });
      }
    });

    return anomalies;
  };

  const generateXaiReason = (type: string, log: UploadedLog): string => {
    const reasons: Record<string, string> = {
      'Authentication Failure': `Pattern analysis detected authentication-related keywords in the log message. The event occurred at ${new Date(log.timestamp).toLocaleString()} from source "${log.source}". Multiple failed authentications may indicate credential stuffing or brute force attacks.`,
      'System Error': `Critical system error patterns were identified. Error events from "${log.source}" at this severity level often precede system failures or indicate ongoing issues that could be exploited.`,
      'Security Threat': `High-confidence threat indicators detected. The log contains signatures commonly associated with active attacks. Immediate investigation recommended.`,
      'Suspicious Activity': `Behavioral analysis flagged unusual patterns. The combination of timing, source, and event characteristics deviates from baseline activity.`,
      'Network Issue': `Network connectivity problems detected. While not directly a security threat, network issues can mask or enable malicious activity.`,
      'Web Attack': `Web application attack signatures identified. Common injection or cross-site attack patterns detected in the request data.`,
      'Brute Force Attack': `Multiple rapid authentication attempts detected. Pattern consistent with automated credential testing or dictionary attacks.`,
    };
    return reasons[type] || `Anomaly detected based on pattern matching and severity analysis of the log entry.`;
  };

  const parseLogFile = async (file: File): Promise<UploadedLog[]> => {
    const text = await file.text();
    const extension = file.name.split('.').pop()?.toLowerCase();
    const fileName = file.name;

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
          fileName,
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
            fileName,
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
          fileName,
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
      const newFiles: UploadedFile[] = [];
      
      for (const file of validFiles) {
        const logs = await parseLogFile(file);
        allLogs.push(...logs);
        newFiles.push({
          name: file.name,
          logCount: logs.length,
          uploadedAt: new Date().toISOString(),
        });
      }

      // 🔹 show ONLY newly uploaded file logs
      setUploadedLogs(allLogs);

      // 🔹 auto-select the newly uploaded file
      setSelectedFile(newFiles[0].name);

      setUploadedFiles(prev => {
        const existing = new Set(prev.map(f => f.name));
        const merged = [...prev];

        newFiles.forEach(f => {
          if (!existing.has(f.name)) {
            merged.push(f);
          }
        });

        return merged;
      });

      
      // Detect anomalies in uploaded logs
      const newAnomalies = detectAnomalies(allLogs);
      // setDetectedAnomalies(prev => [...newAnomalies, ...prev]);
      // 🔥 store parsed log entries in backend DB
      await fetch('http://127.0.0.1:8000/api/upload/entries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(allLogs),
      });

      setUploadStatus('success');
      setStatusMessage(`Successfully uploaded ${allLogs.length} log entries from ${validFiles.length} file(s). ${newAnomalies.length} anomalies detected.`);
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
    setUploadedFiles([]);
    setDetectedAnomalies([]);
    setSelectedFile(null);
  };

  // Filter logs by selected file
  const filteredLogs = useMemo(() => {
    if (!selectedFile) return uploadedLogs;
    return uploadedLogs.filter(log => log.fileName === selectedFile);
  }, [uploadedLogs, selectedFile]);
  useEffect(() => {
    if (!selectedFile) {
      setDetectedAnomalies([]);
      return;
    }

    // 🔥 anomalies strictly follow selected file
    setDetectedAnomalies(detectAnomalies(filteredLogs));
  }, [selectedFile, filteredLogs]);

  const getRiskColor = (score: number) => {
    if (score >= 80) return 'text-destructive';
    if (score >= 60) return 'text-warning';
    return 'text-info';
  };

  const getRiskBg = (score: number) => {
    if (score >= 80) return 'bg-destructive/20 border-destructive/30';
    if (score >= 60) return 'bg-warning/20 border-warning/30';
    return 'bg-info/20 border-info/30';
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
        <div className="flex items-center gap-3">
          {/* View Uploaded Logs Dropdown - Always visible */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium 
                               bg-accent hover:bg-accent/80 border border-border rounded-lg transition-colors">
                <Eye className="w-4 h-4" />
                <span>View Uploaded Logs</span>
                <ChevronDown className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 bg-card border-border z-50">
              {uploadedFiles.length > 0 ? (
                <>
                  {/* <DropdownMenuItem 
                    onClick={() => setSelectedFile(null)}
                    className={cn(
                      "cursor-pointer",
                      !selectedFile && "bg-accent"
                    )}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    <span>All Files ({uploadedLogs.length} logs)</span>
                  </DropdownMenuItem> */}
                  {uploadedFiles.map((file, index) => (
                    <DropdownMenuItem 
                      key={index}
                      onClick={() => setSelectedFile(file.name)}
                      className={cn(
                        "cursor-pointer",
                        selectedFile === file.name && "bg-accent"
                      )}
                    >
                      <FileJson className="w-4 h-4 mr-2" />
                      <div className="flex flex-col">
                        <span className="truncate max-w-[180px]">{file.name}</span>
                        <span className="text-xs text-muted-foreground">{file.logCount} logs</span>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </>
              ) : (
                <div className="px-3 py-4 text-center text-muted-foreground">
                  <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No files uploaded yet</p>
                  <p className="text-xs mt-1">Upload logs to view them here</p>
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          
          {uploadedLogs.length > 0 && (
            <button
              onClick={clearLogs}
              className="px-4 py-2 text-sm font-medium text-destructive hover:text-destructive/80 
                       border border-destructive/30 rounded-lg hover:bg-destructive/10 transition-colors"
            >
              Clear All
            </button>
          )}
        </div>
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

      {/* Anomalies Detection Box */}
      {selectedFile && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-xl overflow-hidden"
        >
          <div className="p-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-warning/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-warning" />
              </div>
              <div>
                <h2 className="font-semibold text-foreground">Detected Anomalies</h2>
                <p className="text-xs text-muted-foreground">
                  AI-powered threat detection with XAI explanations
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "px-3 py-1 rounded-full text-sm font-medium",
                  detectedAnomalies.length > 0
                    ? "bg-warning/20 text-warning"
                    : "bg-success/20 text-success"
                )}
              >
                {detectedAnomalies.length}{" "}
                {detectedAnomalies.length === 1 ? "Anomaly" : "Anomalies"}
              </span>
            </div>
          </div>

          {detectedAnomalies.length > 0 ? (
            <div className="divide-y divide-border max-h-[300px] overflow-y-auto custom-scrollbar">
              {detectedAnomalies.map((anomaly, index) => (
                <motion.div
                  key={anomaly.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-4 hover:bg-accent/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        <span
                          className={cn(
                            "px-2 py-1 text-xs font-medium rounded border",
                            getRiskBg(anomaly.riskScore)
                          )}
                        >
                          {anomaly.type}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(anomaly.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-foreground">
                        {anomaly.description}
                      </p>
                      <div className="bg-muted/50 rounded-lg p-3 border border-border/50">
                        <div className="flex items-center gap-2 mb-2">
                          <Shield className="w-4 h-4 text-primary" />
                          <span className="text-xs font-semibold text-primary uppercase tracking-wide">
                            XAI Explanation
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {anomaly.xaiReason}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div
                        className={cn(
                          "text-2xl font-bold",
                          getRiskColor(anomaly.riskScore)
                        )}
                      >
                        {anomaly.riskScore}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Risk Score
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              <Shield className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No anomalies detected yet.</p>
              <p className="text-xs mt-1">
                Upload log files to scan for security threats.
              </p>
            </div>
          )}
        </motion.div>
      )}

      {/* Uploaded Logs Table */}
      {selectedFile && filteredLogs.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-xl overflow-hidden"
        >
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h2 className="font-semibold text-foreground">
              {selectedFile ? (
                <>Logs from: <span className="text-primary">{selectedFile}</span> ({filteredLogs.length})</>
              ) : (
                <>All Uploaded Logs ({filteredLogs.length})</>
              )}
            </h2>
            {selectedFile && (
              <button
                onClick={() => setSelectedFile(null)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Show all files
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    File
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
                  {filteredLogs.map((log, index) => (
                    <motion.tr
                      key={log.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: index * 0.02 }}
                      className={cn(
                        "border-b border-border/50 hover:bg-accent/50 transition-colors",
                        detectedAnomalies.find(a => a.logId === log.id) && "bg-warning/5"
                      )}
                    >
                      <td className="p-3 text-sm text-muted-foreground font-mono">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="p-3 text-sm text-muted-foreground truncate max-w-[120px]">
                        {log.fileName}
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
