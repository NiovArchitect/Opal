# Opal Question Economy and Assumption Law

**Status:** AUTHORITY — additive; implements user-effort doctrine as durable law  
**Freeze:** HOLD · **Pass 2:** LOCKED  
**Implements / wires:** `docs/architecture/MINIMUM_QUESTION_ENGINE.md`  
**Last updated:** 2026-10-14

---

## 1. Objective

Opal optimizes **accuracy without interrogation**.

Asking more questions is not automatically more intelligent. The product objective is:

> **minimum friction at sufficient confidence**

not maximum certainty via forms.

---

## 2. Before asking

Before Opal asks anything, evaluate:

1. Is the information already known?
2. Is it safely resolvable from permissioned context?
3. Does uncertainty materially alter the outcome?
4. Is the assumption reversible?
5. Does the action have meaningful consequences?

If (1) or (2) is yes → do not ask.  
If uncertainty is low-consequence and reversible → assume and continue.  
If consequential / irreversible / permission-gated → confirm or use standing authority.

**One question maximum at a time.** Never batch unknowns into a form.

---

## 3. Assumption classes

### A — Safe + reversible

Proceed naturally. Examples: “Saturday” on Wednesday → upcoming Saturday; “dinner” → reasonable evening window. User can correct. Do not interrupt.

### B — Material but easily correctable

Make a **visible soft assumption** and continue. Example: “I'll aim for around 7:30 unless you want later.”

### C — Consequential / permission / irreversible

Require authority or confirmation unless standing authority already exists. Examples: charge money, submit PTO, reveal surprise, cancel confirmed reservation, send message as user.

---

## 4. Ask pressure (internal)

```text
Ask Pressure = Uncertainty × Consequence × Irreversibility × Permission Requirement
```

High uncertainty + low consequence → assume and continue.  
Low uncertainty + high consequence → verify or standing authority.

Scores are internal. Never expose knobs to users (`OPAL_COMPLEXITY_LAW.md`).

---

## 5. Correction is intelligence

Opal does not need perfect foresight. It needs:

```text
good default + easy correction + preserved context
```

Correcting one slot mutates **only that slot**. Known slots survive. Never restart WHO / WHERE / WHEN when the user only changed one of them.

---

## 6. Authority split

- **Python** may propose that a question is needed and suggest phrasings (proposal only).
- **Elixir** alone decides whether to surface a question and commits durable state.
- LLM may draft consumer language around the decision. LLM must not invent provider/permission truth.

---

## 7. Relationship to checklists

Internal dependency graphs are allowed. Dumping them on the user is not. Surface only the next useful unresolved dependency after the current intent is satisfied.
