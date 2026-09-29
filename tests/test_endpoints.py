import pytest
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from app.main import app


@pytest.fixture
def client():
    """Create FastAPI test client."""
    return TestClient(app)


class TestCNCEndpoints:
    """Test CNC API endpoints."""
    
    @patch("app.routers.cnc.CNCService.create_cnc")
    def test_create_cnc_endpoint(self, mock_create, client):
        """Test POST /cncs endpoint."""
        mock_cnc = MagicMock()
        mock_cnc._id = "cnc-1"
        mock_cnc.code = "CNC01"
        mock_cnc.name = "Machine A"
        mock_cnc.description = "Test Machine"
        mock_cnc.status = "UNKNOWN"
        mock_cnc.status_since = datetime.utcnow()
        mock_cnc.last_seen = None
        mock_cnc.created_at = datetime.utcnow()
        mock_create.return_value = mock_cnc
        
        response = client.post("/cncs", json={
            "name": "Machine A",
            "description": "Test Machine"
        })
        
        assert response.status_code == 201
        data = response.json()
        assert data["code"] == "CNC01"
        assert data["name"] == "Machine A"
    
    @patch("app.routers.cnc.CNCService.get_all_cncs")
    def test_get_all_cncs_endpoint(self, mock_get_all, client):
        """Test GET /cncs endpoint."""
        mock_cnc = MagicMock()
        mock_cnc._id = "cnc-1"
        mock_cnc.code = "CNC01"
        mock_cnc.name = "Machine A"
        mock_cnc.description = "Test"
        mock_cnc.status = "ACTIVE"
        mock_cnc.status_since = datetime.utcnow()
        mock_cnc.last_seen = datetime.utcnow()
        mock_cnc.created_at = datetime.utcnow()
        mock_get_all.return_value = [mock_cnc]
        
        response = client.get("/cncs")
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["code"] == "CNC01"
    
    @patch("app.routers.cnc.CNCService.get_cnc")
    def test_get_cnc_endpoint(self, mock_get, client):
        """Test GET /cncs/{cnc_id} endpoint."""
        mock_cnc = MagicMock()
        mock_cnc._id = "cnc-1"
        mock_cnc.code = "CNC01"
        mock_cnc.name = "Machine A"
        mock_cnc.description = "Test"
        mock_cnc.status = "ACTIVE"
        mock_cnc.status_since = datetime.utcnow()
        mock_cnc.last_seen = datetime.utcnow()
        mock_cnc.created_at = datetime.utcnow()
        mock_get.return_value = mock_cnc
        
        response = client.get("/cncs/cnc-1")
        
        assert response.status_code == 200
        data = response.json()
        assert data["code"] == "CNC01"
    
    @patch("app.routers.cnc.CNCService.get_cnc")
    def test_get_cnc_not_found(self, mock_get, client):
        """Test GET /cncs/{cnc_id} with non-existent ID."""
        mock_get.return_value = None
        
        response = client.get("/cncs/non-existent")
        
        assert response.status_code == 404


class TestDeviceEndpoints:
    """Test Device API endpoints."""
    
    @patch("app.routers.devices.DeviceService.register_device")
    def test_register_device_endpoint(self, mock_register, client):
        """Test POST /devices/register endpoint."""
        mock_device = MagicMock()
        mock_device._id = "device-1"
        mock_device.code = "DVC01"
        mock_device.mac_address = "A4:CF:12:8B:34:91"
        mock_device.name = "Gateway ESP32"
        mock_device.ip_address = "192.168.1.37"
        mock_device.firmware_version = "1.0.0"
        mock_device.cnc_id = None
        mock_device.last_seen = datetime.utcnow()
        mock_device.online = True
        mock_device.created_at = datetime.utcnow()
        mock_register.return_value = (mock_device, True)
        
        response = client.post("/devices/register", json={
            "mac_address": "A4:CF:12:8B:34:91",
            "ip_address": "192.168.1.37",
            "name": "Gateway ESP32",
            "firmware_version": "1.0.0"
        })
        
        assert response.status_code == 201
        data = response.json()
        assert data["code"] == "DVC01"
        assert data["mac_address"] == "A4:CF:12:8B:34:91"
    
    @patch("app.routers.devices.DeviceService.get_all_devices")
    def test_get_all_devices_endpoint(self, mock_get_all, client):
        """Test GET /devices endpoint."""
        mock_device = MagicMock()
        mock_device._id = "device-1"
        mock_device.code = "DVC01"
        mock_device.mac_address = "A4:CF:12:8B:34:91"
        mock_device.name = "Gateway"
        mock_device.ip_address = "192.168.1.37"
        mock_device.firmware_version = "1.0.0"
        mock_device.cnc_id = None
        mock_device.last_seen = datetime.utcnow()
        mock_device.online = True
        mock_device.created_at = datetime.utcnow()
        mock_get_all.return_value = [mock_device]
        
        response = client.get("/devices")
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["code"] == "DVC01"
    
    @patch("app.routers.devices.DeviceService.get_device_status")
    def test_get_device_status_endpoint(self, mock_status, client):
        """Test GET /devices/{device_id}/status endpoint."""
        mock_status.return_value = {
            "id": "device-1",
            "code": "DVC01",
            "mac_address": "A4:CF:12:8B:34:91",
            "name": "Gateway",
            "online": True,
            "last_seen": datetime.utcnow(),
            "cnc_id": None
        }
        
        response = client.get("/devices/device-1/status")
        
        assert response.status_code == 200
        data = response.json()
        assert data["code"] == "DVC01"
        assert data["online"] is True


class TestTelemetryEndpoints:
    """Test Telemetry API endpoints."""
    
    @patch("app.routers.telemetry.DeviceService.get_device")
    @patch("app.routers.telemetry.TelemetryService.create_telemetry")
    def test_create_telemetry_endpoint(self, mock_create, mock_get_device, client):
        """Test POST /devices/{device_id}/telemetry endpoint."""
        mock_device = MagicMock()
        mock_device._id = "device-1"
        mock_get_device.return_value = mock_device
        
        mock_telemetry = MagicMock()
        mock_telemetry._id = "telemetry-1"
        mock_telemetry.device_id = "device-1"
        mock_telemetry.timestamp = datetime.utcnow()
        mock_telemetry.machine_active = True
        mock_telemetry.voltage_24v = True
        mock_telemetry.digital_signals = {"D01": True}
        mock_telemetry.analog_signals = {"A01": 3.42}
        mock_telemetry.extra_signals = {"cycle": True}
        mock_telemetry.received_at = datetime.utcnow()
        mock_create.return_value = mock_telemetry
        
        response = client.post("/devices/device-1/telemetry", json={
            "timestamp": datetime.utcnow().isoformat(),
            "machine_active": True,
            "voltage_24v": True,
            "digital_signals": {"D01": True},
            "analog_signals": {"A01": 3.42},
            "extra_signals": {"cycle": True}
        })
        
        assert response.status_code == 201
        data = response.json()
        assert data["machine_active"] is True
    
    @patch("app.routers.telemetry.DeviceService.get_device")
    def test_telemetry_endpoint_device_not_found(self, mock_get_device, client):
        """Test POST /devices/{device_id}/telemetry with non-existent device."""
        mock_get_device.return_value = None
        
        response = client.post("/devices/non-existent/telemetry", json={
            "timestamp": datetime.utcnow().isoformat(),
            "machine_active": True,
            "voltage_24v": True
        })
        
        assert response.status_code == 404


class TestHealthCheck:
    """Test health check endpoint."""
    
    def test_health_check(self, client):
        """Test /health endpoint."""
        response = client.get("/health")
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
