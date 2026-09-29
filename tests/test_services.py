import pytest
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock
from app.services.cnc_service import CNCService
from app.services.device_service import DeviceService, DEVICE_ONLINE_TIMEOUT_SECONDS
from app.services.telemetry_service import TelemetryService
from app.models.cnc import CNC
from app.models.device import Device
from app.models.telemetry import Telemetry


class TestCNCService:
    """Test CNC service operations."""
    
    @patch("app.services.cnc_service.get_collection")
    def test_create_cnc(self, mock_get_collection):
        """Test creating a new CNC."""
        mock_collection = MagicMock()
        mock_get_collection.return_value = mock_collection
        mock_collection.find.return_value.sort.return_value.limit.return_value = []
        
        cnc = CNCService.create_cnc("Machine A", "Description A")
        
        assert cnc.name == "Machine A"
        assert cnc.description == "Description A"
        assert cnc.code == "CNC01"
        assert cnc.status == "UNKNOWN"
        assert cnc._id is not None
        
        # Verify insert was called
        mock_collection.insert_one.assert_called_once()
    
    @patch("app.services.cnc_service.get_collection")
    def test_cnc_code_generation_sequence(self, mock_get_collection):
        """Test automatic code generation CNC01, CNC02, etc."""
        mock_collection = MagicMock()
        mock_get_collection.return_value = mock_collection
        
        # First CNC
        mock_collection.find.return_value.sort.return_value.limit.return_value = []
        cnc1 = CNCService.create_cnc("Machine 1")
        assert cnc1.code == "CNC01"
        
        # Second CNC
        mock_collection.find.return_value.sort.return_value.limit.return_value = [
            {"code": "CNC01"}
        ]
        cnc2 = CNCService.create_cnc("Machine 2")
        assert cnc2.code == "CNC02"
        
        # Third CNC
        mock_collection.find.return_value.sort.return_value.limit.return_value = [
            {"code": "CNC02"}
        ]
        cnc3 = CNCService.create_cnc("Machine 3")
        assert cnc3.code == "CNC03"
    
    @patch("app.services.cnc_service.get_collection")
    def test_get_cnc(self, mock_get_collection):
        """Test retrieving a CNC."""
        mock_collection = MagicMock()
        mock_get_collection.return_value = mock_collection
        
        cnc_data = {
            "_id": "test-id",
            "code": "CNC01",
            "name": "Machine A",
            "description": "Test",
            "status": "ACTIVE",
            "status_since": datetime.utcnow(),
            "last_seen": datetime.utcnow(),
            "created_at": datetime.utcnow()
        }
        mock_collection.find_one.return_value = cnc_data
        
        cnc = CNCService.get_cnc("test-id")
        
        assert cnc is not None
        assert cnc.code == "CNC01"
        assert cnc.name == "Machine A"
    
    @patch("app.services.cnc_service.get_collection")
    def test_delete_cnc(self, mock_get_collection):
        """Test deleting a CNC."""
        mock_collection = MagicMock()
        mock_get_collection.return_value = mock_collection
        
        mock_result = MagicMock()
        mock_result.deleted_count = 1
        mock_collection.delete_one.return_value = mock_result
        
        result = CNCService.delete_cnc("test-id")
        
        assert result is True
        mock_collection.delete_one.assert_called_once_with({"_id": "test-id"})


