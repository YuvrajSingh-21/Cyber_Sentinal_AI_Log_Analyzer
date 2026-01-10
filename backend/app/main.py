from fastapi import FastAPI
from app.database import Base, engine
from app.routes import logs, websocket, anomalies, timeline, reports
from app.models.logs import LogEvent
from app.models.anomalies import Anomaly
from app.models.anomaly_logs import AnomalyLog

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