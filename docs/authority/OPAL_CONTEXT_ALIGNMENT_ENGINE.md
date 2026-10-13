# OPAL CONTEXT ALIGNMENT ENGINE

**Status:** FOUNDATIONAL AUTHORITY — architecture law only  
**Synced:** 2026-10-13  
**Pass 2:** LOCKED  
**Additive to:** `OPAL_TEMPORAL_CONTEXT_ALIGNMENT_FOUNDATION.md` · `RELATIONSHIP_CONTEXT_MODEL.md` · `OPAL_UNDERSTANDING_LAW.md` · `USER_VS_CONTROL_LAW.md` · `OPAL_COMPLEXITY_LAW.md` · `YOU_TRUST_MODEL.md`

```yaml
authority_class: OPAL_CONTEXT_ALIGNMENT_ENGINE
pass_2: LOCKED
implementation: FORBIDDEN_NOW
creates: NONE
# Explicitly does NOT create: memory · inference · scoring · personality prediction
# · relationship assumptions · Understanding Candidates · Pass 2 unlock
```

## Purpose

Define how Opal maintains alignment between people, relationships, time, location, intent, constraints, and permissions.

This document is architecture law.

It does **not** implement memory, inference, scoring, or autonomous understanding.

It defines the future intelligence foundation so agents do not flatten humans into static profiles.

## Future agent instruction

Before architectural decisions about people, preferences, recommendations, or relationship intelligence, read:

1. `MASTER_PRODUCTION_CONTINUITY_HANDOFF.md`
2. `CURRENT_OPAL_STATE.md`
3. `PRODUCT_INVARIANTS.md`
4. `OPAL_UNDERSTANDING_LAW.md`
5. **This file** — `OPAL_CONTEXT_ALIGNMENT_ENGINE.md`
6. `DYNAMIC_RELATIONSHIP_ALIGNMENT_MATRIX.md`

---

# Core Principle

Opal does not understand people as static profiles.

People are dynamic.

A person has:

- stable identity
- changing contexts
- evolving relationships
- current states
- future intentions

Opal must understand:

```text
Person
+
Relationship
+
Context
+
Time
+
Location
+
Intent
+
Permission
=
Alignment Opportunity
```

before assistance.

---

# The Gyroscope Principle

Opal behaves like a balancing system.

The goal is not maximizing one person's preference.

The goal is finding stable alignment across contextual reality.

A gyroscope maintains balance by accounting for multiple forces.

Opal maintains social alignment by accounting for:

- people
- preferences
- constraints
- relationships
- location
- timing
- availability
- history
- current situation
- environment
- intent
- permission

No single signal dominates without context.

**Metaphor note:** “Gyroscope” is the metaphor. **Context Alignment Engine** is the architecture name. See also `DYNAMIC_RELATIONSHIP_ALIGNMENT_MATRIX.md` for the relationship-balance matrix.

---

# Human Model

**Incorrect:**

```text
Person → Profile → Preferences
```

**Correct:**

```text
Person
 |
 Core Identity
 |
 Contexts
 |
 Relationships
 |
 Experiences
 |
 Current State
 |
 Future Intentions
 |
 Permission
 |
 Alignment
 |
 Assistance
```

---

# Core Identity

Represents stable aspects of a person.

Examples:

- values
- principles
- personality tendencies
- long-term interests
- boundaries

Core identity should not change frequently from single observations.

---

# Context Expression

A person expresses different valid versions of themselves depending on context.

| Context | Possible expressions |
|---------|----------------------|
| Partner | Romance · shared experiences · future planning · intimacy |
| Family | Support · traditions · responsibility |
| Child | Teaching · protection · guidance |
| Work | Productivity · collaboration · professionalism |
| Community / church | Service · fellowship · shared values |
| Alone | Creativity · coding · reflection · personal growth |
| Friends | Adventure · social activities · reconnection |

These are not contradictions.

They are contextual expressions of the same person.

---

# Temporal Model — Past · Present · Future

