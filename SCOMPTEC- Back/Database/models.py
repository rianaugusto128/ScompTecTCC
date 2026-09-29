from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    JSON,
    String,
    Text,
)
from sqlalchemy.orm import (
    DeclarativeBase,
    Mapped,
    mapped_column,
    relationship,
)


class Base(DeclarativeBase):
    pass


class CodeSequence(Base):
    """Persistent counters used for human-readable CNC and Arduino Opta WiFi codes."""
    __tablename__ = "code_sequences"

    prefix: Mapped[str] = mapped_column(String(20), primary_key=True)
    last_number: Mapped[int] = mapped_column(nullable=False, default=0)


# ============================================================
# USUÁRIO / AUTENTICAÇÃO
# ============================================================

class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(512), nullable=False)
    role: Mapped[str] = mapped_column(String(30), nullable=False, default="CLIENTE")
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class AdminIncident(Base):
    __tablename__ = "admin_incidents"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    machine_id: Mapped[str] = mapped_column(String(36), nullable=False)
    machine_code: Mapped[str] = mapped_column(String(20), nullable=False)
    title: Mapped[str] = mapped_column(String(180), nullable=False)
    priority: Mapped[str] = mapped_column(String(20), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="Aberta")
    assignee: Mapped[str] = mapped_column(String(36), nullable=False, default="")
    note: Mapped[str] = mapped_column(Text, nullable=False, default="")
    attendance: Mapped[str] = mapped_column(Text, nullable=False, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))


class AdminRules(Base):
    __tablename__ = "admin_rules"
    id: Mapped[int] = mapped_column(primary_key=True)
    values: Mapped[dict] = mapped_column(JSON, nullable=False)


class AdminAudit(Base):
    __tablename__ = "admin_audit"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    actor_id: Mapped[str] = mapped_column(String(36), nullable=False)
    actor_name: Mapped[str] = mapped_column(String(120), nullable=False)
    action: Mapped[str] = mapped_column(Text, nullable=False)
    at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))


# ============================================================
# CNC
# ============================================================

class CNC(Base):
    __tablename__ = "cncs"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid4()),
    )

    code: Mapped[str] = mapped_column(
        String(20),
        unique=True,
        nullable=False,
        index=True,
    )

    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="UNKNOWN",
    )

    status_since: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
    )

    last_seen: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    devices: Mapped[list["Device"]] = relationship(
        "Device",
        back_populates="cnc",
        cascade="all, delete-orphan",
    )


# ============================================================
# DEVICE / GATEWAY
# ============================================================

class Device(Base):
    __tablename__ = "devices"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid4()),
    )

    code: Mapped[str] = mapped_column(
        String(20),
        unique=True,
        nullable=False,
        index=True,
    )

    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    mac_address: Mapped[str | None] = mapped_column(
        String(17),
        unique=True,
        nullable=True,  # Somente legado; novos cadastros exigem MAC no schema.
        index=True,
    )

    ip_address: Mapped[str | None] = mapped_column(
        String(45),
        nullable=True,
    )

    cnc_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey(
            "cncs.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
        unique=True,
    )

    firmware_version: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )

    last_seen: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    cnc: Mapped["CNC"] = relationship(
        "CNC",
        back_populates="devices",
    )

    telemetry: Mapped[list["Telemetry"]] = relationship(
        "Telemetry",
        back_populates="device",
        cascade="all, delete-orphan",
    )


# ============================================================
# TELEMETRY
# ============================================================

class Telemetry(Base):
    __tablename__ = "telemetry"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid4()),
    )

    device_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey(
            "devices.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    timestamp: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
    )

    received_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    machine_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
    )

    voltage_24v: Mapped[bool | None] = mapped_column(
        Boolean,
        nullable=True,
    )

    digital_signals: Mapped[dict | None] = mapped_column(
        JSON,
        nullable=True,
    )

    analog_signals: Mapped[dict | None] = mapped_column(
        JSON,
        nullable=True,
    )

    extra_signals: Mapped[dict | None] = mapped_column(
        JSON,
        nullable=True,
    )

    device: Mapped["Device"] = relationship(
        "Device",
        back_populates="telemetry",
    )

    ingestion_order: Mapped["TelemetryOrder | None"] = relationship(
        "TelemetryOrder", cascade="all, delete-orphan", uselist=False,
    )

    # ============================================================
    # Login
    # ============================================================

    # ============================================================
    # Registro
    # ============================================================


class TelemetryOrder(Base):
    """Stable arrival ordering, including MySQL timestamps within one second.

    A separate table avoids altering telemetry columns in existing installations.
    Legacy rows keep their received_at ordering until new readings arrive.
    """
    __tablename__ = "telemetry_order"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    telemetry_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("telemetry.id", ondelete="CASCADE"), unique=True,
    )
