from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import json

from app.database import get_db
from app.models.anomalies import Anomaly
from app.models.anomaly_logs import AnomalyLog
from app.models.logs import LogEvent
from app.services.xai_engine import generate_xai_explanation
import app.services.xai_engine as xe


router = APIRouter(prefix="/api/anomalies", tags=["XAI"])


@router.get("/{anomaly_id}/xai")
def get_xai_analysis(anomaly_id: str, db: Session = Depends(get_db)):


    anomaly = db.query(Anomaly).filter(Anomaly.id == anomaly_id).first()
    if not anomaly:
        raise HTTPException(status_code=404, detail="Anomaly not found")

    log_links = (
        db.query(AnomalyLog)
        .filter(AnomalyLog.anomaly_id == anomaly_id)
        .all()
    )

    logs = []
    for link in log_links:
        log = db.query(LogEvent).filter(LogEvent.id == link.log_id).first()
        if log:
            logs.append(log)

    try:
        explanation = json.loads(anomaly.explanation_json or "{}")
    except Exception:
        explanation = {}

    raw_signals = explanation.get("factors") or explanation.get("signals") or []
    signals = []

    if isinstance(raw_signals, dict):
        for k, v in raw_signals.items():
            signals.append({"name": k, "value": v})
    elif isinstance(raw_signals, list):
        signals = raw_signals

    entities = {
        "source": anomaly.source,
        "anomaly_type": anomaly.type
    }

    baseline = {
        "detector_reason": explanation.get("summary")
            or anomaly.description
            or "Rule-based anomaly detection triggered"
    }

    try:

        xai_result = generate_xai_explanation(
            anomaly={
                "id": anomaly.id,
                "type": anomaly.type,
                "risk_score": anomaly.risk_score,
                "detected_at": anomaly.created_at.isoformat()
            },
            entities=entities,
            signals=signals,
            logs=[
                {
                    "timestamp": log.timestamp.isoformat(),
                    "source": log.source,
                    "message": log.message
                }
                for log in logs
            ],
            baseline=baseline
        )

    except Exception as e:
        xai_result={}

    # 🔐 ENFORCE NON-EMPTY SECTIONS (THE FIX)
    why_flagged = xai_result.get("why_flagged") or [
        {
            "signal": "rule_match",
            "explanation": baseline["detector_reason"],
            "severity": "high"
        }
    ]

    remediation_steps = xai_result.get("remediation_steps")
    if not remediation_steps:
        remediation_steps = [
            {
                "step": 1,
                "action": "Review the affected endpoint and associated logs",
                "reason": "Confirm whether the detected activity is legitimate"
            },
            {
                "step": 2,
                "action": "Inspect related system or network activity",
                "reason": "Identify potential spread or misuse"
            }
        ]

    preventive_measures = xai_result.get("preventive_measures")
    if not preventive_measures:
        preventive_measures = [
            {
                "control": "Behavior monitoring",
                "purpose": "Detect similar anomalies earlier"
            },
            {
                "control": "Security hardening",
                "purpose": "Reduce impact of future incidents"
            }
        ]

    return {
        "anomaly_id": anomaly.id,
        "xai": {
            "summary": xai_result.get(
                "summary",
                "Suspicious activity detected by rule-based engine"
            ),
            "risk_score": anomaly.risk_score,
            "confidence": xai_result.get("confidence", 0.6),
            "why_flagged": why_flagged,
            "remediation_steps": remediation_steps,
            "preventive_measures": preventive_measures,
            "evidence": xai_result.get("evidence", [
                {
                    "type": "log",
                    "source": anomaly.source,
                    "description": "Rule-based anomaly triggered"
                }
            ])
        }
    }

