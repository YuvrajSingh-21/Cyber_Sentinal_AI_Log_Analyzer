# from fastapi import APIRouter, Depends, Query, Response
# from sqlalchemy.orm import Session
# from app.database import SessionLocal
# from app.models.logs import LogEvent
# from app.schemas.logs import LogCreate, LogResponse
# from typing import List, Optional
# from app.services.network_detection import detect_attacks
# import json
# from app.websocket_manager import manager
# import asyncio
# from datetime import datetime, timezone
# from app.services.anomaly_detector import detect_anomalies

# router = APIRouter(prefix="/api/logs", tags=["Logs"])

# def get_db():
#     db = SessionLocal()
#     try:
#         yield db
#     finally:
#         db.close()

# # 1️⃣ INGEST LOGS (agents will call this)
# @router.post("/ingest", response_model=LogResponse)
# async def ingest_log(log: LogCreate, db: Session = Depends(get_db)):
#     db_log = LogEvent(
#         endpoint_id=log.endpoint_id,
#         log_type=log.log_type,
#         severity=log.severity,
#         message=log.message,
#         source=log.source,
#         raw_data=log.raw_data,
#         timestamp=datetime.now(timezone.utc)
#     )

#     db.add(db_log)
#     db.commit()
#     db.refresh(db_log)
#     detect_anomalies(db, db_log)
#     # ✅ SAFE async broadcast
#     await manager.broadcast(
#         log.endpoint_id,
#         {
#             "id": db_log.id,
#             "type": log.log_type,
#             "severity": log.severity,
#             "message": log.message,
#             "source": log.source,
#             "timestamp": db_log.timestamp.isoformat()
#         }
#     )

#     return db_log



# # 2️⃣ LOGS EXPLORER (frontend uses this)
# @router.get("/explorer")
# def get_logs(
#     log_type: str | None = None,
#     severity: str | None = None,
#     db: Session = Depends(get_db)
# ):
#     query = db.query(LogEvent)

#     if log_type:
#         query = query.filter(LogEvent.log_type == log_type)
#     if severity:
#         query = query.filter(LogEvent.severity == severity)

#     return query.order_by(LogEvent.timestamp.desc()).all()

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime, timezone

from app.database import SessionLocal
from app.models.logs import LogEvent
from app.schemas.logs import LogCreate, LogResponse
from app.websocket_manager import manager
from app.services.anomaly_detector import detect_anomalies

router = APIRouter(prefix="/api/logs", tags=["Logs"])


# -------------------- DB DEPENDENCY --------------------
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ======================================================
# 1️⃣ INGEST LOGS (AGENTS ONLY – NOT UPLOADS)
# ======================================================
@router.post("/ingest", response_model=LogResponse)
async def ingest_log(
    log: LogCreate,
    db: Session = Depends(get_db),
):
    """
    Accepts logs ONLY from agents.
    Uploaded logs must NEVER hit this route.
    """

    # 🚫 DROP NOISE (prevents 422 retry storms + anomaly spam)
    if not log.message or len(log.message.strip()) < 10:
        return Response(status_code=204)

    # 🚫 Enforce allowed severities
    severity = log.severity.lower()
    if severity not in ("low", "medium", "high", "critical"):
        severity = "low"

    # 🚫 Uploaded logs must not mix with realtime
    is_uploaded_log = log.source == "upload"

    # 🔥 Only high-signal logs can create anomalies
    detect = (
        not is_uploaded_log
        and severity in ("high", "critical")
    )

    # -------------------- SAVE LOG --------------------
    db_log = LogEvent(
        endpoint_id=log.endpoint_id,
        log_type=log.log_type,
        severity=severity,
        message=log.message,
        source=log.source,
        raw_data=log.raw_data,
        timestamp=datetime.now(timezone.utc),
    )

    db.add(db_log)
    db.commit()
    db.refresh(db_log)

    # -------------------- ANOMALY DETECTION --------------------
    if detect:
        detect_anomalies(db, db_log)

    # -------------------- WEBSOCKET BROADCAST --------------------
    if detect:
        await manager.broadcast(
            log.endpoint_id,
            {
                "id": db_log.id,
                "log_type": db_log.log_type,
                "severity": db_log.severity,
                "message": db_log.message,
                "source": db_log.source,
                "timestamp": db_log.timestamp.isoformat(),
            },
        )

    return db_log


# ======================================================
# 2️⃣ LOG EXPLORER (READ-ONLY FOR FRONTEND)
# ======================================================
@router.get("/explorer")
def get_logs(
    log_type: Optional[str] = None,
    severity: Optional[str] = None,
    endpoint_id: Optional[str] = None,
    limit: int = Query(200, le=500),
    db: Session = Depends(get_db),
):
    """
    Used by frontend tables.
    Does NOT include uploaded logs unless explicitly filtered.
    """

    query = db.query(LogEvent)

    if endpoint_id:
        query = query.filter(LogEvent.endpoint_id == endpoint_id)

    if log_type:
        query = query.filter(LogEvent.log_type == log_type)

    if severity:
        query = query.filter(LogEvent.severity == severity)

    return (
        query
        .order_by(LogEvent.timestamp.desc())
        .limit(limit)
        .all()
    )


# ======================================================
# 3️⃣ REAL SYSTEM UPTIME (FROM AGENT DATA)
# ======================================================
@router.get("/system/uptime")
def get_system_uptime(db: Session = Depends(get_db)):
    """
    Returns real OS uptime sent by system agent.
    Agent must send:
    log_type="system"
    message="System uptime"
    raw_data="<seconds>"
    """

    log = (
        db.query(LogEvent)
        .filter(LogEvent.log_type == "system")
        .filter(LogEvent.message == "System uptime")
        .order_by(LogEvent.timestamp.desc())
        .first()
    )

    if not log or not log.raw_data:
        return {"uptime": 0}

    try:
        return {"uptime": int(log.raw_data)}
    except ValueError:
        return {"uptime": 0}
