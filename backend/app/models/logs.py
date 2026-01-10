from sqlalchemy import Column, Integer, String, DateTime, Text
from datetime import datetime, timezone
from app.database import Base

class LogEvent(Base):
    __tablename__ = "log_events"

    id = Column(Integer, primary_key=True)

    timestamp = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    endpoint_id = Column(String, index=True)  # 🔐 ISOLATION KEY
    log_type = Column(String)
    source = Column(String)
    severity = Column(String)
    message = Column(Text)
    raw_data = Column(Text)
