# Build slice: Dynamic Social and Experience Intelligence Phase 3

**Status:** Experience completion, light reflection, scoped outcome learning, correction priority, restrained digital continuity  
**Branch:** `build/dynamic-social-intelligence-phase3-outcome-learning`  
**Base:** `main` after PR #52 (`1bd0e16`)  
**Does not close Social Flow 18.**  
**No live location, providers, payments, bookings, Kafka, Foundation, or Technicolor production merge.**

## Objective

Prove, on the synthetic quiet dinner for three:

- an experience can be confirmed with explicit authority
- completion is authoritative (Elixir)
- time alone cannot mark completion
- a light reflection may occur once, only when useful
- silence may win (no reflection is a pass)
- one outcome may modestly improve a later relevant experience
- private constraints remain private
- correction outranks inferred learning
- no user homework, surveys, or social scores

## Central rule preserved

> Joining Opal and using Opal are two different states.

Phase 3 does not touch pre-member shell, walkthrough, or Technicolor.

## Lifecycle (backend; not exposed as raw names)

```
detected → eligible → surfaced → private participation → shared readiness
  → confirmed → completed → reflection eligible
  → reflection surfaced | suppressed
  → scoped learning accepted | rejected
  → archived | expired
```

## Data model (bounded)

| Table | Purpose |
|-------|---------|
| `dsi_experience_completions` | Authoritative completion evidence + continuity label |
| `dsi_reflections` | Light reflection state (eligible / suppressed / surfaced / answered) |
| `dsi_scoped_learnings` | Participant-set scoped dimensions with expiry + correction flag |

Does **not** copy raw conversations or arbitrary model prose.

## Authority

| Actor | May | May not |
|-------|-----|---------|
| Elixir | Complete, surface/suppress reflection, persist/suppress learning, rank with modest boost | Leak private budget |
| Python | Propose likely outcome, learning dimension, reflection usefulness | Complete, publish reflection, change relationship state, permanent preference |

## API (product, authenticated)

| Method | Path |
|--------|------|
| POST | `/api/v1/product/conversations/:id/opportunity/complete` |
| POST | `/api/v1/product/conversations/:id/opportunity/reflection` |
| POST | `/api/v1/product/conversations/:id/opportunity/reflection/respond` |

## Light reflection

- Prompt: **Would you choose a place like this again?**
- Actions: Yes · Maybe · Not with this group
- No multi-question survey, rating scale, push campaign, or celebration spam
- Low likely value → surface nothing

## Scoped learning dimensions

- quiet venue
- moderate cost
- timing
- balanced travel
- similar dinner experiences

Scoped by experience type, participant set, freshness, permission, confidence, correction history.

## Continuity label

User-facing digital continuity after completion (conversation-native):

- **Happened** (default Phase 3)
- Handled
- Complete

No public feed, scrapbook, streak, or experience score.

## Closure language (only when all gates green)

> OPAL DYNAMIC SOCIAL AND EXPERIENCE INTELLIGENCE PHASE 3 CLOSED FOR EXPERIENCE COMPLETION, LIGHT REFLECTION, SCOPED OUTCOME LEARNING, CORRECTION PRIORITY, AND RESTRAINED DIGITAL CONTINUITY

## Explicit non-claims

production recommendations · real providers · real location · booking · payments · memberships · creator system · Social Flow 18 closure · Kafka · Foundation ingress
