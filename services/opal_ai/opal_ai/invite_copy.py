"""Bounded invitation-copy proposals only — no identity authority."""

from __future__ import annotations

from typing import Any


def propose_invite_copy(context_items: list[dict[str, Any]]) -> dict[str, Any]:
    text = " ".join(str(i.get("value") or "") for i in context_items).lower()
    if "project" in text or "school" in text:
        msg = "Would you like to connect on Opal for this project?"
        tone = "collaborative"
    elif "catch up" in text or "coffee" in text:
        msg = "Would you like to connect on Opal?"
        tone = "friendly"
    else:
        msg = "Would you like to connect on Opal?"
        tone = "neutral"

    return {
        "result_type": "invite_copy",
        "invite_copy": {
            "suggested_message": msg[:200],
            "tone": tone,
            "no_identity_inference": True,
            "no_contact_matching": True,
        },
        "evidence": [
            {
                "source_id": str(context_items[0].get("source_id") or "i"),
                "field": "invite_note",
                "snippet": str(context_items[0].get("value") or "")[:120],
            }
        ]
        if context_items
        else [],
        "uncertainty": ["not_identity_authority", "not_membership_oracle"],
    }
