from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import json

from app.database import SessionLocal
from app.models.anomalies import Anomaly
from app.models.anomaly_logs import AnomalyLog
from app.models.logs import LogEvent

router = APIRouter(prefix="/api/anomalies", tags=["Anomalies"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("")
def list_anomalies(db: Session = Depends(get_db)):
    anomalies = (
        db.query(Anomaly)
        .order_by(Anomaly.created_at.desc())
        .all()
    )

    response = []

    for anomaly in anomalies:
        related_logs = (
            db.query(AnomalyLog.log_id)
            .filter(AnomalyLog.anomaly_id == anomaly.id)
            .all()
        )

        explanation = {}
        if anomaly.explanation_json:
            explanation = json.loads(anomaly.explanation_json)

        response.append({
            "id": anomaly.id,
            "type": anomaly.type,
            "status": anomaly.status,
            "riskScore": anomaly.risk_score,
            "source": anomaly.source,
            "timestamp": anomaly.created_at.isoformat(),
            "relatedLogs": [str(l.log_id) for l in related_logs],
            "explanation": explanation
        })

    return response

@router.get("/stats")
def anomaly_stats(db: Session = Depends(get_db)):
    anomalies = db.query(Anomaly).all()

    if not anomalies:
        return {
            "active": 0,
            "investigating": 0,
            "resolved": 0,
            "avgRisk": 0
        }

    return {
        "active": sum(1 for a in anomalies if a.status == "active"),
        "investigating": sum(1 for a in anomalies if a.status == "investigating"),
        "resolved": sum(1 for a in anomalies if a.status == "resolved"),
        "avgRisk": round(
            sum(a.risk_score for a in anomalies) / len(anomalies)
        )
    }


@router.patch("/{anomaly_id}/status")
def update_anomaly_status(
    anomaly_id: str,
    status: str,
    db: Session = Depends(get_db)
):
    anomaly = db.query(Anomaly).filter(Anomaly.id == anomaly_id).first()

    if not anomaly:
        raise HTTPException(status_code=404, detail="Anomaly not found")

    if status not in {"active", "investigating", "resolved"}:
        raise HTTPException(status_code=400, detail="Invalid status")

    anomaly.status = status
    db.commit()

    return {"success": True, "status": status}
