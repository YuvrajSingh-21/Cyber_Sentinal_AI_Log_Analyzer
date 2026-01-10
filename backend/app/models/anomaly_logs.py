from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class AnomalyLog(Base):
    __tablename__ = "anomaly_logs"

    id = Column(Integer, primary_key=True)
    anomaly_id = Column(String, ForeignKey("anomalies.id", ondelete="CASCADE"))
    log_id = Column(Integer, ForeignKey("log_events.id", ondelete="CASCADE"))

    anomaly = relationship("Anomaly", back_populates="logs")
