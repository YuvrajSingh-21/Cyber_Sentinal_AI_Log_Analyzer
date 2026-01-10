from pydantic import BaseModel
from typing import Dict, List


class ReportAnomaly(BaseModel):
    id: str
    title: str
    severity: str
    riskScore: float
    status: str


class ReportResponse(BaseModel):
    range: str
    total_logs: int
    total_anomalies: int
    severity_breakdown: Dict[str, int]
    source_breakdown: Dict[str, int]
    top_anomalies: List[ReportAnomaly]
