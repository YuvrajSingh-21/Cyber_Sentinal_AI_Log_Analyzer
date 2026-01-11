# from fastapi import APIRouter, UploadFile, File, Form, Depends
# from sqlalchemy.orm import Session
# from app.database import get_db
# from app.models.uploaded_logs import UploadedLog

# router = APIRouter(prefix="/api/upload", tags=["Upload Logs"])


# @router.post("/")
# async def upload_logs(
#     file: UploadFile = File(...),
#     log_source: str = Form(None),
#     uploaded_by: str = Form(None),
#     db: Session = Depends(get_db)
# ):
#     content = await file.read()

#     uploaded_log = UploadedLog(
#         filename=file.filename,
#         file_type=file.filename.split(".")[-1],
#         log_source=log_source,
#         uploaded_by=uploaded_by,
#         content=content.decode("utf-8", errors="ignore")
#     )

#     db.add(uploaded_log)
#     db.commit()
#     db.refresh(uploaded_log)

#     return {
#         "status": "success",
#         "uploaded_log_id": uploaded_log.id,
#         "filename": uploaded_log.filename
#     }



from fastapi import APIRouter, UploadFile, File, Form, Depends
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
from datetime import datetime, timezone

from app.database import get_db
from app.models.uploaded_logs import UploadedLog
from app.models.uploaded_log_entries import UploadedLogEntry

router = APIRouter(prefix="/api/upload", tags=["Upload Logs"])


# =====================================================
# 1️⃣ RAW FILE UPLOAD (EVIDENCE STORAGE)
# =====================================================
# Stores the FULL uploaded file as-is
# Used for forensic evidence, NOT for UI tables
# =====================================================

@router.post("/")
async def upload_logs(
    file: UploadFile = File(...),
    log_source: str = Form(None),
    uploaded_by: str = Form(None),
    db: Session = Depends(get_db)
):
    content = await file.read()

    uploaded_log = UploadedLog(
        filename=file.filename,
        file_type=file.filename.split(".")[-1],
        log_source=log_source,
        uploaded_by=uploaded_by,
        content=content.decode("utf-8", errors="ignore")
    )

    db.add(uploaded_log)
    db.commit()
    db.refresh(uploaded_log)

    return {
        "status": "success",
        "uploaded_log_id": uploaded_log.id,
        "filename": uploaded_log.filename
    }


# =====================================================
# 2️⃣ PARSED LOG ENTRY SCHEMA (FROM FRONTEND)
# =====================================================

class UploadedLogEntryIn(BaseModel):
    timestamp: str
    source: str
    eventType: str
    status: str
    severity: str
    message: str
    fileName: str


# =====================================================
# 3️⃣ STORE PARSED LOG ENTRIES (FOR UI + ANALYSIS)
# =====================================================
# This is what powers:
# - Logs table
# - File dropdown
# - Frontend anomaly detection
# =====================================================

@router.post("/entries")
def store_uploaded_log_entries(
    logs: List[UploadedLogEntryIn],
    db: Session = Depends(get_db)
):
    rows = []

    for log in logs:
        rows.append(
            UploadedLogEntry(
                filename=log.fileName,
                timestamp=datetime.fromisoformat(
                    log.timestamp.replace("Z", "+00:00")
                ),
                source=log.source,
                event_type=log.eventType,
                status=log.status,
                severity=log.severity,
                message=log.message
            )
        )

    db.bulk_save_objects(rows)
    db.commit()

    return {
        "status": "success",
        "stored_logs": len(rows)
    }


# =====================================================
# 4️⃣ FETCH UPLOADED LOG ENTRIES (TABLE + DROPDOWN)
# =====================================================

@router.get("/entries")
def get_uploaded_log_entries(db: Session = Depends(get_db)):
    logs = (
        db.query(UploadedLogEntry)
        .order_by(UploadedLogEntry.timestamp.desc())
        .all()
    )

    return [
        {
            "id": log.id,
            "timestamp": log.timestamp.isoformat(),
            "source": log.source,
            "eventType": log.event_type,
            "status": log.status,
            "severity": log.severity,
            "message": log.message,
            "fileName": log.filename
        }
        for log in logs
    ]
