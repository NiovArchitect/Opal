# RELATIONSHIP INTELLIGENCE ENTRY CONTRACT

**Status:** GATE AUTHORITY — Pass 2 LOCKED until founder unlock + this contract satisfied  
**Synced:** 2026-10-13  
**Prerequisite checkpoint:** `shots/steward/PASS1_FINAL_CHECKPOINT.md`  
**Composes with:** `FACT_OWNERSHIP_VISIBILITY_LAW.md` · Memory Observed→Candidate→Confirmed→Durable · `STATE_OWNERSHIP_LAW.md`

```yaml
authority_class: RELATIONSHIP_INTELLIGENCE_ENTRY_CONTRACT
pass_2: LOCKED
functionality: NONE_YET
purpose: gate_contract_only
```

## Purpose

Not new features. A **contract** that must hold before any relationship intelligence ships.

Pass 1 answered:

> Why is Opal showing me this?

Pass 2 may only ask:

> How do we make Opal understand people without violating trust?

Never:

> How do we make Opal smarter / remember everything?

## Entry condition (strict)

> Build a permissioned relationship graph where Opal understands people without pretending to know what it does not know.

Founder must explicitly unlock Pass 2. Until then: **HOLD**.

---

## 1. Relationship facts are not assumptions

Conversation: “I love Italian food.”

**Allowed**

```text
Candidate: Favorite cuisine → Italian
Source: Explicit statement
Confidence: High (still Candidate until Confirmed)
Scope: Personal
```

**Forbidden**

```text
Permanent truth: User always wants Italian
```

Memory ladder remains: Observed → Candidate → Confirmed → Durable. Never Observed → Permanent Fact.

---

## 2. Relationship context requires relationship scope

Chanelle: “Likes pink.”

| Scope | Allowed? |
|-------|----------|
| Self (Chanelle knows) | Yes |
| Partner (thoughtful gestures) | Only if visibility permits |
| Group | No (default) |
| Public | No (default) |

Scope is first-class on every relationship fact (see FACT OWNERSHIP + VISIBILITY).

---

## 3. Emotional inference must remain separate

Observed: Chanelle sent proposal videos about beach weddings.

**Allowed**

```text
Candidate: Interested in beach wedding concepts
```

**Forbidden**

```text
Fact: Wants a beach wedding
```

Inference ≠ commitment. Patterns may inform Candidates; they do not invent Confirmed desires.

---

## 4. Opal must explain itself naturally

**Forbidden**

> Memory candidate confidence 0.87 influenced recommendation.

**Required (human)**

> You mentioned wanting something more relaxed lately, so I thought this might fit.

Every surfaced relationship-intelligence suggestion needs a lightweight explanation path the user can understand.

---

## 5. Correction is first-class

People change. Preferences change. Relationships change.

**Required**

```text
Old belief → New information → Updated understanding → History preserved
```

**Forbidden**

```text
AI was wrong → overwrite silently
```

Correction path is a required field of durable relationship facts.

---

## Relationship graph posture (prepare — do not ship as flat profile)

A person is not a simple profile card.

```text
Person
 |
 ├── Identity
 ├── Preferences
 ├── Patterns
 ├── Shared Experiences
 ├── Commitments
 ├── Important Moments
 ├── Boundaries
 └── Relationship Dynamics
```

| Weak (profile) | Strong (relationship graph) |
|----------------|----------------------------|
| “Chanelle likes pink.” | “Pink has appeared repeatedly in meaningful contexts involving Chanelle’s style, events, and shared moments.” |

Pass 2 designs toward the strong model. Flat “likes X” profiles without source/scope/confidence violate this contract.

---

## Temptations that wait

Do not rush into Pass 2 as a feature race:

- partner intelligence dumps
- preference graphs without scope
- gift / anniversary automation without visibility
- emotional “facts” from thin inference

Those become valuable only after this contract is live in product behavior.

## Required zeros (Pass 2 gate)

- `ASSUMPTION_SHIPPED_AS_DURABLE_FACT = 0`
- `INFERENCE_LABELED_AS_CONFIRMED_DESIRE = 0`
- `RELATIONSHIP_FACT_WITHOUT_SCOPE = 0`
- `SURFACED_INTEL_WITHOUT_HUMAN_EXPLANATION = 0`
- `SILENT_OVERWRITE_OF_RELATIONSHIP_BELIEF = 0`
- `FLAT_PROFILE_WITHOUT_SOURCE_CONFIDENCE = 0`

## Unlock phrase (founder)

Pass 2 opens only when the founder intentionally decides:

> "Opal is ready to begin understanding people with explicit permission, transparent context, and user-controlled boundaries."

Equivalent explicit unlock still accepted:

> "Opal is ready to begin understanding people."

**Unlock means:** Opal may begin creating **permissioned understanding objects** — not “turn on memory.”

Until then: preserve Pass 1 coherence, U Trust Layer honesty, and production readiness. No relationship-intelligence implementation.

## Unlock checklist

Before any Pass 2 PR merges:

1. [ ] Founder unlocks with a phrase above (or equivalent explicit unlock)
2. [ ] Pass 1 checkpoint still green · Consumer Reality Gate still green
3. [ ] This contract cited in the PR / packet
4. [ ] New durable facts carry Owner · Source · Confidence · Scope · Visibility · Correction · Expiration
5. [ ] Human explanation path for any surfaced suggestion
6. [ ] No silent overwrite of prior beliefs
7. [ ] **Permission test:** Opal can answer “Why do you know this?”
8. [ ] **Correction test:** User can easily say “That changed”
9. [ ] **Scope test:** Distinguishes my preference / our preference / group discussion
10. [ ] **Time test:** Distinguishes “true then” vs “true now”
11. [ ] U Permission Capability Matrix row exists for the capability (`docs/evidence/u_page/`)
12. [ ] First slice remains humility-first (e.g. RU-1 provisional confirm/dismiss before Durable prefs)

## Hold-period forbidden list

Until unlock: no memory expansion · partner graph · preference learning · emotional inference · relationship scoring · automated assumptions.

## Related

- `shots/steward/PASS1_FINAL_CHECKPOINT.md`
- `docs/authority/FACT_OWNERSHIP_VISIBILITY_LAW.md`
- `docs/authority/OPAL_UNDERSTANDING_LAW.md` (constitution — six questions before store/recall/act)
- `docs/authority/RELATIONSHIP_CONTEXT_MODEL.md` (Person + Context Graph; not static profile)
- `docs/authority/OPAL_MATURITY_STACK.md` (Reality · Understanding · Intelligence)
- `docs/authority/OPAL_PERMISSION_ARCHITECTURE.md` (YOU page Trust Layer)
- `docs/evidence/u_page/YOU_PAGE_CAPABILITY_MATRIX.md` (YOU capability audit)
- `docs/authority/OPAL_RELATIONSHIP_INTELLIGENCE_DOCTRINE.md` (doctrine; this file is the **entry gate**)
- `docs/authority/PASS2_PLUS_CAPABILITY_MAP.md` (life-intelligence blueprint; not implementation)
- `docs/evidence/pass2_entry/PASS2_ENTRY_REVIEW.md` (code inventory before unlock)
- `docs/evidence/founder_staging_walk_correction/CONSUMER_REALITY_GATE_RESULT.md` (human loop GREEN; Pass 2 still locked)
