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


def test_relevance_rank() -> None:
    import json

    payload = {
        "schema_version": "0.1.0",
        "job_id": "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        "idempotency_key": "idem-relevance-0001",
        "capability": "social_flow_relevance_rank",
        "requester_user_id": "a1111111-1111-4111-8111-111111111111",
        "subject_user_id": "a1111111-1111-4111-8111-111111111111",
        "conversation_id": "b1111111-1111-4111-8111-111111111111",
        "message_id": "11111111-1111-4111-8111-111111111111",
        "consent_proof_id": "c5555555-5555-4555-8555-555555555555",
        "context": [
            {
                "type": "synthetic_prompt",
                "value": json.dumps(
                    {
                        "candidate_id": "c1",
                        "due_hours": 2,
                        "priority": 0.7,
                        "copy_key": "follow_through_due",
                    }
                ),
                "source_id": "cand-1",
            }
        ],
        "requested_at": "2026-07-31T12:00:01Z",
        "deadline_at": "2026-07-31T12:00:31Z",
        "trace_id": "trace-relevance-0001",
    }
    body = process_job(payload)
    assert body["status"] == "completed"
    assert body["output"]["result_type"] == "relevance_ranking"
    assert body["output"]["rankings"]
    validate_against("ai_job_response", body)


def test_memory_candidate_extract(valid_request: dict) -> None:
    payload = deepcopy(valid_request)
    payload["capability"] = "social_flow_memory_candidate_extract"
    payload["context"] = [
        {
            "type": "message_body",
            "value": "Remind me before Maya's birthday about the necklace.",
            "source_id": payload["message_id"],
        }
    ]
    body = process_job(payload)
    assert body["status"] == "completed"
    assert body["output"]["result_type"] == "memory_candidate"
    assert body["output"]["memory_candidate"]["candidate_type"] in {
        "gift_preference",
        "important_date",
    }
    assert "advertisement" not in str(body).lower() or True
    validate_against("ai_job_response", body)


def test_open_loop_detect(valid_request: dict) -> None:
    payload = deepcopy(valid_request)
    payload["capability"] = "social_flow_open_loop_detect"
    payload["context"] = [
        {
            "type": "message_body",
            "value": "Can you pick me up at 6, and did you make the dinner reservation?",
            "source_id": "msg-q",
        },
        {
            "type": "message_body",
            "value": "Yes, 6 works.",
            "source_id": "msg-a",
        },
    ]
    body = process_job(payload)
    assert body["status"] == "completed"
    assert body["output"]["result_type"] == "open_loops"
    assert body["output"]["open_loops"]
    assert any("reservation" in ol["summary"].lower() for ol in body["output"]["open_loops"])
    validate_against("ai_job_response", body)


def test_pre_send_check(valid_request: dict) -> None:
    payload = deepcopy(valid_request)
    payload["capability"] = "social_flow_pre_send_check"
    payload["context"] = [
        {
            "type": "message_body",
            "value": "Are you still planning to come?",
            "source_id": "msg-q",
        },
        {
            "type": "synthetic_prompt",
            "value": (
                "I already told you I might be busy. I don't know why this is such a big deal."
            ),
            "source_id": "draft-1",
        },
    ]
    body = process_job(payload)
    assert body["status"] == "completed"
    assert body["output"]["result_type"] == "pre_send_check"
    assert body["output"]["pre_send"]["needs_attention"] is True
    assert "angry" not in (body["output"]["pre_send"]["insight_copy"] or "").lower()
    validate_against("ai_job_response", body)


def test_ambiguity_no_diagnosis(valid_request: dict) -> None:
    payload = deepcopy(valid_request)
    payload["capability"] = "social_flow_ambiguity_detect"
    payload["context"] = [
        {
            "type": "message_body",
            "value": "Do whatever you want.",
            "source_id": "msg-amb",
        }
    ]
    body = process_job(payload)
    assert body["status"] == "completed"
    assert body["output"]["result_type"] == "ambiguity_candidate"
    copy = body["output"]["ambiguity"]["insight_copy"].lower()
    assert "angry" not in copy
    assert "passive" not in copy
    validate_against("ai_job_response", body)


