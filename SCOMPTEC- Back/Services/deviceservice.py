from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from Database.Connection import get_db
from Database.models import CNC, Device
from Schema.device import DeviceCreate, DeviceResponse, DeviceStatusResponse, DeviceUpdate

router = APIRouter(prefix="/devices", tags=["Devices"])


def utcnow():
    return datetime.now(timezone.utc).replace(tzinfo=None)


def get_device_or_404(db: Session, device_id: str) -> Device:
    device = db.get(Device, device_id)
    if not device:
        raise HTTPException(status_code=404, detail="Dispositivo não encontrado")
    return device


def ensure_cnc(db: Session, cnc_id: str):
    if not db.get(CNC, cnc_id):
        raise HTTPException(status_code=422, detail="CNC associada não encontrada")


@router.post("", response_model=DeviceResponse, status_code=201)
def create_device(data: DeviceCreate, db: Session = Depends(get_db)):
    ensure_cnc(db, data.cnc_id)
    device = Device(code=f"ESP32-{db.query(Device).count() + 1:03d}", name=data.name, cnc_id=data.cnc_id, firmware_version=data.firmware_version)
    db.add(device)
    db.commit()
    db.refresh(device)
    return device


@router.get("", response_model=list[DeviceResponse])
def list_devices(db: Session = Depends(get_db)):
    return db.scalars(select(Device).order_by(Device.code)).all()


@router.get("/{device_id}", response_model=DeviceResponse)
def get_device(device_id: str, db: Session = Depends(get_db)):
    return get_device_or_404(db, device_id)


@router.put("/{device_id}", response_model=DeviceResponse)
def update_device(device_id: str, data: DeviceUpdate, db: Session = Depends(get_db)):
    device = get_device_or_404(db, device_id)
    changes = data.model_dump(exclude_unset=True)
    if "cnc_id" in changes:
        ensure_cnc(db, changes["cnc_id"])
    for field, value in changes.items():
        setattr(device, field, value)
    db.commit()
    db.refresh(device)
    return device


@router.delete("/{device_id}", status_code=204)
def delete_device(device_id: str, db: Session = Depends(get_db)):
    db.delete(get_device_or_404(db, device_id))
    db.commit()


@router.get("/{device_id}/status", response_model=DeviceStatusResponse)
def get_device_status(device_id: str, db: Session = Depends(get_db)):
    device = get_device_or_404(db, device_id)
    online = bool(device.last_seen and (utcnow() - device.last_seen).total_seconds() <= 90)
    return DeviceStatusResponse(id=device.id, code=device.code, name=device.name, cnc_id=device.cnc_id, online=online, last_seen=device.last_seen)
