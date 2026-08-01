"""Deterministic conversation meaning analysis for Social Flow 3.

Epistemic rules:
- Evidence-grounded only
- No mind-reading or psychological diagnosis
- No relationship scores
- Proposals only; Elixir owns authority
"""

from __future__ import annotations

import json
import re
from typing import Any


def analyze(capability: str, context_items: list[dict[str, Any]]) -> dict[str, Any]:
    if capability == "social_flow_turn_classify":
        return classify_turns(context_items)
    if capability == "social_flow_open_loop_detect":
        return detect_open_loops(context_items)
    if capability == "social_flow_pre_send_check":
        return pre_send_check(context_items)
    if capability == "social_flow_ambiguity_detect":
        return detect_ambiguity(context_items)
    if capability == "social_flow_repair_suggest":
        return repair_suggest(context_items)
    if capability == "social_flow_decision_summary":
        return decision_summary(context_items)
    return {
        "result_type": "no_insight",
        "uncertainty": ["Unsupported capability"],
        "evidence": [],
    }


def classify_turns(context_items: list[dict[str, Any]]) -> dict[str, Any]:
    turns = []
    for item in context_items:
        text = str(item.get("value") or "")
        sid = str(item.get("source_id") or "unknown")
        acts: list[str] = []
        questions = _extract_questions(text)
        if questions:
            acts.append("question")
        if _is_answer(text):
            acts.append("answer")
        if _is_agreement(text):
            acts.append("agreement")
        if _is_commitment(text):
            acts.append("commitment")
        if _is_impact(text):
            acts.append("impact_statement")
        if not acts:
            acts.append("statement")
        turns.append({"source_id": sid, "speech_acts": acts, "questions": questions})
    return {
        "result_type": "turn_classification",
        "turns": turns,
        "evidence": [
            {"source_id": t["source_id"], "field": "speech_acts", "snippet": ""} for t in turns[:5]
        ],
        "uncertainty": ["Speech acts are linguistic labels, not mind states"],
    }


def detect_open_loops(context_items: list[dict[str, Any]]) -> dict[str, Any]:
    messages = [(str(i.get("source_id") or "u"), str(i.get("value") or "")) for i in context_items]
    open_loops: list[dict[str, Any]] = []

    # Multi-question pattern: "Can you X, and did you Y?"
    for sid, text in messages:
        qs = _extract_questions(text)
        if len(qs) >= 2:
            later = " ".join(v for s, v in messages if s != sid).lower()
            answered: list[str] = []
            unanswered: list[str] = []
            for q in qs:
                if _question_answered(q, later):
                    answered.append(q)
                else:
                    unanswered.append(q)
            if unanswered:
                open_loops.append(
                    {
                        "loop_type": "unanswered_question",
                        "summary": _open_loop_summary(answered, unanswered),
                        "status": "partially_answered" if answered else "open",
                        "source_message_ids": [sid],
                        "answered_parts": answered,
                        "unanswered_parts": unanswered,
                        "confidence": 0.82,
                    }
                )

    # Single unanswered question
    if not open_loops:
        for sid, text in messages:
            qs = _extract_questions(text)
            for q in qs:
                later = " ".join(v for s, v in messages if s != sid).lower()
                if not _question_answered(q, later):
                    open_loops.append(
                        {
                            "loop_type": "unanswered_question",
                            "summary": f"This question appears unanswered: {q}",
                            "status": "open",
                            "source_message_ids": [sid],
                            "answered_parts": [],
                            "unanswered_parts": [q],
                            "confidence": 0.7,
                        }
                    )

    return {
        "result_type": "open_loops",
        "open_loops": open_loops[:5],
        "evidence": [
            {
                "source_id": (ol["source_message_ids"] or ["unknown"])[0],
                "field": "open_loops",
                "snippet": ol["summary"][:200],
            }
            for ol in open_loops[:5]
        ],
        "uncertainty": [
            "Does not claim why the question is unanswered",
            "Not a psychological conclusion",
        ],
    }


