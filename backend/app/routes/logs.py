from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.logs import LogEvent
from app.schemas.logs import LogCreate, LogResponse
from typing import List, Optional
from app.services.network_detection import detect_attacks
import json
from app.websocket_manager import manager
import asyncio
from datetime import datetime, timezone
from app.services.anomaly_detector import detect_anomalies

router = APIRouter(prefix="/api/logs", tags=["Logs"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# 1️⃣ INGEST LOGS (agents will call this)
@router.post("/ingest", response_model=LogResponse)
async def ingest_log(log: LogCreate, db: Session = Depends(get_db)):
    db_log = LogEvent(
        endpoint_id=log.endpoint_id,
        log_type=log.log_type,
        severity=log.severity,
        message=log.message,
        source=log.source,
        raw_data=log.raw_data,
        timestamp=datetime.now(timezone.utc)
    )

    db.add(db_log)
    db.commit()
    db.refresh(db_log)
    detect_anomalies(db, db_log)
    # ✅ SAFE async broadcast
    await manager.broadcast(
        log.endpoint_id,
        {
            "id": db_log.id,
            "type": log.log_type,
            "severity": log.severity,
            "message": log.message,
            "source": log.source,
            "timestamp": db_log.timestamp.isoformat()
        }
    )

    return db_log



# 2️⃣ LOGS EXPLORER (frontend uses this)
@router.get("/explorer")
def get_logs(
    log_type: str | None = None,
    severity: str | None = None,
    db: Session = Depends(get_db)
):
    query = db.query(LogEvent)

    if log_type:
        query = query.filter(LogEvent.log_type == log_type)
    if severity:
        query = query.filter(LogEvent.severity == severity)

    return query.order_by(LogEvent.timestamp.desc()).all()

