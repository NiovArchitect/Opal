"""Deterministic Social Flow plan extraction — no external providers."""

from __future__ import annotations

import re
from typing import Any


def extract_plan_candidate(context_items: list[dict[str, Any]]) -> dict[str, Any]:
    """Return schema-shaped output for social_flow_plan_extract."""
    texts: list[tuple[str, str]] = []
    for item in context_items:
        value = str(item.get("value") or "")
        source = str(item.get("source_id") or "unknown")
        texts.append((source, value))

    combined = " ".join(v for _, v in texts).lower()
    evidence: list[dict[str, str]] = []
    uncertainty: list[str] = [
        "This is a possible plan, not a binding event",
        "Python never creates authoritative agreement",
    ]

    # Commitment language (after a plan may already exist client-side)
    commitment_match = re.search(
        r"i(?:'ll| will)\s+(make the reservation|book(?:\s+it)?|reserve)",
        combined,
    )
    if commitment_match:
        desc = commitment_match.group(0)
        src = _first_source_matching(texts, r"reservation|book|reserve")
        evidence.append(
            {
                "source_id": src,
                "field": "possible_commitments",
                "snippet": desc[:256],
            }
        )
        return {
            "result_type": "commitment_candidate",
            "candidate": {
                "activity": None,
                "participant_mentions": [],
                "temporal_expressions": [],
                "normalized_time_candidates": [],
                "location_expression": None,
                "possible_commitments": [
                    {"description": "Make the reservation", "confidence": 0.8}
                ],
                "revision_hint": None,
                "missing_information": [],
                "confidence": 0.8,
                "recommended_signal_copy": "You offered to make the reservation.",
            },
            "evidence": evidence,
            "uncertainty": uncertainty
            + ["Commitment requires explicit user confirmation in Elixir"],
        }

    # Revision language
    revision_match = re.search(
        r"(?:move it to|change (?:it|time) to|make it)\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)",
        combined,
    )
    if revision_match or "move it" in combined or "can we move" in combined:
        label = "7:30 PM" if "7:30" in combined else revision_match.group(1) if revision_match else "later"
        if "7:30" in combined:
            label = "7:30 PM"
        src = _first_source_matching(texts, r"move|change|7:30|later")
        evidence.append(
            {
                "source_id": src,
                "field": "revision_hint",
                "snippet": next((v for s, v in texts if s == src), "")[:256],
            }
        )
        return {
            "result_type": "revision_candidate",
            "candidate": {
                "activity": "dinner" if "dinner" in combined else None,
                "participant_mentions": [],
                "temporal_expressions": [label],
                "normalized_time_candidates": [
                    {"label": label, "iso_hint": None, "confidence": 0.75}
                ],
                "location_expression": None,
                "possible_commitments": [],
                "revision_hint": {
                    "change_type": "time_change",
                    "proposed_label": label,
                    "confidence": 0.75,
                },
                "missing_information": [],
                "confidence": 0.75,
                "recommended_signal_copy": f"Proposed changing dinner to {label}.",
            },
            "evidence": evidence,
            "uncertainty": uncertainty + ["Revision requires peer approval"],
        }

    # Plan detection
    has_dinner = "dinner" in combined
    has_thursday = "thursday" in combined
    has_free = "free" in combined or "after 6" in combined or "6:30" in combined
    has_plan_language = any(
        phrase in combined
        for phrase in ("we should", "let's", "want to", "get dinner", "meet")
    )

    if not (has_dinner or has_plan_language) and not has_thursday:
        return {
            "result_type": "no_plan",
            "candidate": None,
            "evidence": [],
            "uncertainty": ["No clear coordination language detected"],
        }

    activity = "dinner" if has_dinner else "plan"
    temporal: list[str] = []
    time_candidates: list[dict[str, Any]] = []

    if has_thursday:
        temporal.append("next Thursday" if "next thursday" in combined else "Thursday")
        src = _first_source_matching(texts, r"thursday")
        evidence.append(
            {
                "source_id": src,
                "field": "temporal_expressions",
                "snippet": next((v for s, v in texts if s == src), "")[:256],
            }
        )

    if "6:30" in combined or "after 6" in combined:
        temporal.append("after 6:30")
        time_candidates.append(
            {"label": "Thursday after 6:30", "iso_hint": None, "confidence": 0.72}
        )
        time_candidates.append(
            {"label": "Thursday at 7:00 PM", "iso_hint": None, "confidence": 0.55}
        )
        src = _first_source_matching(texts, r"6:30|free|after")
        evidence.append(
            {
                "source_id": src,
                "field": "normalized_time_candidates",
                "snippet": next((v for s, v in texts if s == src), "")[:256],
            }
        )
    elif has_thursday:
        time_candidates.append(
            {"label": "Thursday (time TBD)", "iso_hint": None, "confidence": 0.4}
        )

    if has_dinner:
        src = _first_source_matching(texts, r"dinner")
        evidence.append(
            {
                "source_id": src,
                "field": "activity",
                "snippet": next((v for s, v in texts if s == src), "")[:256],
            }
        )

    missing: list[str] = []
    if not any("7:00" in c["label"] or "6:30" in c["label"] for c in time_candidates):
        missing.append("exact_time")
    if "restaurant" not in combined and "at " not in combined:
        missing.append("location")

    signal = (
        "Dinner next Thursday may be a plan."
        if has_dinner and has_thursday
        else f"{activity.capitalize()} may be a plan."
    )

    confidence = 0.7 if (has_dinner and has_thursday and has_free) else 0.55

    return {
        "result_type": "plan_candidate",
        "candidate": {
            "activity": activity,
            "participant_mentions": [],
            "temporal_expressions": temporal,
            "normalized_time_candidates": time_candidates,
            "location_expression": None,
            "possible_commitments": [],
            "revision_hint": None,
            "missing_information": missing,
            "confidence": confidence,
            "recommended_signal_copy": signal,
        },
        "evidence": evidence,
        "uncertainty": uncertainty
        + (["Exact time not agreed"] if "exact_time" in missing else [])
        + (["Location not specified"] if "location" in missing else []),
    }


def _first_source_matching(texts: list[tuple[str, str]], pattern: str) -> str:
    rx = re.compile(pattern, re.I)
    for source, value in texts:
        if rx.search(value):
            return source
    return texts[0][0] if texts else "unknown"
