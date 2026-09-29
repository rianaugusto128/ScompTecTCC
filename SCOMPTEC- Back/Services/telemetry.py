from datetime import timedelta
from uuid import uuid5, NAMESPACE_URL

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select

from Database.Connection import get_db
from Database.models import Device, Telemetry, TelemetryOrder
from Schema.telemetry import TelemetryCreate, TelemetryResponse
from Services.clock import utcnow, normalize_datetime
from Services.device_auth import require_device_key

router = APIRouter(prefix="/devices", tags=["Telemetry"])


def derive_status(data: TelemetryCreate) -> str:
    digital = {str(key).lower(): value for key, value in (data.digital_signals or {}).items()}
    if data.voltage_24v is False:
        return "DESLIGADA"
    if digital.get("emergencia") or digital.get("emergency"):
        return "EMERGENCIA"
    if digital.get("alarme") or digital.get("alarm"):
        return "ALARME"
    if digital.get("manutencao") or digital.get("maintenance"):
        return "MANUTENCAO"
    if data.machine_active or digital.get("ciclo") or digital.get("cycle"):
        return "OPERANDO"
    return "PARADA"


@router.post("/{device_id}/telemetry", response_model=TelemetryResponse, status_code=201, dependencies=[Depends(require_device_key)])
def create_telemetry(device_id: str, data: TelemetryCreate, db: Session = Depends(get_db)):
    device = db.scalar(select(Device).where(Device.id == device_id).with_for_update())
    if not device:
        raise HTTPException(status_code=404, detail="Dispositivo não encontrado")
    now = utcnow()
    occurred_at = normalize_datetime(data.timestamp) if data.timestamp else now
    if occurred_at > now + timedelta(seconds=60):
        raise HTTPException(status_code=422, detail="Timestamp futuro: sincronize o relógio ou omita timestamp")
    reading_id = str(uuid5(NAMESPACE_URL, f"scomptec:{device_id}:{data.event_id}")) if data.event_id else None
    if reading_id:
        existing = db.get(Telemetry, reading_id)
        if existing:
            fields = ("machine_active", "voltage_24v", "digital_signals", "analog_signals", "extra_signals")
            if any(getattr(existing, field) != getattr(data, field) for field in fields) or (data.timestamp and existing.timestamp != occurred_at):
                raise HTTPException(status_code=409, detail="event_id já utilizado com outra leitura")
            return existing
    latest = db.scalar(select(Telemetry).outerjoin(TelemetryOrder).where(Telemetry.device_id == device_id).order_by(Telemetry.timestamp.desc(), TelemetryOrder.id.desc(), Telemetry.received_at.desc()).limit(1))
    reading = Telemetry(device_id=device.id, timestamp=occurred_at, received_at=now, machine_active=data.machine_active, voltage_24v=data.voltage_24v, digital_signals=data.digital_signals, analog_signals=data.analog_signals, extra_signals=data.extra_signals)
    if reading_id:
        reading.id = reading_id
    reading.ingestion_order = TelemetryOrder()
    device.last_seen = now
    cnc = device.cnc
    next_status = derive_status(data)
    if latest is None or occurred_at >= latest.timestamp:
        if cnc.status != next_status:
            cnc.status = next_status
            cnc.status_since = occurred_at
    cnc.last_seen = now
    db.add(reading)
    db.commit()
    db.refresh(reading)
    return reading
