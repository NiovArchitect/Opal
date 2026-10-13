# User vs Control Law

**Status:** CURRENT AUTHORITY — foundational product law  
**Synced:** 2026-10-13  
**Pass 2:** LOCKED  
**Composes with:** `YOU_TRUST_MODEL.md` · `OPAL_PERMISSION_ARCHITECTURE.md` · `RELATIONSHIP_CONTEXT_MODEL.md`

```yaml
authority_class: USER_VS_CONTROL_LAW
merge_forbidden: true
```

## Law

**User** and **Control** must never merge.

| | USER | CONTROL |
|---|------|---------|
| Meaning | Who the person is | How Opal is allowed to operate |
| Contains | Identity · values · interests · preferences · patterns · relationships | Permissions · visibility · actions · access · sharing · corrections · revocation |
| Example | “I enjoy hiking.” | “Who may Opal use that with?” → Only me / Partner / Friends / Groups / Suggestions only |

The user is the person.  
Control is the boundary.

## Why this is foundational (not an intelligence feature)

Without this split, Opal collapses preference into permission and leaks context across relationships.

Example scopes that must stay separate:

- Partner may know “we like nicer date nights” without knowing a personal monthly spend limit (**Spending** control).  
- Workout partner may know “morning runs” without seeing private wellness goals (**Fit** control).

## Contextual person (not a flat profile)

Humans are not inconsistent — they are contextual.

```text
Person
 ├── Core identity (relatively stable values)
 ├── Contexts (partner · child · work · community · alone · strangers)
 ├── Relationships
 ├── Shared experiences
 ├── Current state
 └── Possible actions
```

The question for Opal is not only “Who is this person?”  
It is: **Who is this person in this context, with these people, at this moment?**

## Alignment thesis (engine — not YOU knobs)

Opal’s core job is not “recommend things.”

It is:

> Find the highest-alignment action between people, context, time, preferences, constraints, and permissions — while preserving human choice.

Alignment ≠ similarity. Generosity, novelty, current state, and dynamic consent matter. Age is a constraint (legal/safety), not a personality stereotype.

**Users experience the benefit. They do not manage the machinery.**  
See `OPAL_COMPLEXITY_LAW.md`.

## Required zeros

- `USER_FACT_WITHOUT_CONTROL_SCOPE = 0` (for durable / shared use)  
- `SPENDING_SCOPE_COLLAPSED_INTO_FIT = 0`  
- `ALGORITHM_WEIGHT_KNOBS_ON_YOU = 0`  
- `CONTROL_UI_EXPOSED_AS_PERSONALITY_SCORE = 0`

## Related

- `OPAL_COMPLEXITY_LAW.md` — experience vs engine  
- `OPAL_TEMPORAL_CONTEXT_ALIGNMENT_FOUNDATION.md` — people + time + place + intent  
- `OPAL_CONTEXT_ALIGNMENT_ENGINE.md` — YOU manages control; Opal manages alignment  
- `DYNAMIC_RELATIONSHIP_ALIGNMENT_MATRIX.md` — relationship balance (engine-side)  
- `YOU_PAGE_HIERARCHY.md` — Spending and Fit as separate cards  
- `YOU_TRUST_MODEL.md`  
- `OPAL_UNDERSTANDING_LAW.md` — Understanding Candidate first  
