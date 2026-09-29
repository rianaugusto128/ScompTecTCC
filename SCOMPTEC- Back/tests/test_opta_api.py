import os
import sys
import json
from pathlib import Path
from datetime import timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
os.environ["DATABASE_URL"] = "sqlite://"

from Main import app
from Database.Connection import get_db
from Database.models import Base, Device, CNC, Telemetry
from Services.clock import utcnow


@pytest.fixture
def api_client(monkeypatch):
    monkeypatch.delenv("DEVICE_API_KEY", raising=False)
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    with Session(engine) as db:
        app.dependency_overrides[get_db] = lambda: db
        # Deliberately no lifespan: never initialize the configured real database.
        client = TestClient(app, raise_server_exceptions=True)
        yield client, db
        client.close()
    app.dependency_overrides.clear()
    engine.dispose()


def register(client):
    response = client.post("/api/devices/register", json={"mac_address": "AA:BB:CC:DD:EE:11", "firmware_version": "opta-1.0"})
    assert response.status_code == 201, response.text
    return response.json()


def test_utilization_includes_more_than_latest_100_readings(api_client, monkeypatch):
    from Services import cncservice
    client, db = api_client
    registration = register(client)
    now = utcnow()
    monkeypatch.setattr(cncservice, "utcnow", lambda: now)
    for i in range(125):
        db.add(Telemetry(device_id=registration["device"]["id"],
            timestamp=now - timedelta(seconds=1250 - i * 10),
            machine_active=i < 25, voltage_24v=True, digital_signals={}, analog_signals={}))
    db.commit()
    response = client.get(f"/api/cncs/{registration['cnc']['id']}/utilization")
    assert response.status_code == 200, response.text
    buckets = response.json()["buckets"]
    assert len(buckets) == 24
    assert sum(item["samples"] for item in buckets) == 125
    assert sum(item["seconds"]["OPERANDO"] for item in buckets) == 250
    assert sum(item["seconds"]["PARADA"] for item in buckets) == 1000
    assert buckets[0]["timestamp"].endswith("Z")
    assert client.get("/api/cncs/missing/utilization").status_code == 404


def test_utilization_handles_timeout_boundaries_and_priority():
    from Services.utilization import calculate_utilization
    from types import SimpleNamespace
    now = utcnow()
    def sample(seconds, **changes):
        return SimpleNamespace(timestamp=now - timedelta(seconds=seconds), machine_active=True,
            voltage_24v=True, digital_signals=changes)
    result = calculate_utilization([sample(3650), sample(3620, alarme=True), sample(10, emergencia=True)], now, timeout=90)
    buckets = result["buckets"]
    assert sum(item["seconds"]["OPERANDO"] for item in buckets) == 30
    assert sum(item["seconds"]["ALARME"] for item in buckets) == 90
    assert sum(item["seconds"]["EMERGENCIA"] for item in buckets) == 10
    assert buckets[-2]["seconds"]["ALARME"] == 20
    assert buckets[-1]["seconds"]["ALARME"] == 70
    # Repeated timestamp: latest ingestion takes precedence without double counting.
    tied = calculate_utilization([sample(20), sample(20, alarme=True)], now)
    assert tied["buckets"][-1]["seconds"]["OPERANDO"] == 0
    assert tied["buckets"][-1]["seconds"]["ALARME"] == 20
    before_window = calculate_utilization([sample(86430)], now, timeout=90)
    assert before_window["buckets"][0]["seconds"]["OPERANDO"] == 60
    assert sum(item["samples"] for item in before_window["buckets"]) == 0
    assert sum(sum(item["seconds"].values()) for item in calculate_utilization([], now)["buckets"]) == 0


def post(client, registration, **changes):
    return client.post(f"/api/devices/{registration['device']['id']}/telemetry", json={"machine_active": True, "voltage_24v": True, **changes})


def status(client, registration):
    return client.get(f"/api/cncs/{registration['cnc']['id']}/status").json()


def test_legacy_device_without_mac_remains_readable(api_client):
    client, db = api_client
    cnc = CNC(code="CNC-LEGACY", name="CNC antiga")
    db.add(cnc)
    db.flush()
    device = Device(code="LEGACY-001", name="Dispositivo antigo", cnc_id=cnc.id)
    db.add(device)
    db.commit()
    for path in ("/api/devices", f"/api/devices/{device.id}", f"/api/devices/{device.id}/status"):
        response = client.get(path)
        assert response.status_code == 200, response.text
        body = response.json()
        assert (body[0] if isinstance(body, list) else body)["mac_address"] is None
    assert client.post("/api/devices/register", json={}).status_code == 422
    assert client.post("/api/devices", json={"name": "Novo", "cnc_id": cnc.id}).status_code == 422


