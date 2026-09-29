from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict
from Schema.common import UTCModel


class CNCCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = Field(default=None, max_length=1000)


class CNCUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    description: Optional[str] = Field(default=None, max_length=1000)


class CNCResponse(UTCModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    code: str
    name: str
    description: Optional[str] = None
    status: str
    status_since: Optional[datetime] = None
    last_seen: Optional[datetime] = None
    created_at: datetime


class CNCStatusResponse(UTCModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    code: str
    name: str
    status: str
    status_since: Optional[datetime] = None
    status_duration_seconds: int
    last_seen: Optional[datetime] = None
    gateway_online: bool
    last_known_status: str = "SEM_COMUNICACAO"
    telemetry_timestamp: Optional[datetime] = None
    telemetry_received_at: Optional[datetime] = None
    extra_signals: Optional[Dict[str, Any]] = None
    digital_signals: Optional[Dict[str, Any]] = None
    analog_signals: Optional[Dict[str, Any]] = None
    voltage_24v: Optional[bool] = None
