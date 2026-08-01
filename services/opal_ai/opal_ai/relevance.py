"""Deterministic relevance ranking for Social Flow 2 — proposals only."""

from __future__ import annotations

import json
from typing import Any


def rank_candidates(context_items: list[dict[str, Any]]) -> dict[str, Any]:
    """Rank eligible candidates. Elixir still decides emission."""
    raw = " ".join(str(i.get("value") or "") for i in context_items)
    candidates: list[dict[str, Any]] = []

    # Context values may be JSON fragments describing candidates
    for item in context_items:
        value = str(item.get("value") or "").strip()
        source = str(item.get("source_id") or "unknown")
        try:
            parsed = json.loads(value)
            if isinstance(parsed, dict) and parsed.get("candidate_id"):
                candidates.append(parsed)
            elif isinstance(parsed, list):
                candidates.extend([c for c in parsed if isinstance(c, dict)])
            else:
                candidates.append(
                    {
                        "candidate_id": source,
                        "type": "generic",
                        "due_hours": 24,
                        "priority": 0.5,
                    }
                )
        except json.JSONDecodeError:
            candidates.append(
                {
                    "candidate_id": source,
                    "type": "text",
                    "snippet": value[:80],
                    "due_hours": 24,
                    "priority": 0.4,
                }
            )

    rankings: list[dict[str, Any]] = []
    for idx, cand in enumerate(candidates[:10]):
        cid = str(cand.get("candidate_id") or f"c-{idx}")
        due_raw = cand.get("due_hours")
        due = float(due_raw) if isinstance(due_raw, (int, float, str)) else 48.0
        dismissed = bool(cand.get("dismissed"))
        complete = bool(cand.get("complete"))
        pri_raw = cand.get("priority")
        priority = float(pri_raw) if isinstance(pri_raw, (int, float, str)) else 0.5

        suppress = dismissed or complete or due > 72
        score = 0.0 if suppress else max(0.0, min(1.0, priority + max(0.0, (48 - due) / 100)))
        surface = "suppress" if suppress else ("needs_you" if score >= 0.45 else "inline")
        if cand.get("shadow_only"):
            surface = "shadow_only"

        rankings.append(
            {
                "candidate_id": cid,
                "ordinal": idx + 1,
                "internal_score": round(score, 3),
                "recommend_surface": surface,
                "copy_key": str(cand.get("copy_key") or "follow_through_due"),
                "rationale": (
                    "suppressed_complete"
                    if complete
                    else "suppressed_dismissed"
                    if dismissed
                    else "not_due"
                    if due > 72
                    else "due_soon"
                ),
                "uncertainty": ["Internal score not user-visible"],
                "suppress": suppress,
            }
        )

    # Sort by score descending, re-assign ordinal
    rankings.sort(key=lambda r: (-r["internal_score"], r["candidate_id"]))
    for i, r in enumerate(rankings):
        r["ordinal"] = i + 1

    return {
        "result_type": "relevance_ranking",
        "rankings": rankings,
        "candidate": None,
        "evidence": [],
        "uncertainty": [
            "Python ranks only; Elixir owns emission",
            "No relationship score or emotional judgment",
        ],
        "context_note": raw[:64],
    }
