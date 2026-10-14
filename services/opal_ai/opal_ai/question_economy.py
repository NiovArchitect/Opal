"""Question economy proposals — Python proposes, Elixir authorizes.

Never writes authoritative state. Never executes external actions.
Wires concepts from docs/architecture/MINIMUM_QUESTION_ENGINE.md and
docs/authority/OPAL_QUESTION_ECONOMY_AND_ASSUMPTION_LAW.md.
"""

from __future__ import annotations

from typing import Any


def propose_question(context_items: list[dict[str, Any]] | None = None) -> dict[str, Any]:
    """Return a schema-shaped proposal for whether a question is needed.

    Elixir alone decides whether to surface anything.
    """
    ctx = _flatten(context_items or [])
    known = {
        "who": bool(ctx.get("who") or ctx.get("primary_person") or ctx.get("participants")),
        "when": bool(ctx.get("when")),
        "destination": bool(ctx.get("destination")),
        "venue": bool(ctx.get("venue")),
    }

    # Prefer inference / soft assumptions over questions.
    if known["when"] and not ctx.get("when_time") and ctx.get("wants_restaurant"):
        return {
            "ask": False,
            "assumption_class": "soft",
            "soft_assumption": "I'll aim for around 7:30 unless you want later.",
            "uncertainty": 0.3,
            "consequence": 0.2,
            "evidence": ["restaurant_intent_without_clock"],
            "source": "question_economy.propose_question",
        }

    missing = [k for k, v in known.items() if not v and k in ("who", "when", "destination")]
    if not missing:
        return {
            "ask": False,
            "assumption_class": "safe",
            "uncertainty": 0.1,
            "consequence": 0.1,
            "evidence": ["slots_known"],
            "source": "question_economy.propose_question",
        }

    # Rank by downstream unblock value for restaurant flows.
    order = ["who", "destination", "when"]
    topic = next((t for t in order if t in missing), missing[0])
    prompts = {
        "who": "Who should I include?",
        "destination": "Where should this be?",
        "when": "When works?",
    }
    return {
        "ask": True,
        "assumption_class": "ask",
        "topic": topic,
        "proposed_question": prompts.get(topic, "What should I lock next?"),
        "uncertainty": 0.6,
        "consequence": 0.5 if topic == "who" else 0.4,
        "evidence": [f"missing_{topic}"],
        "source": "question_economy.propose_question",
    }


def _flatten(items: list[dict[str, Any]]) -> dict[str, Any]:
    out: dict[str, Any] = {}
    for item in items:
        if not isinstance(item, dict):
            continue
        body = item.get("body") or item.get("content") or item
        if isinstance(body, dict):
            out.update({str(k): v for k, v in body.items()})
        for k in ("who", "when", "destination", "venue", "wants_restaurant", "primary_person", "participants"):
            if k in item:
                out[k] = item[k]
    return out
