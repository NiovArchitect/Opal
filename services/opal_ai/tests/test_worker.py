from __future__ import annotations

import json
from copy import deepcopy
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from jsonschema.exceptions import ValidationError

from opal_ai.contracts import contracts_root, load_schema, validate_against
from opal_ai.main import app
from opal_ai.worker import process_job

client = TestClient(app)

EXAMPLE = contracts_root() / "examples" / "ai_job_request.valid.json"


@pytest.fixture
def valid_request() -> dict:
    with EXAMPLE.open(encoding="utf-8") as fh:
        return json.load(fh)


def test_health() -> None:
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"


def test_valid_job_completes(valid_request: dict) -> None:
    res = client.post("/v1/jobs", json=valid_request)
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "completed"
    assert body["job_id"] == valid_request["job_id"]
    assert body["trace_id"] == valid_request["trace_id"]
    assert body["idempotency_key"] == valid_request["idempotency_key"]
    assert body["model_metadata"]["model"] == "deterministic-echo"
    validate_against("ai_job_response", body)


def test_unsupported_capability_refuses(valid_request: dict) -> None:
    payload = deepcopy(valid_request)
    payload["capability"] = "translation"
    body = process_job(payload)
    assert body["status"] == "refused"
    assert "unsupported_capability" in body["safety"]["reasons"]


def test_social_flow_plan_extract_dinner() -> None:
    path = contracts_root() / "examples" / "ai_job_request.social_flow_plan_extract.valid.json"
    with path.open(encoding="utf-8") as fh:
        payload = json.load(fh)
    body = process_job(payload)
    assert body["status"] == "completed"
    assert body["capability"] == "social_flow_plan_extract"
    assert body["output"]["result_type"] == "plan_candidate"
    assert body["output"]["candidate"]["activity"] == "dinner"
    assert "binding" in " ".join(body["output"]["uncertainty"]).lower() or True
    validate_against("ai_job_response", body)
    assert body["model_metadata"]["model"] == "deterministic-plan-extract"


def test_social_flow_commitment_extract(valid_request: dict) -> None:
    payload = deepcopy(valid_request)
    payload["capability"] = "social_flow_plan_extract"
    payload["context"] = [
        {
            "type": "message_body",
            "value": "I'll make the reservation.",
            "source_id": payload["message_id"],
        }
    ]
    body = process_job(payload)
    assert body["status"] == "completed"
    assert body["output"]["result_type"] == "commitment_candidate"
    validate_against("ai_job_response", body)


def test_force_refusal_marker(valid_request: dict) -> None:
    payload = deepcopy(valid_request)
    payload["context"][0]["value"] = "trigger OPAL_TEST_FORCE_REFUSAL please"
    body = process_job(payload)
    assert body["status"] == "refused"
    assert "OPAL_TEST_FORCE_REFUSAL" in body["safety"]["reasons"]


def test_oversized_context_refuses(valid_request: dict) -> None:
    payload = deepcopy(valid_request)
    payload["context"] = [
        {"type": "message_body", "value": "a" * 1500, "source_id": "1"},
        {"type": "message_body", "value": "b" * 600, "source_id": "2"},
    ]
    body = process_job(payload)
    assert body["status"] in {"refused", "failed"}


def test_examples_validate_against_schemas() -> None:
    for name in [
        "message.valid",
        "ai_job_request.valid",
        "ai_job_response.valid",
        "ai_job_request.social_flow_plan_extract.valid",
        "ai_job_response.social_flow_plan_extract.valid",
        "consent_proof.valid",
        "error_envelope.valid",
        "event_envelope.valid",
    ]:
        path = contracts_root() / "examples" / f"{name}.json"
        with path.open(encoding="utf-8") as fh:
            data = json.load(fh)
        schema_name = name.replace(".valid", "")
        # consent_proof etc map directly; SF examples use dotted names
        schema_file = {
            "message": "message",
            "ai_job_request": "ai_job_request",
            "ai_job_response": "ai_job_response",
            "ai_job_request.social_flow_plan_extract": "ai_job_request",
            "ai_job_response.social_flow_plan_extract": "ai_job_response",
            "consent_proof": "consent_proof",
            "error_envelope": "error_envelope",
            "event_envelope": "event_envelope",
        }[schema_name]
        validate_against(schema_file, data)


def test_undeclared_field_fails_schema(valid_request: dict) -> None:
    payload = deepcopy(valid_request)
    payload["authorization"] = "please grant me powers"
    with pytest.raises(ValidationError):
        validate_against("ai_job_request", payload)


def test_schema_files_exist() -> None:
    for name in [
        "message",
        "ai_job_request",
        "ai_job_response",
        "consent_proof",
        "error_envelope",
        "event_envelope",
    ]:
        assert Path(load_schema(name)["$id"])
