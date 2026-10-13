# DYNAMIC RELATIONSHIP ALIGNMENT MATRIX

**Status:** FOUNDATIONAL AUTHORITY — architecture law only  
**Synced:** 2026-10-13  
**Pass 2:** LOCKED  
**Additive to:** `OPAL_CONTEXT_ALIGNMENT_ENGINE.md` · `OPAL_TEMPORAL_CONTEXT_ALIGNMENT_FOUNDATION.md` · `RELATIONSHIP_CONTEXT_MODEL.md` · `USER_VS_CONTROL_LAW.md` · `OPAL_COMPLEXITY_LAW.md`

```yaml
authority_class: DYNAMIC_RELATIONSHIP_ALIGNMENT_MATRIX
pass_2: LOCKED
implementation: FORBIDDEN_NOW
creates: NONE
# Explicitly does NOT create: memory · inference · scoring · preference averaging
# · relationship assumptions · Understanding Candidates · Pass 2 unlock
```

## Purpose

Define the **gyroscope** model at relationship scale: Opal balances the **relationship context**, not two preference lists.

This document is architecture law.

It does **not** implement memory, inference, scoring, or autonomous understanding.

## Future agent instruction

Read with `OPAL_CONTEXT_ALIGNMENT_ENGINE.md` before any architectural decision about multi-person recommendations, couples logic, group planning, or preference overlap.

---

# Core Mistake to Prevent

Most systems treat relationships as preference overlap:

```text
Person A + Person B = Find overlap
```

Example: both like steak → recommend steak.

Useful, shallow, and **not** Opal.

---

# Core Principle

A relationship is not a static combination of two profiles.

A relationship is a living system.

```text
Person A
+
Person B
+
Relationship History
+
Current State
+
Time
+
Location
+
Environment
+
Intent
+
Constraints
=
Current Alignment State
```

The alignment center can move. It is dynamic.

---

# The Gyroscope Model (relationship axis)

Opal does **not** balance two people's preferences as equal weights forever.

Opal balances the **relationship itself**.

Think of each input as a force acting on balance. Not every force has equal weight in every moment.

| Dimension | Question |
|-----------|----------|
| Identity | Who are these people? |
| Relationship | Who are they to each other? |
| History | What has worked before? |
| Preferences | What do they enjoy? |
| Needs | What matters right now? |
| Intent | What are they trying to accomplish? |
| Time | When is this happening? |
| Location | Where are they? |
| Environment | Weather, events, surroundings |
| Constraints | What cannot happen? |
| Permission | What is Opal allowed to use? |

---

# Deeper Model (not overlap)

```text
Person A
+
Person B
+
Relationship Context
+
Past Shared Experiences
+
Current Needs
+
Future Intentions
=
Alignment Opportunity
```

The relationship itself becomes a source of information.

### Contrasting preferences example

Person A enjoys adventure and novelty.  
Person B enjoys meaningful conversation and intentional moments.

A bad system sees conflict: adventure vs connection.

An alignment engine sees shared underlying value: quality time together — with different expressions.

Possible bridge: scenic drive · quiet restaurant · meaningful conversation · new location — satisfying both without averaging them into something neither wants.

---

# Structural Diagram

```text
             Relationship
                  |
      ------------------------
      |                      |
  Person A                Person B
      |                      |
 Individual             Individual
 Contexts               Contexts
 Preferences             Preferences

                  ↓

          Shared Experience Space

                  ↓

             Alignment
```

Full engine view:

```text
                DYNAMIC ALIGNMENT ENGINE

                         |
        ---------------------------------
        |                               |
   Person Context                 Relationship Context

        |                               |
 Identity + State              Shared History + Dynamics

        ---------------------------------

                         |

              Time / Location / Environment

                         |

                  Alignment Matrix

                         |

              Suggest → Prepare → Assist
```

---

# Preference vs State

AI systems usually fail here.

Example: Someone loves beaches.

That does **not** mean: “Go to the beach.”

The matrix asks today:

- Is she tired?
- Is it cold?
- Is there time?
- Is this a romantic moment?
- Is she seeking comfort or adventure?

The same preference can produce different actions depending on state, time, environment, and relationship intent.

---

# Relationship Intent

The same activity means different things depending on purpose.

A dinner can be:

| With | Meaning |
|------|---------|
| Coworker | Networking |
| Friend | Connection |
| Partner | Romance |
| Child | Bonding |

Same place. Different meaning.

Opal must ask **what each person needs**, not only what each person likes.

Example: Today A needs relaxation; B needs reassurance and connection → quiet dinner together — because it satisfies the moment, not because both listed “dinner” as a preference.

---

# Center of Gravity

A relationship has a center of gravity:

Not “What does A want?” alone.  
Not “What does B want?” alone.

But: **What creates the healthiest shared experience right now?**

Sometimes the center moves toward one person.

Example: B had a difficult day → alignment may intentionally favor B.  
Another day: A needs support → the center moves.

That is not unfair. That is relationship intelligence.

---

# Dynamic Balance Law

```text
Opal must not seek a permanent balance between people.

Opal must seek the appropriate balance for the current moment,
context, and relationship state.

The alignment center may shift over time.
```

