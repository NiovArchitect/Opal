"""P4.2 high-confidence evaluation — Python proposes only.

Elixir revalidates candidate membership, hard constraints, and revision.
Never returns Gold / booking / Graph mutation commands.
Never echoes private budget values into shareable text.
"""

from __future__ import annotations

from typing import Any


def evaluate_high(payload: dict[str, Any]) -> dict[str, Any]:
    request_id = payload.get("request_id")
    decision_id = payload.get("decision_id")
    revision = payload.get("context_revision")
    candidates = payload.get("candidate_set") or []
    prefer_quiet = bool((payload.get("soft_preferences") or {}).get("prefer_quiet"))
    policy_version = payload.get("policy_version") or "p4.2.high.v1"

    ids = [c.get("provider_place_id") or c.get("id") for c in candidates if isinstance(c, dict)]
    ids = [i for i in ids if i]

    if not ids:
        return {
            "request_id": request_id,
            "decision_id": decision_id,
            "based_on_context_revision": revision,
            "result_type": "high_evaluation",
            "high_confidence_eligible": False,
            "selected_candidate_id": None,
            "reason_codes": ["no_candidates"],
            "policy_version": policy_version,
            "model_version": "opal_ai.high_confidence_eval.v1",
            "warnings": [],
        }

    ranked = sorted(
        [c for c in candidates if isinstance(c, dict)],
        key=lambda c: (
            0 if prefer_quiet and c.get("quiet") is True else 1,
            -(float(c.get("rating") or c.get("score") or 0)),
            str(c.get("provider_place_id") or c.get("id") or ""),
        ),
    )
    pick = ranked[0]
    pick_id = pick.get("provider_place_id") or pick.get("id")

    return {
        "request_id": request_id,
        "decision_id": decision_id,
        "based_on_context_revision": revision,
        "result_type": "high_evaluation",
        "high_confidence_eligible": True,
        "selected_candidate_id": pick_id,
        "confidence_factors": {
            "MODEL_CERTAINTY": "soft",
            "note": "deterministic propose over supplied candidate_set",
        },
        "reason_codes": [],
        "private_explanation_factors": {"prefer_quiet": prefer_quiet},
        "shareable_explanation_factors": {
            "summary": f"{pick.get('name') or pick.get('display_name')} fits current context"
        },
        "policy_version": policy_version,
        "model_version": "opal_ai.high_confidence_eval.v1",
        "warnings": ["candidate_source_may_be_fixture"],
    }
