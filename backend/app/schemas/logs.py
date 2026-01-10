from pydantic import BaseModel
from datetime import datetime

class LogCreate(BaseModel):
    endpoint_id: str
    log_type: str
    source: str
    severity: str
    message: str
    raw_data: str | None = None
    

class LogResponse(LogCreate):
    id: int
    timestamp: datetime

    class Config:
        from_attributes = True
        extra = "allow"
