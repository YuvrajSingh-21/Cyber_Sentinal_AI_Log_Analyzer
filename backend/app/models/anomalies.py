from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.database import Base

class Anomaly(Base):
    __tablename__ = "anomalies"

    id = Column(String, primary_key=True, index=True)   # uuid string
    type = Column(String, index=True)                   # network_anomaly, file_change, etc
    status = Column(String, index=True, default="active")  # active/investigating/resolved
    risk_score = Column(Integer)                         # 0–100
    source = Column(String)                              # network/file/auth/system

    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc)
    )
    resolved_at = Column(DateTime(timezone=True), nullable=True)

    # 🔑 Explainable AI output (LLM or rules)
    explanation_json = Column(Text)  # JSON string

    # relationship
    logs = relationship("AnomalyLog", back_populates="anomaly", cascade="all, delete")