## Past

Purpose: learn from completed reality.

Includes: completed experiences · previous plans · historical interactions.

**Past informs. Past does not control.**

A previous preference is not automatically a current preference.

## Present

Highest relevance for immediate decisions.

Includes: current location · current availability · current situation · current needs.

**The present can override historical patterns.**

Example: A person usually enjoys going out. Today they may need rest.

## Future

Represents: intentions · possibilities · commitments · plans.

Must distinguish:

| Soft | Hard |
|------|------|
| Interested | Committed |
| Discussed | Planned |
| Suggested | Accepted |
| Proposed | Executed |

---

# Location Model

Location is context, not just coordinates.

```text
Location + Time + People + Intent = Situation
```

Examples of the same person:

- Home → rest · family · personal activities
- Work → professional activity
- Travel → exploration · discovery
- Restaurant → social connection

Weather and environment modify context. They do not define personality.

```text
Time + Weather + Location + People + Intent = Situation
```

---

# Alignment Engine

Opal's purpose:

Find the highest alignment opportunity between:

- people
- relationships
- preferences
- constraints
- location
- timing
- intent
- permissions

**Inputs:** People · Relationships · Preferences · Past experiences · Current state · Future intentions · Location · Time · Availability · Constraints · Permissions · Environment

**Output (authority-gated):** Suggest · Prepare · Coordinate · Execute

Assistance is the **output**. Intelligence is **not** the UI.

---

# Alignment Engine Hierarchy

```text
Constraints
      ↓
Current Needs
      ↓
Relationship Context
      ↓
Preferences
      ↓
Discovery
```

Meaning:

| Layer | Role |
|-------|------|
| Constraints | Filter — must respect |
| Current Needs | Guide — what matters right now |
| Relationship Context | Scope — who they are to each other |
| Preferences | Optimize — improve the fit |
| Discovery | Expand — appropriate novelty |

Constraints filter. Needs guide. Preferences optimize. Discovery expands.

---

# Context Priority Hierarchy

When Opal evaluates any situation, context must be considered in this order:

1. Explicit current user intent
2. Current constraints and availability
3. Relationship context
4. Current location and environment
5. Recent experiences
6. Historical patterns
7. General preferences

A current explicit choice overrides historical behavior.

**Past behavior informs. Present intent decides.**

---

# Group Alignment

Groups are not averages.

A group is a temporary social entity.

```text
Individuals
+
Relationship dynamics
+
Group intent
+
Constraints
+
Location
+
Time
=
Group alignment
```

Example dinner group: sushi preference · vegetarian constraint · budget · social atmosphere → find workable alignment, not the mean.

### Group Context Lifecycle

Groups are entities with lifecycle states:

```text
Created → Active → Dormant → Completed → Historical
```

A group context does not permanently transfer into individual identity.

Example: A bachelor trip does not mean “everyone likes nightlife.” It means that group, in that context, had that experience.

---

# Current State Layer

Long-term pattern is not enough.

```text
Historical Pattern + Current State = Current Recommendation
```

Normally likes outdoor activities + today tired after work → suggest relaxing activity.

Do not recommend hiking solely because history says so.

---

# YOU Relationship Control Principle

**Users manage:**

- permissions
- visibility
- sharing
- corrections
- access

**Opal manages:**

- interpretation
- balancing
- alignment
- assistance

Users should never manage algorithm knobs.

Composes with `USER_VS_CONTROL_LAW.md` and `OPAL_COMPLEXITY_LAW.md`.

---

# Accuracy Law

Accuracy does not come from collecting everything.

Accuracy comes from:

- correct source
- correct owner
- correct permission
- correct relationship scope
- correct time
- correct location
- correction ability

More data ≠ better understanding. Better context ≠ maximum collection.

**Data Minimization:** Opal should use the minimum information necessary to provide value.

---

# Guardrail Laws (anti-drift)

These laws prevent future agents from semantic drift (e.g. treating “understands relationships” as “builds static profiles”).

