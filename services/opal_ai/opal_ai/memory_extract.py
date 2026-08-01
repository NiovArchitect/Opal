"""Deterministic private memory candidate extraction — no ads, no purchases."""

from __future__ import annotations

import re
from typing import Any


def extract_memory_candidate(context_items: list[dict[str, Any]]) -> dict[str, Any]:
    texts = [
        (str(i.get("source_id") or "unknown"), str(i.get("value") or "")) for i in context_items
    ]
    combined = " ".join(v for _, v in texts).lower()

    # Explicit user request for reminder about preference / birthday
    if re.search(r"remind me before .* birthday", combined) or (
        "remind me" in combined and ("birthday" in combined or "necklace" in combined)
    ):
        src = _src(texts, r"remind|birthday|necklace")
        return {
            "result_type": "memory_candidate",
            "memory_candidate": {
                "candidate_type": "gift_preference" if "necklace" in combined else "important_date",
                "summary": _summary(combined),
                "proposed_purpose": "private personal follow-through reminder",
                "confidence": 0.78,
                "suggested_review_hint": "before_birthday",
                "uncertainty": [
                    "Does not assume they still want the item",
                    "No purchase or advertisement",
                    "Requires explicit user approval to save",
                ],
            },
            "candidate": None,
            "evidence": [
                {
                    "source_id": src,
                    "field": "memory_candidate",
                    "snippet": next((v for s, v in texts if s == src), "")[:256],
                }
            ],
            "uncertainty": [
                "Preference may change",
                "Not a commercial profile",
                "Private until user approves",
            ],
        }

    # Passive preference mention alone is weaker — still candidate if gift-like
    if re.search(
        r"(likes?|loved|want(?:s|ed)?)\s+(?:a |the )?(necklace|gift|book|watch)", combined
    ):
        src = _src(texts, r"necklace|likes|loved|gift")
        return {
            "result_type": "memory_candidate",
            "memory_candidate": {
                "candidate_type": "gift_preference",
                "summary": "Possible gift preference mentioned in conversation",
                "proposed_purpose": "optional private memory if user chooses",
                "confidence": 0.55,
                "suggested_review_hint": None,
                "uncertainty": [
                    "Casual mention may not be a request",
                    "User must approve before saving",
                ],
            },
            "candidate": None,
            "evidence": [
                {
                    "source_id": src,
                    "field": "memory_candidate",
                    "snippet": next((v for s, v in texts if s == src), "")[:256],
                }
            ],
            "uncertainty": ["Low-confidence preference mention"],
        }

    return {
        "result_type": "no_memory",
        "memory_candidate": None,
        "candidate": None,
        "evidence": [],
        "uncertainty": ["No private memory candidate detected"],
    }


def _summary(combined: str) -> str:
    if "necklace" in combined and "birthday" in combined:
        return "You asked to remember a necklace preference before a birthday"
    if "necklace" in combined:
        return "Necklace preference may matter privately later"
    if "birthday" in combined:
        return "Birthday-related private reminder request"
    return "Private follow-through memory candidate"


def _src(texts: list[tuple[str, str]], pattern: str) -> str:
    rx = re.compile(pattern, re.I)
    for source, value in texts:
        if rx.search(value):
            return source
    return texts[0][0] if texts else "unknown"
