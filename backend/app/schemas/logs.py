from pydantic import BaseModel
from datetime import datetime
from typing import  Optional

class LogCreate(BaseModel):
    endpoint_id: str
    log_type: str
    source: str
    severity: str = "low"
    message: str
    raw_data: Optional[str] = None
    

class LogResponse(LogCreate):
    id: int
    timestamp: datetime

    class Config:
        from_attributes = True
        extra = "allow"
