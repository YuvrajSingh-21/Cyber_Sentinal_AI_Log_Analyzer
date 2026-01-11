from sqlalchemy import Column, Integer, String, DateTime, Text
from datetime import datetime, timezone
from app.database import Base


class UploadedLogEntry(Base):
    __tablename__ = "uploaded_log_entries"

    id = Column(Integer, primary_key=True)

    filename = Column(String, nullable=False)

    timestamp = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    source = Column(String)
    event_type = Column(String)
    status = Column(String)
    severity = Column(String)
    message = Column(Text)
