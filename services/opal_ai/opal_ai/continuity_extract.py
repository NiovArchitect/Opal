"""Deterministic continuity candidate proposals — no authority, no profiling."""

from __future__ import annotations

from typing import Any


def extract_continuity(context_items: list[dict[str, Any]]) -> dict[str, Any]:
    text = " ".join(str(i.get("value") or "") for i in context_items).lower()
    candidates: list[dict[str, Any]] = []

    if "quiet" in text or "not crowded" in text:
        candidates.append(
            {
                "memory_class": "private",
                "summary": "They preferred the quieter, less-crowded setting.",
                "purpose": "private personal continuity",
                "confidence": 0.7,
            }
        )
    if "anniversary" in text or "our place" in text:
        candidates.append(
            {
                "memory_class": "shared_relationship",
                "summary": "Possible anniversary place tradition.",
                "purpose": "shared continuity",
                "confidence": 0.75,
            }
        )
    if "first friday" in text or "game night" in text:
        candidates.append(
            {
                "memory_class": "group",
                "summary": "Possible recurring game-night rhythm.",
                "purpose": "group continuity",
                "confidence": 0.7,
            }
        )
    if "annual" in text or "every year" in text or "october" in text and "trip" in text:
        candidates.append(
            {
                "memory_class": "shared_relationship",
                "summary": "Possible annual trip tradition.",
                "purpose": "shared continuity",
                "confidence": 0.7,
            }
        )
    if "thanksgiving" in text or "family tradition" in text:
        candidates.append(
            {
                "memory_class": "group",
                "summary": "Possible adult family tradition.",
                "purpose": "family continuity",
                "confidence": 0.65,
            }
        )

    if not candidates:
        return {
            "result_type": "no_insight",
            "continuity_candidates": [],
            "evidence": [],
            "uncertainty": ["no_continuity_language"],
        }

    return {
        "result_type": "continuity_candidates",
        "continuity_candidates": candidates[:5],
        "evidence": [
            {
                "source_id": str(context_items[0].get("source_id") or "m"),
                "field": "message_body",
                "snippet": str(context_items[0].get("value") or "")[:120],
            }
        ]
        if context_items
        else [],
        "uncertainty": ["requires_user_consent"],
    }
