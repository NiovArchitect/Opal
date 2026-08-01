"""Contract loading and validation against monorepo JSON Schemas."""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any

from jsonschema import Draft202012Validator

SCHEMA_VERSION = "0.1.0"
MAX_CONTEXT_ITEMS = 5
MAX_CONTEXT_CHARS = 2000
FORBIDDEN_MARKER = "OPAL_TEST_FORCE_REFUSAL"
EXECUTABLE_CAPABILITIES = frozenset(
    {
        "ai_echo",
        "social_flow_plan_extract",
        "social_flow_follow_through_extract",
        "social_flow_memory_candidate_extract",
        "social_flow_relevance_rank",
        "social_flow_turn_classify",
        "social_flow_open_loop_detect",
        "social_flow_pre_send_check",
        "social_flow_ambiguity_detect",
        "social_flow_repair_suggest",
        "social_flow_decision_summary",
        "social_flow_group_intent_extract",
        "social_flow_group_option_cluster",
        "social_flow_availability_intersect",
        "social_flow_discovery_rank",
        "social_flow_live_late_extract",
        "social_flow_live_follow_up_extract",
        "social_flow_continuity_extract",
        "social_flow_family_plan_extract",
        "social_flow_safety_triage",
    }
)


def contracts_root() -> Path:
    # services/opal_ai/opal_ai/contracts.py -> repo root packages/contracts
    return Path(__file__).resolve().parents[3] / "packages" / "contracts"


@lru_cache(maxsize=16)
def load_schema(name: str) -> dict[str, Any]:
    path = contracts_root() / "schemas" / f"{name}.schema.json"
    with path.open(encoding="utf-8") as fh:
        data: dict[str, Any] = json.load(fh)
        return data


def validate_against(schema_name: str, payload: dict[str, Any]) -> None:
    schema = load_schema(schema_name)
    Draft202012Validator(schema).validate(payload)


def context_char_count(context: list[dict[str, Any]]) -> int:
    return sum(len(str(item.get("value", ""))) for item in context)


def defense_in_depth_request(payload: dict[str, Any]) -> list[str]:
    """Extra bounds beyond JSON Schema."""
    reasons: list[str] = []
    context = payload.get("context") or []
    if not isinstance(context, list):
        reasons.append("context_not_list")
        return reasons
    if len(context) > MAX_CONTEXT_ITEMS:
        reasons.append("context_too_many_items")
    if context_char_count(context) > MAX_CONTEXT_CHARS:
        reasons.append("context_too_large")
    if payload.get("capability") not in EXECUTABLE_CAPABILITIES:
        reasons.append("unsupported_capability")
    if not payload.get("trace_id"):
        reasons.append("missing_trace_id")
    text = " ".join(str(i.get("value", "")) for i in context)
    if FORBIDDEN_MARKER in text:
        reasons.append(FORBIDDEN_MARKER)
    return reasons
