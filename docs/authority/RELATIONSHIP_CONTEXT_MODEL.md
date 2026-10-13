# Relationship Context Model

**Status:** ARCHITECTURE AUTHORITY — blueprint only  
**Kind:** Model definition (not implementation)  
**Synced:** 2026-10-13  
**Pass 2:** LOCKED  
**Composes with:** `OPAL_UNDERSTANDING_LAW.md` · `FACT_OWNERSHIP_VISIBILITY_LAW.md` · `OPAL_PERSONAL_TO_INTERPERSONAL_MODEL.md`

```yaml
authority_class: RELATIONSHIP_CONTEXT_MODEL
pass_2: LOCKED
implementation: FORBIDDEN_UNTIL_UNLOCK
purpose: dynamic_human_context_not_static_profile
```

## The blind spot this closes

Many AI systems assume:

> A person is a collection of facts.

Humans are not.

Opal’s model:

> A person is a collection of evolving states expressed through different relationships, environments, and moments.

## Forbidden shape — static Person Profile

```text
Sadeil:
- likes steak
- likes beaches
- likes fitness
- likes movies
```

Too shallow. Contextless. Dangerous when projected across every relationship.

## Required shape — Person + Context Graph

```text
Sadeil
 |
 ├── Self context
 ├── With Chanelle
 ├── With children
 ├── With family
 ├── With friends
 ├── At work
 ├── In business
 ├── In church / community
 └── Alone / reflection
```

The same human exists in all of those contexts. Different aspects become active.

### Example

With partner: *"I love spontaneous adventures."*  
With coworkers: *"I prefer everything planned."*

Neither is fake. They are different relationship expressions.

**Bad AI:** `User likes spontaneity.`  
**Opal:** `User has expressed enjoying spontaneity in partner experiences, while demonstrating preference for structure in professional contexts.`

## Architecture change

Do **not** build a flat Person Profile as the intelligence core.

Build:

```text
Person
  │
Relationship
  │
Shared Experiences
  │
Observed Patterns
  │
Current State
  │
Confidence
  │
Permission
```

## Current state matters

Humans are not static even within one relationship.

Historical: *"Chanelle enjoys trying new restaurants."*  
Current: *"Chanelle had a stressful week and mentioned wanting a quiet night."*

**Dumb AI:** recommends new restaurant downtown.  
**Relationship-aware Opal:** tonight may fit something calm at home.

Intelligence is understanding **which facts matter right now** — not knowing more facts.

## Beyond the dyad — groups are entities

Opal is not only `A ↔ B`.

```text
        Person A
          |
Person B — Group — Person C
          |
        Person D
```

A group conversation creates a new entity with shared intention.

Example:

- A: "I want to go hiking."
- B: "I am free Saturday."
- C: "I can't Saturday but Sunday works."

**Not** three isolated messages.  
**Candidate shared state:**

```text
Group:          Weekend Hiking
Participants:   A, B, C
Intent:         Possible activity
Status:         Exploring
Needs:          Time alignment · Location · Commitment
Confidence:     Medium
Scope:          This group only
```

No false memory. No “everyone wants hiking forever.”

## Conversation ingestion layers

Separate these layers (architecture — not yet a shipped pipeline mandate for Pass 2 unlock):

| Layer | Question |
|-------|----------|
| Raw conversation | What was said? |
| Understanding | What does this mean? |
| Context | Who does this apply to? |
| Relationship | Who is allowed to know? |
| Action | What can Opal suggest? |

Example: group says *"We should do Cabo again."*

**Forbidden:** `Everyone wants Cabo.`  
**Allowed candidate:**

```text
Experience preference: Travel together
Evidence:              Group conversation
Confidence:            Medium
Scope:                 This group only
Status:                Idea
```

## Why Pass 1 had to come first

Relationship intelligence without reality integrity is dangerous.

If Opal incorrectly believes “everyone loves hiking” and has no context boundaries, it recommends hiking to spouse, coworkers, and family — creating friction instead of connection.

Consumer Reality Gate GATE_GREEN proved the human loop (conversation → shared state → other person receives → response → both see update). That is the seed of Opal Graph. Understanding people may only grow on top of that.

## Relationship Context Matrix (required shape)

Opal must never flatten a person into one preference list.

Initial matrix:

| Context | Observation | Confidence | Scope |
|---------|-------------|------------|-------|
| Self | Likes quiet mornings | Medium | Private |
| Partner | Likes spontaneous dates | Confirmed | Partner |
| Friends | Likes group adventures | Observed | Friend group |
| Work | Prefers structured planning | Confirmed | Professional |

Evolving dimensions (more data ≠ more intelligence; better context does):

| Field | Purpose |
|-------|---------|
| Source | Where did this come from? |
| Timestamp | When was this true? |
| Frequency | How often observed? |
| Recency | Is it current? |
| Sentiment | Positive / neutral / negative context |
| Exceptions | When does this not apply? |
| Relationship | Who was this expression with? |
| User confirmation | Did the user approve? |

## Group identity lifecycle

A group conversation creates a temporary social entity — not automatic person facts.

| Phase | Meaning |
|-------|---------|
| Created | Shared thread / collective appears |
| Active | Exploring / aligning |
| Dormant | Quiet; no current intent |
| Completed | Shared commitment finished |
| Historical | Retained as shared history under scope |

**Forbidden:** “Let's do Vegas” → everyone Durable-wants Vegas.  
**Required:** Group intention candidate (Travel discussion · Exploring · Alignment needed · Scope=this group).

## Model checklist (for future design docs)

Any Pass 2 design must address:

1. Person identity  
2. Relationship types  
3. Context states (self / partner / family / work / group / alone)  
4. Group dynamics + lifecycle  
5. Shared experiences  
6. Temporary / current states  
7. Confidence levels  
8. Permission boundaries  
9. Correction mechanisms  
10. Expiration / change over time  
11. Relationship Context Matrix fields above  

## Required zeros (context model)

- `FLAT_PROFILE_AS_SOLE_PERSON_MODEL = 0`
- `CROSS_CONTEXT_FACT_LEAK_WITHOUT_SCOPE = 0`
- `HISTORICAL_PATTERN_OVERRIDES_CURRENT_STATE_SILENTLY = 0`
- `GROUP_MESSAGE_TREATED_AS_UNIVERSAL_PERSON_FACT = 0`

## Related

- `OPAL_UNDERSTANDING_LAW.md` — six questions constitution  
- `RELATIONSHIP_INTELLIGENCE_ENTRY_CONTRACT.md` — unlock gate  
- `OPAL_RELATIONSHIP_INTELLIGENCE_DOCTRINE.md` — safe projection  
- `OPAL_PERSONAL_TO_INTERPERSONAL_MODEL.md` — Personal / Relational / Shared planes  
- `PASS2_PLUS_CAPABILITY_MAP.md` — capability blueprint  
- `docs/evidence/pass2_entry/PASS2_ENTRY_REVIEW.md` — what exists in code today  
