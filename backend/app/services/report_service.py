from collections import Counter

def build_report(logs, anomalies, range):
    severity_counts = Counter(l.severity for l in logs)
    source_counts = Counter(l.source for l in logs)

    return {
        "range": range,
        "total_logs": len(logs),
        "total_anomalies": len(anomalies),
        "severity_breakdown": severity_counts,
        "source_breakdown": source_counts,
        "top_anomalies": [
            {
                "id": a.id,
                "title": a.title,
                "severity": a.severity,
                "riskScore": a.risk_score,
                "status": a.status,
            }
            for a in anomalies[:5]
        ],
    }
