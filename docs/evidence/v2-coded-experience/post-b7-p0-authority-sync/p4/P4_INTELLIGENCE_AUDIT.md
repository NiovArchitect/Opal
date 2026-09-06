# P4 Intelligence Audit (P4.0)

**Date:** 2026-09-05 · **HEAD:** `9621a46` · Read-only audit of current owners

## Doctrine / visuals

| Asset | Status | Notes |
|-------|--------|-------|
| `OPAL_DECISION_INTELLIGENCE.md` | CURRENT doctrine | Choice-collapse, scope integrity, confidence≠confirmation |
| `979:2` / `979:280` | CURRENT high visuals | Violet provisional; gold only when earned |
| `988:2` / `988:263` | CURRENT med/low | One question / one tradeoff |
| Historical multi-candidate / gold-premature | HISTORICAL / SUPERSEDED | Must not revive |

## Backend / domain

| Asset | Status | Gap |
|-------|--------|-----|
| `DecisionCompression` | Exists; prefer ≤3 | **Conflicts** with ONE ANSWER ladder — update in P4.2+ |
| `decision_trace` / `decision_summary` | Partial traces | Not first-class DecisionContext aggregate |
| Graph / Journey APIs | REAL_BACKEND + fixture edges | DecisionContext not persisted as revisioned object |
| Python AI services | Partial probes | No formal DI request/response contract yet |

## Events / realtime

| Asset | Status | Gap |
|-------|--------|-----|
| `EventOutbox` + `Publisher` | REAL | Transport-neutral; good |
| `PublishOutboxWorker` | LocalAdapter + optional Foundation | Kafka not in delivery path |
| `KafkaAdapter` | Stub `kafka_not_operational` | Activate under P4.4 with local broker |
| `DomainEvent` topic families | Present | Add `decision.*` family |
| Phoenix PubSub / Channels | REAL for live UI | Keep for immediacy |

## Global Opal (`618:902`)

| Control | P3.1 status | P4 need |
|---------|-------------|---------|
| Context pods | Inspect sheets REAL_ACTIVE | Bind to DecisionContext dimensions |
| Intent starters | Seed path REAL_ACTIVE | Set intent + compose decision |
| Refine/Timing/Budget/Vibe | P4_REQUIRED honest | Delta mutate + recompose |
| More ideas | Explore REAL_ACTIVE | Keep as escape hatch |
| Composer | Seed REAL_ACTIVE | Route through engine |
| DI answer lane | Fixture carousel | Replace with ladder output |

## Frozen touchpoints (do not reopen)

- P2 Calls Continuity surfaces  
- P3 signal tokens / motion tempo CSS family  
- Activity icon `1046:2`

## Fixture ≠ production (honest)

| Area | Class |
|------|-------|
| Global Opal DI answers | **FIXTURE** until P4.2+ |
| Founder seed people/graphs | FIXTURE / seed |
| Outbox local publish | REAL_DEV |
| Kafka | NOT_BUILT → P4.4 local proof |
| Provider reservation | PARTIAL / deps |
| Push / WebRTC media | NOT_READY (outside P4 core UI) |

## Recommended insertion points

1. New `OpalCore.Decision` (or `SocialFlow.Decision`) context module + schema (P4.1)  
2. Extend `DomainEvent.topic_family/1` for `decision.*`  
3. Extend `PublishOutboxWorker` to call Kafka when enabled (P4.4)  
4. Surgical Global Opal wiring after engine exists (P4.2–P4.3)  
5. Ladder-aware replace of `DecisionCompression` surface rules
