"""Tests for the ChangeGate FastAPI endpoints."""

import pytest
from fastapi.testclient import TestClient
from app.fixtures import DEMO_PROPOSALS
from app.main import app


@pytest.fixture
def client():
    return TestClient(app)


def test_get_proposals(client):
    """GET /api/proposals returns all 5 demo proposals."""
    res = client.get("/api/proposals")
    assert res.status_code == 200
    data = res.json()
    assert len(data) == 5
    ids = [p["id"] for p in data]
    assert "prop-001" in ids
    assert "prop-005" in ids


def test_evaluate_endpoint_with_id(client):
    """POST /api/evaluate executes proposal and returns GateEvaluationResult."""
    res = client.post("/api/evaluate", json={"proposal_id": "prop-001"})
    assert res.status_code == 200
    data = res.json()
    assert data["decision"]["verdict"] == "apply"
    assert data["traversed_nodes"] == ["inspect", "checks", "evaluate", "apply"]
    assert len(data["trace"]) == 4


def test_evaluate_endpoint_with_all_scenarios(client):
    """Ensure all 5 scenarios evaluate accurately via HTTP API."""
    expected = {
        "prop-001": "apply",
        "prop-002": "apply",
        "prop-003": "review",
        "prop-004": "stop",
        "prop-005": "stop",
    }
    for prop_id, verdict in expected.items():
        res = client.post("/api/evaluate", json={"proposal_id": prop_id})
        assert res.status_code == 200
        assert res.json()["decision"]["verdict"] == verdict


def test_get_runs_endpoint(client):
    """GET /api/runs returns historical evaluation results."""
    client.post("/api/evaluate", json={"proposal_id": "prop-002"})
    res = client.get("/api/runs")
    assert res.status_code == 200
    runs = res.json()
    assert len(runs) >= 1
    assert runs[0]["proposal"]["id"] == "prop-002"


def test_pipeline_schema_endpoint(client):
    """GET /api/pipeline-schema returns expected pipeline nodes and edges."""
    res = client.get("/api/pipeline-schema")
    assert res.status_code == 200
    data = res.json()
    assert "inspect" in data["nodes"]
    assert "evaluate" in data["nodes"]
    assert len(data["edges"]) == 5


def test_health_endpoint(client):
    """GET /api/health returns ok status and ChangeGate identifier."""
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert data["service"] == "ChangeGate"
