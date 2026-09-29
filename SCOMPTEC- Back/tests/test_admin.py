import os
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
os.environ["DATABASE_URL"] = "sqlite://"

from Main import app
from Database.Connection import get_db
from Database.models import Base, User, CNC, AdminAudit
from Services.security import hash_password, create_access_token


@pytest.fixture
def admin_api():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    with Session(engine) as db:
        admin = User(name="Administrador", email="admin@example.com", role="admin", password_hash=hash_password("test-password"))
        db.add(admin)
        db.add(CNC(id="machine-1", code="CNC-01", name="Torno"))
        db.commit()
        admin_id = admin.id
    def session():
        with Session(engine) as db:
            yield db
    app.dependency_overrides[get_db] = session
    client = TestClient(app)
    yield client, {"Authorization": f"Bearer {create_access_token(admin_id)}"}, engine, admin_id
    client.close()
    app.dependency_overrides.clear()
    engine.dispose()


def create_user(client, headers, **extra):
    return client.post("/api/admin/users", headers=headers, json={"name": "Pessoa", "email": "person@example.com", "password": "strong-password", "role": "maintenance", **extra})


def test_admin_permissions_and_accounts(admin_api):
    client, headers, engine, admin_id = admin_api
    assert client.get("/api/admin/state").status_code == 401
    created = create_user(client, headers)
    assert created.status_code == 201, created.text
    assert "password" not in created.text
    user = next(u for u in created.json()["users"] if u["id"] != admin_id)
    login = client.post("/api/auth/login", json={"email": user["email"], "password": "strong-password"})
    assert login.status_code == 200
    user_headers = {"Authorization": "Bearer " + login.json()["access_token"]}
    for method, url, payload in [
        ("GET", "/api/admin/state", None), ("POST", "/api/admin/users", {}),
        ("PATCH", f"/api/admin/users/{admin_id}", {"active": False}),
        ("POST", "/api/admin/incidents", {}), ("PATCH", "/api/admin/incidents/missing", {"status": "Aberta"}),
        ("PUT", "/api/admin/rules", {}),
    ]:
        assert client.request(method, url, headers=user_headers, json=payload).status_code == 403
    assert create_user(client, headers, email="PERSON@example.com").status_code == 409
    assert create_user(client, headers, email="new@example.com", role="superuser").status_code == 422
    assert client.patch(f"/api/admin/users/{admin_id}", headers=headers, json={"active": False}).status_code == 409
    assert client.patch(f"/api/admin/users/{user['id']}", headers=headers, json={"active": False}).status_code == 200
    assert client.get("/api/auth/me", headers=user_headers).status_code == 401
    assert client.post("/api/auth/login", json={"email": user["email"], "password": "strong-password"}).status_code == 401
    assert client.patch(f"/api/admin/users/{user['id']}", headers=headers, json={"active": True}).status_code == 200
    assert client.get("/api/auth/me", headers=user_headers).status_code == 200
    with Session(engine) as db:
        assert db.get(User, user["id"]).password_hash != "strong-password"
        admin = db.get(User, admin_id)
        admin.role = "viewer"
        db.commit()
    assert client.get("/api/admin/state", headers=headers).status_code == 403