def test_opta_to_database_to_frontend_contract(api_client):
    client, db = api_client
    registration = register(client)
    assert registration["device"]["code"] == "OPTA-001"
    response = post(client, registration, digital_signals={"ciclo": True}, analog_signals={"current": 12.5}, extra_signals={"rssi": -60})
    assert response.status_code == 201
    assert response.json()["timestamp"].endswith("Z")
    assert db.get(Telemetry, response.json()["id"]).analog_signals == {"current": 12.5}
    snapshot = status(client, registration)
    assert snapshot["status"] == "OPERANDO"
    assert snapshot["gateway_online"] is True
    assert snapshot["extra_signals"]["rssi"] == -60
    assert snapshot["last_seen"].endswith("Z")
    history = client.get(f"/api/cncs/{registration['cnc']['id']}/history").json()
    assert history["total"] == 1
    assert history["items"][0]["id"] == response.json()["id"]
    assert client.get("/api/health").json()["database"] == "ok"


def test_mesa_payload_preserves_unknown_voltage_and_all_signals(api_client):
    client, db = api_client
    registration = register(client)
    assert len(registration["telemetry_session_id"]) == 36
    assert registration["server_time_unix"] > 1700000000
    path = Path(__file__).resolve().parents[2] / "firmware/opta_mesa_monitor/mesa_sample.json"
    payload = json.loads(path.read_text(encoding="utf-8"))
    payload["timestamp"] = utcnow().isoformat() + "Z"
    response = client.post(f"/api/devices/{registration['device']['id']}/telemetry", json=payload)
    assert response.status_code == 201
    assert response.json()["voltage_24v"] is None
    saved = db.get(Telemetry, response.json()["id"])
    assert saved.voltage_24v is None
    assert saved.analog_signals == {}
    snapshot = status(client, registration)
    assert snapshot["status"] == "OPERANDO"
    assert snapshot["extra_signals"]["mesa"] == payload["extra_signals"]["mesa"]
    assert snapshot["digital_signals"]["altura_pequena_bloqueada"] is True
    assert "emergencia" not in snapshot["digital_signals"]
    history = client.get(f"/api/cncs/{registration['cnc']['id']}/history").json()
    assert history["items"][0]["extra_signals"]["mesa"]["contadores"]["total"] == 3


@pytest.mark.parametrize("cycle,fault,expected", [(False, False, "PARADA"), (True, False, "OPERANDO"), (False, True, "ALARME")])
def test_mesa_without_supply_sensor(api_client, cycle, fault, expected):
    client, _ = api_client
    registration = register(client)
    response = post(client, registration, voltage_24v=None, machine_active=cycle, digital_signals={"ciclo": cycle, "alarme": fault})
    assert response.status_code == 201
    assert status(client, registration)["status"] == expected


@pytest.mark.parametrize("payload,expected", [
    ({"voltage_24v": False, "digital_signals": {"emergencia": True}}, "DESLIGADA"),
    ({"digital_signals": {"emergency": True, "alarm": True}}, "EMERGENCIA"),
    ({"digital_signals": {"alarme": True}}, "ALARME"),
    ({"digital_signals": {"maintenance": True}}, "MANUTENCAO"),
    ({"machine_active": False}, "PARADA"),
    ({"digital_signals": {"alarm": "false"}}, "OPERANDO"),
])
def test_signal_statuses(api_client, payload, expected):
    client, _ = api_client
    registration = register(client)
    assert post(client, registration, **payload).status_code == 201
    assert status(client, registration)["status"] == expected


def test_retries_and_conflicting_event_id(api_client):
    client, db = api_client
    registration = register(client)
    first = post(client, registration, event_id="boot1-1")
    second = post(client, registration, event_id="boot1-1")
    assert first.json()["id"] == second.json()["id"]
    assert len(db.scalars(select(Telemetry)).all()) == 1
    assert post(client, registration, event_id="boot1-1", machine_active=False).status_code == 409


