"""Bounded Home Needs You ranking proposals — no UI authority, no scores."""

from __future__ import annotations

from typing import Any


def propose_shell_rank(context_items: list[dict[str, Any]]) -> dict[str, Any]:
    """Order eligible item ids by simple keyword urgency after Elixir eligibility."""
    high: list[str] = []
    normal: list[str] = []
    for item in context_items:
        sid = str(item.get("source_id") or item.get("id") or "")
        val = str(item.get("value") or "").lower()
        if not sid:
            continue
        if "due" in val or "pickup" in val or "reservation" in val or "book" in val:
            high.append(sid)
        else:
            normal.append(sid)
    ordered = (high + normal)[:3]
    return {
        "result_type": "shell_rank",
        "shell_rank": {
            "ordered_ids": ordered,
            "no_ui_authority": True,
            "no_relationship_score": True,
        },
        "evidence": [
            {
                "source_id": str(context_items[0].get("source_id") or "n"),
                "field": "needs_you_candidate",
                "snippet": str(context_items[0].get("value") or "")[:120],
            }
        ]
        if context_items
        else [],
        "uncertainty": ["not_ui_authority", "eligibility_owned_by_elixir"],
    }
