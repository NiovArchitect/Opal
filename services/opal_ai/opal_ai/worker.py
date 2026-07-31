"""Deterministic ai_echo worker — no external providers, no persistence."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from opal_ai.contracts import FORBIDDEN_MARKER, defense_in_depth_request, validate_against
from opal_ai.models import AiJobRequest, AiJobResponse, EchoOutput, ModelMetadata, Safety


def process_job(payload: dict[str, Any]) -> dict[str, Any]:
    # Schema validation first
    try:
        validate_against("ai_job_request", payload)
    except Exception as exc:  # noqa: BLE001 — surface as refused/failed envelope
        return _failed_from_raw(payload, f"schema_invalid:{exc}")

    request = AiJobRequest.model_validate(payload)
    reasons = defense_in_depth_request(payload)
    if reasons:
        return _refused(request, reasons).to_public_dict()

    if request.capability != "ai_echo":
        return _refused(request, ["unsupported_capability"]).to_public_dict()

    text = " ".join(item.value for item in request.context).strip()
    if FORBIDDEN_MARKER in text:
        return _refused(request, [FORBIDDEN_MARKER]).to_public_dict()

    output = EchoOutput(
        normalized_text=text,
        character_count=len(text),
        context_item_count=len(request.context),
    )
    response = AiJobResponse(
        job_id=request.job_id,
        idempotency_key=request.idempotency_key,
        capability=request.capability,
        status="completed",
        output=output,
        model_metadata=ModelMetadata(),
        safety=Safety(decision="allowed", reasons=[]),
        completed_at=datetime.now(timezone.utc),
        trace_id=request.trace_id,
    )
    out = response.to_public_dict()
    validate_against("ai_job_response", out)
    return out


def _refused(request: AiJobRequest, reasons: list[str]) -> AiJobResponse:
    return AiJobResponse(
        job_id=request.job_id,
        idempotency_key=request.idempotency_key,
        capability=request.capability,
        status="refused",
        output=None,
        model_metadata=ModelMetadata(),
        safety=Safety(decision="refused", reasons=reasons),
        completed_at=datetime.now(timezone.utc),
        trace_id=request.trace_id,
    )


def _failed_from_raw(payload: dict[str, Any], reason: str) -> dict[str, Any]:
    job_id = payload.get("job_id") or "00000000-0000-4000-8000-000000000000"
    try:
        UUID(str(job_id))
    except Exception:  # noqa: BLE001
        job_id = "00000000-0000-4000-8000-000000000000"

    return {
        "schema_version": "0.1.0",
        "job_id": str(job_id),
        "idempotency_key": str(payload.get("idempotency_key") or "invalid-key-xx"),
        "capability": str(payload.get("capability") or "ai_echo"),
        "status": "failed",
        "output": None,
        "model_metadata": {
            "provider": "local",
            "model": "deterministic-echo",
            "model_version": "0.1.0",
        },
        "safety": {"decision": "refused", "reasons": [reason[:256]]},
        "completed_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "trace_id": str(payload.get("trace_id") or "trace-invalid-0001"),
    }
