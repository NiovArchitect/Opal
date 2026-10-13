# Opal Context Ownership and Temporal Truth Model

**Status:** ARCHITECTURE AUTHORITY — freeze guardrail before intelligence expansion  
**Synced:** 2026-10-13  
**Pass 2:** LOCKED  
**Implementation:** FORBIDDEN NOW (laws only; no Understanding Candidates activation)  
**Composes with:** `OPAL_UNDERSTANDING_LAW.md` · `FACT_OWNERSHIP_VISIBILITY_LAW.md` · `RELATIONSHIP_CONTEXT_MODEL.md` · `OPAL_TEMPORAL_CONTEXT_ALIGNMENT_FOUNDATION.md` · `OPAL_RELATIONSHIP_ACCESS_MODEL.md` · `OPAL_DYNAMIC_RELATIONSHIP_CLARIFICATION.md` · `OPAL_PERMISSION_ARCHITECTURE.md`

```yaml
authority_class: OPAL_CONTEXT_OWNERSHIP_AND_TEMPORAL_TRUTH_MODEL
pass_2: LOCKED
implementation: FORBIDDEN_NOW
purpose: prevent_observation_becoming_truth_and_preference_becoming_identity
```

## Why this document exists

Permission substrate is in place. The next danger is not missing capability.

The next danger is future agents skipping human complexity:

| Mistake | Forbidden outcome |
|---------|-------------------|
| Every statement → memory | Contaminated graph |
| Every preference → identity | Flat person profile |
| Every relationship → permission | Silent access escalation |
| Every group → shared knowledge | Private bleed |
| Every observation → truth | Creepy certainty |

This file freezes the **laws** that must sit between Reality and Assistance.

## Current safe sequence (unchanged)

```text
Reality
   ↓
YOU Control
   ↓
Permission Infrastructure     ✅
   ↓
Understanding Candidates      🔒
   ↓
Context Engine                🔒
   ↓
Alignment Engine              🔒
   ↓
Assistance Expansion          🔒
```

Do not jump to “AI remembers everything.”

---

## 1. Context Ownership Law

**Who owns a piece of context?**

A couple says: “We should visit Italy someday.”

Possible interpretations (do **not** auto-pick one):

- shared dream  
- one person’s dream  
- temporary conversation  
- hypothetical statement  

**Law:** Do not immediately assign durable ownership. Every observed signal must carry:

| Field | Meaning |
|-------|---------|
| **source** | Where it came from |
| **owner** | Who may correct / remove (may be provisional until confirmed) |
| **participants** | Who was in the interaction |
| **confidence** | Observed · Candidate · Confirmed · Durable |
| **scope** | Self / relationship / group / … |
| **expiration** | When it must decay or reconfirm |
| **correction path** | How a human fixes it |

Composes with the six questions in `OPAL_UNDERSTANDING_LAW.md` and fields in `FACT_OWNERSHIP_VISIBILITY_LAW.md`. This law adds **participants** and forbids premature owner assignment on ambiguous shared speech.

**Required zero:** `AMBIGUOUS_SHARED_STATEMENT_AUTO_OWNED = 0`

---

## 2. Observation ≠ Truth

Conversations contain jokes, sarcasm, imagination, emotional spikes, temporary frustration, and hypotheticals.

Example: “I hate this restaurant.”

| Interpretation | Allowed? |
|----------------|----------|
| Permanent preference forever | ❌ Forbidden auto-promote |
| Current mood | Possible Candidate |
| Bad experience that day | Possible Candidate |
| Durable dislike | Only after confirm + review |

**Law:**

```text
Observed statement ≠ permanent preference
Observed statement ≠ identity
Observed statement ≠ truth until Candidate → Confirm path
```

**Required zero:** `OBSERVATION_PROMOTED_TO_DURABLE_WITHOUT_CONFIRM = 0`

---

## 3. Relationship seasons

Relationships have seasons. Same people, different needs.

Examples (illustrative labels, not product enums yet):

- honeymoon / early romance  
- new friendship  
- conflict period  
- recovery period  
- travel season  
- parenting season  
- work-heavy season  