def test_persistent_incident_lifecycle_rules_and_audit(admin_api):
    client, headers, engine, admin_id = admin_api
    user = next(u for u in create_user(client, headers).json()["users"] if u["id"] != admin_id)
    payload = {"machineId": "machine-1", "title": "Temperatura alta", "assignee": user["id"]}
    assert client.post("/api/admin/incidents", headers=headers, json={**payload, "machineId": "missing"}).status_code == 422
    assert client.post("/api/admin/incidents", headers=headers, json={**payload, "assignee": "missing"}).status_code == 422
    result = client.post("/api/admin/incidents", headers=headers, json=payload)
    assert result.status_code == 201, result.text
    incident = result.json()["incidents"][0]
    assert incident["machineId"] == "CNC-01"
    endpoint = f"/api/admin/incidents/{incident['id']}"
    assert client.patch(f"/api/admin/users/{user['id']}", headers=headers, json={"active": False}).status_code == 409
    for invalid in [{"status": "Resolvida"}, {"attendance": " "}, {"status": None}, {"bogus": 1}]:
        assert client.patch(endpoint, headers=headers, json=invalid).status_code == 422
    assert client.patch(endpoint, headers=headers, json={"status": "Em atendimento"}).status_code == 200
    assert client.patch(endpoint, headers=headers, json={"attendance": "Sensor substituído"}).status_code == 200
    assert client.patch(endpoint, headers=headers, json={"status": "Resolvida"}).status_code == 200
    assert client.patch(endpoint, headers=headers, json={"assignee": ""}).status_code == 422
    rules = {"current": 20, "temperature": 60, "voltageMin": 210, "voltageMax": 230}
    assert client.put("/api/admin/rules", headers=headers, json={**rules, "voltageMin": 250}).status_code == 422
    assert client.put("/api/admin/rules", headers=headers, json=rules).status_code == 200
    # Every request has a fresh database session: this also verifies persistence.
    state = client.get("/api/admin/state", headers=headers).json()
    assert state["rules"] == rules
    assert state["incidents"][0]["attendance"] == "Sensor substituído"
    assert state["incidents"][0]["status"] == "Resolvida"
    assert len(state["audit"]) == 6
    assert all(entry["actor"] == "Administrador" for entry in state["audit"])
    with Session(engine) as db:
        assert len(db.scalars(select(AdminAudit)).all()) == 6


def test_public_registration_cannot_grant_admin(admin_api):
    client, _, _, _ = admin_api
    response = client.post("/api/auth/register", json={"name": "Visitante", "email": "visitor@example.com", "password": "test-password", "role": "admin"})
    assert response.status_code == 201
    headers = {"Authorization": "Bearer " + response.json()["access_token"]}
    assert client.get("/api/admin/state", headers=headers).status_code == 403


def test_env_admin_sync_and_password_change(admin_api, monkeypatch):
    from Services.admin_bootstrap import sync_admin
    client, _, engine, _ = admin_api
    monkeypatch.setenv("ADMIN_NAME", "Admin ambiente")
    monkeypatch.setenv("ADMIN_EMAIL", "configured@example.com")
    monkeypatch.setenv("ADMIN_PASSWORD", "first-password")
    with Session(engine) as db:
        sync_admin(db)
        user = db.scalar(select(User).where(User.email == "configured@example.com"))
        first_hash = user.password_hash
        sync_admin(db)
        assert user.password_hash == first_hash
        assert len(db.scalars(select(AdminAudit)).all()) == 1
    login = client.post("/api/auth/login", json={"email": "configured@example.com", "password": "first-password"})
    assert login.status_code == 200
    assert login.json()["user"]["role"] == "admin"
    monkeypatch.setenv("ADMIN_PASSWORD", "second-password")
    with Session(engine) as db:
        sync_admin(db)
        assert len(db.scalars(select(AdminAudit)).all()) == 2
    assert client.post("/api/auth/login", json={"email": "configured@example.com", "password": "first-password"}).status_code == 401
    assert client.post("/api/auth/login", json={"email": "configured@example.com", "password": "second-password"}).status_code == 200


def test_env_admin_validates_without_leaking_password(admin_api, monkeypatch):
    from Services.admin_bootstrap import sync_admin
    _, _, engine, _ = admin_api
    monkeypatch.setenv("ADMIN_EMAIL", "invalid")
    monkeypatch.setenv("ADMIN_PASSWORD", "private-value")
    with Session(engine) as db:
        with pytest.raises(RuntimeError) as error:
            sync_admin(db)
        assert "private-value" not in str(error.value)
        monkeypatch.setenv("ADMIN_EMAIL", "")
        monkeypatch.setenv("ADMIN_PASSWORD", "")
        sync_admin(db)
        assert len(db.scalars(select(User)).all()) == 1