```text
FIXED_EQUAL_WEIGHT_BALANCE_ALWAYS = 0
```

---

# Relationship Seasons

Relationships change phases. The same people can have different alignment needs depending on the season.

Examples:

| Season | Alignment posture |
|--------|-------------------|
| New relationship | Discovery · learning each other |
| Long-term relationship | Traditions · shared history |
| Parent / child | Protection → teaching → independence |
| Friendship | Frequent connection → life changes → reconnection |

Do not treat all relationship edges as the same phase.

---

# Hierarchy Inside the Matrix

### Level 1 — Non-negotiables (Constraints)

Hard constraints: allergies · beliefs · availability · boundaries · permissions · accessibility · legal

### Level 2 — Needs

What matters right now: rest · connection · celebration · support · adventure

### Level 3 — Preferences

Likes: food · activities · locations · atmosphere

### Level 4 — Discovery

New possibilities · appropriate novelty

Then:

```text
Constraints filter.
Needs guide.
Preferences optimize.
Discovery expands.
```

Same hierarchy as `OPAL_CONTEXT_ALIGNMENT_ENGINE.md` — applied to the shared relationship space.

---

# Weather / Environment Layer

Weather is not only a recommendation filter.

It changes emotional and practical context.

| Environment | Possible alignment shift |
|-------------|--------------------------|
| Sunny | Beach · walk · outdoor dinner |
| Rainy | Cozy restaurant · cooking together · movie · conversation |

Weather and environment **modify** the state of the gyroscope. They do **not** define personality.

```text
Time + Weather + Location + People + Intent = Situation
```

---

# Reciprocity

Opal needs to ask not only “What does A want?” but “What does B experience as meaningful?”

Relationships fail when one person's preferences dominate permanently.

Reciprocity is part of the matrix — without optimizing guilt, pressure, or scorekeeping.

---

# Valuable Signals (beyond “likes Italian”)

### 1. Individual identity

Values · boundaries · lifestyle · interests

### 2. Relationship-specific expression

Who are they with?

Alone ≠ with partner ≠ with friends ≠ at work.

### 3. Shared history

Not “B likes restaurants.”

Instead: “Together, A and B repeatedly enjoyed intimate dinners followed by walks.”

That is a **relationship pattern**.

### 4. Reciprocity and current needs

What each person needs in this moment within the relationship.

---

# Worked Example (dynamic state)

Couple wants dinner.

| Input | Signal |
|-------|--------|
| Person A preference | Loves trying new restaurants |
| Person B preference | Prefers familiar places |
| Shared history | Great experience at a small coastal restaurant |
| Current state | Both tired |
| Weather | Rainy evening |
| Location | Near home |

The alignment result changes.

Not: “Pick the restaurant both statistically prefer.”

May become: cozy familiar restaurant nearby with a new dessert experience — balance found for **this** moment.

---

# Relationship Alignment Law (restated)

Opal does not optimize for individual preference satisfaction alone.

Opal optimizes for mutually beneficial shared experiences while respecting individual identity and boundaries.

```text
A relationship creates a new context that belongs to neither person alone.
```

```text
RELATIONSHIP_COLLAPSED_TO_PREFERENCE_OVERLAP = 0
ALIGNMENT_AS_EQUAL_SACRIFICE_AVERAGE = 0
```

---

# Thesis Distinctions

| System type | Asks |
|-------------|------|
| Normal AI | What should this person do? |
| Social AI | What should these people do together? |
| **Opal** | Given who these people are, their relationship, this moment, this place, and what matters right now — what creates the strongest shared alignment? |

Without this document, a future implementation team could accidentally build a static “couples recommendation engine” instead of a **dynamic relationship alignment system**.

---

# Implementation Boundary

This document does **not** authorize:

- memory activation
- inference productization
- scoring / personality prediction
- preference averaging as product logic
- relationship assumptions
- Understanding Candidates implementation
- Pass 2 unlock

Compound only. Pass 2 remains LOCKED until founder unlock via `RELATIONSHIP_INTELLIGENCE_ENTRY_CONTRACT.md`.

---

# Related

- `OPAL_CONTEXT_ALIGNMENT_ENGINE.md` — Context Alignment Engine + guardrail laws + Final Thesis
- `OPAL_TEMPORAL_CONTEXT_ALIGNMENT_FOUNDATION.md` — time + place + context foundation
- `RELATIONSHIP_CONTEXT_MODEL.md` — Person + Context Graph · groups as entities
- `OPAL_UNDERSTANDING_LAW.md` — Candidate first · six questions
- `USER_VS_CONTROL_LAW.md` · `OPAL_COMPLEXITY_LAW.md`
- `YOU_TRUST_MODEL.md` · `OPAL_PERMISSION_ARCHITECTURE.md`
- `RELATIONSHIP_INTELLIGENCE_ENTRY_CONTRACT.md` — Pass 2 gate (LOCKED)
- `MASTER_PRODUCTION_CONTINUITY_HANDOFF.md` · `CURRENT_OPAL_STATE.md` · `PRODUCT_INVARIANTS.md`
)
