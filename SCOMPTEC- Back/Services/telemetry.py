from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from Database.Connection import get_db
from Database.models import Device, Telemetry
from Schema.telemetry import TelemetryCreate, TelemetryResponse

router = APIRouter(prefix="/devices", tags=["Telemetry"])


def utcnow():
    return datetime.now(timezone.utc).replace(tzinfo=None)


def normalize_datetime(value):
    if value is None:
        return utcnow()
    return value.astimezone(timezone.utc).replace(tzinfo=None) if value.tzinfo else value


def derive_status(data: TelemetryCreate) -> str:
    digital = {str(key).lower(): value for key, value in (data.digital_signals or {}).items()}
    if not data.voltage_24v:
        return "DESLIGADA"
    if digital.get("emergencia") or digital.get("emergency"):
        return "EMERGENCIA"
    if digital.get("alarme") or digital.get("alarm"):
        return "ALARME"
    if data.machine_active or digital.get("ciclo") or digital.get("cycle"):
        return "OPERANDO"
    return "PARADA"


@router.post("/{device_id}/telemetry", response_model=TelemetryResponse, status_code=201)
def create_telemetry(device_id: str, data: TelemetryCreate, db: Session = Depends(get_db)):
    device = db.get(Device, device_id)
    if not device:
        raise HTTPException(status_code=404, detail="Dispositivo não encontrado")
    occurred_at = normalize_datetime(data.timestamp)
    reading = Telemetry(device_id=device.id, timestamp=occurred_at, machine_active=data.machine_active, voltage_24v=data.voltage_24v, digital_signals=data.digital_signals, analog_signals=data.analog_signals, extra_signals=data.extra_signals)
    device.last_seen = occurred_at
    cnc = device.cnc
    next_status = derive_status(data)
    if cnc.status != next_status:
        cnc.status = next_status
        cnc.status_since = occurred_at
    cnc.last_seen = occurred_at
    db.add(reading)
    db.commit()
    db.refresh(reading)
    return reading