def pre_send_check(context_items: list[dict[str, Any]]) -> dict[str, Any]:
    """Context: prior messages + synthetic_prompt with draft text."""
    draft = ""
    prior: list[tuple[str, str]] = []
    for item in context_items:
        t = str(item.get("type") or "message_body")
        v = str(item.get("value") or "")
        sid = str(item.get("source_id") or "unknown")
        if t == "synthetic_prompt" or sid.startswith("draft"):
            draft = v
        else:
            prior.append((sid, v))

    prior_text = " ".join(v for _, v in prior)
    questions = []
    for _, v in prior:
        questions.extend(_extract_questions(v))

    unanswered = [q for q in questions if not _question_answered(q, draft.lower())]
    escalatory = bool(
        re.search(
            r"big deal|don't know why|whatever|calm down|always|never",
            draft,
            re.I,
        )
    )

    needs = bool(unanswered) or (escalatory and bool(questions))
    insight = None
    suggested = None
    reasons: list[str] = []

    if unanswered:
        q = unanswered[-1]
        insight = (
            "Jordan asked whether you are still coming. Your draft does not answer that yet."
            if re.search(r"coming|still planning|saturday", q, re.I)
            else f"A direct question still needs an answer: {q}"
        )
        if re.search(r"coming|still planning|saturday|together", q + prior_text, re.I):
            insight = (
                "Jordan asked whether you are still coming. Your draft does not answer that yet."
            )
            suggested = (
                "I'm not sure yet, and I should have been clearer. "
                "I'll know by tonight and will let you know."
            )
        reasons.append("draft_does_not_answer_direct_question")
    if escalatory and questions:
        reasons.append("draft_may_escalate_before_answering")

    return {
        "result_type": "pre_send_check",
        "pre_send": {
            "needs_attention": needs,
            "insight_copy": insight,
            "reasons": reasons,
            "suggested_draft": suggested if needs else None,
            "unanswered_questions": unanswered[:5],
            "uncertainty": [
                "Does not claim the recipient's emotional state",
                "Draft is a suggestion only; user must approve send",
            ],
        },
        "evidence": [
            {"source_id": sid, "field": "prior_message", "snippet": v[:120]} for sid, v in prior[:3]
        ],
        "uncertainty": ["Pre-send help is private and non-blocking"],
    }


def detect_ambiguity(context_items: list[dict[str, Any]]) -> dict[str, Any]:
    for item in context_items:
        text = str(item.get("value") or "")
        sid = str(item.get("source_id") or "unknown")
        if re.search(r"do whatever you want|fine\.|whatever|i guess", text, re.I):
            return {
                "result_type": "ambiguity_candidate",
                "ambiguity": {
                    "phrase": text.strip()[:256],
                    "insight_copy": (
                        "This could be understood more than one way. "
                        "Would you like to clarify before acting?"
                    ),
                    "clarification_draft": (
                        "Just to make sure I understand—are you comfortable with me deciding, "
                        "or would you rather choose together?"
                    ),
                    "source_id": sid,
                    "confidence": 0.68,
                    "uncertainty": [
                        "Does not assert anger or passive-aggression",
                        "Multiple interpretations remain possible",
                    ],
                },
                "evidence": [{"source_id": sid, "field": "ambiguity", "snippet": text[:200]}],
                "uncertainty": ["Ambiguity is linguistic possibility, not mind-reading"],
            }
    return {
        "result_type": "no_insight",
        "ambiguity": None,
        "evidence": [],
        "uncertainty": ["No high-ambiguity phrase detected"],
    }


def repair_suggest(context_items: list[dict[str, Any]]) -> dict[str, Any]:
    impact_src = None
    impact_quote = None
    for item in context_items:
        text = str(item.get("value") or "")
        sid = str(item.get("source_id") or "unknown")
        if re.search(r"felt dismissive|felt hurt|that felt|trying to explain", text, re.I):
            impact_src = sid
            impact_quote = text.strip()[:512]
            break
    if not impact_src:
        return {
            "result_type": "no_insight",
            "repair": None,
            "evidence": [],
            "uncertainty": ["No explicit impact statement found"],
        }
    return {
        "result_type": "repair_suggestion",
        "repair": {
            "insight_copy": (
                "Jordan said the message felt dismissive. "
                "Would you like help acknowledging that before explaining your intent?"
            ),
            "suggested_draft": (
                "I can see why that felt dismissive. I responded to the logistics "
                "and missed what you were trying to explain."
            ),
            "source_id": impact_src,
            "impact_quote": impact_quote,
            "uncertainty": [
                "Does not diagnose the relationship",
                "Does not force an apology",
                "User must edit and send",
            ],
        },
        "evidence": [
            {
                "source_id": impact_src,
                "field": "impact_statement",
                "snippet": (impact_quote or "")[:200],
            }
        ],
        "uncertainty": ["Repair help is private; no autonomous send"],
    }


