
from fastapi import APIRouter, Depends, Query
from fastapi.responses import FileResponse, StreamingResponse
from starlette.responses import JSONResponse
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import csv
import io
import os

from app.database import get_db
from app.models.logs import LogEvent as Log
from app.models.anomalies import Anomaly

# PDF
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

router = APIRouter(prefix="/api/reports", tags=["Reports"])


def apply_time_range(query, range: str):
    now = datetime.utcnow()

    if range == "24h":
        return query.filter(Log.timestamp >= now - timedelta(hours=24))
    if range == "7d":
        return query.filter(Log.timestamp >= now - timedelta(days=7))
    if range == "30d":
        return query.filter(Log.timestamp >= now - timedelta(days=30))

    return query

@router.get("/export/json")
def export_json(
    range: str = Query("24h"),
    db: Session = Depends(get_db)
):
    logs = apply_time_range(db.query(Log), range).all()
    anomalies = db.query(Anomaly).all()

    return JSONResponse({
        "generated_at": datetime.utcnow().isoformat(),
        "range": range,
        "logs": [
            {
                "timestamp": l.timestamp.isoformat(),
                "source": l.source,
                "severity": l.severity,
                "message": l.message,
            }
            for l in logs
        ],
        "anomalies": [
            {
                # "title": a.title,
                "severity": a.severity,
                "riskScore": a.riskScore,
                "status": a.status,
                "timestamp": a.timestamp.isoformat(),
            }
            for a in anomalies
        ],
    })


@router.get("/export/csv")
def export_csv(
    range: str = Query("24h"),
    db: Session = Depends(get_db)
):
    logs = apply_time_range(db.query(Log), range).all()

    buffer = io.StringIO()
    writer = csv.writer(buffer)

    writer.writerow([
        "timestamp",
        "source",
        "severity",
        "message"
        
    ])

    for l in logs:
        writer.writerow([
            l.timestamp.isoformat(),
            l.source,
            l.severity,
            l.message,
            # l.ip
        ])

    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="text/csv",
        headers={
            "Content-Disposition": "attachment; filename=cybersentinel_report.csv"
        }
    )



@router.get("/export/pdf")
def export_pdf(
    range: str = Query("24h"),
    db: Session = Depends(get_db)
):
    logs = apply_time_range(db.query(Log), range).limit(50).all()

    file_path = "cybersentinel_report.pdf"
    c = canvas.Canvas(file_path, pagesize=A4)

    width, height = A4
    y = height - 40

    c.setFont("Helvetica-Bold", 16)
    c.drawString(40, y, "CyberSentinel Forensic Report")

    y -= 30
    c.setFont("Helvetica", 10)
    c.drawString(40, y, f"Generated: {datetime.utcnow().isoformat()}")
    y -= 20

    for log in logs:
        if y < 40:
            c.showPage()
            y = height - 40

        c.drawString(
            40,
            y,
            f"[{log.timestamp}] {log.source.upper()} | {log.severity.upper()} | {log.message[:90]}"
        )
        y -= 14

    c.save()

    return FileResponse(
        file_path,
        filename="cybersentinel_report.pdf",
        media_type="application/pdf"
    )