def test_change_role_and_delete_user(admin_api):
    client, headers, engine, admin_id = admin_api
    created = create_user(client, headers).json()
    user = next(u for u in created["users"] if u["id"] != admin_id)
    url = f"/api/admin/users/{user['id']}"
    login = client.post("/api/auth/login", json={"email": user["email"], "password": "strong-password"}).json()
    user_headers = {"Authorization": "Bearer " + login["access_token"]}
    assert client.patch(url, headers=user_headers, json={"role": "admin"}).status_code == 403
    assert client.delete(url, headers=user_headers).status_code == 403
    for invalid in [{}, {"role": None}, {"role": "invalid"}, {"active": None}]:
        assert client.patch(url, headers=headers, json=invalid).status_code == 422
    response = client.patch(url, headers=headers, json={"role": "admin"})
    assert response.status_code == 200
    assert next(u for u in response.json()["users"] if u["id"] == user["id"])["active"] is True
    assert client.get("/api/admin/state", headers=user_headers).status_code == 200
    assert client.patch(url, headers=user_headers, json={"role": "viewer"}).status_code == 409
    assert client.delete(url, headers=user_headers).status_code == 409
    assert client.patch(url, headers=headers, json={"role": "viewer"}).status_code == 200
    assert client.get("/api/admin/state", headers=user_headers).status_code == 403
    assert client.delete(url).status_code == 401
    deleted = client.delete(url, headers=headers)
    assert deleted.status_code == 200
    assert all(u["id"] != user["id"] for u in deleted.json()["users"])
    assert client.get("/api/auth/me", headers=user_headers).status_code == 401
    assert client.delete(url, headers=headers).status_code == 404
    with Session(engine) as db:
        assert db.get(User, user["id"]) is None
        actions = [entry.action for entry in db.scalars(select(AdminAudit))]
        assert any("Manutenção para Administrador" in action for action in actions)
        assert any("Pessoa excluído" in action for action in actions)


def test_deletion_preserves_incidents_and_environment_admin(admin_api, monkeypatch):
    client, headers, _, admin_id = admin_api
    user = next(u for u in create_user(client, headers).json()["users"] if u["id"] != admin_id)
    url = f"/api/admin/users/{user['id']}"
    created = client.post("/api/admin/incidents", headers=headers, json={"machineId": "machine-1", "title": "Inspeção", "assignee": user["id"]}).json()
    incident = created["incidents"][0]
    assert client.delete(url, headers=headers).status_code == 409
    assert client.patch(f"/api/admin/incidents/{incident['id']}", headers=headers, json={"attendance": "Concluída", "status": "Resolvida"}).status_code == 200
    assert client.delete(url, headers=headers).status_code == 409
    assert client.patch(url, headers=headers, json={"active": False}).status_code == 200
    state = client.get("/api/admin/state", headers=headers).json()
    assert state["incidents"][0]["assignee"] == user["id"]
    monkeypatch.setenv("ADMIN_EMAIL", user["email"])
    monkeypatch.setenv("ADMIN_PASSWORD", "strong-password")
    assert client.delete(url, headers=headers).status_code == 409
    assert client.patch(url, headers=headers, json={"role": "operator"}).status_code == 409
    assert client.patch(url, headers=headers, json={"active": False}).status_code == 409
    state = client.get("/api/admin/state", headers=headers).json()
    assert next(u for u in state["users"] if u["id"] == user["id"])["managedByEnv"] is True


def test_machine_incidents_are_authenticated_and_filtered(admin_api):
    client, headers, engine, admin_id = admin_api
    with Session(engine) as db:
        db.add(CNC(id="machine-2", code="CNC-02", name="Outra CNC"))
        db.commit()
    payload = {"machineId": "machine-1", "title": "Falha no spindle", "priority": "Alta", "assignee": admin_id, "note": "Inspecionar sensor"}
    created = client.post("/api/admin/incidents", headers=headers, json=payload)
    assert created.status_code == 201
    incident_id = created.json()["incidents"][0]["id"]
    assert client.patch(f"/api/admin/incidents/{incident_id}", headers=headers, json={"attendance": "Sensor substituído", "status": "Resolvida"}).status_code == 200
    endpoint = "/api/cncs/machine-1/incidents"
    assert client.get(endpoint).status_code == 401
    create_user(client, headers)
    login = client.post("/api/auth/login", json={"email": "person@example.com", "password": "strong-password"})
    reader = {"Authorization": "Bearer " + login.json()["access_token"]}
    response = client.get(endpoint, headers=reader)
    assert response.status_code == 200
    items = response.json()
    assert len(items) == 1
    assert items[0]["machineId"] == "CNC-01"
    assert items[0]["attendance"] == "Sensor substituído"
    assert items[0]["status"] == "Resolvida"
    assert items[0]["assigneeName"] == "Administrador"
    assert items[0]["createdAt"].endswith("+00:00")
    assert "email" not in items[0] and "password" not in items[0]
    assert client.get("/api/cncs/machine-2/incidents", headers=reader).json() == []
    assert client.get("/api/cncs/missing/incidents", headers=reader).status_code == 404