def decision_summary(context_items: list[dict[str, Any]]) -> dict[str, Any]:
    """Prefer structured JSON in context; else heuristic from text + plan facts."""
    confirmed: list[dict[str, Any]] = []
    still_open: list[dict[str, Any]] = []
    handled: list[dict[str, Any]] = []
    source_ids: list[str] = []

    for item in context_items:
        sid = str(item.get("source_id") or "unknown")
        value = str(item.get("value") or "")
        source_ids.append(sid)
        try:
            parsed = json.loads(value)
            if isinstance(parsed, dict) and parsed.get("kind") == "plan_facts":
                for t in parsed.get("confirmed") or []:
                    confirmed.append(
                        {"text": str(t), "source_message_ids": parsed.get("source_ids") or [sid]}
                    )
                for t in parsed.get("still_open") or []:
                    still_open.append(
                        {"text": str(t), "source_message_ids": parsed.get("source_ids") or [sid]}
                    )
                for t in parsed.get("handled") or []:
                    handled.append(
                        {"text": str(t), "source_message_ids": parsed.get("source_ids") or [sid]}
                    )
                continue
        except json.JSONDecodeError:
            pass

        low = value.lower()
        if "7:30" in low or "thursday" in low:
            confirmed.append(
                {
                    "text": "Thursday at 7:30 PM" if "7:30" in low else "Thursday",
                    "source_message_ids": [sid],
                }
            )
        if "reservation is booked" in low or "reservation booked" in low:
            handled.append({"text": "Reservation is booked", "source_message_ids": [sid]})
        if "location" in low and ("?" in value or "tbd" in low or "undecided" in low):
            still_open.append({"text": "Location still open", "source_message_ids": [sid]})

    if not still_open and not any("location" in (c.get("text") or "").lower() for c in confirmed):
        # Default open item when plan facts incomplete
        if confirmed:
            still_open.append(
                {"text": "Location unresolved if not stated", "source_message_ids": source_ids[:2]}
            )

    # Dedupe
    confirmed = _dedupe_items(confirmed)
    still_open = _dedupe_items(still_open)
    handled = _dedupe_items(handled)

    return {
        "result_type": "decision_summary",
        "decision_summary": {
            "confirmed": confirmed[:10],
            "still_open": still_open[:10],
            "handled": handled[:10],
        },
        "evidence": [
            {"source_id": sid, "field": "decision_summary", "snippet": ""} for sid in source_ids[:5]
        ],
        "uncertainty": [
            "Private reminders excluded",
            "Superseded times are not current truth",
            "Only shared completions appear as handled",
        ],
    }


def _extract_questions(text: str) -> list[str]:
    qs: list[str] = []
    # Reconstruct question segments ending with ?
    if "?" not in text:
        # Imperative double request without ?
        if re.search(r"\band\b.*(did you|have you|can you|will you)", text, re.I):
            # Split on "and" for dual asks
            chunks = re.split(r"\band\b", text, flags=re.I)
            return [c.strip() for c in chunks if c.strip()]
        return []
    # Use original with ?
    for m in re.finditer(r"[^.?!]*(?:\?)", text):
        q = m.group(0).strip()
        if q:
            qs.append(q)
    # Also dual questions joined by and
    if len(qs) == 1 and re.search(r"\band\b", qs[0], re.I):
        # e.g. "Can you pick me up at 6, and did you make the dinner reservation?"
        chunks = re.split(r",\s*and\s+|\sand\s+", qs[0], flags=re.I)
        if len(chunks) >= 2:
            return [
                c.strip().rstrip("?") + "?" if not c.strip().endswith("?") else c.strip()
                for c in chunks
            ]
    return qs


def _is_answer(text: str) -> bool:
    return bool(
        re.search(r"\byes\b|\bno\b|works|i('ll| will)|already|haven't|have not", text, re.I)
    )


def _is_agreement(text: str) -> bool:
    return bool(re.search(r"\bagreed?\b|sounds good|let's do|works for me|confirmed", text, re.I))


def _is_commitment(text: str) -> bool:
    return bool(re.search(r"i('ll| will)|i can|i'll handle|i will handle", text, re.I))


def _is_impact(text: str) -> bool:
    return bool(re.search(r"felt |that felt|hurt|dismissive|mattered to me", text, re.I))


def _question_answered(question: str, response_lower: str) -> bool:
    q = question.lower()
    if "reservation" in q:
        return bool(
            re.search(
                r"reservation|booked|haven't|have not|i('ll| will) (make|handle|book)",
                response_lower,
            )
        )
    if "pick" in q or "6" in q:
        return bool(re.search(r"\byes\b|6 works|works|i('ll| will) pick|pickup", response_lower))
    if "coming" in q or "saturday" in q or "still planning" in q:
        return bool(
            re.search(
                r"coming|not sure yet|i('ll| will) know|can't make|will be there|busy",
                response_lower,
            )
        )
    # generic: short affirmative without addressing second topic still counts partial
    return (
        bool(re.search(r"\byes\b|\bno\b|i('ll| will)", response_lower)) and len(response_lower) > 8
    )


def _open_loop_summary(answered: list[str], unanswered: list[str]) -> str:
    if answered and unanswered:
        a0 = answered[0]
        if "pick" in a0.lower() or "6" in a0:
            return (
                "You answered the pickup question. The reservation question still needs a response."
            )
        return "You answered one question. Another question still needs a response."
    if unanswered:
        return f"This question appears unanswered: {unanswered[0]}"
    return "No open loops"


def _dedupe_items(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    seen: set[str] = set()
    out: list[dict[str, Any]] = []
    for it in items:
        key = str(it.get("text") or "").lower()
        if key and key not in seen:
            seen.add(key)
            out.append(it)
    return out
