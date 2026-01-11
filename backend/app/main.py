from fastapi import FastAPI
from app.database import Base, engine
from app.routes import logs, websocket, anomalies, timeline, reports, upload
from app.models.logs import LogEvent
from app.models.anomalies import Anomaly
from app.models.anomaly_logs import AnomalyLog
from app.models.uploaded_logs import UploadedLog
from app.models.uploaded_log_entries import UploadedLogEntry

import threading
import time
from app.database import SessionLocal
from utils.log_cleanup import archive_and_delete_logs
from utils.archive_cleanup import cleanup_old_archives

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Cyber Sentinel AI - Logs Backend")

from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8080",
        "http://127.0.0.1:8080",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(logs.router)
app.include_router(websocket.router)
app.include_router(anomalies.router)
app.include_router(timeline.router)
app.include_router(reports.router)
app.include_router(upload.router)


CLEANUP_INTERVAL = 60 * 60  # 1 hour

def cleanup_worker():
    while True:
        try:
            db = SessionLocal()
            deleted = archive_and_delete_logs(db)
            if deleted:
                print(f"🧹 Archived & deleted {deleted} logs")
            cleanup_old_archives()
        except Exception as e:
            print("❌ Cleanup error:", e)
        finally:
            db.close()

        time.sleep(CLEANUP_INTERVAL)


@app.on_event("startup")
def start_cleanup_worker():
    threading.Thread(
        target=cleanup_worker,
        daemon=True
    ).start()
