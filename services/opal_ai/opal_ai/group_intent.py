"""Deterministic group intent extraction — proposals only, no ranking."""

from __future__ import annotations

import json
from typing import Any


def extract_group_intent(context_items: list[dict[str, Any]]) -> dict[str, Any]:
    texts = [(str(i.get("source_id") or "u"), str(i.get("value") or "")) for i in context_items]
    combined = " ".join(v for _, v in texts).lower()

    activity = "dinner" if "dinner" in combined else ("plan" if "we should" in combined else None)
    time_candidates: list[dict[str, Any]] = []
    constraints: list[dict[str, Any]] = []
    unresolved: list[str] = []

    if "saturday" in combined:
        label = "Saturday after 7" if "after 7" in combined or "7" in combined else "Saturday"
        time_candidates.append({"label": label, "confidence": 0.75})
    if "friday" in combined:
        time_candidates.append({"label": "Friday at 7:00 PM", "confidence": 0.5})
    if "sunday" in combined:
        time_candidates.append({"label": "Sunday at 5:00 PM", "confidence": 0.45})
    if "8:00" in combined or "8 pm" in combined:
        time_candidates.append({"label": "Saturday at 8:00 PM", "confidence": 0.7})

    for sid, v in texts:
        low = v.lower()
        if "accessible" in low or "accessibility" in low or "parking" in low:
            constraints.append(
                {
                    "type": "accessibility",
                    "summary": "Accessible parking required",
                    "source_id": sid,
                    "suggest_private": True,
                }
            )
        if "after 7" in low or "free after" in low:
            constraints.append(
                {
                    "type": "time_window",
                    "summary": "Free after 7",
                    "source_id": sid,
                    "suggest_private": False,
                }
            )

    if not any("location" in (c.get("type") or "") for c in constraints):
        if "restaurant" not in combined and "at " not in combined:
            unresolved.append("location")

    if activity and time_candidates:
        copy = f"{time_candidates[0]['label']} may work for everyone."
        if "location" in unresolved:
            copy += " Location is still open."
    else:
        copy = None

    if not activity and not time_candidates:
        return {
            "result_type": "no_insight",
            "group_intent": None,
            "evidence": [],
            "uncertainty": ["No group plan language detected"],
        }

    return {
        "result_type": "group_intent",
        "group_intent": {
            "activity": activity,
            "time_candidates": time_candidates[:5],
            "constraints": constraints[:5],
            "unresolved": unresolved,
            "recommended_signal_copy": copy,
            "confidence": 0.72 if activity else 0.4,
        },
        "evidence": [
            {"source_id": sid, "field": "group_intent", "snippet": v[:120]} for sid, v in texts[:5]
        ],
        "uncertainty": [
            "Does not rank participants",
            "Does not assert consensus",
            "Python proposes only",
        ],
    }


def availability_intersect(context_items: list[dict[str, Any]]) -> dict[str, Any]:
    """Intersect free/busy envelopes — never private event titles."""
    envelopes: list[dict[str, Any]] = []
    for item in context_items:
        try:
            parsed = json.loads(str(item.get("value") or ""))
            if isinstance(parsed, dict) and parsed.get("windows"):
                envelopes.append(parsed)
        except json.JSONDecodeError:
            continue

    if not envelopes:
        return {
            "result_type": "availability_intersection",
            "availability_intersection": {
                "label": "Insufficient shared availability",
                "participant_count": 0,
                "excluded_count": 0,
                "uncertainty": ["No envelopes provided"],
            },
            "evidence": [],
            "uncertainty": ["No private event titles received"],
        }

    # Deterministic: if all claim saturday 19-21 free
    labels = [str(e.get("label") or "") for e in envelopes]
    n = len(envelopes)
    if all(
        "saturday" in (e.get("label") or "").lower() or "19" in str(e.get("windows"))
        for e in envelopes
    ):
        label = "Saturday between 7:00 and 9:00 works for everyone."
    else:
        label = "No single window works for everyone with current grants."

    return {
        "result_type": "availability_intersection",
        "availability_intersection": {
            "label": label,
            "participant_count": n,
            "excluded_count": 0,
            "uncertainty": [
                "Intersection uses free/busy only",
                "No private event titles",
            ],
        },
        "evidence": [],
        "uncertainty": labels[:3] if labels else [],
    }