class TestDeviceService:
    """Test Device service operations."""
    
    @patch("app.services.device_service.get_collection")
    def test_register_new_device(self, mock_get_collection):
        """Test registering a new device."""
        mock_collection = MagicMock()
        mock_get_collection.return_value = mock_collection
        
        # No existing device
        mock_collection.find_one.return_value = None
        
        # First device
        mock_collection.find.return_value.sort.return_value.limit.return_value = []
        
        device, is_new = DeviceService.register_device(
            mac_address="A4:CF:12:8B:34:91",
            ip_address="192.168.1.37",
            name="Gateway ESP32",
            firmware_version="1.0.0"
        )
        
        assert is_new is True
        assert device.code == "DVC01"
        assert device.mac_address == "A4:CF:12:8B:34:91"
        assert device.online is True
        
        # Verify insert was called
        mock_collection.insert_one.assert_called_once()
    
    @patch("app.services.device_service.get_collection")
    def test_register_existing_device_updates(self, mock_get_collection):
        """Test that registering with existing MAC updates the device."""
        mock_collection = MagicMock()
        mock_get_collection.return_value = mock_collection
        
        existing_device = {
            "_id": "device-1",
            "code": "DVC01",
            "mac_address": "A4:CF:12:8B:34:91",
            "name": "Gateway ESP32",
            "ip_address": "192.168.1.36",
            "firmware_version": "0.9.0",
            "cnc_id": None,
            "last_seen": datetime.utcnow() - timedelta(seconds=10),
            "online": False,
            "created_at": datetime.utcnow()
        }
        mock_collection.find_one.return_value = existing_device
        
        device, is_new = DeviceService.register_device(
            mac_address="A4:CF:12:8B:34:91",
            ip_address="192.168.1.37",
            firmware_version="1.0.0"
        )
        
        assert is_new is False
        assert device.code == "DVC01"
        assert device.ip_address == "192.168.1.37"
        assert device.firmware_version == "1.0.0"
        assert device.online is True
        
        # Verify update was called
        mock_collection.find_one_and_update.assert_called_once()
    
    @patch("app.services.device_service.get_collection")
    def test_device_code_generation_sequence(self, mock_get_collection):
        """Test automatic code generation DVC01, DVC02, etc."""
        mock_collection = MagicMock()
        mock_get_collection.return_value = mock_collection
        
        # First device
        mock_collection.find.return_value.sort.return_value.limit.return_value = []
        mock_collection.find_one.return_value = None
        
        device1, _ = DeviceService.register_device("AA:BB:CC:DD:EE:01", "192.168.1.1")
        assert device1.code == "DVC01"
        
        # Second device
        mock_collection.find.return_value.sort.return_value.limit.return_value = [
            {"code": "DVC01"}
        ]
        mock_collection.find_one.return_value = None
        
        device2, _ = DeviceService.register_device("AA:BB:CC:DD:EE:02", "192.168.1.2")
        assert device2.code == "DVC02"
    
    @patch("app.services.device_service.get_collection")
    def test_device_online_status_calculation(self, mock_get_collection):
        """Test online/offline status based on last_seen."""
        mock_collection = MagicMock()
        mock_get_collection.return_value = mock_collection
        
        # Device seen 2 seconds ago (online)
        device_data = {
            "_id": "device-1",
            "code": "DVC01",
            "mac_address": "AA:BB:CC:DD:EE:01",
            "name": "Gateway",
            "ip_address": "192.168.1.1",
            "firmware_version": "1.0.0",
            "cnc_id": None,
            "last_seen": datetime.utcnow() - timedelta(seconds=2),
            "online": True,
            "created_at": datetime.utcnow()
        }
        mock_collection.find_one.return_value = device_data
        
        status_info = DeviceService.get_device_status("device-1")
        
        assert status_info is not None
        assert status_info["online"] is True
    
    @patch("app.services.device_service.get_collection")
    def test_device_offline_status_calculation(self, mock_get_collection):
        """Test device goes offline after timeout."""
        mock_collection = MagicMock()
        mock_get_collection.return_value = mock_collection
        
        # Device seen 10 seconds ago (offline - beyond 5 second timeout)
        device_data = {
            "_id": "device-1",
            "code": "DVC01",
            "mac_address": "AA:BB:CC:DD:EE:01",
            "name": "Gateway",
            "ip_address": "192.168.1.1",
            "firmware_version": "1.0.0",
            "cnc_id": None,
            "last_seen": datetime.utcnow() - timedelta(seconds=10),
            "online": True,
            "created_at": datetime.utcnow()
        }
        mock_collection.find_one.return_value = device_data
        
        status_info = DeviceService.get_device_status("device-1")
        
        assert status_info is not None
        assert status_info["online"] is False