## Context ≠ Identity Law

A behavior observed in one context cannot automatically become an identity attribute.

Context explains behavior. Identity does not explain all contexts.

Example: Declining a party does not mean someone dislikes social events.

```text
CONTEXT_BEHAVIOR_PROMOTED_TO_UNIVERSAL_IDENTITY = 0
```

## Observation ≠ Truth Law

Observed behavior is evidence, not permanent fact.

Composes with `OPAL_UNDERSTANDING_LAW.md` (six questions) and the memory ladder Observed → Candidate → Confirmed → Durable.

```text
OBSERVATION_SHIPPED_AS_DURABLE_FACT = 0
```

## Unknown Is Valid

Opal must preserve uncertainty.

Unknown is better than assumption.

Valid states include: Known · Observed · Candidate · Unknown · Corrected · Expired — not only true/false.

Absence of evidence ≠ evidence of preference.

```text
UNKNOWN_FILLED_WITH_ASSUMPTION = 0
```

## Preference Strength Law

Differentiate:

| Signal | Weight posture |
|--------|----------------|
| Stated preference | Explicit |
| Repeated behavior | Higher confidence |
| Single experience | Weak |
| Candidate preference | Provisional |
| Assumed preference | Forbidden as durable |
| Unknown | Preserve |

A single interaction cannot create a permanent preference. Repeated behavior increases confidence. Explicit correction overrides previous observations.

Preference strength may consider frequency · recency · explicit statement · repeated choice · correction — without exposing knobs on YOU.

```text
SINGLE_EXPERIENCE_AS_PERMANENT_PREFERENCE = 0
```

## Relationship-Specific Truth Law

Truth in Opal is relationship-scoped.

A fact about a person is not automatically universal across all relationships.

A person can have different valid expressions depending on relationship context.

Example: Partner ≠ coworker ≠ child ≠ friend ≠ alone.

```text
CONTEXTLESS_FACT_PROJECTED_ACROSS_RELATIONSHIPS = 0
```

## Emotional State ≠ Personality

Temporary emotional or situational states must not become personality attributes.

Examples: tired · stressed · grieving · excited · sick · overwhelmed.

```text
TEMPORARY_STATE_PROMOTED_TO_PERSONALITY = 0
```

## Current State Override Law

Current explicit needs override historical patterns.

```text
HISTORICAL_PATTERN_OVERRIDES_EXPLICIT_CURRENT_NEED = 0
```

## Alignment ≠ Compromise Law

The goal is not equal sacrifice.

The goal is mutually beneficial alignment.

Alignment optimizes mutual consideration, not identical preferences.

Alignment does not mean erasing differences. Some needs are preferences; some are boundaries; some are requirements.

```text
ALIGNMENT_AS_EQUAL_SACRIFICE_AVERAGE = 0
```

## Constraint vs Preference Law

Separate:

**Constraints** (must respect — filter):

- boundaries
- permissions
- accessibility
- dietary restrictions
- availability
- legal requirements

**Preferences** (improve alignment — optimize):

- interests
- activities
- favorites
- atmosphere

Constraints filter. Preferences optimize.

```text
CONSTRAINT_TREATED_AS_NEGOTIABLE_PREFERENCE = 0
```

## Relationship Emergence Law

A relationship creates a unique shared context.

```text
Person + Person = Shared Context
```

without replacing either individual.

Opal must model what the relationship creates — not only what each person likes alone.

```text
RELATIONSHIP_COLLAPSED_TO_PREFERENCE_OVERLAP = 0
```

## Location Context Law

Location provides context, not intent.

Being somewhere does not mean:

- the user likes that place
- the user wants recommendations
- the user is available
- the user intends participation related to that location

Location is one signal among many.

Example: Being at a hospital does not mean hospital-related assistance is wanted.

```text
LOCATION_EQUALS_INTENT = 0
```

## Surprise and Discovery Layer

Opal must balance familiarity and discovery.

Known enjoyment + appropriate novelty creates growth.

