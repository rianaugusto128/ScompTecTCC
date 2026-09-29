from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from Database.Connection import get_db
from Database.models import CNC, CodeSequence, Device, Telemetry
from Services.clock import is_online
from Services.device_auth import require_device_key
from Schema.device import (
    CNCRegistrationResponse,
    DeviceCreate,
    DeviceRegistration,
    DeviceRegistrationResponse,
    DeviceResponse,
    DeviceStatusResponse,
    DeviceUpdate,
)

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


def next_code(db: Session, model, prefix: str) -> str:
    """Generate a readable code without reusing one after a deletion."""
    if db.bind.dialect.name == "mysql":
        from sqlalchemy.dialects.mysql import insert
        existing_numbers = [int(code[len(prefix):]) for code in db.scalars(select(model.code)) if code.startswith(prefix) and code[len(prefix):].isdigit()]
        stmt = insert(CodeSequence).values(prefix=prefix, last_number=max(existing_numbers, default=0) + 1)
        db.execute(stmt.on_duplicate_key_update(last_number=CodeSequence.last_number + 1))
        number = db.scalar(select(CodeSequence.last_number).where(CodeSequence.prefix == prefix).with_for_update())
        return f"{prefix}{number:03d}"
    sequence = db.get(CodeSequence, prefix)
    if not sequence:
        existing_numbers = [
            int(code.removeprefix(prefix))
            for code in db.scalars(select(model.code))
            if code.startswith(prefix) and code.removeprefix(prefix).isdigit()
        ]
        sequence = CodeSequence(prefix=prefix, last_number=max(existing_numbers, default=0))
        db.add(sequence)

    sequence.last_number += 1
    db.flush()
    return f"{prefix}{sequence.last_number:03d}"


def provision_device(db: Session, data: DeviceRegistration) -> tuple[Device, CNC, bool]:
    """Register an Arduino Opta WiFi and create its CNC on the first MAC registration.

    Repeated registrations are idempotent: they refresh the known device instead
    of creating another CNC for the same physical Arduino Opta WiFi.
    """
    mac_address = data.mac_address.upper()
    device = db.scalar(select(Device).where(Device.mac_address == mac_address))
    now = utcnow()

    if device:
        device.ip_address = data.ip_address
        device.firmware_version = data.firmware_version
        device.last_seen = now
        db.commit()
        db.refresh(device)
        return device, device.cnc, False

    cnc_code = next_code(db, CNC, "CNC-")
    cnc_number = int(cnc_code.removeprefix("CNC-"))
    cnc = CNC(
        code=cnc_code,
        name=f"CNC {cnc_number:02d}",
        description="CNC provisionada automaticamente pelo Arduino Opta WiFi",
        status="SEM_COMUNICACAO",
        status_since=now,
        last_seen=now,
    )
    db.add(cnc)
    db.flush()

    device_code = next_code(db, Device, "OPTA-")
    device_number = int(device_code.removeprefix("OPTA-"))
    device = Device(
        code=device_code,
        name=f"Arduino Opta WiFi {device_number:02d}",
        mac_address=mac_address,
        ip_address=data.ip_address,
        cnc_id=cnc.id,
        firmware_version=data.firmware_version,
        last_seen=now,
    )
    db.add(device)
    db.commit()
    db.refresh(cnc)
    db.refresh(device)
    return device, cnc, True


@router.post("/register", response_model=DeviceRegistrationResponse, status_code=201, dependencies=[Depends(require_device_key)])
def register_device(data: DeviceRegistration, db: Session = Depends(get_db)):
    """Create the CNC + Arduino Opta WiFi pair, or refresh a previously registered Arduino Opta WiFi."""
    try:
        device, cnc, created = provision_device(db, data)
    except IntegrityError:
        db.rollback()
        if not db.scalar(select(Device).where(Device.mac_address == data.mac_address.upper())):
            raise HTTPException(status_code=409, detail="Conflito no cadastro; tente novamente")
        device, cnc, created = provision_device(db, data)
    return DeviceRegistrationResponse(
        created=created,
        device=DeviceResponse.model_validate(device),
        cnc=CNCRegistrationResponse(id=cnc.id, code=cnc.code, name=cnc.name),
    )


@router.post("", response_model=DeviceResponse, status_code=201)
def create_device(data: DeviceCreate, db: Session = Depends(get_db)):
    ensure_cnc(db, data.cnc_id)
    if db.scalar(select(Device).where((Device.mac_address == data.mac_address.upper()) | (Device.cnc_id == data.cnc_id))):
        raise HTTPException(status_code=409, detail="MAC ou CNC já possui dispositivo cadastrado")
    device = Device(
        code=next_code(db, Device, "OPTA-"),
        name=data.name,
        mac_address=data.mac_address.upper(),
        ip_address=data.ip_address,
        cnc_id=data.cnc_id,
        firmware_version=data.firmware_version,
        last_seen=utcnow(),
    )
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
    if any(changes.get(field) is None for field in ("name", "cnc_id") if field in changes):
        raise HTTPException(status_code=422, detail="Nome e CNC não podem ser nulos")
    if "cnc_id" in changes:
        ensure_cnc(db, changes["cnc_id"])
        if changes["cnc_id"] != device.cnc_id:
            if db.scalar(select(Device).where(Device.cnc_id == changes["cnc_id"])):
                raise HTTPException(status_code=409, detail="CNC já possui um dispositivo")
            if db.scalar(select(Telemetry.id).where(Telemetry.device_id == device.id).limit(1)):
                raise HTTPException(status_code=409, detail="Dispositivo possui histórico; realocação exige migração explícita para preservar a CNC de origem")
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
    online = is_online(device.last_seen)
    return DeviceStatusResponse(id=device.id, code=device.code, name=device.name, mac_address=device.mac_address, cnc_id=device.cnc_id, online=online, last_seen=device.last_seen)
