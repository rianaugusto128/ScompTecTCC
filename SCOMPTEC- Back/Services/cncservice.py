from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from Database.Connection import get_db
from Database.models import CNC, Device, Telemetry
from Schema.cnc import CNCCreate, CNCResponse, CNCStatusResponse, CNCUpdate
from Schema.telemetry import TelemetryHistoryResponse

router = APIRouter(prefix="/cncs", tags=["CNC"])


def utcnow():
    return datetime.now(timezone.utc).replace(tzinfo=None)


def get_cnc_or_404(db: Session, cnc_id: str) -> CNC:
    cnc = db.get(CNC, cnc_id)
    if not cnc:
        raise HTTPException(status_code=404, detail="CNC não encontrada")
    return cnc


def next_code(db: Session) -> str:
    return f"CNC-{db.query(CNC).count() + 1:03d}"


def latest_telemetry(db: Session, cnc_id: str) -> Optional[Telemetry]:
    return db.scalars(
        select(Telemetry).join(Device).where(Device.cnc_id == cnc_id).order_by(Telemetry.timestamp.desc()).limit(1)
    ).first()


@router.post("", response_model=CNCResponse, status_code=201)
def create_cnc(data: CNCCreate, db: Session = Depends(get_db)):
    cnc = CNC(code=next_code(db), name=data.name, description=data.description, status="SEM_COMUNICACAO")
    db.add(cnc)
    db.commit()
    db.refresh(cnc)
    return cnc


@router.get("", response_model=list[CNCResponse])
def list_cncs(db: Session = Depends(get_db)):
    return db.scalars(select(CNC).order_by(CNC.code)).all()


@router.get("/{cnc_id}", response_model=CNCResponse)
def get_cnc(cnc_id: str, db: Session = Depends(get_db)):
    return get_cnc_or_404(db, cnc_id)


@router.put("/{cnc_id}", response_model=CNCResponse)
def update_cnc(cnc_id: str, data: CNCUpdate, db: Session = Depends(get_db)):
    cnc = get_cnc_or_404(db, cnc_id)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(cnc, field, value)
    db.commit()
    db.refresh(cnc)
    return cnc


@router.delete("/{cnc_id}", status_code=204)
def delete_cnc(cnc_id: str, db: Session = Depends(get_db)):
    db.delete(get_cnc_or_404(db, cnc_id))
    db.commit()


@router.get("/{cnc_id}/status", response_model=CNCStatusResponse)
def get_cnc_status(cnc_id: str, db: Session = Depends(get_db)):
    cnc = get_cnc_or_404(db, cnc_id)
    reading = latest_telemetry(db, cnc_id)
    duration = int((utcnow() - cnc.status_since).total_seconds()) if cnc.status_since else 0
    return CNCStatusResponse(
        id=cnc.id, code=cnc.code, name=cnc.name, status=cnc.status,
        status_since=cnc.status_since, status_duration_seconds=max(0, duration), last_seen=cnc.last_seen,
        gateway_online=bool(cnc.last_seen and (utcnow() - cnc.last_seen).total_seconds() <= 90),
        digital_signals=reading.digital_signals if reading else {},
        analog_signals=reading.analog_signals if reading else {},
        voltage_24v=reading.voltage_24v if reading else None,
    )


@router.get("/{cnc_id}/history", response_model=TelemetryHistoryResponse)
def get_cnc_history(cnc_id: str, start: Optional[datetime] = Query(default=None), end: Optional[datetime] = Query(default=None), page: int = Query(default=1, ge=1), limit: int = Query(default=50, ge=1, le=500), db: Session = Depends(get_db)):
    get_cnc_or_404(db, cnc_id)
    query = select(Telemetry).join(Device).where(Device.cnc_id == cnc_id)
    if start:
        query = query.where(Telemetry.timestamp >= start)
    if end:
        query = query.where(Telemetry.timestamp <= end)
    total = len(db.scalars(query).all())
    items = db.scalars(query.order_by(Telemetry.timestamp.desc()).offset((page - 1) * limit).limit(limit)).all()
    return TelemetryHistoryResponse(items=items, total=total, page=page, limit=limit)