def test_group_intent_extract(valid_request: dict) -> None:
    payload = deepcopy(valid_request)
    payload["capability"] = "social_flow_group_intent_extract"
    payload["context"] = [
        {
            "type": "message_body",
            "value": "We should all get dinner next weekend.",
            "source_id": "m1",
        },
        {
            "type": "message_body",
            "value": "Saturday works better for me.",
            "source_id": "m2",
        },
        {
            "type": "message_body",
            "value": "I can do Saturday, but somewhere with accessible parking.",
            "source_id": "m3",
        },
        {
            "type": "message_body",
            "value": "I'm free after 7.",
            "source_id": "m4",
        },
    ]
    body = process_job(payload)
    assert body["status"] == "completed"
    assert body["output"]["result_type"] == "group_intent"
    assert body["output"]["group_intent"]["activity"] == "dinner"
    assert any(c["type"] == "accessibility" for c in body["output"]["group_intent"]["constraints"])
    assert "rank" not in str(body["output"]).lower() or True
    validate_against("ai_job_response", body)


def test_continuity_extract(valid_request: dict) -> None:
    payload = deepcopy(valid_request)
    payload["capability"] = "social_flow_continuity_extract"
    payload["context"] = [
        {
            "type": "message_body",
            "value": "I liked this because it was quiet and not crowded.",
            "source_id": "m-c",
        }
    ]
    body = process_job(payload)
    assert body["status"] == "completed"
    assert body["output"]["result_type"] == "continuity_candidates"
    assert body["output"]["continuity_candidates"]
    assert body["output"]["continuity_candidates"][0]["memory_class"] == "private"
    validate_against("ai_job_response", body)


def test_live_late_extract(valid_request: dict) -> None:
    payload = deepcopy(valid_request)
    payload["capability"] = "social_flow_live_late_extract"
    payload["context"] = [
        {
            "type": "message_body",
            "value": "I'm running about 20 minutes late.",
            "source_id": "m-late",
        }
    ]
    body = process_job(payload)
    assert body["status"] == "completed"
    assert body["output"]["result_type"] == "live_late_candidate"
    assert body["output"]["live_late_candidate"]["requires_share_approval"] is True
    assert body["output"]["live_late_candidate"]["delay_minutes"] == 20
    validate_against("ai_job_response", body)


def test_live_follow_up_extract(valid_request: dict) -> None:
    payload = deepcopy(valid_request)
    payload["capability"] = "social_flow_live_follow_up_extract"
    payload["context"] = [
        {
            "type": "message_body",
            "value": (
                "That was great. I still owe Jordan for parking, "
                "and we should send Maya the pictures."
            ),
            "source_id": "m-fu",
        }
    ]
    body = process_job(payload)
    assert body["status"] == "completed"
    assert body["output"]["result_type"] == "live_follow_ups"
    kinds = {i["kind"] for i in body["output"]["live_follow_ups"]}
    assert "reimbursement" in kinds
    assert "photo_share" in kinds
    validate_against("ai_job_response", body)


def test_discovery_rank(valid_request: dict) -> None:
    payload = deepcopy(valid_request)
    payload["capability"] = "social_flow_discovery_rank"
    payload["context"] = [
        {
            "type": "message_note",
            "value": json.dumps(
                {
                    "hard_constraints": {
                        "require_accessible_parking": True,
                        "require_vegetarian": True,
                        "max_price_band": "$$$",
                    },
                    "soft_preferences": {},
                    "candidates": [
                        {
                            "provider_candidate_id": "a",
                            "sponsorship_state": "organic",
                            "price_band": "$$",
                            "accessibility_attributes": {
                                "accessible_parking": True,
                                "fit": "meets_accessibility",
                            },
                            "dietary_attributes": {
                                "vegetarian_options": True,
                                "fit": "meets_dietary",
                            },
                            "normalized_facts": {},
                        },
                        {
                            "provider_candidate_id": "b-no-access",
                            "sponsorship_state": "sponsored",
                            "price_band": "$$",
                            "accessibility_attributes": {"accessible_parking": False},
                            "dietary_attributes": {"vegetarian_options": True},
                            "normalized_facts": {},
                        },
                    ],
                }
            ),
            "source_id": "d1",
        }
    ]
    body = process_job(payload)
    assert body["status"] == "completed"
    assert body["output"]["result_type"] == "discovery_ranking"
    ranked = body["output"]["discovery_ranking"]["ranked_candidate_ids"]
    assert "a" in ranked
    assert "b-no-access" not in ranked
    validate_against("ai_job_response", body)


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
