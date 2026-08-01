"""Deterministic live-experience extraction proposals — no authority."""

from __future__ import annotations

import re
from typing import Any


def extract_late_notice(context_items: list[dict[str, Any]]) -> dict[str, Any]:
    text = " ".join(str(i.get("value") or "") for i in context_items).lower()
    delay = None
    m = re.search(r"(\d+)\s*minutes?\s*late", text)
    if m:
        delay = int(m.group(1))
    elif "running late" in text or "running about" in text:
        m2 = re.search(r"about\s+(\d+)", text)
        delay = int(m2.group(1)) if m2 else 20

    if delay is None and "late" not in text:
        return {
            "result_type": "no_insight",
            "live_late_candidate": None,
            "evidence": [],
            "uncertainty": ["no_late_language"],
        }

    arrival_label = f"around 8:{20 if delay and delay >= 15 else 10}"
    if delay:
        # generic label without clock authority
        arrival_label = f"about {delay} minutes late"

    return {
        "result_type": "live_late_candidate",
        "live_late_candidate": {
            "delay_minutes": delay or 20,
            "arrival_label": arrival_label,
            "confidence": 0.7 if delay else 0.5,
            "requires_share_approval": True,
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
        "uncertainty": ["user_must_approve_share"],
    }


def extract_follow_ups(context_items: list[dict[str, Any]]) -> dict[str, Any]:
    text = " ".join(str(i.get("value") or "") for i in context_items).lower()
    items: list[dict[str, str]] = []
    if "owe" in text or "parking" in text or "reimburse" in text:
        items.append({"description": "reimburse for parking", "kind": "reimbursement"})
    if "picture" in text or "photo" in text:
        items.append({"description": "send pictures", "kind": "photo_share"})
    if not items:
        return {
            "result_type": "no_insight",
            "live_follow_ups": [],
            "evidence": [],
            "uncertainty": ["no_follow_up_language"],
        }
    return {
        "result_type": "live_follow_ups",
        "live_follow_ups": items,
        "evidence": [
            {
                "source_id": str(context_items[0].get("source_id") or "m"),
                "field": "message_body",
                "snippet": str(context_items[0].get("value") or "")[:120],
            }
        ]
        if context_items
        else [],
        "uncertainty": [],
    }
