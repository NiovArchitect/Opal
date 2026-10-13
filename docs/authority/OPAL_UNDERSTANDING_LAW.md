# Opal Understanding Law

**Status:** CURRENT AUTHORITY — constitution for relationship intelligence  
**Kind:** Rules only (not features, not schema, not unlock)  
**Synced:** 2026-10-13  
**Pass 2:** LOCKED until founder unlock  
**Prerequisite:** Consumer Reality Gate GATE_GREEN (`a4d48179`) — human loop proven before understanding people

```yaml
authority_class: OPAL_UNDERSTANDING_LAW
pass_2: LOCKED
functionality: NONE
purpose: constitution_before_implementation
```

## Thesis

> Opal does not remember people.  
> Opal understands evolving relationships.

Memory is a mechanism. The product is context, timing, permission, relationship dynamics, and shared reality.

Pass 1 answered: *Can Opal represent reality correctly?*  
Pass 2 may only ask: *How does Opal understand people without violating trust?*

## Six questions (required before store, recall, or act)

Before Opal stores, recalls, or acts on anything about a person:

| # | Question | Field |
|---|----------|-------|
| 1 | Where did this information come from? | **Source** |
| 2 | Who owns this information? | **Owner** |
| 3 | Who is allowed to see it? | **Visibility / Scope** |
| 4 | How confident is Opal? | **Confidence** |
| 5 | Can the person correct it? | **Correction** |
| 6 | What happens when it becomes outdated? | **Expiration** |

These six are the constitution. They compose with `FACT_OWNERSHIP_VISIBILITY_LAW.md` and the memory ladder Observed → Candidate → Confirmed → Durable.

## Canonical example

User says: *"Chanelle loves pink."*

**Forbidden**

```text
FACT:
Chanelle likes pink forever
```

**Required**

```text
Observation:
  Chanelle expressed liking pink

Source:
  Conversation

Confidence:
  User stated → Candidate (not Durable until Confirmed)

Scope:
  Relationship context (default: not group-wide)

Correction:
  Available to owner / stated subject path

Expiration:
  Reviewable
```

That is the difference between a creepy assistant and a trusted relationship system.

## Operating sequence (unchanged)

```text
Truth
  ↓
Permission
  ↓
Context
  ↓
Assistance
```

Never:

```text
AI guess → Hope it's right
```

## Person model posture

A person is **not** a static profile of facts.

A person is a collection of **evolving states** expressed through different relationships, environments, and moments.

See `RELATIONSHIP_CONTEXT_MODEL.md` for the Person + Context Graph.

## Required zeros

- `ASSUMPTION_SHIPPED_AS_DURABLE_FACT = 0`
- `INFERENCE_LABELED_AS_CONFIRMED_DESIRE = 0`
- `RELATIONSHIP_FACT_WITHOUT_SIX_QUESTIONS = 0`
- `SILENT_OVERWRITE_OF_RELATIONSHIP_BELIEF = 0`
- `CONTEXTLESS_FACT_PROJECTED_ACROSS_RELATIONSHIPS = 0`
- `CURRENT_STATE_IGNORED_WHEN_HISTORICAL_PATTERN_EXISTS = 0`

## Unlock gate

This law does **not** unlock Pass 2.

Founder unlock phrase remains (`RELATIONSHIP_INTELLIGENCE_ENTRY_CONTRACT.md`):

> "Opal is ready to begin understanding people."

Until then: architecture preparation and Pass 1 coherence only.

## Related

- `FACT_OWNERSHIP_VISIBILITY_LAW.md` — Owner · Source · Confidence · Scope · Visibility · Expiration · Correction
- `RELATIONSHIP_INTELLIGENCE_ENTRY_CONTRACT.md` — Pass 2 gate
- `RELATIONSHIP_CONTEXT_MODEL.md` — dynamic human context
- `OPAL_RELATIONSHIP_INTELLIGENCE_DOCTRINE.md` — safe projection / alignment edges
- `PASS2_PLUS_CAPABILITY_MAP.md` — blueprint only
- `docs/evidence/pass2_entry/PASS2_ENTRY_REVIEW.md` — code inventory before unlock
