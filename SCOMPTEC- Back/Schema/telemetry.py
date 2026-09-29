from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field, ConfigDict, StrictBool, FiniteFloat
from Schema.common import UTCModel


class TelemetryCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    event_id: Optional[str] = Field(default=None, min_length=1, max_length=100, description="Identificador persistido pelo Opta e reutilizado nas tentativas da mesma leitura")
    machine_active: StrictBool
    voltage_24v: Optional[StrictBool] = Field(default=None, description="Presença de 24 V, somente quando existe entrada dedicada; null significa não medido")
    digital_signals: Dict[str, bool] = Field(default_factory=dict)
    analog_signals: Dict[str, FiniteFloat] = Field(default_factory=dict)
    extra_signals: Optional[Dict[str, Any]] = Field(default_factory=dict)
    timestamp: Optional[datetime] = Field(
        default=None,
        description="Horário UTC do Opta (ISO 8601 com Z). Omita se o relógio não estiver sincronizado.",
    )


class TelemetryResponse(UTCModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    device_id: str
    timestamp: datetime
    received_at: datetime
    machine_active: bool
    voltage_24v: Optional[bool] = None
    digital_signals: Optional[Dict[str, Any]] = None
    analog_signals: Optional[Dict[str, Any]] = None
    extra_signals: Optional[Dict[str, Any]] = None


class TelemetryHistoryResponse(BaseModel):
    items: List[TelemetryResponse]
    total: int
    page: int
    limit: int
