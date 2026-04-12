"""Minimal smoke tests for critical endpoints."""
import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_health():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_login():
    response = client.post("/api/auth/login", json={"email": "admin@demo.co.jp", "password": "admin123"})
    assert response.status_code == 200
    assert "access_token" in response.json()


def test_projects_requires_auth():
    response = client.get("/api/projects")
    assert response.status_code in (401, 403)


def test_login_wrong_password():
    response = client.post("/api/auth/login", json={"email": "admin@demo.co.jp", "password": "wrong"})
    assert response.status_code in (400, 401)
