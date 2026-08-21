from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


def test_root():
    response = client.get("/")
    assert response.status_code == 200


def test_health():
    response = client.get("/health")
    assert response.status_code == 200


def test_recovery_summary():
    response = client.get("/api/recovery/summary")
    assert response.status_code == 200


def test_recovery_recommendations():
    response = client.get("/api/recovery/recommendations")
    assert response.status_code == 200