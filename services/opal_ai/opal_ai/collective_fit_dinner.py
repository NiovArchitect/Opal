"""Deterministic collective-fit ranking for Phase 1 quiet-dinner fixtures.

Python proposes only. Elixir revalidates hard constraints and audience safety.
Never returns private constraint values in explanations.
"""

from __future__ import annotations

import json
from typing import Any

_PRICE_RANK = {"$": 1, "$$": 2, "$$$": 3, "$$$$": 4}
_FORBIDDEN = (
    "budget",
    "cannot afford",
    "can't afford",
    "max_price",
    "price_band",
    "sensory",
    "sensitivity",
    "exact location",
    "area_a",
    "area_b",
    "area_c",
    "fit_score",
    "friend score",
    "gps",
    "coordinate",
)


def rank_collective_fit(context_items: list[dict[str, Any]]) -> dict[str, Any]:
    payload = _payload_from_context(context_items)
    if not payload:
        return {
            "result_type": "no_insight",
            "collective_fit_ranking": None,
            "evidence": [],
            "uncertainty": ["missing_collective_fit_payload"],
        }

    candidates = payload.get("candidates") or []
    hard = payload.get("hard_constraints") or {}
    soft = payload.get("soft_preferences") or {}
    # Private hard constraints arrive as protected feature flags, not user-facing text.
    private_hard = payload.get("private_hard_features") or {}

    effective_hard = {
        "require_quiet": bool(hard.get("require_quiet") or private_hard.get("require_quiet")),
        "max_price_band": hard.get("max_price_band") or private_hard.get("max_price_band"),
        "earliest_available": hard.get("earliest_available")
        or private_hard.get("earliest_available"),
    }

    scored: list[tuple[float, dict[str, Any], str]] = []
    for c in candidates:
        if not isinstance(c, dict):
            continue
        if not _hard_pass(c, effective_hard):
            continue
        score = _soft_score(c, soft)
        explanation = _group_safe_explanation(c, effective_hard, soft)
        if _leaks_private(explanation):
            explanation = "Works with everyone’s timing and current preferences."
        scored.append((score, c, explanation))

    scored.sort(key=lambda t: (-t[0], str(t[1].get("id") or "")))
    top = scored[:3]

    if not top:
        return {
            "result_type": "collective_fit_ranking",
            "collective_fit_ranking": {
                "ranked_candidate_ids": [],
                "explanations": [],
                "preferred_id": None,
                "no_match": True,
                "restraint_recommendation": "silence",
                "confidence": 0.2,
            },
            "evidence": [],
            "uncertainty": ["hard_constraints_unmet"],
        }

    ranked_ids = [str(c.get("id")) for _, c, _ in top]
    return {
        "result_type": "collective_fit_ranking",
        "collective_fit_ranking": {
            "ranked_candidate_ids": ranked_ids,
            "explanations": [{"candidate_id": str(c.get("id")), "text": exp} for _, c, exp in top],
            "preferred_id": ranked_ids[0],
            "no_match": False,
            "restraint_recommendation": "surface" if top[0][0] >= 1.2 else "silence",
            "confidence": min(0.95, 0.55 + top[0][0] * 0.15),
            "fit_dimensions": {
                "quiet": bool(effective_hard.get("require_quiet")),
                "timing": True,
                "travel": True,
                # Never include private budget dimension labels for clients.
            },
        },
        "evidence": [
            {
                "source_id": "collective_fit_context",
                "field": "candidates",
                "snippet": f"{len(candidates)} candidates evaluated",
            }
        ],
        "uncertainty": [],
    }


def _payload_from_context(context_items: list[dict[str, Any]]) -> dict[str, Any]:
    for item in context_items:
        val = item.get("value") or ""
        if isinstance(val, str) and val.strip().startswith("{"):
            try:
                data = json.loads(val)
            except json.JSONDecodeError:
                continue
            if isinstance(data, dict) and (
                "candidates" in data or data.get("kind") == "collective_fit_input"
            ):
                return data
    return {}


def _hard_pass(c: dict[str, Any], hard: dict[str, Any]) -> bool:
    if hard.get("require_quiet") is True and c.get("quiet") is not True:
        return False
    max_band = hard.get("max_price_band")
    if max_band and _price_rank(c.get("price_band")) > _price_rank(max_band):
        return False
    earliest = hard.get("earliest_available")
    available = c.get("available_at")
    if earliest and available and str(available) < str(earliest):
        return False
    return True


def _soft_score(c: dict[str, Any], soft: dict[str, Any]) -> float:
    score = 1.0
    if c.get("quiet") is True:
        score += 0.35
    if soft.get("prefer_novelty") and c.get("similar_to_past") is not True:
        score += 0.05
    friction = c.get("travel_friction")
    if soft.get("prefer_balanced_travel", True):
        if friction == "short":
            score += 0.2
        elif friction == "balanced":
            score += 0.15
        elif friction == "long":
            score -= 0.25
    if c.get("similar_to_past") is True:
        score += 0.1
    score += max(0.0, 0.15 - _price_rank(c.get("price_band")) * 0.03)
    return round(score, 3)


def _group_safe_explanation(c: dict[str, Any], hard: dict[str, Any], soft: dict[str, Any]) -> str:
    parts = ["Works with everyone’s timing and current preferences"]
    if hard.get("require_quiet") and c.get("quiet") is True:
        parts.append("Quieter than the other options")
    if c.get("travel_friction") in {"short", "balanced"}:
        parts.append("Convenient for the people involved")
    if c.get("similar_to_past") is True:
        parts.append("Similar to places this group has enjoyed")
    elif soft.get("prefer_novelty"):
        parts.append("A fresh option for the group")
    return ". ".join(parts) + "."


def _leaks_private(text: str) -> bool:
    low = (text or "").lower()
    return any(token in low for token in _FORBIDDEN)


def _price_rank(band: Any) -> int:
    return _PRICE_RANK.get(str(band or "$$"), 2)
