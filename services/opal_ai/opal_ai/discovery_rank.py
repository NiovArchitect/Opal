"""Deterministic discovery ranking proposals — no partner favoritism authority."""

from __future__ import annotations

import json
from typing import Any


def rank_discovery_candidates(context_items: list[dict[str, Any]]) -> dict[str, Any]:
    """
    Propose a ranked list from provider-neutral candidate JSON in context.
    Does not apply authority; Elixir re-validates hard constraints.
    """
    payload: dict[str, Any] = {}
    for item in context_items:
        val = item.get("value") or ""
        if isinstance(val, str) and val.strip().startswith("{"):
            try:
                payload = json.loads(val)
            except json.JSONDecodeError:
                continue

    candidates = payload.get("candidates") or []
    hard = payload.get("hard_constraints") or {}
    soft = payload.get("soft_preferences") or {}
    hide_sponsored = bool(payload.get("hide_sponsored"))

    scored: list[tuple[float, dict[str, Any], str]] = []
    for c in candidates:
        if not isinstance(c, dict):
            continue
        if hide_sponsored and c.get("sponsorship_state") == "sponsored":
            continue
        pass_hard, why = _hard_pass(c, hard)
        if not pass_hard:
            continue
        score = _soft_score(c, soft)
        # organic slightly preferred so sponsored cannot silently replace best organic
        if c.get("sponsorship_state") == "organic":
            score += 0.02
        explanation = _explain(c, hard, soft, why)
        scored.append((score, c, explanation))

    scored.sort(key=lambda t: t[0], reverse=True)
    top = scored[:3]

    if not top:
        return {
            "result_type": "discovery_ranking",
            "discovery_ranking": {
                "ranked_candidate_ids": [],
                "explanations": [],
                "no_match": True,
                "diversity_note": "No candidate satisfied every hard requirement.",
            },
            "evidence": [],
            "uncertainty": ["hard_constraints_unmet"],
        }

    return {
        "result_type": "discovery_ranking",
        "discovery_ranking": {
            "ranked_candidate_ids": [
                str(c.get("provider_candidate_id") or c.get("id")) for _, c, _ in top
            ],
            "explanations": [
                {
                    "candidate_id": str(c.get("provider_candidate_id") or c.get("id")),
                    "text": exp,
                }
                for _, c, exp in top
            ],
            "no_match": False,
            "diversity_note": "Diverse categories preferred when scores are close.",
        },
        "evidence": [
            {
                "source_id": "discovery_context",
                "field": "candidates",
                "snippet": f"{len(candidates)} candidates evaluated",
            }
        ],
        "uncertainty": [],
    }


def _hard_pass(c: dict[str, Any], hard: dict[str, Any]) -> tuple[bool, list[str]]:
    reasons: list[str] = []
    acc = c.get("accessibility_attributes") or {}
    diet = c.get("dietary_attributes") or {}
    facts = c.get("normalized_facts") or {}

    if hard.get("require_accessible_parking") is True:
        if not (acc.get("accessible_parking") is True or acc.get("fit") == "meets_accessibility"):
            reasons.append("accessibility")
    if hard.get("require_vegetarian") is True:
        if not (diet.get("vegetarian_options") is True or diet.get("fit") == "meets_dietary"):
            reasons.append("dietary")
    if hard.get("max_price_band"):
        if _price_rank(c.get("price_band")) > _price_rank(hard["max_price_band"]):
            reasons.append("budget")
    if hard.get("require_outdoor") is True and facts.get("outdoor") is not True:
        reasons.append("outdoor")
    return (len(reasons) == 0, reasons)


def _soft_score(c: dict[str, Any], soft: dict[str, Any]) -> float:
    facts = c.get("normalized_facts") or {}
    score = 1.0
    if soft.get("prefer_quiet") and facts.get("quiet"):
        score += 0.3
    if soft.get("prefer_outdoor") and facts.get("outdoor"):
        score += 0.3
    score += max(0.0, 0.2 - _price_rank(c.get("price_band")) * 0.05)
    return round(score, 3)


def _explain(c: dict[str, Any], hard: dict[str, Any], soft: dict[str, Any], _why: list[str]) -> str:
    parts: list[str] = []
    if hard.get("require_accessible_parking"):
        parts.append("accessible parking")
    if hard.get("require_vegetarian"):
        parts.append("dietary needs")
    if hard.get("max_price_band"):
        parts.append("fits the group's budget preferences")
    facts = c.get("normalized_facts") or {}
    if soft.get("prefer_quiet") and facts.get("quiet"):
        parts.append("quiet setting")
    if soft.get("prefer_outdoor") and facts.get("outdoor"):
        parts.append("outdoor option")
    if c.get("sponsorship_state") == "sponsored":
        parts.append("Sponsored")
    if not parts:
        return "Matches the plan constraints."
    return "Fits: " + "; ".join(parts) + "."


def _price_rank(band: Any) -> int:
    return {"free": 0, "$": 1, "$$": 2, "$$$": 3, "$$$$": 4}.get(str(band or "$$"), 2)
