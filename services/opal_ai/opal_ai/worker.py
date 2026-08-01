"""Deterministic AI workers — no external providers, no persistence."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from opal_ai.continuity_extract import extract_continuity
from opal_ai.contracts import FORBIDDEN_MARKER, defense_in_depth_request, validate_against
from opal_ai.conversation_meaning import analyze as analyze_meaning
from opal_ai.discovery_rank import rank_discovery_candidates
from opal_ai.family_plan import extract_family_plan
from opal_ai.group_intent import availability_intersect, extract_group_intent
from opal_ai.invite_copy import propose_invite_copy
from opal_ai.live_experience import extract_follow_ups, extract_late_notice
from opal_ai.memory_extract import extract_memory_candidate
from opal_ai.models import AiJobRequest, AiJobResponse, EchoOutput, ModelMetadata, Safety
from opal_ai.plan_extract import extract_plan_candidate
from opal_ai.relevance import rank_candidates
from opal_ai.safety_triage import triage_safety_report
from opal_ai.shell_rank import propose_shell_rank

_MEANING_CAPS = frozenset(
    {
        "social_flow_turn_classify",
        "social_flow_open_loop_detect",
        "social_flow_pre_send_check",
        "social_flow_ambiguity_detect",
        "social_flow_repair_suggest",
        "social_flow_decision_summary",
    }
)


def process_job(payload: dict[str, Any]) -> dict[str, Any]:
    try:
        validate_against("ai_job_request", payload)
    except Exception as exc:  # noqa: BLE001 — surface as refused/failed envelope
        return _failed_from_raw(payload, f"schema_invalid:{exc}")

    request = AiJobRequest.model_validate(payload)
    reasons = defense_in_depth_request(payload)
    if reasons:
        return _refused(request, reasons).to_public_dict()

    if request.capability == "ai_echo":
        return _process_echo(request)

    if request.capability == "social_flow_plan_extract":
        return _process_structured(
            request,
            "social_flow_plan_extract",
            "deterministic-plan-extract",
            extract_plan_candidate,
        )

    if request.capability == "social_flow_follow_through_extract":
        # Reuse plan extract patterns for commitment/follow-through language
        return _process_structured(
            request,
            "social_flow_follow_through_extract",
            "deterministic-plan-extract",
            extract_plan_candidate,
        )

    if request.capability == "social_flow_memory_candidate_extract":
        return _process_structured(
            request,
            "social_flow_memory_candidate_extract",
            "deterministic-memory-extract",
            extract_memory_candidate,
        )

    if request.capability == "social_flow_relevance_rank":
        return _process_structured(
            request,
            "social_flow_relevance_rank",
            "deterministic-relevance",
            rank_candidates,
        )

    if request.capability in _MEANING_CAPS:

        def _extract(ctx: list[dict[str, Any]]) -> dict[str, Any]:
            return analyze_meaning(request.capability, ctx)

        return _process_structured(
            request,
            request.capability,
            "deterministic-conversation-meaning",
            _extract,
        )

    if request.capability == "social_flow_group_intent_extract":
        return _process_structured(
            request,
            request.capability,
            "deterministic-group-intent",
            extract_group_intent,
        )

    if request.capability == "social_flow_group_option_cluster":
        return _process_structured(
            request,
            request.capability,
            "deterministic-group-intent",
            extract_group_intent,
        )

    if request.capability == "social_flow_availability_intersect":
        return _process_structured(
            request,
            request.capability,
            "deterministic-group-intent",
            availability_intersect,
        )

    if request.capability == "social_flow_discovery_rank":
        return _process_structured(
            request,
            request.capability,
            "deterministic-discovery-rank",
            rank_discovery_candidates,
        )

    if request.capability == "social_flow_live_late_extract":
        return _process_structured(
            request,
            request.capability,
            "deterministic-live-experience",
            extract_late_notice,
        )

    if request.capability == "social_flow_live_follow_up_extract":
        return _process_structured(
            request,
            request.capability,
            "deterministic-live-experience",
            extract_follow_ups,
        )

    if request.capability == "social_flow_continuity_extract":
        return _process_structured(
            request,
            request.capability,
            "deterministic-continuity",
            extract_continuity,
        )

    if request.capability == "social_flow_family_plan_extract":
        return _process_structured(
            request,
            request.capability,
            "deterministic-family",
            extract_family_plan,
        )

    if request.capability == "social_flow_safety_triage":
        return _process_structured(
            request,
            request.capability,
            "deterministic-safety",
            triage_safety_report,
        )

    if request.capability == "social_flow_invite_copy":
        return _process_structured(
            request,
            request.capability,
            "deterministic-invite-copy",
            propose_invite_copy,
        )

    if request.capability == "social_flow_shell_rank":
        return _process_structured(
            request,
            request.capability,
            "deterministic-shell-rank",
            propose_shell_rank,
        )

    return _refused(request, ["unsupported_capability"]).to_public_dict()


def _process_echo(request: AiJobRequest) -> dict[str, Any]:
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


def _process_structured(
    request: AiJobRequest,
    capability: str,
    model: str,
    extractor: Any,
) -> dict[str, Any]:
    context = [
        {"type": item.type, "value": item.value, "source_id": item.source_id}
        for item in request.context
    ]
    joined = " ".join(item.value for item in request.context)
    if FORBIDDEN_MARKER in joined:
        return _refused(request, [FORBIDDEN_MARKER]).to_public_dict()

    extracted = extractor(context)
    completed = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    out = {
        "schema_version": "0.1.0",
        "job_id": str(request.job_id),
        "idempotency_key": request.idempotency_key,
        "capability": capability,
        "status": "completed",
        "output": extracted,
        "model_metadata": {
            "provider": "local",
            "model": model,
            "model_version": "0.1.0",
        },
        "safety": {"decision": "allowed", "reasons": []},
        "completed_at": completed,
        "trace_id": request.trace_id,
    }
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