**Law:** Season may modulate *suggestions* and template *offers*. Season must never silently raise access ceilings or rewrite ownership. Formal productization of seasons remains Pass 2+; schema may reserve `season_key` (already noted on grants).

**Required zero:** `SEASON_SILENT_PERMISSION_ESCALATION = 0`

---

## 4. Temporary state vs identity

Opal must never confuse:

| Temporary | Must not become |
|-----------|-----------------|
| “I am tired today” | “I dislike social events” |
| “I can't afford this month” | “I am financially constrained” (durable identity) |
| “I hate this restaurant” (tonight) | Lifelong cuisine ban |

**Law:** Temporary state **decays**. Identity / durable preference requires confirmation, scope, and expiration review.

Use ≠ disclose still applies: a temporary financial constraint may **use** for Suggest without **disclose** to others (`OPAL_RELATIONSHIP_ACCESS_MODEL.md`).

**Required zero:** `TEMPORARY_STATE_FLATTENED_TO_IDENTITY = 0`

---

## 5. Group privacy inheritance

**Law (restated):**

```text
A group does not inherit private member context.
```

Family group (Mom + Dad + Child) does not mean everyone sees everyone’s private information.

Group scope is its own permission boundary. Member private grants do not cascade into the group graph.

**Required zero:** `GROUP_INHERITS_MEMBER_PRIVATE_CONTEXT = 0`

---

## 6. Gyroscope (alignment, not preference tug-of-war)

The gyroscope is **not** only:

> Person A’s preference versus Person B’s preference.

That is too shallow.

The gyroscope balances:

```text
People
+ Relationship
+ Current moment
+ Constraints
+ Intent
+ Location
+ Time
+ Permissions
```

**Output question:**

> What creates the highest alignment with the least friction?

That may mean compromise, one person leading, another getting priority, postpone, or a new option nobody suggested.

**Goal:** alignment — not equal sacrifice, not “Person A wins.”

Person-agnostic: works for any users; founder names in conversation are examples only (`OPAL_DYNAMIC_RELATIONSHIP_CLARIFICATION.md`).

---

## Pipeline with permission gates (architected; not activated)

```text
Observation
      ↓  [Access permission]
Signal
      ↓  [Ownership + temporal truth checks]
Candidate                    ← LOCKED (Understanding Candidates)
      ↓  [User confirm / dismiss / correct]
Understanding
      ↓  [Scope + visibility + use≠disclose]
Context
      ↓  [Action ceiling: Suggest → Prepare → Execute]
Action
```

Between every stage: permission / ownership / confidence / expiration gates.

Raw interaction ≠ derived understanding. Dump-to-memory remains forbidden.

---

## Freeze checklist for future agents

Before any intelligence expansion, verify:

1. Context ownership fields present on new objects  
2. Observation cannot skip to Durable  
3. Temporary state has decay / expiration  
4. Relationship type ≠ automatic access  
5. Group ≠ member private inheritance  
6. Use ≠ disclose respected  
7. Gyroscope inputs include permissions + moment, not preference lists alone  
8. `PASS2_UNLOCKED = NO` until founder unlock phrase  

## Hard boundaries

```text
PASS2_UNLOCKED = NO
UNDERSTANDING_CANDIDATES_ACTIVE = NO
RELATIONSHIP_INFERENCE_ACTIVE = NO
SCORING = NO
FAKE_SUCCESS = 0
IMPLEMENTATION_THIS_DOC = NONE
```

## Related

- `OPAL_UNDERSTANDING_LAW.md` — six questions  
- `FACT_OWNERSHIP_VISIBILITY_LAW.md` — owner/source/visibility spine  
- `OPAL_TEMPORAL_CONTEXT_ALIGNMENT_FOUNDATION.md` — time + place + context  
- `OPAL_RELATIONSHIP_ACCESS_MODEL.md` — permission dimensions  
- `OPAL_DYNAMIC_RELATIONSHIP_CLARIFICATION.md` — examples ≠ data models  
- Evidence posture: permission substrate report under `docs/evidence/relationship_access/`  
