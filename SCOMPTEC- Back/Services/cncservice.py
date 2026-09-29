from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from Database.Connection import get_db
from Database.models import CNC, Device, Telemetry, TelemetryOrder, AdminIncident, User
from Services.authservice import get_current_user
from Schema.cnc import CNCCreate, CNCResponse, CNCStatusResponse, CNCUpdate
from Schema.telemetry import TelemetryHistoryResponse
from Services.clock import is_online, normalize_datetime, OFFLINE_TIMEOUT_SECONDS
from Services.deviceservice import next_code as allocate_code
from Services.utilization import calculate_utilization

router = APIRouter(prefix="/cncs", tags=["CNC"])


def utcnow():
    return datetime.now(timezone.utc).replace(tzinfo=None)


def get_cnc_or_404(db: Session, cnc_id: str) -> CNC:
    cnc = db.get(CNC, cnc_id)
    if not cnc:
        raise HTTPException(status_code=404, detail="CNC não encontrada")
    return cnc


def next_code(db: Session) -> str:
    return allocate_code(db, CNC, "CNC-")


def latest_telemetry(db: Session, cnc_id: str) -> Optional[Telemetry]:
    return db.scalars(
        select(Telemetry).join(Device).outerjoin(TelemetryOrder).where(Device.cnc_id == cnc_id).order_by(Telemetry.timestamp.desc(), TelemetryOrder.id.desc(), Telemetry.received_at.desc()).limit(1)
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
    return [cnc_response(db, cnc) for cnc in db.scalars(select(CNC).order_by(CNC.code)).all()]


@router.get("/{cnc_id}", response_model=CNCResponse)
def get_cnc(cnc_id: str, db: Session = Depends(get_db)):
    return cnc_response(db, get_cnc_or_404(db, cnc_id))


@router.put("/{cnc_id}", response_model=CNCResponse)
def update_cnc(cnc_id: str, data: CNCUpdate, db: Session = Depends(get_db)):
    cnc = get_cnc_or_404(db, cnc_id)
    if "name" in data.model_fields_set and data.name is None:
        raise HTTPException(status_code=422, detail="Nome não pode ser nulo")
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
    device = db.scalar(select(Device).where(Device.cnc_id == cnc_id))
    online = bool(device and is_online(device.last_seen))
    status = cnc.status
    since = cnc.status_since
    if not online:
        status = "SEM_COMUNICACAO"
        since = device.last_seen + timedelta(seconds=OFFLINE_TIMEOUT_SECONDS) if device and device.last_seen else cnc.created_at
    elif not reading or not is_online(reading.timestamp):
        status = "DADOS_DESATUALIZADOS"
        since = reading.timestamp + timedelta(seconds=OFFLINE_TIMEOUT_SECONDS) if reading else cnc.created_at
    duration = int((utcnow() - since).total_seconds()) if since else 0
    return CNCStatusResponse(
        id=cnc.id, code=cnc.code, name=cnc.name, status=status,
        status_since=since, status_duration_seconds=max(0, duration), last_seen=device.last_seen if device else None,
        gateway_online=online, last_known_status=cnc.status,
        telemetry_timestamp=reading.timestamp if reading else None,
        telemetry_received_at=reading.received_at if reading else None,
        extra_signals=reading.extra_signals if reading else {},
        digital_signals=reading.digital_signals if reading else {},
        analog_signals=reading.analog_signals if reading else {},
        voltage_24v=reading.voltage_24v if reading else None,
    )


@router.get("/{cnc_id}/history", response_model=TelemetryHistoryResponse)
def get_cnc_history(cnc_id: str, start: Optional[datetime] = Query(default=None), end: Optional[datetime] = Query(default=None), page: int = Query(default=1, ge=1), limit: int = Query(default=50, ge=1, le=500), db: Session = Depends(get_db)):
    get_cnc_or_404(db, cnc_id)
    start = normalize_datetime(start) if start else None
    end = normalize_datetime(end) if end else None
    if start and end and start > end:
        raise HTTPException(status_code=422, detail="start deve ser anterior a end")
    query = select(Telemetry).join(Device).where(Device.cnc_id == cnc_id)
    if start:
        query = query.where(Telemetry.timestamp >= start)
    if end:
        query = query.where(Telemetry.timestamp <= end)
    total = db.scalar(select(func.count()).select_from(query.subquery()))
    items = db.scalars(query.outerjoin(TelemetryOrder).order_by(Telemetry.timestamp.desc(), TelemetryOrder.id.desc(), Telemetry.received_at.desc(), Telemetry.id).offset((page - 1) * limit).limit(limit)).all()
    return TelemetryHistoryResponse(items=items, total=total, page=page, limit=limit)


@router.get("/{cnc_id}/incidents", dependencies=[Depends(get_current_user)])
def get_cnc_incidents(cnc_id: str, db: Session = Depends(get_db)):
    get_cnc_or_404(db, cnc_id)
    rows = db.execute(
        select(AdminIncident, User.name).outerjoin(User, User.id == AdminIncident.assignee)
        .where(AdminIncident.machine_id == cnc_id)
        .order_by(AdminIncident.created_at.desc(), AdminIncident.id)
    ).all()
    return [{
        "id": incident.id, "machineId": incident.machine_code,
        "title": incident.title, "priority": incident.priority, "status": incident.status,
        "assigneeName": name or "Não atribuído", "note": incident.note,
        "attendance": incident.attendance,
        "createdAt": normalize_datetime(incident.created_at).replace(tzinfo=timezone.utc).isoformat(),
    } for incident, name in rows]


@router.get("/{cnc_id}/utilization")
def get_cnc_utilization(cnc_id: str, db: Session = Depends(get_db)):
    get_cnc_or_404(db, cnc_id)
    now = utcnow()
    start = now - timedelta(hours=24, seconds=OFFLINE_TIMEOUT_SECONDS)
    readings = db.scalars(select(Telemetry).join(Device).outerjoin(TelemetryOrder).where(
        Device.cnc_id == cnc_id, Telemetry.timestamp >= start, Telemetry.timestamp <= now,
    ).order_by(Telemetry.timestamp, TelemetryOrder.id, Telemetry.received_at, Telemetry.id)).all()
    return calculate_utilization(readings, now)


def cnc_response(db, cnc):
    response = CNCResponse.model_validate(cnc)
    current = get_cnc_status(cnc.id, db)
    return response.model_copy(update={"status": current.status, "status_since": current.status_since, "last_seen": current.last_seen})
