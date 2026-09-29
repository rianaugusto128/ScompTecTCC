import pytest
from datetime import datetime, timedelta
from mongomock import MongoClient as MockMongoClient
import sys
import os

# Add the app directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


# Mock MongoDB for testing
@pytest.fixture(scope="function")
def mock_db():
    """Create a mock MongoDB for testing."""
    client = MockMongoClient()
    db = client["test_cnc_monitor"]
    
    # Create indexes
    db.cncs.create_index("code", unique=True)
    db.devices.create_index("mac_address", unique=True)
    db.telemetry.create_index("device_id")
    db.telemetry.create_index("timestamp")
    
    yield db
    
    # Cleanup
    client.drop_database("test_cnc_monitor")


@pytest.fixture
def test_client():
    """Create a test client for the FastAPI app."""
    from fastapi.testclient import TestClient
    from app.main import app
    
    client = TestClient(app)
    return client
