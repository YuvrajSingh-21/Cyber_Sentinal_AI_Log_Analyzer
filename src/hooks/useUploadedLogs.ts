import { useEffect, useState, useMemo } from 'react';

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

export const useUploadedLogs = (
  detectAnomalies: (logs: UploadedLog[]) => DetectedAnomaly[]
) => {
  const [uploadedLogs, setUploadedLogs] = useState<UploadedLog[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [detectedAnomalies, setDetectedAnomalies] = useState<DetectedAnomaly[]>([]);

  // 🔹 Fetch uploaded logs from DB
  useEffect(() => {
    fetch('http://127.0.0.1:8000/api/upload/entries')
      .then(res => res.json())
      .then((data: UploadedLog[]) => {
        setUploadedLogs(data);

        // Build dropdown files
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

        // Run frontend-only anomaly detection
        setDetectedAnomalies(detectAnomalies(data));
      })
      .catch(err => {
        console.error('❌ Failed to load uploaded logs', err);
      });
  }, [detectAnomalies]);

  return {
    uploadedLogs,
    uploadedFiles,
    detectedAnomalies,
  };
};