class TestTelemetryService:
    """Test Telemetry service operations."""
    
    @patch("app.services.telemetry_service.get_collection")
    @patch("app.services.telemetry_service.DeviceService.get_device")
    @patch("app.services.telemetry_service.DeviceService.update_last_seen")
    @patch("app.services.telemetry_service.CNCService._update_cnc_status")
    def test_create_telemetry_active_machine(self, mock_update_cnc, mock_update_device,
                                              mock_get_device, mock_get_collection):
        """Test creating telemetry with machine active."""
        mock_collection = MagicMock()
        mock_get_collection.return_value = mock_collection
        
        mock_device = MagicMock()
        mock_device._id = "device-1"
        mock_device.cnc_id = "cnc-1"
        mock_get_device.return_value = mock_device
        
        telemetry = TelemetryService.create_telemetry(
            device_id="device-1",
            timestamp=datetime.utcnow(),
            machine_active=True,
            voltage_24v=True,
            digital_signals={"D01": True, "D02": False},
            analog_signals={"A01": 3.42},
            extra_signals={"cycle": True, "alarm": False}
        )
        
        assert telemetry is not None
        assert telemetry.machine_active is True
        assert telemetry.device_id == "device-1"
        
        # Verify CNC status was updated to ACTIVE
        mock_update_cnc.assert_called_once_with("cnc-1", "ACTIVE")
    
    @patch("app.services.telemetry_service.get_collection")
    @patch("app.services.telemetry_service.DeviceService.get_device")
    @patch("app.services.telemetry_service.DeviceService.update_last_seen")
    @patch("app.services.telemetry_service.CNCService._update_cnc_status")
    def test_create_telemetry_inactive_machine(self, mock_update_cnc, mock_update_device,
                                               mock_get_device, mock_get_collection):
        """Test creating telemetry with machine inactive."""
        mock_collection = MagicMock()
        mock_get_collection.return_value = mock_collection
        
        mock_device = MagicMock()
        mock_device._id = "device-1"
        mock_device.cnc_id = "cnc-1"
        mock_get_device.return_value = mock_device
        
        telemetry = TelemetryService.create_telemetry(
            device_id="device-1",
            timestamp=datetime.utcnow(),
            machine_active=False,
            voltage_24v=True,
            digital_signals={},
            analog_signals={},
            extra_signals={}
        )
        
        assert telemetry is not None
        assert telemetry.machine_active is False
        
        # Verify CNC status was updated to INACTIVE
        mock_update_cnc.assert_called_once_with("cnc-1", "INACTIVE")


class TestIntegration:
    """Integration tests for the complete flow."""
    
    @patch("app.services.device_service.get_collection")
    def test_device_registration_and_cnc_association(self, mock_get_collection):
        """Test registering device and associating with CNC."""
        mock_collection = MagicMock()
        mock_get_collection.return_value = mock_collection
        
        # Register device
        mock_collection.find_one.return_value = None
        mock_collection.find.return_value.sort.return_value.limit.return_value = []
        
        device, is_new = DeviceService.register_device(
            mac_address="A4:CF:12:8B:34:91",
            ip_address="192.168.1.37",
            name="Gateway ESP32",
            firmware_version="1.0.0"
        )
        
        assert is_new is True
        assert device.code == "DVC01"
        assert device.cnc_id is None  # Not associated yet
        
        # Associate with CNC
        mock_collection.find_one_and_update.return_value = device.to_dict()
        updated_device = DeviceService.update_device(device._id, cnc_id="cnc-1")
        
        # Verify association was set
        mock_collection.find_one_and_update.assert_called()