def test_mysql_second_precision_does_not_break_retry(api_client):
    client, _ = api_client
    registration = register(client)
    timestamp = (utcnow() - timedelta(seconds=2)).replace(microsecond=123456).isoformat() + "Z"
    first = post(client, registration, event_id="fractional", timestamp=timestamp)
    retry = post(client, registration, event_id="fractional", timestamp=timestamp)
    assert retry.status_code == 201
    assert retry.json()["id"] == first.json()["id"]
    assert ".123456" not in retry.json()["timestamp"]


def test_same_second_signals_follow_arrival_order(api_client):
    client, _ = api_client
    registration = register(client)
    timestamp = utcnow().isoformat() + "Z"
    for number in range(6):
        active = number % 2 == 0
        result = post(client, registration, event_id=f"same-second-{number}", timestamp=timestamp, machine_active=active, digital_signals={"ciclo": active})
        assert result.status_code == 201
        snapshot = status(client, registration)
        assert snapshot["status"] == ("OPERANDO" if active else "PARADA")
        assert snapshot["digital_signals"]["ciclo"] == active
        latest = client.get(f"/api/cncs/{registration['cnc']['id']}/history?limit=1").json()["items"][0]
        assert latest["id"] == result.json()["id"]


def test_delayed_reading_does_not_revert_state_or_connection_clock(api_client):
    client, db = api_client
    registration = register(client)
    post(client, registration)
    old = (utcnow() - timedelta(hours=2)).isoformat() + "Z"
    assert post(client, registration, timestamp=old, machine_active=False).status_code == 201
    current = status(client, registration)
    assert current["status"] == "OPERANDO"
    assert current["gateway_online"] is True
    assert (utcnow() - db.get(Device, registration["device"]["id"]).last_seen).total_seconds() < 5


def test_offline_and_stale_are_distinct(api_client):
    client, db = api_client
    registration = register(client)
    post(client, registration, timestamp=(utcnow() - timedelta(minutes=5)).isoformat() + "Z")
    assert status(client, registration)["status"] == "DADOS_DESATUALIZADOS"
    device = db.get(Device, registration["device"]["id"])
    device.last_seen = utcnow() - timedelta(minutes=5)
    db.commit()
    assert status(client, registration)["status"] == "SEM_COMUNICACAO"
    assert client.get("/api/cncs").json()[0]["status"] == "SEM_COMUNICACAO"
    assert client.get(f"/api/devices/{device.id}/status").json()["online"] is False
    post(client, registration)
    assert status(client, registration)["status"] == "OPERANDO"


def test_invalid_payloads_and_unknown_device(api_client):
    client, _ = api_client
    registration = register(client)
    for changes in [{"machine_active": "yes"}, {"digital_signals": {"alarm": "invalid"}}, {"analog_signals": {"current": "NaN"}}, {"timestamp": (utcnow() + timedelta(days=1)).isoformat() + "Z"}]:
        assert post(client, registration, **changes).status_code == 422
    assert client.post("/api/devices/unknown/telemetry", json={"machine_active": True, "voltage_24v": True}).status_code == 404


def test_optional_device_key(api_client, monkeypatch):
    client, _ = api_client
    registration = register(client)
    monkeypatch.setenv("DEVICE_API_KEY", "integration-key")
    assert post(client, registration).status_code == 401
    assert client.post("/api/devices/register", json={"mac_address": "AA:BB:CC:DD:EE:11"}).status_code == 401
    assert client.post(f"/api/devices/{registration['device']['id']}/telemetry", headers={"X-Device-Key": "integration-key"}, json={"machine_active": True, "voltage_24v": True}).status_code == 201


def test_history_timezone_pagination_and_invalid_range(api_client):
    client, _ = api_client
    registration = register(client)
    for minute in (1, 2):
        post(client, registration, timestamp=f"2026-01-01T12:0{minute}:00-03:00")
    path = f"/api/cncs/{registration['cnc']['id']}/history"
    page = client.get(path, params={"start": "2026-01-01T15:00:00Z", "end": "2026-01-01T15:03:00Z", "limit": 1, "page": 2}).json()
    assert page["total"] == 2
    assert page["items"][0]["timestamp"] == "2026-01-01T15:01:00Z"
    assert client.get(path, params={"start": "2026-02-01", "end": "2026-01-01"}).status_code == 422


def test_reassignment_cannot_move_machine_history(api_client):
    client, _ = api_client
    registration = register(client)
    post(client, registration)
    cnc = client.post("/api/cncs", json={"name": "Outra CNC"}).json()
    assert client.put(f"/api/devices/{registration['device']['id']}", json={"cnc_id": cnc["id"]}).status_code == 409
