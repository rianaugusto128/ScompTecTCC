from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict
from Schema.common import UTCModel
from time import time
from uuid import uuid4


class DeviceRegistration(BaseModel):
    """Identificação enviada pelo Arduino Opta WiFi ao entrar na rede."""
    mac_address: str = Field(..., pattern=r"^[0-9A-Fa-f]{2}(:[0-9A-Fa-f]{2}){5}$")
    ip_address: Optional[str] = Field(default=None, max_length=45)
    firmware_version: Optional[str] = Field(default=None, max_length=50)


class DeviceCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    mac_address: str = Field(..., pattern=r"^[0-9A-Fa-f]{2}(:[0-9A-Fa-f]{2}){5}$")
    cnc_id: str = Field(..., description="ID (UUID) da CNC associada")
    ip_address: Optional[str] = Field(default=None, max_length=45)
    firmware_version: Optional[str] = Field(default=None, max_length=50)


class DeviceUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    firmware_version: Optional[str] = Field(default=None, max_length=50)
    ip_address: Optional[str] = Field(default=None, max_length=45)
    # Permitido: um gateway físico pode ser realocado para outra CNC
    # (troca de armário, substituição de máquina, reorganização de planta).
    cnc_id: Optional[str] = Field(default=None)


class DeviceResponse(UTCModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    code: str
    name: str
    # Cadastros legados podem ainda nao ter o MAC real informado.
    mac_address: Optional[str] = None
    ip_address: Optional[str] = None
    cnc_id: str
    firmware_version: Optional[str] = None
    last_seen: Optional[datetime] = None
    created_at: datetime


class DeviceStatusResponse(UTCModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    code: str
    name: str
    mac_address: Optional[str] = None
    cnc_id: str
    online: bool
    last_seen: Optional[datetime] = None


class CNCRegistrationResponse(BaseModel):
    id: str
    code: str
    name: str


class DeviceRegistrationResponse(BaseModel):
    created: bool
    device: DeviceResponse
    cnc: CNCRegistrationResponse
    server_time_unix: int = Field(default_factory=lambda: int(time()))
    telemetry_session_id: str = Field(default_factory=lambda: str(uuid4()))
