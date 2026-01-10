from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.logs import LogEvent
from app.models.anomalies import Anomaly
import json

router = APIRouter(prefix="/api/timeline", tags=["Timeline"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("")
def get_timeline(db: Session = Depends(get_db)):
    events = []

    # 🔹 Logs
    logs = (
        db.query(LogEvent)
        .order_by(LogEvent.timestamp.desc())
        .limit(50)
        .all()
    )

    for log in logs:
        events.append({
            "id": f"log_{log.id}",
            "timestamp": log.timestamp.isoformat(),
            "category": "access" if log.log_type == "auth" else "change",
            "severity": "low" if log.severity == "low" else "medium",
            "description": log.message,
            "details": f"Source: {log.source}",
            "source": log.log_type
        })

    # 🔹 Anomalies
    anomalies = (
        db.query(Anomaly)
        .order_by(Anomaly.created_at.desc())
        .limit(50)
        .all()
    )

    for a in anomalies:
        events.append({
            "id": f"timeline_{a.id}",
            "anomalyId": a.id,   # 👈 IMPORTANT
            "timestamp": a.created_at.isoformat(),
            "category": "incident" if a.risk_score >= 80 else "alert",
            "severity": (
                "critical" if a.risk_score >= 90 else
                "high" if a.risk_score >= 80 else
                "medium"
            ),
            "description": a.type.replace("_", " "),
            "details": json.loads(a.explanation_json).get("summary", ""),
            "source": a.source
        })



    # 🔹 Sort everything by time
    events.sort(key=lambda e: e["timestamp"], reverse=True)

    return events[:100]
