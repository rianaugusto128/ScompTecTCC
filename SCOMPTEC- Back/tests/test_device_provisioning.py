from pathlib import Path
import os
import sys

import pytest
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))
os.environ["DATABASE_URL"] = "sqlite://"

from Database.models import Base, CNC, Device
from Schema.device import DeviceRegistration
from Services.deviceservice import provision_device


@pytest.fixture
def db():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        yield session


def registration(mac_address="AA:BB:CC:DD:EE:FF"):
    return DeviceRegistration(
        mac_address=mac_address,
        ip_address="192.168.1.10",
        firmware_version="1.0.0",
    )


def test_first_registration_creates_one_linked_cnc_and_device(db):
    device, cnc, created = provision_device(db, registration())

    assert created is True
    assert device.cnc_id == cnc.id
    assert device.mac_address == "AA:BB:CC:DD:EE:FF"
    assert device.code == "OPTA-001"
    assert device.name == "Arduino Opta WiFi 01"
    assert cnc.code == "CNC-001"
    assert cnc.name == "CNC 01"
    assert len(db.scalars(select(CNC)).all()) == 1
    assert len(db.scalars(select(Device)).all()) == 1


def test_reregistering_same_mac_updates_device_without_creating_another_cnc(db):
    first_device, first_cnc, first_created = provision_device(db, registration())
    db.expire_all()

    repeated = registration()
    repeated.ip_address = "192.168.1.25"
    repeated.firmware_version = "1.1.0"
    device, cnc, created = provision_device(db, repeated)

    assert first_created is True
    assert created is False
    assert device.id == first_device.id
    assert cnc.id == first_cnc.id
    assert device.name == "Arduino Opta WiFi 01"
    assert device.ip_address == "192.168.1.25"
    assert device.firmware_version == "1.1.0"
    assert len(db.scalars(select(CNC)).all()) == 1
    assert len(db.scalars(select(Device)).all()) == 1


def test_codes_are_not_reused_after_a_cnc_is_deleted(db):
    _, first_cnc, _ = provision_device(db, registration())
    db.delete(first_cnc)
    db.commit()

    _, next_cnc, _ = provision_device(db, registration("AA:BB:CC:DD:EE:01"))

    assert next_cnc.code == "CNC-002"
