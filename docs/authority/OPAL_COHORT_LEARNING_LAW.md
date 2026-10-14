# Opal Cohort Learning Law

**Status:** ARCHITECTURE ONLY — no Pass 2 unlock · no user-level memory activation  
**Freeze:** HOLD · **Pass 2:** LOCKED  
**Last updated:** 2026-10-14

---

## 1. Purpose

Allow aggregate product learning to improve Opal defaults over time without turning people into stereotypes.

```text
COHORT_IMPLEMENTATION_ACTIVE = NO
PASS2_UNLOCKED = NO
COHORT_USED_AS_IDENTITY = 0
```

---

## 2. Hierarchy of authority

```text
cohort prior
  < relationship-specific evidence
  < current explicit intent
```

Current user intent always wins. Relationship-specific repeated behavior beats cohort defaults.

---

## 3. What cohorts may learn

Prefer interaction/outcome patterns:

- clarifying questions users skip
- defaults users correct
- time-to-alignment
- recommendation acceptance / cancellation
- option-selection patterns
- follow-through success
- provider reliability
- when proactive help is accepted/dismissed
- how much questioning causes abandonment

Goal: **better product behavior**, not profiling people.

---

## 4. Privacy

Do not create cohort logic from raw identifiable relationship conversations. Aggregate / de-identify. No user may infer another user's finances, health, private calendar, relationship conflicts, or exact location history from cohort behavior. Cohort output must never disclose cohort members.

---

## 5. No demographic shortcuts

Do not map age / race / gender / religion → preference assumption. Prefer product/context interaction patterns.

Acceptable: “Users planning a same-weekend trip often prefer three strong options before more questions.”  
Forbidden: “People like this user usually want X.”

---

## 6. Memory boundary

Cohort architecture may be documented now. It does **not** unlock Pass 2 understanding, user-level memory, or inference activation.
