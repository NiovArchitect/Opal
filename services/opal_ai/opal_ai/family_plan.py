"""Deterministic family-plan proposals — no authority, no youth scoring."""

from __future__ import annotations

import re
from typing import Any


def extract_family_plan(context_items: list[dict[str, Any]]) -> dict[str, Any]:
    text = " ".join(str(i.get("value") or "") for i in context_items).lower()
    time_label = None
    m = re.search(r"(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)", text)
    if m:
        time_label = m.group(1).strip()
    if "5 today" in text or "ends at 5" in text:
        time_label = time_label or "5:00 PM"
    if "4:45" in text:
        time_label = "4:45 PM"

    pickup = "pick" in text or "pickup" in text or "pick you up" in text
    practice = "practice" in text

    if not (pickup or practice or "birthday" in text):
        return {
            "result_type": "no_insight",
            "family_plan_candidate": None,
            "evidence": [],
            "uncertainty": ["no_family_plan_language"],
        }

    return {
        "result_type": "family_plan_candidate",
        "family_plan_candidate": {
            "activity": "practice_pickup" if practice or pickup else "permission_sensitive",
            "time_label": time_label,
            "pickup": pickup,
            "requires_guardian_confirm": True,
            "confidence": 0.75,
        },
        "evidence": [
            {
                "source_id": str(context_items[0].get("source_id") or "m"),
                "field": "message_body",
                "snippet": str(context_items[0].get("value") or "")[:120],
            }
        ]
        if context_items
        else [],
        "uncertainty": ["guardian_must_confirm", "no_precise_location"],
    }