Do not over-optimize history into a boring life.

```text
HISTORY_ONLY_OPTIMIZATION_WITHOUT_DISCOVERY = 0
```

## Explainability Law

Future Opal assistance must explain:

- why this suggestion
- based on what
- for whom
- under what permission

Alignment decisions should have human-readable reasoning.

Not: “Because AI said so.”

Example: “I suggested this because you both enjoyed similar experiences, you are nearby, and you are both free tonight.”

```text
MEANINGFUL_SUGGESTION_WITHOUT_HUMAN_REASON = 0
```

## Human Override Law

Explicit human choice overrides Opal's model.

Observed patterns never override explicit human preference.

Opal assists. Humans decide.

```text
INFERRED_PATTERN_OVERRIDES_EXPLICIT_HUMAN_CHOICE = 0
```

## Relationship Integrity Law

Opal helps humans connect.

Opal must not optimize:

- dependency on Opal
- jealousy
- comparison
- urgency pressure
- emotional manipulation
- replacement of human interaction

Opal supports human connection. Opal does not optimize emotional pressure.

```text
RELATIONSHIP_MANIPULATION_OPTIMIZATION = 0
```

## Relationship Alignment Law

Opal does not optimize for individual preference satisfaction alone.

Opal optimizes for mutually beneficial shared experiences while respecting individual identity and boundaries.

A relationship creates a new context that belongs to neither person alone.

---

# Implementation Boundary

This model does not create:

- memory
- assumptions
- personality scoring
- relationship inference
- Understanding Candidates
- Pass 2 unlock

Future intelligence must follow:

```text
Reality
  ↓
YOU Control
  ↓
Permission
  ↓
Understanding Candidate
  ↓
Context Alignment Engine
  ↓
Assistance
```

Composes with sequence in `OPAL_TEMPORAL_CONTEXT_ALIGNMENT_FOUNDATION.md`.

---

# Governing Questions

**North star question:**

> What action helps these people, in this moment, in this place, while respecting who they are and what they have allowed Opal to understand?

**Final Opal Thesis (exact):**

> Opal does not ask:  
> What does this person like?  
>  
> Opal asks:  
> Given who these people are, their relationship, where they are, when this is happening, and what matters right now — what creates the strongest alignment?

---

# Anti-patterns this law prevents

Future agents must not accidentally turn Opal into:

- a social scoring system
- a personality profiler
- a flat recommendation engine (“preferences table → restaurants”)
- a surveillance assistant
- a static couples preference overlap engine

The restaurant (or any suggestion) is the **output**.

The intelligence is understanding: who is going · what relationship exists · what happened before · what matters today · where they are · what constraints exist · what would make everyone feel considered.

That is the difference between a recommendation engine and an **alignment engine**.

---

# Related

- `OPAL_TEMPORAL_CONTEXT_ALIGNMENT_FOUNDATION.md` — time + place + context foundation (compound; do not replace)
- `DYNAMIC_RELATIONSHIP_ALIGNMENT_MATRIX.md` — gyroscope matrix / dynamic balance
- `RELATIONSHIP_CONTEXT_MODEL.md` — Person + Context Graph
- `OPAL_UNDERSTANDING_LAW.md` — six questions; Candidate first
- `USER_VS_CONTROL_LAW.md` — User ≠ Control
- `OPAL_COMPLEXITY_LAW.md` — no algorithm knobs on YOU
- `YOU_TRUST_MODEL.md` · `YOU_PAGE_HIERARCHY.md` · `OPAL_PERMISSION_ARCHITECTURE.md`
- `RELATIONSHIP_INTELLIGENCE_ENTRY_CONTRACT.md` — Pass 2 gate (LOCKED)
- `FACT_OWNERSHIP_VISIBILITY_LAW.md`
- `MASTER_PRODUCTION_CONTINUITY_HANDOFF.md` · `CURRENT_OPAL_STATE.md` · `PRODUCT_INVARIANTS.md`
)
