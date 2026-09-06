# P4 Decision Intelligence — Intent Lock (P4.0)

**Date:** 2026-09-05  
**Starting HEAD:** `9621a46a7a074cdb2a536f77010a7576982c2405`  
**Branch:** `build/v2-coded-experience-closure`  
**Checkpoint:** **P4.0** Architecture / domain lock only

```
P4_AUTHORIZED = YES
P4_0_COMPLETE = (this pass)
P4_COMPLETE = NO
P2_FROZEN = YES
P3_FROZEN = YES
MERGE = NO
LIVE = NO
permissionToStartLive = NO
FOUNDER_ACCEPTED_WHOLE_PRODUCT = NO
ACTIVITY_ICON_APPROVED = NO
KAFKA_IMPLEMENTATION_AUTHORIZED = YES
KAFKA_IS_SOURCE_OF_TRUTH = NO
KAFKA_PRODUCTION_DEPLOYED = NO
```

## What P4 is

A **decision system** that maximizes **speed to alignment** using known context — not a recommendation carousel, chatbot wrapper, or search ranker.

## Immutable interfaces (consume, do not redefine)

| System | Role |
|--------|------|
| **P2** Calls Continuity `928:9/276/158/221` | Communication continuity |
| **P3** Signal + Motion Grammar | Semantic state + attention behavior |
| Visual DI stack | HIGH `979:2`/`979:280` · MEDIUM `988:2` · LOW `988:263` |
| Global Opal shell | `618:902` gateway (not a Curate tab) |

## Compression ladder (visible)

HIGH → **one answer** · MEDIUM → **one necessary question** · LOW → **one meaningful tradeoff** · **More ideas** = exploration escape hatch only.

## Core laws

1. A decision carries **evidence + invalidation conditions**.  
2. Event asks: did this invalidate a premise? No → **do nothing**. Yes → **delta recompute**.  
3. Realtime: smarter before louder.  
4. CONFIDENCE ≠ CONFIRMATION · GOLD earned · never dim the human.  
5. DYAD ≠ SOLO · visible WHO = engine WHO.  
6. Private context never leaks into shared explanation.  
7. Elixir owns truth · Python understands · Phoenix is immediate · Kafka is durable event log · Postgres is authority.

## Kafka (P4 addendum supersession)

Earlier “do not implement Kafka” is **superseded**. P4 requires local architecture + proof. Local ≠ production deployed.

## Controlled checkpoints

P4.0 (this) → P4.1 DecisionContext → P4.2 High → P4.3 Med/Low → P4.4 Realtime+Kafka → P4.5 Privacy/provider → P4.6 Convergence.

## Non-goals of P4.0

No product UI rewrite · No Calls/P3 edits · No 1046:2 · No claiming Kafka production · No Curate tab.
