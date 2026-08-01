"""Bounded safety triage proposals — no guilt determination, no authority."""

from __future__ import annotations

from typing import Any


def triage_safety_report(context_items: list[dict[str, Any]]) -> dict[str, Any]:
    text = " ".join(str(i.get("value") or "") for i in context_items).lower()
    proposal = "manual_review_needed"
    if "repeated" in text or "unwanted request" in text or "spam" in text:
        proposal = "suspend_contact_requests"
    elif "impersonation" in text:
        proposal = "manual_review_needed"

    return {
        "result_type": "safety_triage",
        "safety_triage": {
            "proposal": proposal,
            "manual_review": proposal == "manual_review_needed",
            "confidence": 0.7 if proposal != "manual_review_needed" else 0.5,
            "no_guilt_determination": True,
        },
        "evidence": [
            {
                "source_id": str(context_items[0].get("source_id") or "r"),
                "field": "report_note",
                "snippet": str(context_items[0].get("value") or "")[:120],
            }
        ]
        if context_items
        else [],
        "uncertainty": ["not_a_legal_finding", "not_guilt_determination"],
    }
